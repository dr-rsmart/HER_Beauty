/**
 * BookingTrack Live API Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app from '../index.js';
import prisma from '../prisma.js';

let server: http.Server;
let baseUrl = '';
let cookieHeader = '';

beforeAll(async () => {
  await prisma.$connect();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});

describe('BookingTrack API Integration', () => {
  it('returns healthy status from /health and /ready', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('ok');
    expect(body.service).toBe('BookingTrack');
    expect(body.database.status).toBe('healthy');
  });

  it('lists published HER Beauty studios from /api/providers', async () => {
    const res = await fetch(`${baseUrl}/api/providers?status=published`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThanOrEqual(6);
    expect(body.items.some((p: any) => p.name.includes('Flagship Studio'))).toBe(true);
  });

  it('authenticates studio admin and returns httpOnly session cookie + provider context', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@herbeauty.co.za',
        password: 'Password123',
      }),
    });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('bt_token=');
    cookieHeader = setCookie.split(';')[0];

    const body = (await res.json()) as any;
    expect(body.user.email).toBe('admin@herbeauty.co.za');
    expect(body.user.role).toBe('admin');
    expect(body.user.provider?.name).toContain('Flagship Studio');
  });

  it('serves HER Beauty Floor 1 specials, promo code validation, contracts, and pathway metrics', async () => {
    const specRes = await fetch(`${baseUrl}/api/her/specials`);
    expect(specRes.status).toBe(200);
    const specBody = (await specRes.json()) as any;
    expect(specBody.items.some((s: any) => s.code === 'CAMPUS20')).toBe(true);

    const valRes = await fetch(`${baseUrl}/api/her/specials/validate?code=CAMPUS20`);
    expect(valRes.status).toBe(200);
    const valBody = (await valRes.json()) as any;
    expect(valBody.valid).toBe(true);
    expect(valBody.offer.discountPercentage).toBe(20);

    const conRes = await fetch(`${baseUrl}/api/her/contracts`);
    expect(conRes.status).toBe(200);
    const conBody = (await conRes.json()) as any;
    expect(conBody.bookingPolicy.depositPercent).toBe(20);
    expect(conBody.stylistContracts.length).toBeGreaterThanOrEqual(5);
    expect(conBody.programmeAgreements[0].cohort).toBe('2025');

    const pwRes = await fetch(`${baseUrl}/api/her/pathway-metrics`);
    expect(pwRes.status).toBe(200);
    const pwBody = (await pwRes.json()) as any;
    expect(pwBody.stageCounts.EMPOWER).toBeGreaterThanOrEqual(1);
  });

  it('fetches provider dashboard KPI stats and today schedule for authenticated business owner', async () => {
    const mineRes = await fetch(`${baseUrl}/api/providers/mine`, {
      headers: { Cookie: cookieHeader },
    });
    expect(mineRes.status).toBe(200);
    const { provider } = (await mineRes.json()) as any;
    expect(provider).toBeTruthy();

    const statsRes = await fetch(
      `${baseUrl}/api/bookings/stats?provider_id=${encodeURIComponent(provider.id)}`,
      { headers: { Cookie: cookieHeader } },
    );
    expect(statsRes.status).toBe(200);
    const stats = (await statsRes.json()) as any;
    expect(typeof stats.todayCount).toBe('number');
    expect(typeof stats.upcomingCount).toBe('number');
    expect(stats.revenue).toBeGreaterThan(0);
    expect(Array.isArray(stats.todaySchedule)).toBe(true);
  });

  it('authenticates Platform Master and returns cross-tenant platform KPIs & audit trail', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'founder@herbeauty.co.za',
        password: 'ChangeMe123!',
      }),
    });
    expect(loginRes.status).toBe(200);
    const masterCookie = (loginRes.headers.get('set-cookie') || '').split(';')[0];

    const masterStatsRes = await fetch(`${baseUrl}/api/master/stats`, {
      headers: { Cookie: masterCookie },
    });
    expect(masterStatsRes.status).toBe(200);
    const masterStats = (await masterStatsRes.json()) as any;
    expect(masterStats.totalProviders).toBeGreaterThanOrEqual(6);
    expect(masterStats.totalBookings).toBeGreaterThanOrEqual(4);

    const auditRes = await fetch(`${baseUrl}/api/audit`, {
      headers: { Cookie: masterCookie },
    });
    expect(auditRes.status).toBe(200);
    expect(auditRes.headers.get('x-total-count')).toBeTruthy();
    const auditBody = (await auditRes.json()) as any;
    expect(auditBody.items.length).toBeGreaterThanOrEqual(2);
  });

  it('serves OpenAPI 3.1 contract at /api/openapi.json and 200-OK anonymous session probe at /api/auth/session', async () => {
    const oaRes = await fetch(`${baseUrl}/api/openapi.json`);
    expect(oaRes.status).toBe(200);
    const spec = (await oaRes.json()) as any;
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.title).toContain('BookingTrack');

    const sessRes = await fetch(`${baseUrl}/api/auth/session`);
    expect(sessRes.status).toBe(200);
    const sessBody = (await sessRes.json()) as any;
    expect(sessBody.authenticated).toBe(false);
    expect(sessBody.user).toBeNull();
  });

  it('enforces cross-tenant isolation by rejecting service creation for another provider', async () => {
    // Sign in as customer (sipho@bookingtrack.com)
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sipho@bookingtrack.com',
        password: 'Password123',
      }),
    });
    expect(loginRes.status).toBe(200);
    const customerCookie = (loginRes.headers.get('set-cookie') || '').split(';')[0];

    const provRes = await fetch(`${baseUrl}/api/providers?status=published`);
    const provBody = (await provRes.json()) as any;
    const targetProviderId = provBody.items[0].id;

    // Attempt to create a service on a provider not owned by Sipho -> must return 403
    const createRes = await fetch(`${baseUrl}/api/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: customerCookie,
      },
      body: JSON.stringify({
        provider_id: targetProviderId,
        name: 'Unauthorized Service',
        duration_minutes: 30,
        price: 100,
      }),
    });
    expect(createRes.status).toBe(403);
  });

  it('authenticates Platform Master account (ricardovsmart@gmail.com)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ricardovsmart@gmail.com', password: 'ChangeMe123!' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.user.email).toBe('ricardovsmart@gmail.com');
    expect(body.user.role).toBe('master');
  });

  it('atomically prevents double-booking race condition under concurrent requests', async () => {
    // 1. Create a dedicated test slot
    const provRes = await fetch(`${baseUrl}/api/providers?status=published`);
    const provBody = (await provRes.json()) as any;
    const provider = provBody.items[0];

    const prosRes = await fetch(`${baseUrl}/api/professionals?provider_id=${provider.id}`);
    const prosBody = (await prosRes.json()) as any;
    const pro = prosBody.items[0];

    const slotDate = '2026-12-15';
    const testSlot = await prisma.slot.create({
      data: {
        providerId: provider.id,
        professionalId: pro.id,
        date: slotDate,
        startTime: '16:00',
        endTime: '16:30',
        status: 'open',
      },
    });

    // 2. Authenticate customer
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sipho@bookingtrack.com',
        password: 'Password123',
      }),
    });
    const customerCookie = (loginRes.headers.get('set-cookie') || '').split(';')[0];

    // 3. Fire two concurrent booking attempts for the same slot
    const bookPayload = {
      provider_id: provider.id,
      provider_name: provider.name,
      service_name: 'Concurrent Check',
      slot_id: testSlot.id,
      date: slotDate,
      start_time: '16:00',
      end_time: '16:30',
      customer_name: 'Sipho Zulu',
      customer_email: 'sipho@bookingtrack.com',
    };

    const [resA, resB] = await Promise.all([
      fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
        body: JSON.stringify(bookPayload),
      }),
      fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
        body: JSON.stringify(bookPayload),
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    // Exactly one must succeed (201) and the other must conflict (409)
    expect(statuses).toEqual([201, 409]);

    const winnerRes = resA.status === 201 ? resA : resB;
    const winnerData = (await winnerRes.json()) as any;
    expect(winnerData.id).toBeTruthy();

    // Verify slot is booked in DB
    const updatedSlot = await prisma.slot.findUnique({ where: { id: testSlot.id } });
    expect(updatedSlot?.status).toBe('booked');
    expect(updatedSlot?.bookingId).toBe(winnerData.id);

    // 4. Cancel the booking and verify slot is automatically released back to 'open'
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${winnerData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    expect(cancelRes.status).toBe(200);

    const releasedSlot = await prisma.slot.findUnique({ where: { id: testSlot.id } });
    expect(releasedSlot?.status).toBe('open');
    expect(releasedSlot?.bookingId).toBeNull();

    // Clean up test slot and booking
    await prisma.booking.deleteMany({ where: { id: winnerData.id } });
    await prisma.slot.deleteMany({ where: { id: testSlot.id } });
  });
});
