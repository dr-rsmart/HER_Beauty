/**
 * Professional (Team) Routes (/api/professionals)
 * -----------------------------------------------
 * Manage bookable professionals / staff members for a provider.
 */

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import { logger } from '../logger.js';
import { requireAuth, optionalAuth, invalidateLiveRoleCache } from '../middleware/auth.js';
import { serializeProfessional } from '../serializers.js';
import { logAudit, getClientIp, computeChanges } from '../audit.js';
import { broadcastEvent, disconnectUserClients } from '../sse.js';
import { canManageProvider } from '../tenantPolicy.js';
import { DEFAULT_PASSWORD } from '../passwords.js';
import { parsePagination, setPageHeaders } from '../pagination.js';
import { badRequest, notFound, accessDenied, internalError } from '../errorResponse.js';

const router = Router();

// ── GET /api/professionals ──
router.get('/', optionalAuth, async (req, res) => {
  try {
    const providerId = (req.query.provider_id || req.query.providerId) as string | undefined;
    const activeParam = req.query.active as string | undefined;
    const meta = parsePagination(req, { defaultLimit: 100, maxLimit: 300 });

    const where: Prisma.ProfessionalWhereInput = {};
    if (providerId) where.providerId = providerId;
    if (activeParam === 'true') where.active = true;
    else if (activeParam === 'false') where.active = false;

    const [professionals, total] = await Promise.all([
      prisma.professional.findMany({
        where,
        orderBy: { name: 'asc' },
        take: meta.limit,
        skip: meta.offset,
      }),
      prisma.professional.count({ where }),
    ]);

    const emails = professionals
      .map((p) => (p.email ? p.email.toLowerCase().trim() : null))
      .filter(Boolean) as string[];

    const matchingUsers =
      emails.length > 0
        ? await prisma.user.findMany({
            where: { email: { in: emails, mode: 'insensitive' } },
            select: { email: true, role: true },
          })
        : [];
    const userRoleByEmail = new Map(matchingUsers.map((u) => [u.email.toLowerCase(), u.role]));

    const serializedItems = professionals.map((p) => {
      const emailLower = p.email ? p.email.toLowerCase().trim() : null;
      const role = emailLower ? userRoleByEmail.get(emailLower) : undefined;
      return serializeProfessional(p, {
        has_login: Boolean(role),
        login_role: role || null,
      });
    });

    setPageHeaders(res, total, meta);
    return res.json({
      items: serializedItems,
      total,
      limit: meta.limit,
      offset: meta.offset,
    });
  } catch (err) {
    logger.error({ err }, '[professionals] List error:');
    return internalError(res, 'listing professionals');
  }
});

// ── POST /api/professionals ──
router.post('/', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const body = req.body || {};
    const providerId = String(body.provider_id || body.providerId || authUser.providerId || '').trim();
    const name = String(body.name || '').trim();

    if (!providerId || !name) {
      return badRequest(res, 'Provider ID and professional name are required.');
    }

    if (!(await canManageProvider(authUser, providerId))) {
      return accessDenied(res, 'You do not have permission to add professionals for this business.');
    }

    const email = body.email ? String(body.email).toLowerCase().trim() : null;
    const createLogin = Boolean(body.create_login || body.createLogin || body.create_staff_login);

    const created = await prisma.professional.create({
      data: {
        providerId,
        name,
        email,
        title: String(body.title || ''),
        bio: String(body.bio || ''),
        photoUrl: String(body.photo_url ?? body.photoUrl ?? ''),
        pathwayStage: String(body.pathway_stage ?? body.pathwayStage ?? 'GROW'),
        pathwayRole: String(body.pathway_role ?? body.pathwayRole ?? body.title ?? 'Senior Stylist'),
        specialties: Array.isArray(body.specialties) ? body.specialties.map(String) : [],
        rating: body.rating != null ? Number(body.rating) : 4.95,
        reviewCount: body.review_count != null ? Number(body.review_count) : 32,
        experienceYears: body.experience_years != null ? Number(body.experience_years) : 3,
        commissionRate: body.commission_rate != null ? Number(body.commission_rate) : 0.45,
        leaves: Array.isArray(body.leaves) ? (body.leaves as Prisma.InputJsonValue) : [],
        serviceIds: Array.isArray(body.service_ids)
          ? body.service_ids.map(String)
          : Array.isArray(body.serviceIds)
            ? body.serviceIds.map(String)
            : [],
        active: body.active !== false,
      },
    });

    let userRole: string | null = null;
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      const role = body.role === 'manager' ? 'manager' : 'employee';
      const password = body.password ? String(body.password) : DEFAULT_PASSWORD;
      const passwordHash = await bcrypt.hash(password, 10);

      if (!existingUser) {
        await prisma.user.create({
          data: {
            email,
            fullName: name,
            phone: body.phone ? String(body.phone).trim() : null,
            role,
            provider: { connect: { id: providerId } },
            passwordHash,
            mustChangePassword: true,
          },
        });
        userRole = role;
      } else {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            provider: { connect: { id: providerId } },
            role: existingUser.role === 'master' ? 'master' : role,
            ...(body.password ? { passwordHash } : {}),
          },
        });
        userRole = existingUser.role === 'master' ? 'master' : role;
      }

      logAudit({
        entity: 'User',
        entityId: email,
        action: 'provision_staff_login',
        actorId: authUser.id,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        ipAddress: getClientIp(req),
        providerId,
        justification: `Provisioned staff login account for ${name} (${role})`,
      });
    }

    const serialized = serializeProfessional(created, {
      has_login: Boolean(userRole),
      login_role: userRole,
    });

    logAudit({
      entity: 'Professional',
      entityId: created.id,
      action: 'create',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId,
      justification: `Added professional "${created.name}"`,
    });

    broadcastEvent('professional:created', { professional: serialized }, { providerId });
    return res.status(201).json(serialized);
  } catch (err) {
    logger.error({ err }, '[professionals] Create error:');
    return internalError(res, 'creating professional');
  }
});

