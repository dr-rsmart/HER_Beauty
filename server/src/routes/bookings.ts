/**
 * Booking Routes (/api/bookings)
 * ------------------------------
 * Atomic appointment booking, provider KPI stats, status transitions,
 * slot release on cancellation, and customer email reminders.
 */

import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import { logger } from '../logger.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeBooking } from '../serializers.js';
import { logAudit, getClientIp, computeChanges } from '../audit.js';
import { broadcastEvent } from '../sse.js';
import { businessNow } from '../timezone.js';
import { recordBookingCreated, recordBookingCancelled } from '../metrics.js';
import { canManageProvider, canMutateBooking } from '../tenantPolicy.js';
import { parsePagination, setPageHeaders } from '../pagination.js';
import {
  badRequest,
  notFound,
  accessDenied,
  conflictError,
  internalError,
} from '../errorResponse.js';

const router = Router();

// ── GET /api/bookings/stats ──
// Provider Overview KPIs: todayCount, upcomingCount, pendingCount, revenue, todaySchedule
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const providerId = String(req.query.provider_id || req.query.providerId || authUser.providerId || '');
    if (!providerId) {
      return badRequest(res, 'Provider ID is required.');
    }

    if (!(await canManageProvider(authUser, providerId))) {
      return accessDenied(res, 'You do not have permission to view statistics for this business.');
    }

    const { dateStr: today } = businessNow();

    const [todayCount, upcomingCount, pendingCount, completedAgg, todayBookings] =
      await Promise.all([
        prisma.booking.count({
          where: {
            providerId,
            date: today,
            status: { in: ['pending', 'confirmed'] },
          },
        }),
        prisma.booking.count({
          where: {
            providerId,
            date: { gte: today },
            status: { in: ['pending', 'confirmed'] },
          },
        }),
        prisma.booking.count({
          where: {
            providerId,
            status: 'pending',
          },
        }),
        prisma.booking.aggregate({
          where: {
            providerId,
            status: 'completed',
          },
          _sum: {
            price: true,
          },
        }),
        prisma.booking.findMany({
          where: {
            providerId,
            date: today,
            status: { not: 'cancelled' },
          },
          orderBy: { startTime: 'asc' },
          take: 50,
        }),
      ]);

    const revenue = completedAgg._sum.price ? Number(completedAgg._sum.price) : 0;

    return res.json({
      todayCount,
      upcomingCount,
      pendingCount,
      revenue,
      todaySchedule: todayBookings.map(serializeBooking),
    });
  } catch (err) {
    logger.error({ err }, '[bookings] Stats error:');
    return internalError(res, 'loading booking statistics');
  }
});

// ── GET /api/bookings ──
router.get('/', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const providerId = (req.query.provider_id || req.query.providerId) as string | undefined;
    const customerId = (req.query.customer_id || req.query.customerId) as string | undefined;
    const status = req.query.status as string | undefined;
    const tab = req.query.tab as string | undefined;
    const date = req.query.date as string | undefined;
    const dateGte = req.query.date_gte as string | undefined;
    const meta = parsePagination(req, { defaultLimit: 100, maxLimit: 500 });

    const { dateStr: today } = businessNow();
    const where: Prisma.BookingWhereInput = {};

    if (providerId) {
      if (!(await canManageProvider(authUser, providerId))) {
        return accessDenied(res, 'You do not have permission to view bookings for this business.');
      }
      where.providerId = providerId;
    } else if (customerId) {
      where.OR = [
        { customerId: authUser.role === 'master' ? customerId : authUser.id },
        { customerEmail: { equals: authUser.email, mode: 'insensitive' } },
      ];
    } else if (authUser.role === 'customer') {
      where.OR = [
        { customerId: authUser.id },
        { customerEmail: { equals: authUser.email, mode: 'insensitive' } },
      ];
    } else if (authUser.providerId) {
      where.providerId = authUser.providerId;
    }

    if (tab === 'upcoming') {
      where.date = { gte: today };
      where.status = { in: ['pending', 'confirmed'] };
    } else if (tab && tab !== 'all') {
      if (['pending', 'confirmed', 'completed', 'cancelled'].includes(tab)) {
        where.status = tab as any;
      }
    } else if (status) {
      if (['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        where.status = status as any;
      }
    }

    if (date) where.date = date;
    else if (dateGte) where.date = { gte: dateGte };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: meta.limit,
        skip: meta.offset,
      }),
      prisma.booking.count({ where }),
    ]);

    setPageHeaders(res, total, meta);
    return res.json({
      items: bookings.map(serializeBooking),
      total,
      limit: meta.limit,
      offset: meta.offset,
    });
  } catch (err) {
    logger.error({ err }, '[bookings] List error:');
    return internalError(res, 'listing bookings');
  }
});

