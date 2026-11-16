/**
 * Service Routes (/api/services)
 * ------------------------------
 * Manage bookable services and ZAR rates for a provider.
 */

import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import { logger } from '../logger.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { serializeService } from '../serializers.js';
import { logAudit, getClientIp, computeChanges } from '../audit.js';
import { broadcastEvent } from '../sse.js';
import { canManageProvider } from '../tenantPolicy.js';
import { parsePagination, setPageHeaders } from '../pagination.js';
import { badRequest, notFound, accessDenied, internalError } from '../errorResponse.js';

const router = Router();

// ── GET /api/services ──
router.get('/', optionalAuth, async (req, res) => {
  try {
    const providerId = (req.query.provider_id || req.query.providerId) as string | undefined;
    const activeParam = req.query.active as string | undefined;
    const meta = parsePagination(req, { defaultLimit: 100, maxLimit: 300 });

    const where: Prisma.ServiceWhereInput = {};
    if (providerId) where.providerId = providerId;
    if (activeParam === 'true') where.active = true;
    else if (activeParam === 'false') where.active = false;

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: { name: 'asc' },
        take: meta.limit,
        skip: meta.offset,
      }),
      prisma.service.count({ where }),
    ]);

    setPageHeaders(res, total, meta);
    return res.json({
      items: services.map(serializeService),
      total,
      limit: meta.limit,
      offset: meta.offset,
    });
  } catch (err) {
    logger.error({ err }, '[services] List error:');
    return internalError(res, 'listing services');
  }
});

// ── POST /api/services ──
router.post('/', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const body = req.body || {};
    const providerId = String(body.provider_id || body.providerId || authUser.providerId || '').trim();
    const name = String(body.name || '').trim();

    if (!providerId || !name) {
      return badRequest(res, 'Provider ID and service name are required.');
    }

    if (!(await canManageProvider(authUser, providerId))) {
      return accessDenied(res, 'You do not have permission to add services for this business.');
    }

    const rawPrice = body.price;
    const price =
      rawPrice === null || rawPrice === undefined || rawPrice === ''
        ? null
        : new Prisma.Decimal(Number(rawPrice));

    const created = await prisma.service.create({
      data: {
        providerId,
        name,
        categoryName: String(body.category_name ?? body.categoryName ?? 'Natural Hair & Treatments'),
        stream: String(body.stream || 'salon'),
        description: String(body.description || ''),
        durationMinutes: Math.max(5, Number(body.duration_minutes ?? body.durationMinutes ?? 30) || 30),
        price,
        priceNote: String(body.price_note ?? body.priceNote ?? ''),
        imageUrl: String(body.image_url ?? body.imageUrl ?? ''),
        popular: Boolean(body.popular),
        professionalIds: Array.isArray(body.professional_ids)
          ? body.professional_ids.map(String)
          : Array.isArray(body.professionalIds)
            ? body.professionalIds.map(String)
            : [],
        active: body.active !== false,
      },
    });

    const serialized = serializeService(created);

    logAudit({
      entity: 'Service',
      entityId: created.id,
      action: 'create',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId,
      justification: `Created service "${created.name}"`,
    });

    broadcastEvent('service:created', { service: serialized }, { providerId });
    return res.status(201).json(serialized);
  } catch (err) {
    logger.error({ err }, '[services] Create error:');
    return internalError(res, 'creating service');
  }
});

// ── PUT & PATCH /api/services/:id ──
async function handleUpdateService(req: Request, res: Response) {
  try {
    const authUser = req.authUser!;
    const id = String(req.params.id);
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) return notFound(res, 'Service');

    if (!(await canManageProvider(authUser, existing.providerId))) {
      return accessDenied(res, 'You do not have permission to update this service.');
    }

    const body = req.body || {};
    const data: Prisma.ServiceUpdateInput = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.category_name !== undefined || body.categoryName !== undefined) {
      data.categoryName = String(body.category_name ?? body.categoryName ?? 'Natural Hair & Treatments');
    }
    if (body.stream !== undefined) data.stream = String(body.stream);
    if (body.description !== undefined) data.description = String(body.description);
    if (body.image_url !== undefined || body.imageUrl !== undefined) {
      data.imageUrl = String(body.image_url ?? body.imageUrl ?? '');
    }
    if (body.popular !== undefined) data.popular = Boolean(body.popular);
    if (body.duration_minutes !== undefined || body.durationMinutes !== undefined) {
      data.durationMinutes = Math.max(
        5,
        Number(body.duration_minutes ?? body.durationMinutes ?? 30) || 30,
      );
    }
    if (body.price !== undefined) {
      data.price =
        body.price === null || body.price === ''
          ? null
          : new Prisma.Decimal(Number(body.price));
    }
    if (body.price_note !== undefined || body.priceNote !== undefined) {
      data.priceNote = String(body.price_note ?? body.priceNote ?? '');
    }
    if (body.professional_ids !== undefined || body.professionalIds !== undefined) {
      const ids = body.professional_ids ?? body.professionalIds;
      data.professionalIds = Array.isArray(ids) ? ids.map(String) : [];
    }
    if (body.active !== undefined) {
      data.active = Boolean(body.active);
    }

    const updated = await prisma.service.update({
      where: { id },
      data,
    });

    const beforeObj = serializeService(existing) as unknown as Record<string, unknown>;
    const afterObj = serializeService(updated) as unknown as Record<string, unknown>;

    logAudit({
      entity: 'Service',
      entityId: updated.id,
      action: 'update',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      changes: computeChanges(beforeObj, afterObj),
      ipAddress: getClientIp(req),
      providerId: updated.providerId,
    });

    broadcastEvent('service:updated', { service: afterObj }, { providerId: updated.providerId });
    return res.json(afterObj);
  } catch (err) {
    logger.error({ err }, '[services] Update error:');
    return internalError(res, 'updating service');
  }
}

router.put('/:id', requireAuth, handleUpdateService);
router.patch('/:id', requireAuth, handleUpdateService);

// ── DELETE /api/services/:id ──
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const id = String(req.params.id);
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) return notFound(res, 'Service');

    if (!(await canManageProvider(authUser, existing.providerId))) {
      return accessDenied(res, 'You do not have permission to delete this service.');
    }

    await prisma.service.delete({ where: { id } });

    logAudit({
      entity: 'Service',
      entityId: id,
      action: 'delete',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId: existing.providerId,
      justification: `Deleted service "${existing.name}"`,
    });

    broadcastEvent('service:deleted', { serviceId: id }, { providerId: existing.providerId });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, '[services] Delete error:');
    return internalError(res, 'deleting service');
  }
});

export default router;
