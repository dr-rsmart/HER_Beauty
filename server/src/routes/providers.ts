/**
 * Provider Routes (/api/providers)
 * --------------------------------
 * Public directory search, single provider lookup, and authenticated
 * business profile creation & management.
 */

import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import { logger } from '../logger.js';
import { requireAuth, optionalAuth, invalidateLiveRoleCache } from '../middleware/auth.js';
import { serializeProvider, DEFAULT_WORKING_HOURS } from '../serializers.js';
import { logAudit, getClientIp, computeChanges } from '../audit.js';
import { broadcastEvent } from '../sse.js';
import { parsePagination, setPageHeaders } from '../pagination.js';
import {
  badRequest,
  notFound,
  accessDenied,
  internalError,
} from '../errorResponse.js';

const router = Router();

// ── GET /api/providers ──
// Supports: ?status=published&category=Salon&search=Sandton&owner_email=...&limit=60
router.get('/', optionalAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const search = ((req.query.search || req.query.q || '') as string).trim();
    const ownerEmail = (req.query.owner_email as string | undefined)?.toLowerCase().trim();
    const meta = parsePagination(req, { defaultLimit: 60, maxLimit: 200 });

    const where: Prisma.ProviderWhereInput = {
      isActive: true,
    };

    if (status === 'published' || status === 'draft') {
      where.status = status;
    } else if (!ownerEmail) {
      where.status = 'published';
    }

    if (category) {
      where.category = category;
    }

    if (ownerEmail) {
      where.ownerEmail = { equals: ownerEmail, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { tagline: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        {
          services: {
            some: {
              name: { contains: search, mode: 'insensitive' },
              active: true,
            },
          },
        },
      ];
    }

    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: meta.limit,
        skip: meta.offset,
      }),
      prisma.provider.count({ where }),
    ]);

    setPageHeaders(res, total, meta);
    return res.json({
      items: providers.map(serializeProvider),
      total,
      limit: meta.limit,
      offset: meta.offset,
    });
  } catch (err) {
    logger.error({ err }, '[providers] List error:');
    return internalError(res, 'listing businesses');
  }
});

// ── GET /api/providers/mine ──
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    let provider = null;

    if (authUser.providerId) {
      provider = await prisma.provider.findUnique({ where: { id: authUser.providerId } });
    }
    if (!provider) {
      provider = await prisma.provider.findFirst({
        where: {
          OR: [
            { ownerUserId: authUser.id },
            { ownerEmail: { equals: authUser.email, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    return res.json({
      provider: provider ? serializeProvider(provider) : null,
    });
  } catch (err) {
    logger.error({ err }, '[providers] /mine error:');
    return internalError(res, 'fetching your business profile');
  }
});

// ── GET /api/providers/:id ──
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const provider = await prisma.provider.findUnique({
      where: { id },
    });
    if (!provider || !provider.isActive) {
      return notFound(res, 'Business');
    }
    return res.json(serializeProvider(provider));
  } catch (err) {
    logger.error({ err }, '[providers] Get error:');
    return internalError(res, 'fetching business');
  }
});

// ── POST /api/providers ──
router.post('/', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) {
      return badRequest(res, 'Business name is required.');
    }

    const workingHours = Array.isArray(body.working_hours)
      ? body.working_hours
      : Array.isArray(body.workingHours)
        ? body.workingHours
        : DEFAULT_WORKING_HOURS;

    const created = await prisma.$transaction(async (tx) => {
      const p = await tx.provider.create({
        data: {
          name,
          category: String(body.category || 'Salon'),
          tagline: String(body.tagline || ''),
          about: String(body.about || ''),
          phone: String(body.phone || ''),
          email: String(body.email || authUser.email),
          website: String(body.website || ''),
          street: String(body.street || ''),
          city: String(body.city || ''),
          postcode: String(body.postcode || ''),
          country: String(body.country || 'South Africa'),
          coverImage: String(body.cover_image ?? body.coverImage ?? ''),
          workingHours: workingHours as unknown as Prisma.InputJsonValue,
          ownerEmail: String(body.owner_email || authUser.email).toLowerCase(),
          ownerUserId: authUser.id,
          status: body.status === 'draft' ? 'draft' : 'published',
          isActive: true,
        },
      });

      // Link user to this provider and promote customer -> admin if needed
      const currentUser = await tx.user.findUnique({ where: { id: authUser.id } });
      if (currentUser) {
        await tx.user.update({
          where: { id: authUser.id },
          data: {
            providerId: currentUser.providerId || p.id,
            role: currentUser.role === 'customer' ? 'admin' : currentUser.role,
          },
        });
      }

      return p;
    });

    invalidateLiveRoleCache(authUser.id);

    logAudit({
      entity: 'Provider',
      entityId: created.id,
      action: 'create',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId: created.id,
      justification: `Created business profile "${created.name}"`,
    });

    const serialized = serializeProvider(created);
    broadcastEvent('provider:created', { provider: serialized });
    return res.status(201).json(serialized);
  } catch (err) {
    logger.error({ err }, '[providers] Create error:');
    return internalError(res, 'creating business profile');
  }
});

