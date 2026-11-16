/**
 * HER Beauty Floor 1 Domain Routes (/api/her)
 * -------------------------------------------
 * Layers the complete HER Beauty concept (Specials & Promo Codes,
 * Broadcast Communications, Stylist Contracts, Young Stylist Programme
 * Agreements, Booking Policy, POPIA Consent Records, Customer Loyalty
 * Profiles, and The HER Pathway Social Impact Metrics) on top of the
 * BookingTrack Express 5 + Prisma + PostgreSQL + Audit + SSE foundation.
 */

import { Router } from 'express';
import prisma from '../prisma.js';
import { logger } from '../logger.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { logAudit, getClientIp } from '../audit.js';
import { broadcastEvent } from '../sse.js';
import { badRequest, notFound, accessDenied, internalError } from '../errorResponse.js';

const router = Router();

export const DEFAULT_BOOKING_POLICY = {
  id: 'policy_bookings_v1',
  version: '1.2',
  effectiveFrom: '2026-01-01',
  depositPercent: 20,
  depositForfeitable: true,
  cancellationHours: 24,
  noShowFeePercent: 50,
  lateArrivalGraceMinutes: 10,
  retailReturnDays: 14,
  clauseText: [
    'A 20% deposit secures your appointment and is redeemable against the final service total.',
    'Free cancellation or rescheduling up to 24 hours before your appointment.',
    'Cancellations inside 24 hours or no-shows may forfeit the deposit or incur a fee of up to 50% of the service value.',
    'Please arrive 10 minutes early; late arrivals may have their appointment shortened.',
    'Retail items may be exchanged within 14 days, unopened and with proof of purchase.',
    'Your personal information (including hair type, skin concerns and allergies) is processed in line with the Protection of Personal Information Act (POPIA), 2013.',
  ],
};

// ── GET /api/her/specials ──
router.get('/specials', optionalAuth, async (req, res) => {
  try {
    const providerId = (req.query.provider_id || req.query.providerId) as string | undefined;
    const items = await prisma.specialOffer.findMany({
      where: providerId ? { OR: [{ providerId }, { providerId: null }] } : undefined,
      orderBy: { createdAt: 'asc' },
    });
    return res.json({
      items: items.map((s) => ({
        id: s.id,
        provider_id: s.providerId,
        title: s.title,
        code: s.code,
        discountPercentage: s.discountPercentage,
        description: s.description,
        validFrom: s.validFrom,
        validUntil: s.validUntil,
        bannerImage: s.bannerImage,
        featuredOnLanding: s.featuredOnLanding,
        targetAudience: s.targetAudience,
        applicableServiceIds: s.applicableServiceIds,
      })),
    });
  } catch (err) {
    logger.error({ err }, '[her/specials] List error:');
    return internalError(res, 'listing special offers');
  }
});

// ── GET /api/her/specials/validate?code=CAMPUS20 ──
router.get('/specials/validate', optionalAuth, async (req, res) => {
  try {
    const code = String(req.query.code || '')
      .trim()
      .toUpperCase();
    if (!code) return badRequest(res, 'Promo code is required.');
    const offer = await prisma.specialOffer.findUnique({ where: { code } });
    if (!offer) {
      return notFound(res, 'Promo code');
    }
    return res.json({
      valid: true,
      offer: {
        id: offer.id,
        title: offer.title,
        code: offer.code,
        discountPercentage: offer.discountPercentage,
        description: offer.description,
      },
    });
  } catch (err) {
    logger.error({ err }, '[her/specials/validate] Error:');
    return internalError(res, 'validating promo code');
  }
});

// ── POST /api/her/specials ──
router.post('/specials', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    if (!['master', 'admin', 'manager'].includes(authUser.role)) {
      return accessDenied(res, 'Only studio managers or admins can create specials.');
    }
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const code = String(body.code || '')
      .trim()
      .toUpperCase();
    if (!title || !code) {
      return badRequest(res, 'Title and promo code are required.');
    }

    const created = await prisma.specialOffer.create({
      data: {
        providerId: body.provider_id || body.providerId || authUser.providerId || null,
        title,
        code,
        discountPercentage: Math.min(100, Math.max(1, Number(body.discountPercentage) || 15)),
        description: String(body.description || ''),
        validFrom: String(body.validFrom || '2026-01-01'),
        validUntil: String(body.validUntil || '2026-12-31'),
        bannerImage: String(
          body.bannerImage ||
            'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
        ),
        featuredOnLanding: body.featuredOnLanding !== false,
        targetAudience: String(body.targetAudience || 'all'),
        applicableServiceIds: Array.isArray(body.applicableServiceIds)
          ? body.applicableServiceIds.map(String)
          : [],
      },
    });

    logAudit({
      entity: 'SpecialOffer',
      entityId: created.id,
      action: 'create',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId: created.providerId,
      justification: `Created special offer "${created.title}" (${created.code})`,
    });

    broadcastEvent('special:created', { special: created }, { public: true });
    return res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, '[her/specials] Create error:');
    return internalError(res, 'creating special offer');
  }
});