// ── POST /api/bookings ──
// Atomic reservation: verifies slot is open, creates Booking, marks Slot booked.
router.post('/', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const body = req.body || {};

    const providerId = String(body.provider_id || body.providerId || '').trim();
    const slotId = body.slot_id || body.slotId || null;
    const serviceId = body.service_id || body.serviceId || null;
    const professionalId = body.professional_id || body.professionalId || null;
    const date = String(body.date || '').trim();
    const startTime = String(body.start_time || body.startTime || '').trim();
    const endTime = String(body.end_time || body.endTime || '').trim();

    if (!providerId || !date || !startTime || !endTime) {
      return badRequest(res, 'Provider, date, start time, and end time are required.');
    }

    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider || !provider.isActive) {
      return notFound(res, 'Business');
    }

    const isManager = await canManageProvider(authUser, providerId);
    // Non-managers cannot spoof customer ID, email, or name
    const effectiveCustomerId =
      isManager && (body.customer_id || body.customerId)
        ? String(body.customer_id || body.customerId)
        : authUser.id;
    const effectiveCustomerEmail =
      isManager && (body.customer_email || body.customerEmail)
        ? String(body.customer_email || body.customerEmail).toLowerCase().trim()
        : authUser.email.toLowerCase().trim();
    const effectiveCustomerName =
      isManager && (body.customer_name || body.customerName)
        ? String(body.customer_name || body.customerName).trim()
        : String(authUser.fullName || authUser.email).trim();

    const rawPrice = body.price;
    const price =
      rawPrice === null || rawPrice === undefined || rawPrice === ''
        ? null
        : new Prisma.Decimal(Number(rawPrice));

    const created = await prisma.$transaction(async (tx) => {
      if (slotId) {
        // Atomic check-and-set update: ensures only ONE concurrent transaction claims the slot
        const claimed = await tx.slot.updateMany({
          where: {
            id: String(slotId),
            status: 'open',
          },
          data: {
            status: 'booked',
          },
        });

        if (claimed.count === 0) {
          const slotExists = await tx.slot.findUnique({ where: { id: String(slotId) } });
          if (!slotExists) {
            throw Object.assign(new Error('Selected time slot no longer exists.'), {
              status: 404,
              code: 'NOT_FOUND',
            });
          }
          throw Object.assign(
            new Error('This time slot has just been taken. Please pick another slot.'),
            { status: 409, code: 'CONFLICT' },
          );
        }
      }

      const rawDeposit = body.deposit_amount ?? body.depositAmount;
      const depositAmount =
        rawDeposit != null && rawDeposit !== ''
          ? new Prisma.Decimal(Number(rawDeposit))
          : price != null
            ? new Prisma.Decimal(Math.round(Number(price) * 0.2 * 100) / 100)
            : null;
      const referenceCode =
        String(body.reference_code || body.referenceCode || '').trim() ||
        `HER-${Math.floor(10000 + Math.random() * 90000)}`;
      const promoCode = String(body.promo_code || body.promoCode || '').trim().toUpperCase();
      const discountPercent = Number(body.discount_percent ?? body.discountPercent ?? 0) || 0;
      const popiaConsent = body.popia_consent !== false && body.popiaConsent !== false;

      const booking = await tx.booking.create({
        data: {
          referenceCode,
          providerId,
          providerName: String(body.provider_name || body.providerName || provider.name),
          serviceId: serviceId ? String(serviceId) : null,
          serviceName: String(body.service_name || body.serviceName || 'Appointment'),
          professionalId: professionalId ? String(professionalId) : null,
          professionalName:
            body.professional_name || body.professionalName
              ? String(body.professional_name || body.professionalName)
              : null,
          slotId: slotId ? String(slotId) : null,
          customerId: effectiveCustomerId,
          customerName: effectiveCustomerName,
          customerEmail: effectiveCustomerEmail,
          customerPhone: String(body.customer_phone || body.customerPhone || ''),
          date,
          startTime,
          endTime,
          price,
          depositAmount,
          promoCode,
          discountPercent,
          popiaConsent,
          notes: String(body.notes || ''),
          status:
            body.status && ['pending', 'confirmed', 'completed', 'cancelled'].includes(body.status)
              ? body.status
              : 'confirmed',
        },
      });

      if (popiaConsent) {
        await tx.consentRecord.create({
          data: {
            providerId,
            customerId: effectiveCustomerId,
            customerEmail: effectiveCustomerEmail,
            customerName: effectiveCustomerName,
            type: 'special_info',
            granted: true,
            version: '1.2',
          },
        });
      }

      if (slotId) {
        await tx.slot.update({
          where: { id: String(slotId) },
          data: {
            bookingId: booking.id,
          },
        });
      }

      return booking;
    });

    recordBookingCreated();

    logAudit({
      entity: 'Booking',
      entityId: created.id,
      action: 'create',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId: created.providerId,
      justification: `Booked "${created.serviceName}" on ${created.date} at ${created.startTime}`,
    });

    const serialized = serializeBooking(created);
    broadcastEvent(
      'booking:created',
      { booking: serialized },
      { providerId: created.providerId, customerId: created.customerId },
    );

    if (created.slotId) {
      broadcastEvent(
        'slot:updated',
        {
          slot: {
            id: created.slotId,
            provider_id: created.providerId,
            status: 'booked',
            booking_id: created.id,
            date: created.date,
            start_time: created.startTime,
            end_time: created.endTime,
          },
        },
        { providerId: created.providerId, public: true },
      );
    }

    return res.status(201).json(serialized);
  } catch (err: any) {
    if (err?.status === 409) {
      return conflictError(res, err.message);
    }
    if (err?.status === 404) {
      return notFound(res, 'Time slot');
    }
    logger.error({ err }, '[bookings] Create error:');
    return internalError(res, 'creating booking');
  }
});

