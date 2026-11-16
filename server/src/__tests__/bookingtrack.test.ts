/**
 * BookingTrack Unit & Integration Test Suite
 * ------------------------------------------
 * Validates master authorization policies, audit diff & POPIA IP redaction,
 * entity serializers, and API health/provider/booking contracts.
 */

import { describe, it, expect } from 'vitest';
import { isMasterAuthorized } from '../masterAuth.js';
import { redactIp, computeChanges } from '../audit.js';
import { withPoolConfig } from '../prisma.js';
import { canAccessTenantRow, canMutateBooking } from '../tenantPolicy.js';
import {
  isValidTimeWindow,
  timesOverlap,
  filterNonOverlappingSlots,
} from '../overlap.js';
import {
  DEFAULT_WORKING_HOURS,
  serializeProvider,
  serializeService,
  serializeBooking,
} from '../serializers.js';

describe('BookingTrack Core Infrastructure & Domain', () => {
  it('enforces least-privilege Master authorization for impersonation sessions', () => {
    expect(isMasterAuthorized(null, '/stats')).toBe(false);
    expect(isMasterAuthorized({ role: 'admin' }, '/stats')).toBe(false);
    expect(isMasterAuthorized({ role: 'master' }, '/stats')).toBe(true);

    // Impersonated session can only call /stop-impersonation or /demo-login
    expect(
      isMasterAuthorized({ role: 'admin', originalRole: 'master' }, '/stats'),
    ).toBe(false);
    expect(
      isMasterAuthorized({ role: 'admin', originalRole: 'master' }, '/stop-impersonation'),
    ).toBe(true);
    expect(
      isMasterAuthorized({ role: 'customer', originalRole: 'master' }, '/demo-login'),
    ).toBe(true);
  });

  it('redacts IPv4 and IPv6 addresses for POPIA compliance', () => {
    expect(redactIp(null)).toBeNull();
    expect(redactIp('196.21.104.12')).toBe('196...');
    expect(redactIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001...');
  });

  it('computes accurate before/after audit diffs while ignoring timestamps', () => {
    const before = {
      status: 'pending',
      price: 480,
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const after = {
      status: 'confirmed',
      price: 480,
      updatedAt: '2026-01-02T00:00:00Z',
    };
    const diff = computeChanges(before, after);
    expect(diff).toEqual({
      status: { before: 'pending', after: 'confirmed' },
    });
  });

  it('serializes Provider, Service, and Booking records to Base44 snake_case contract', () => {
    const now = new Date('2026-11-04T10:00:00.000Z');
    const p = serializeProvider({
      id: 'prov_1',
      name: 'Sandton Clinic',
      category: 'Doctor',
      tagline: 'Same-day GP',
      about: 'Care in Sandton',
      phone: '+27 11 784 2100',
      email: 'info@sandtonclinic.co.za',
      website: 'https://sandtonclinic.co.za',
      street: '12 Rivonia Rd',
      city: 'Johannesburg',
      postcode: '2196',
      country: 'South Africa',
      coverImage: '',
      workingHours: [] as any,
      ownerEmail: 'admin@bookingtrack.com',
      ownerUserId: 'usr_1',
      status: 'published',
      isActive: true,
      billingTier: 'enterprise',
      vatNumber: 'ZA123',
      registrationNumber: '2021/123',
      primaryContactName: 'Diana Prince',
      createdAt: now,
      updatedAt: now,
    });

    expect(p.id).toBe('prov_1');
    expect(p.working_hours).toHaveLength(7);
    expect(p.working_hours).toEqual(DEFAULT_WORKING_HOURS);

    const s = serializeService({
      id: 'svc_1',
      providerId: 'prov_1',
      name: 'GP Consultation',
      description: '30m checkup',
      durationMinutes: 30,
      price: 650 as any,
      priceNote: '',
      professionalIds: ['pro_1'],
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    expect(s.duration_minutes).toBe(30);
    expect(s.price).toBe(650);

    const b = serializeBooking({
      id: 'bk_1',
      providerId: 'prov_1',
      providerName: 'Sandton Clinic',
      serviceId: 'svc_1',
      serviceName: 'GP Consultation',
      professionalId: 'pro_1',
      professionalName: 'Dr. Nkosi',
      slotId: 'slot_1',
      customerId: 'cust_1',
      customerName: 'Sipho Ndlovu',
      customerEmail: 'sipho@bookingtrack.com',
      customerPhone: '+27 82 555 0142',
      date: '2026-11-04',
      startTime: '10:00',
      endTime: '10:30',
      price: 650 as any,
      notes: '',
      status: 'confirmed',
      reminderSentAt: null,
      createdAt: now,
      updatedAt: now,
    });
    expect(b.provider_name).toBe('Sandton Clinic');
    expect(b.start_time).toBe('10:00');
    expect(b.status).toBe('confirmed');
  });

  it('detects and filters overlapping or duplicate time slots per professional/date', () => {
    expect(isValidTimeWindow('09:00', '09:30')).toBe(true);
    expect(isValidTimeWindow('10:00', '09:30')).toBe(false);
    expect(timesOverlap('09:00', '09:30', '09:15', '09:45')).toBe(true);
    expect(timesOverlap('09:00', '09:30', '09:30', '10:00')).toBe(false);

    const existing = [
      { date: '2026-11-05', professionalId: 'pro_1', startTime: '09:00', endTime: '09:30' },
    ];
    const candidates = [
      { date: '2026-11-05', professionalId: 'pro_1', startTime: '09:15', endTime: '09:45' }, // overlaps existing
      { date: '2026-11-05', professionalId: 'pro_1', startTime: '09:30', endTime: '10:00' }, // valid
      { date: '2026-11-05', professionalId: 'pro_1', startTime: '09:30', endTime: '10:00' }, // duplicate in batch
    ];

    const { accepted, skippedCount } = filterNonOverlappingSlots(candidates, existing);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].startTime).toBe('09:30');
    expect(skippedCount).toBe(2);
  });

  it('enforces multi-tenant row access rules across roles', () => {
    expect(canAccessTenantRow({ role: 'master' }, 'prov_123')).toBe(true);
    expect(canAccessTenantRow({ role: 'admin', providerId: 'prov_1' }, 'prov_1')).toBe(true);
    expect(canAccessTenantRow({ role: 'admin', providerId: 'prov_1' }, 'prov_2')).toBe(false);
    expect(canAccessTenantRow({ role: 'customer', providerId: null }, 'prov_1')).toBe(false);
    expect(canAccessTenantRow({ role: 'admin', providerId: 'prov_1' }, null)).toBe(false);
  });

  it('enforces booking mutation rules: customers may only cancel their own bookings', async () => {
    const customer = {
      id: 'cust_1',
      email: 'customer@bookingtrack.com',
      fullName: 'Customer One',
      role: 'customer' as const,
      providerId: null,
    };
    const booking = {
      providerId: 'prov_99',
      customerId: 'cust_1',
      customerEmail: 'customer@bookingtrack.com',
    };

    const cancelPerm = await canMutateBooking(customer, booking, 'cancelled');
    expect(cancelPerm.allowed).toBe(true);

    const confirmPerm = await canMutateBooking(customer, booking, 'confirmed');
    expect(confirmPerm.allowed).toBe(false);
    expect(confirmPerm.reason).toContain('Customers may only cancel');

    const otherBooking = {
      providerId: 'prov_99',
      customerId: 'cust_2',
      customerEmail: 'other@bookingtrack.com',
    };
    const deniedPerm = await canMutateBooking(customer, otherBooking, 'cancelled');
    expect(deniedPerm.allowed).toBe(false);
    expect(deniedPerm.reason).toContain('Access denied');
  });

  it('appends PostgreSQL connection pool parameters via withPoolConfig', () => {
    const configured = withPoolConfig('postgresql://postgres:pass@localhost:5433/bookingtrack_pre-prod');
    expect(configured).toContain('connection_limit=50');
    expect(configured).toContain('pool_timeout=30');
    expect(configured).toContain('connection_timeout=10');
  });
});