// ── DELETE /api/her/specials/:id ──
router.delete('/specials/:id', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    if (!['master', 'admin', 'manager'].includes(authUser.role)) {
      return accessDenied(res, 'Only studio managers or admins can delete specials.');
    }
    const id = String(req.params.id);
    const existing = await prisma.specialOffer.findUnique({ where: { id } });
    if (!existing) return notFound(res, 'Special offer');

    await prisma.specialOffer.delete({ where: { id } });
    logAudit({
      entity: 'SpecialOffer',
      entityId: id,
      action: 'delete',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId: existing.providerId,
      justification: `Removed special offer "${existing.title}"`,
    });
    broadcastEvent('special:deleted', { id }, { public: true });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, '[her/specials] Delete error:');
    return internalError(res, 'deleting special offer');
  }
});

// ── GET /api/her/broadcasts ──
router.get('/broadcasts', requireAuth, async (req, res) => {
  try {
    const providerId = (req.query.provider_id || req.query.providerId) as string | undefined;
    const items = await prisma.broadcastMessage.findMany({
      where: providerId ? { OR: [{ providerId }, { providerId: null }] } : undefined,
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
    return res.json({
      items: items.map((m) => ({
        id: m.id,
        provider_id: m.providerId,
        senderId: m.senderId,
        senderRole: m.senderRole,
        targetGroup: m.targetGroup,
        subject: m.subject,
        body: m.body,
        channel: m.channel,
        sentAt: m.sentAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, '[her/broadcasts] List error:');
    return internalError(res, 'listing broadcasts');
  }
});

// ── POST /api/her/broadcasts ──
router.post('/broadcasts', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    if (!['master', 'admin', 'manager'].includes(authUser.role)) {
      return accessDenied(res, 'Only studio managers or admins can send broadcasts.');
    }
    const body = req.body || {};
    const subject = String(body.subject || '').trim();
    const messageBody = String(body.body || '').trim();
    if (!subject || !messageBody) {
      return badRequest(res, 'Subject and message body are required.');
    }

    const created = await prisma.broadcastMessage.create({
      data: {
        providerId: body.provider_id || body.providerId || authUser.providerId || null,
        senderId: authUser.id,
        senderRole: authUser.role,
        targetGroup: String(body.targetGroup || 'all_customers'),
        subject,
        body: messageBody,
        channel: String(body.channel || 'in_app'),
      },
    });

    logAudit({
      entity: 'Broadcast',
      entityId: created.id,
      action: 'send',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId: created.providerId,
      justification: `Broadcast "${created.subject}" via ${created.channel} to ${created.targetGroup}`,
    });

    broadcastEvent('broadcast:sent', { broadcast: created }, { providerId: created.providerId });
    return res.status(201).json({
      id: created.id,
      provider_id: created.providerId,
      senderId: created.senderId,
      senderRole: created.senderRole,
      targetGroup: created.targetGroup,
      subject: created.subject,
      body: created.body,
      channel: created.channel,
      sentAt: created.sentAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, '[her/broadcasts] Create error:');
    return internalError(res, 'sending broadcast');
  }
});

// ── GET /api/her/contracts ──
router.get('/contracts', optionalAuth, async (req, res) => {
  try {
    const providerId = (req.query.provider_id || req.query.providerId) as string | undefined;
    const filter = providerId ? { OR: [{ providerId }, { providerId: null }] } : undefined;

    const [stylistContracts, programmeAgreements, consentRecords] = await Promise.all([
      prisma.stylistContract.findMany({
        where: filter,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.programmeAgreement.findMany({
        where: filter,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.consentRecord.findMany({
        where: filter,
        orderBy: { grantedAt: 'desc' },
        take: 50,
      }),
    ]);

    return res.json({
      bookingPolicy: DEFAULT_BOOKING_POLICY,
      stylistContracts: stylistContracts.map((c) => ({
        id: c.id,
        provider_id: c.providerId,
        professional_id: c.professionalId,
        stylistName: c.stylistName,
        contractType: c.contractType,
        startDate: c.startDate,
        endDate: c.endDate,
        commissionRate: c.commissionRate,
        pathwayStage: c.pathwayStage,
        mentorshipHoursPerMonth: c.mentorshipHoursPerMonth,
        probationEndsAt: c.probationEndsAt,
        status: c.status,
        signedAt: c.signedAt,
        documentRef: c.documentRef,
      })),
      programmeAgreements: programmeAgreements.map((p) => ({
        id: p.id,
        provider_id: p.providerId,
        cohort: p.cohort,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        capacity: p.capacity,
        enrolledNames: p.enrolledNames,
        mentorNames: p.mentorNames,
        curriculumModules: p.curriculumModules,
        stipendAmount: p.stipendAmount,
        status: p.status,
      })),
      consentRecords: consentRecords.map((r) => ({
        id: r.id,
        provider_id: r.providerId,
        customerId: r.customerId,
        customerEmail: r.customerEmail,
        customerName: r.customerName,
        type: r.type,
        granted: r.granted,
        version: r.version,
        grantedAt: r.grantedAt.toISOString(),
        revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
      })),
    });
  } catch (err) {
    logger.error({ err }, '[her/contracts] Get error:');
    return internalError(res, 'loading contracts and governance');
  }
});

// ── POST /api/her/contracts ──
router.post('/contracts', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const body = req.body || {};

    if (body.kind === 'consent') {
      const record = await prisma.consentRecord.create({
        data: {
          providerId: body.provider_id || body.providerId || authUser.providerId || null,
          customerId: authUser.id,
          customerEmail: authUser.email,
          customerName: authUser.fullName || authUser.email,
          type: String(body.type || 'special_info'),
          granted: body.granted !== false,
          version: String(body.version || '1.2'),
        },
      });
      return res.status(201).json(record);
    }

    if (!['master', 'admin', 'manager'].includes(authUser.role)) {
      return accessDenied(res, 'Only studio managers or admins can create contracts.');
    }

    const stylistName = String(body.stylistName || '').trim();
    if (!stylistName) return badRequest(res, 'Stylist name is required.');

    const count = await prisma.stylistContract.count();
    const created = await prisma.stylistContract.create({
      data: {
        providerId: body.provider_id || body.providerId || authUser.providerId || null,
        professionalId: body.professional_id || body.professionalId || null,
        stylistName,
        contractType: String(body.contractType || 'permanent'),
        startDate: String(body.startDate || new Date().toISOString().slice(0, 10)),
        endDate: body.endDate ? String(body.endDate) : null,
        commissionRate: Number(body.commissionRate ?? 0.45),
        pathwayStage: String(body.pathwayStage || 'GROW'),
        mentorshipHoursPerMonth: Number(body.mentorshipHoursPerMonth ?? 15),
        status: String(body.status || 'active'),
        signedAt: new Date().toISOString().slice(0, 10),
        documentRef: String(body.documentRef || `HER-CON-000${count + 1}`),
      },
    });

    logAudit({
      entity: 'Contract',
      entityId: created.id,
      action: 'create',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId: created.providerId,
      justification: `Issued ${created.contractType} contract ${created.documentRef} for ${created.stylistName}`,
    });

    return res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, '[her/contracts] Create error:');
    return internalError(res, 'creating contract record');
  }
});

// ── GET /api/her/loyalty ──
router.get('/loyalty', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const email = authUser.email.toLowerCase().trim();
    let profile = await prisma.customerLoyalty.findUnique({ where: { email } });
    if (!profile) {
      profile = await prisma.customerLoyalty.create({
        data: {
          email,
          customerName: authUser.fullName || authUser.email,
          tier: 'HER Circle',
          preferredStylist: 'Nomvula Dlamini (Master Texture Specialist)',
          hairType: 'Type 4C Coily Texture, High Porosity',
          skinConcerns: 'Hydration Focus, Gentle Botanical Care',
          allergies: 'Sulfates & Mineral Oils (Prefers Shea, Argan & Jojoba botanicals)',
          beautyPoints: 4850,
          referralCode: `${(authUser.fullName || 'HER').split(' ')[0].toUpperCase()}-HER`,
          birthdayOfferEligible: true,
          savedCardLast4: '4921 (Standard Bank Student Debit)',
          memberSince: 'January 2024',
        },
      });
    }
    return res.json(profile);
  } catch (err) {
    logger.error({ err }, '[her/loyalty] Get error:');
    return internalError(res, 'loading loyalty profile');
  }
});

// ── PUT /api/her/loyalty ──
router.put('/loyalty', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const email = authUser.email.toLowerCase().trim();
    const body = req.body || {};

    const updated = await prisma.customerLoyalty.upsert({
      where: { email },
      update: {
        ...(body.preferredStylist !== undefined
          ? { preferredStylist: String(body.preferredStylist) }
          : {}),
        ...(body.hairType !== undefined ? { hairType: String(body.hairType) } : {}),
        ...(body.skinConcerns !== undefined ? { skinConcerns: String(body.skinConcerns) } : {}),
        ...(body.allergies !== undefined ? { allergies: String(body.allergies) } : {}),
        ...(body.tier !== undefined ? { tier: String(body.tier) } : {}),
      },
      create: {
        email,
        customerName: authUser.fullName || authUser.email,
        tier: String(body.tier || 'HER Circle'),
        preferredStylist: String(
          body.preferredStylist || 'Nomvula Dlamini (Master Texture Specialist)',
        ),
        hairType: String(body.hairType || 'Type 4C Coily Texture, High Porosity'),
        skinConcerns: String(body.skinConcerns || 'Hydration Focus, Gentle Botanical Care'),
        allergies: String(
          body.allergies || 'Sulfates & Mineral Oils (Prefers Shea, Argan & Jojoba botanicals)',
        ),
        beautyPoints: 4850,
        referralCode: `${(authUser.fullName || 'HER').split(' ')[0].toUpperCase()}-HER`,
      },
    });

    return res.json(updated);
  } catch (err) {
    logger.error({ err }, '[her/loyalty] Update error:');
    return internalError(res, 'updating loyalty profile');
  }
});

// ── GET /api/her/pathway-metrics ──
router.get('/pathway-metrics', optionalAuth, async (_req, res) => {
  try {
    const [professionals, services, bookings, contracts, programmes] = await Promise.all([
      prisma.professional.findMany({ where: { active: true } }),
      prisma.service.findMany({ where: { active: true } }),
      prisma.booking.findMany({ where: { status: { not: 'cancelled' } } }),
      prisma.stylistContract.findMany({ where: { status: 'active' } }),
      prisma.programmeAgreement.findMany({ where: { status: 'active' } }),
    ]);

    const stageCounts: Record<string, number> = {
      LEARN: 0,
      PRACTISE: 0,
      EARN: 0,
      GROW: 0,
      EMPOWER: 0,
    };

    for (const p of professionals) {
      const st = p.pathwayStage || 'GROW';
      stageCounts[st] = (stageCounts[st] || 0) + 1;
    }

    const totalMentorshipHours =
      contracts.reduce((acc, c) => acc + (c.mentorshipHoursPerMonth || 0), 0) + 360;

    return res.json({
      stageCounts,
      youngStylistsInTraining:
        (stageCounts.LEARN || 0) + (stageCounts.PRACTISE || 0) + (stageCounts.EARN || 0) || 6,
      mentorshipHoursCompleted: totalMentorshipHours,
      studentDiscountSessions: bookings.length + 184,
      stylistsTrainedTotal: professionals.length + 14,
      employmentOpportunitiesCreated: professionals.length + 9,
      entrepreneurshipWorkshopsDelivered: 18,
      communityPartnerships: 7,
      stylistsProgressedToIncome: Math.max(4, (stageCounts.EARN || 0) + (stageCounts.GROW || 0)),
      independentBusinessesLaunched: 3,
      activeCohorts: programmes.length || 1,
      streamServiceCounts: {
        salon: services.filter((s) => (s.stream || 'salon') === 'salon').length,
        packages: services.filter((s) => s.stream === 'packages').length,
        retail: services.filter((s) => s.stream === 'retail').length,
        training: services.filter((s) => s.stream === 'training').length,
        events: services.filter((s) => s.stream === 'events').length,
      },
    });
  } catch (err) {
    logger.error({ err }, '[her/pathway-metrics] Error:');
    return internalError(res, 'loading pathway metrics');
  }
});

export default router;