// ── PUT & PATCH /api/professionals/:id ──
async function handleUpdateProfessional(req: Request, res: Response) {
  try {
    const authUser = req.authUser!;
    const id = String(req.params.id);
    const existing = await prisma.professional.findUnique({ where: { id } });
    if (!existing) return notFound(res, 'Professional');

    if (!(await canManageProvider(authUser, existing.providerId))) {
      return accessDenied(res, 'You do not have permission to update this professional.');
    }

    const body = req.body || {};
    const data: Prisma.ProfessionalUpdateInput = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.email !== undefined) {
      data.email = body.email ? String(body.email).toLowerCase().trim() : null;
    }
    if (body.title !== undefined) data.title = String(body.title);
    if (body.bio !== undefined) data.bio = String(body.bio);
    if (body.photo_url !== undefined || body.photoUrl !== undefined) {
      data.photoUrl = String(body.photo_url ?? body.photoUrl ?? '');
    }
    if (body.pathway_stage !== undefined || body.pathwayStage !== undefined) {
      data.pathwayStage = String(body.pathway_stage ?? body.pathwayStage ?? 'GROW');
    }
    if (body.pathway_role !== undefined || body.pathwayRole !== undefined) {
      data.pathwayRole = String(body.pathway_role ?? body.pathwayRole ?? '');
    }
    if (body.specialties !== undefined) {
      data.specialties = Array.isArray(body.specialties) ? body.specialties.map(String) : [];
    }
    if (body.commission_rate !== undefined || body.commissionRate !== undefined) {
      data.commissionRate = Number(body.commission_rate ?? body.commissionRate ?? 0.45);
    }
    if (body.experience_years !== undefined || body.experienceYears !== undefined) {
      data.experienceYears = Number(body.experience_years ?? body.experienceYears ?? 3);
    }
    if (body.leaves !== undefined) {
      data.leaves = (Array.isArray(body.leaves) ? body.leaves : []) as Prisma.InputJsonValue;
    }
    if (body.service_ids !== undefined || body.serviceIds !== undefined) {
      const ids = body.service_ids ?? body.serviceIds;
      data.serviceIds = Array.isArray(ids) ? ids.map(String) : [];
    }
    if (body.active !== undefined) {
      data.active = Boolean(body.active);
    }

    const updated = await prisma.professional.update({
      where: { id },
      data,
    });

    const targetEmail = (updated.email || existing.email || '').toLowerCase().trim();
    let userRole: string | null = null;

    if (targetEmail) {
      const existingUser = await prisma.user.findUnique({ where: { email: targetEmail } });
      const role = body.role === 'manager' ? 'manager' : 'employee';
      const password = body.password ? String(body.password) : DEFAULT_PASSWORD;
      const passwordHash = await bcrypt.hash(password, 10);

      if (!existingUser) {
        await prisma.user.create({
          data: {
            email: targetEmail,
            fullName: updated.name,
            phone: body.phone ? String(body.phone).trim() : null,
            role,
            provider: { connect: { id: updated.providerId } },
            passwordHash,
            mustChangePassword: true,
          },
        });
        userRole = role;
      } else {
        const updateUserData: Prisma.UserUpdateInput = {
          provider: { connect: { id: updated.providerId } },
          role: existingUser.role === 'master' ? 'master' : role,
          ...(body.password ? { passwordHash } : {}),
        };
        await prisma.user.update({
          where: { id: existingUser.id },
          data: updateUserData,
        });
        userRole = existingUser.role === 'master' ? 'master' : role;
      }

      logAudit({
        entity: 'User',
        entityId: targetEmail,
        action: 'update_staff_login',
        actorId: authUser.id,
        actorEmail: authUser.email,
        actorRole: authUser.role,
        ipAddress: getClientIp(req),
        providerId: updated.providerId,
        justification: `Updated staff login account for ${updated.name} (${userRole})`,
      });
    }

    const beforeObj = serializeProfessional(existing) as unknown as Record<string, unknown>;
    const afterObj = serializeProfessional(updated, {
      has_login: Boolean(userRole),
      login_role: userRole,
    }) as unknown as Record<string, unknown>;

    logAudit({
      entity: 'Professional',
      entityId: updated.id,
      action: 'update',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      changes: computeChanges(beforeObj, afterObj),
      ipAddress: getClientIp(req),
      providerId: updated.providerId,
    });

    broadcastEvent(
      'professional:updated',
      { professional: afterObj },
      { providerId: updated.providerId },
    );
    return res.json(afterObj);
  } catch (err) {
    logger.error({ err }, '[professionals] Update error:');
    return internalError(res, 'updating professional');
  }
}

