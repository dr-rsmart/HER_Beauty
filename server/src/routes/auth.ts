/**
 * Auth Routes
 * -----------
 * POST /api/auth/login           — authenticate and issue JWT cookie
 * POST /api/auth/register        — create customer/business account and sign in
 * POST /api/auth/logout          — clear session & bump pwdEpoch
 * GET  /api/auth/me              — return current user profile + linked provider
 * PUT  /api/auth/profile         — update user profile
 * POST /api/auth/change-password — rotate password & bump pwdEpoch
 * POST /api/auth/keep-password   — clear mustChangePassword flag
 * POST /api/auth/forgot-password — initiate password reset flow
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { logger } from '../logger.js';
import {
  signToken,
  verifyToken,
  requireAuth,
  invalidateLiveRoleCache,
} from '../middleware/auth.js';
import { loginRateLimit } from '../middleware/rateLimit.js';
import {
  validate,
  loginSchema,
  registerSchema,
  changePasswordSchema,
} from '../validation.js';
import { logAudit, getClientIp } from '../audit.js';
import { DEFAULT_PASSWORD, isDefaultPasswordHash } from '../passwords.js';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, getAuthToken } from '../authSession.js';
import { disconnectUserClients } from '../sse.js';
import {
  badRequest,
  unauthorized,
  duplicateRecord,
  internalError,
  sendError,
} from '../errorResponse.js';

const router = Router();

async function buildUserPayload(userId: string, overrides?: {
  role?: any;
  providerId?: string | null;
  originalRole?: any;
  demoEmail?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      provider: true,
      ownedProviders: {
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });
  if (!user) return null;

  const effectiveProviderId =
    overrides?.providerId !== undefined
      ? overrides.providerId
      : user.providerId || user.ownedProviders[0]?.id || null;

  const effectiveProvider = effectiveProviderId
    ? await prisma.provider.findUnique({
        where: { id: effectiveProviderId },
        select: { id: true, name: true, category: true, status: true, isActive: true },
      })
    : null;

  const usingDefaultPassword = await isDefaultPasswordHash(user.passwordHash);

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    full_name: user.fullName,
    phone: user.phone ?? null,
    role: overrides?.role || user.role,
    providerId: effectiveProviderId,
    provider: effectiveProvider,
    mustChangePassword: user.mustChangePassword,
    usingDefaultPassword,
    ...(overrides?.originalRole ? { originalRole: overrides.originalRole } : {}),
    ...(overrides?.demoEmail ? { demoEmail: overrides.demoEmail } : {}),
  };
}

// ── POST /login ──
router.post('/login', loginRateLimit, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email as string).toLowerCase().trim();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        ownedProviders: { take: 1 },
      },
    });

    // Self-healing case-insensitive lookup
    if (!user) {
      const rescued = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "User" WHERE lower(trim(email)) = $1 LIMIT 1`,
        normalizedEmail,
      );
      if (rescued.length > 0) {
        user = await prisma.user.findUnique({
          where: { id: rescued[0].id },
          include: { ownedProviders: { take: 1 } },
        });
      }
    }

    // ── Self-healing for team members in Professional directory (TimeTrack standard) ──
    // If a professional was created with an email but their User login record
    // was missing (the exact "they're on the team roster but can't log in" issue),
    // atomically auto-provision their User account with DEFAULT_PASSWORD ("Password123")
    // so they can log in immediately.
    if (!user) {
      const pro = await prisma.professional.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        include: { provider: true },
      });
      if (pro) {
        const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            fullName: pro.name,
            role: 'employee',
            providerId: pro.providerId,
            passwordHash: defaultHash,
            mustChangePassword: true,
          },
          include: { ownedProviders: { take: 1 } },
        });
        logger.info(
          `[auth] Auto-provisioned User login for professional "${pro.name}" (${normalizedEmail})`,
        );
      }
    }

    if (!user || !user.passwordHash) {
      logAudit({
        entity: 'User',
        entityId: user?.id ?? 'unknown',
        action: 'login_denied_no_account',
        actorId: 'unknown',
        actorRole: 'unknown',
        actorEmail: normalizedEmail,
        justification: 'Login denied — no account exists for this email',
        ipAddress: getClientIp(req),
      });
      return unauthorized(res, 'Invalid email or password.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return unauthorized(res, 'Invalid email or password.');
    }

    const effectiveProviderId = user.providerId || user.ownedProviders[0]?.id || null;

    if (effectiveProviderId && user.role !== 'master') {
      const provider = await prisma.provider.findUnique({
        where: { id: effectiveProviderId },
        select: { isActive: true, name: true },
      });
      if (provider && !provider.isActive) {
        logAudit({
          entity: 'User',
          entityId: user.id,
          action: 'login_denied_suspended',
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          justification: `Login denied — business "${provider.name}" is suspended`,
          ipAddress: getClientIp(req),
          providerId: effectiveProviderId,
        });
        return sendError(
          res,
          403,
          'Your business account has been suspended. Please contact platform support.',
          { code: 'COMPANY_SUSPENDED' },
        );
      }
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      providerId: effectiveProviderId,
      pwdEpoch: user.pwdEpoch,
    });

    res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

    logAudit({
      entity: 'User',
      entityId: user.id,
      action: 'login',
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      ipAddress: getClientIp(req),
      providerId: effectiveProviderId,
    });

    const userPayload = await buildUserPayload(user.id);
    return res.json({ user: userPayload, token });
  } catch (err) {
    logger.error({ err }, '[auth] Login error:');
    return internalError(res, 'logging in');
  }
});

// ── POST /register ──
router.post('/register', loginRateLimit, validate(registerSchema), async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;
    const normalizedEmail = (email as string).toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return duplicateRecord(res, 'Account', 'email');
    }

    const effectivePassword = (password && String(password).trim()) || DEFAULT_PASSWORD;
    const passwordHash = await bcrypt.hash(effectivePassword, 10);
    const derivedName =
      (fullName && String(fullName).trim()) ||
      normalizedEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: derivedName,
        phone: phone ? String(phone).trim() : null,
        role: 'customer',
        passwordHash,
        mustChangePassword: false,
      },
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      providerId: null,
      pwdEpoch: user.pwdEpoch,
    });

    res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

    logAudit({
      entity: 'User',
      entityId: user.id,
      action: 'register',
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      ipAddress: getClientIp(req),
    });

    const userPayload = await buildUserPayload(user.id);
    return res.status(201).json({ user: userPayload, token });
  } catch (err) {
    logger.error({ err }, '[auth] Register error:');
    return internalError(res, 'creating account');
  }
});

// ── POST /logout ──
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    if (!authUser.originalRole) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { pwdEpoch: { increment: 1 } },
      });
      invalidateLiveRoleCache(authUser.id);
      disconnectUserClients(authUser.id);
    }

    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.clearCookie('tt_token', { path: '/' });

    logAudit({
      entity: 'User',
      entityId: authUser.id,
      action: 'logout',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId: authUser.providerId,
    });

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, '[auth] Logout error:');
    return internalError(res, 'logging out');
  }
});

// ── GET /session (200-OK anonymous-safe session probe for SPA boot) ──
router.get('/session', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.json({ authenticated: false, user: null });
    const decoded = verifyToken(token);
    if (!decoded) return res.json({ authenticated: false, user: null });

    const isImpersonated = decoded.originalRole === 'master';
    if (!isImpersonated && typeof decoded.pwdEpoch === 'number') {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { pwdEpoch: true },
      });
      if (!dbUser || decoded.pwdEpoch !== dbUser.pwdEpoch) {
        return res.json({ authenticated: false, user: null });
      }
    }

    const payload = await buildUserPayload(decoded.id, {
      role: decoded.role,
      providerId: decoded.providerId,
      originalRole: decoded.originalRole,
      demoEmail: decoded.demoEmail,
    });
    if (!payload) return res.json({ authenticated: false, user: null });
    return res.json({ authenticated: true, user: payload });
  } catch {
    return res.json({ authenticated: false, user: null });
  }
});

// ── GET /me ──
router.get('/me', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const payload = await buildUserPayload(authUser.id, {
      role: authUser.role,
      providerId: authUser.providerId,
      originalRole: authUser.originalRole,
      demoEmail: authUser.demoEmail,
    });
    if (!payload) return unauthorized(res, 'User not found.');
    return res.json(payload);
  } catch (err) {
    logger.error({ err }, '[auth] /me error:');
    return internalError(res, 'fetching profile');
  }
});

// ── PUT /profile ──
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const { fullName, phone } = req.body;
    if (!fullName || !String(fullName).trim()) {
      return badRequest(res, 'Full name is required.');
    }

    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        fullName: String(fullName).trim(),
        phone: phone !== undefined ? String(phone).trim() : undefined,
      },
    });

    logAudit({
      entity: 'User',
      entityId: authUser.id,
      action: 'update_profile',
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      ipAddress: getClientIp(req),
      providerId: authUser.providerId,
    });

    const payload = await buildUserPayload(authUser.id);
    return res.json({ user: payload });
  } catch (err) {
    logger.error({ err }, '[auth] Update profile error:');
    return internalError(res, 'updating profile');
  }
});

// ── POST /change-password ──
router.post('/change-password', requireAuth, validate(changePasswordSchema), async (req, res) => {
  try {
    const authUser = req.authUser!;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user || !user.passwordHash) return unauthorized(res);

    if (!user.mustChangePassword && currentPassword) {
      const matches = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!matches) {
        return badRequest(res, 'Current password is incorrect.');
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        pwdEpoch: { increment: 1 },
      },
    });
    invalidateLiveRoleCache(user.id);

    const token = signToken({
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      providerId: updated.providerId,
      pwdEpoch: updated.pwdEpoch,
    });
    res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

    logAudit({
      entity: 'User',
      entityId: user.id,
      action: 'change_password',
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      ipAddress: getClientIp(req),
      providerId: user.providerId,
    });

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    logger.error({ err }, '[auth] Change password error:');
    return internalError(res, 'changing password');
  }
});

// ── POST /keep-password ──
router.post('/keep-password', requireAuth, async (req, res) => {
  try {
    const authUser = req.authUser!;
    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) return unauthorized(res);

    if (await isDefaultPasswordHash(user.passwordHash)) {
      return badRequest(res, 'You cannot keep the default temporary password. Please choose a new password.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
    });

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, '[auth] Keep password error:');
    return internalError(res, 'keeping password');
  }
});

// ── POST /forgot-password ──
router.post('/forgot-password', loginRateLimit, async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!email) {
      return badRequest(res, 'Email address is required.');
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        provider: {
          include: { owner: true },
        },
      },
    });

    let pro = null;
    if (!user) {
      pro = await prisma.professional.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        include: {
          provider: {
            include: { owner: true },
          },
        },
      });
      if (pro) {
        // Auto-provision user account so reset works
        const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        user = await prisma.user.create({
          data: {
            email,
            fullName: pro.name,
            role: 'employee',
            providerId: pro.providerId,
            passwordHash: defaultHash,
            mustChangePassword: true,
          },
          include: {
            provider: {
              include: { owner: true },
            },
          },
        });
      }
    }

    const provider = user?.provider || pro?.provider || null;
    const adminEmail =
      provider?.owner?.email ||
      provider?.ownerEmail ||
      (user?.role === 'master' ? 'founder@herbeauty.co.za' : 'admin@bookingtrack.com');
    const adminName =
      provider?.owner?.fullName || provider?.primaryContactName || 'Business Administrator';
    const providerName = provider?.name || 'BookingTrack';

    logAudit({
      entity: 'User',
      entityId: user?.id ?? 'unknown',
      action: 'forgot_password_request',
      actorId: user?.id ?? 'unknown',
      actorEmail: email,
      actorRole: user?.role ?? 'unknown',
      justification: 'Self-service forgot password — directed to contact business administrator',
      ipAddress: getClientIp(req),
      providerId: user?.providerId ?? null,
    });

    return res.json({
      success: true,
      message: adminEmail
        ? `Please reach out to your business administrator (${adminEmail}) to reset your password.`
        : 'Please reach out to your business administrator to reset your password.',
      adminEmail,
      adminName,
      providerName,
    });
  } catch (err) {
    logger.error({ err }, '[auth] Forgot password error:');
    return internalError(res, 'requesting password reset');
  }
});

export default router;