// ── PUT & PATCH /api/bookings/:id ──
async function handleUpdateBooking(req: Request, res: Response) {
  try {
    const authUser = req.authUser!;
    const id = String(req.params.id);
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return notFound(res, 'Booking');

    const body = req.body || {};
    const newStatus = body.status as
      | 'pending'
      | 'confirmed'
      | 'completed'
      | 'cancelled'
      | undefined;

    const permission = await canMutateBooking(authUser, existing, newStatus);
    if (!permission.allowed) {
      return accessDenied(res, permission.reason || 'Access denied.');
    }

    const isManager = await canManageProvider(authUser, existing.providerId);

    const updated = await prisma.$transaction(async (tx) => {
      const data: Prisma.BookingUpdateInput = {};
      if (newStatus && ['pending', 'confirmed', 'completed', 'cancelled'].includes(newStatus)) {
        data.status = newStatus;
      }
      if (isManager) {
        if (body.reminder_sent_at !== undefined || body.reminderSentAt !== undefined) {
          const val = body.reminder_sent_at ?? body.reminderSentAt;
          data.reminderSentAt = val ? new Date(val) : null;
        }
        if (body.notes !== undefined) {
          data.notes = String(body.notes);
        }
      }

      const b = await tx.booking.update({
        where: { id },
        data,
      });

      // Automatically release the linked slot if the booking is cancelled
      if (newStatus === 'cancelled' && existing.slotId) {
        await tx.slot.updateMany({
          where: { id: existing.slotId },
          data: {
            status: 'open',
            bookingId: null,
          },
        });
      }

      return b;
    });

    if (newStatus === 'cancelled') {
      recordBookingCancelled();
    }

    const beforeObj = serializeBooking(existing) as unknown as Record<string, unknown>;
    const afterObj = serializeBooking(updated) as unknown as Record<string, unknown>;

    logAudit({
      entity: 'Booking',
      entityId: updated.id,
      action: newStatus ? `status_${newStatus}` : 'update',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      changes: computeChanges(beforeObj, afterObj),
      ipAddress: getClientIp(req),
      providerId: updated.providerId,
    });

    broadcastEvent(
      'booking:updated',
      { booking: afterObj },
      { providerId: updated.providerId, customerId: updated.customerId },
    );

    if (newStatus === 'cancelled' && existing.slotId) {
      broadcastEvent(
        'slot:updated',
        {
          slot: {
            id: existing.slotId,
            provider_id: existing.providerId,
            status: 'open',
            booking_id: null,
            date: existing.date,
            start_time: existing.startTime,
            end_time: existing.endTime,
          },
        },
        { providerId: existing.providerId, public: true },
      );
    }

    return res.json(afterObj);
  } catch (err) {
    logger.error({ err }, '[bookings] Update error:');
    return internalError(res, 'updating booking');
  }
}

router.put('/:id', requireAuth, handleUpdateBooking);
router.patch('/:id', requireAuth, handleUpdateBooking);

// ── POST /api/bookings/:id/remind ──
router.post('/:id/remind', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const id = String(req.params.id);
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return notFound(res, 'Booking');

    if (!(await canManageProvider(authUser, existing.providerId))) {
      return accessDenied(res, 'You do not have permission to send reminders for this booking.');
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { reminderSentAt: new Date() },
    });

    logAudit({
      entity: 'Booking',
      entityId: updated.id,
      action: 'send_reminder',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId: updated.providerId,
      justification: `Sent appointment reminder to ${updated.customerEmail}`,
    });

    const serialized = serializeBooking(updated);
    broadcastEvent(
      'booking:updated',
      { booking: serialized },
      { providerId: updated.providerId, customerId: updated.customerId },
    );

    return res.json(serialized);
  } catch (err) {
    logger.error({ err }, '[bookings] Remind error:');
    return internalError(res, 'sending appointment reminder');
  }
});

export default router;