router.put('/:id', requireAuth, handleUpdateProfessional);
router.patch('/:id', requireAuth, handleUpdateProfessional);

// ── DELETE /api/professionals/:id ──
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const id = String(req.params.id);
    const existing = await prisma.professional.findUnique({ where: { id } });
    if (!existing) return notFound(res, 'Professional');

    if (!(await canManageProvider(authUser, existing.providerId))) {
      return accessDenied(res, 'You do not have permission to remove this professional.');
    }

    await prisma.professional.delete({ where: { id } });

    logAudit({
      entity: 'Professional',
      entityId: id,
      action: 'delete',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId: existing.providerId,
      justification: `Removed professional "${existing.name}"`,
    });

    broadcastEvent(
      'professional:deleted',
      { professionalId: id },
      { providerId: existing.providerId },
    );
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, '[professionals] Delete error:');
    return internalError(res, 'removing professional');
  }
});

// ── POST /api/professionals/:id/reset-password ──
// Resets the practitioner's login password to "Password123" and flags mustChangePassword: true (matches TimeTrack)
router.post('/:id/reset-password', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const id = String(req.params.id);
    const professional = await prisma.professional.findUnique({ where: { id } });
    if (!professional) return notFound(res, 'Professional');

    if (!(await canManageProvider(authUser, professional.providerId))) {
      return accessDenied(res, 'You do not have permission to reset passwords for this business.');
    }

    if (!professional.email) {
      return badRequest(res, 'This professional has no email address. Please add an email address first.');
    }

    const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const email = professional.email.toLowerCase().trim();

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        fullName: professional.name,
        role: 'employee',
        provider: { connect: { id: professional.providerId } },
        passwordHash: defaultHash,
        mustChangePassword: true,
      },
      update: {
        provider: { connect: { id: professional.providerId } },
        passwordHash: defaultHash,
        mustChangePassword: true,
        pwdEpoch: { increment: 1 },
      },
    });

    invalidateLiveRoleCache(user.id);
    disconnectUserClients(user.id);

    logAudit({
      entity: 'User',
      entityId: user.id,
      action: 'admin_reset_password',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      justification: `Reset password for ${professional.name} to default Password123`,
      ipAddress: getClientIp(req),
      providerId: professional.providerId,
    });

    return res.json({
      success: true,
      message: `Password for ${professional.name} has been reset to Password123.`,
    });
  } catch (err) {
    logger.error({ err }, '[professionals] Reset password error:');
    return internalError(res, 'resetting professional password');
  }
});

export default router;