// ── PUT & PATCH /api/providers/:id ──
async function handleUpdateProvider(req: Request, res: Response) {
  try {
    const authUser = req.authUser!;
    const id = String(req.params.id);
    const existing = await prisma.provider.findUnique({ where: { id } });
    if (!existing) return notFound(res, 'Business');

    const isOwner =
      authUser.role === 'master' ||
      existing.ownerUserId === authUser.id ||
      existing.ownerEmail.toLowerCase() === authUser.email.toLowerCase() ||
      authUser.providerId === existing.id;

    if (!isOwner) {
      return accessDenied(res, 'You do not have permission to update this business.');
    }

    const body = req.body || {};
    const data: Prisma.ProviderUpdateInput = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.category !== undefined) data.category = String(body.category);
    if (body.tagline !== undefined) data.tagline = String(body.tagline);
    if (body.about !== undefined) data.about = String(body.about);
    if (body.phone !== undefined) data.phone = String(body.phone);
    if (body.email !== undefined) data.email = String(body.email);
    if (body.website !== undefined) data.website = String(body.website);
    if (body.street !== undefined) data.street = String(body.street);
    if (body.city !== undefined) data.city = String(body.city);
    if (body.postcode !== undefined) data.postcode = String(body.postcode);
    if (body.country !== undefined) data.country = String(body.country);
    if (body.cover_image !== undefined) data.coverImage = String(body.cover_image);
    if (body.coverImage !== undefined) data.coverImage = String(body.coverImage);
    if (body.working_hours !== undefined) {
      data.workingHours = body.working_hours as Prisma.InputJsonValue;
    } else if (body.workingHours !== undefined) {
      data.workingHours = body.workingHours as Prisma.InputJsonValue;
    }
    if (body.status === 'published' || body.status === 'draft') {
      data.status = body.status;
    }

    const updated = await prisma.provider.update({
      where: { id },
      data,
    });

    const beforeObj = serializeProvider(existing) as unknown as Record<string, unknown>;
    const afterObj = serializeProvider(updated) as unknown as Record<string, unknown>;

    logAudit({
      entity: 'Provider',
      entityId: updated.id,
      action: 'update',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      changes: computeChanges(beforeObj, afterObj),
      ipAddress: getClientIp(req),
      providerId: updated.id,
    });

    const serialized = serializeProvider(updated);
    broadcastEvent('provider:updated', { provider: serialized }, { providerId: updated.id });
    return res.json(serialized);
  } catch (err) {
    logger.error({ err }, '[providers] Update error:');
    return internalError(res, 'updating business profile');
  }
}

router.put('/:id', requireAuth, handleUpdateProvider);
router.patch('/:id', requireAuth, handleUpdateProvider);

export default router;
