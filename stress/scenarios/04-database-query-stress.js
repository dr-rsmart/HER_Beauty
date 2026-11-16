/**
 * k6 Scenario 4: Database Query & Transaction Stress Scenario
 * ------------------------------------------------------------
 * Stresses PostgreSQL transactions and connection pool (connection_limit=50):
 *   - Concurrent slot reservations (Prisma.$transaction + Slot.updateMany atomic check-and-set)
 *   - Intentional collision simulation: multiple VUs trying to book the exact same slot
 *   - Complex filtering & count aggregations on /api/slots and /api/providers
 *   - AuditLog insertion pipeline overhead
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

export const txDuration = new Trend('booking_tx_duration_ms', true);
export const doubleBookingBlocked = new Counter('double_booking_blocked_total');
export const dbErrorRate = new Rate('db_transaction_error_rate');

export const options = {
  scenarios: {
    db_query_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 },
        { duration: '1m', target: 1000 },  // Phase A: 1,000 concurrent DB queries/tx
        { duration: '2m', target: 3000 },  // Phase B: 3,000 concurrent DB queries/tx
        { duration: '2m', target: 5000 },  // Phase C: 5,000 concurrent DB queries/tx
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    booking_tx_duration_ms: ['p(95)<1500', 'p(99)<3000'],
    db_transaction_error_rate: [
      {
        threshold: 'rate<0.05',
        abortOnFail: true,
        delayAbortEval: '10s',
      },
    ],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:4005';
const PERF_SECRET = __ENV.PERF_TEST_SECRET || 'tt_perf_bench_2026';

export function setup() {
  // Query 100 available slots to target during test
  const res = http.get(`${BASE_URL}/api/slots?status=open&limit=100`, {
    headers: { 'x-perf-bypass': PERF_SECRET },
  });
  const data = JSON.parse(res.body || '{}');
  const slots = data.items || [];
  return { slots };
}

export default function (data) {
  const vuId = __VU;
  const email = `perf_user_${vuId}@stress.bookingtrack.internal`;
  const slots = data.slots;

  if (!slots || slots.length === 0) {
    sleep(1);
    return;
  }

  // Intentionally assign target slot using modulo to cause deliberate collision/race condition
  const targetSlot = slots[vuId % slots.length];

  const headers = {
    'Content-Type': 'application/json',
    'x-perf-bypass': PERF_SECRET,
  };

  // 1. Authenticate user to obtain session
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password: 'StressPass123!' }),
    { headers, timeout: '5s' },
  );

  const cookies = loginRes.cookies;
  const token = cookies['bt_token'] ? cookies['bt_token'][0].value : null;
  if (token) {
    headers['Cookie'] = `bt_token=${token}`;
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 2. Attempt atomic booking creation
  const bookingPayload = JSON.stringify({
    provider_id: targetSlot.provider_id || targetSlot.providerId,
    slot_id: targetSlot.id,
    service_id: targetSlot.service_id || targetSlot.serviceId,
    professional_id: targetSlot.professional_id || targetSlot.professionalId,
    date: targetSlot.date,
    start_time: targetSlot.start_time || targetSlot.startTime,
    end_time: targetSlot.end_time || targetSlot.endTime,
    customer_name: `Virtual User ${vuId}`,
    customer_email: email,
    customer_phone: '+27 82 555 9999',
  });

  const txStart = Date.now();
  const bookRes = http.post(`${BASE_URL}/api/bookings`, bookingPayload, { headers, timeout: '5s' });
  const duration = Date.now() - txStart;
  txDuration.add(duration);

  // Status 201/200: Successfully booked
  // Status 409/400: Successfully detected collision and rejected double-booking
  // Status 500/503/504: Database failure or timeout
  const validOutcome = check(bookRes, {
    'booking created or gracefully rejected on collision': (r) =>
      r.status === 201 || r.status === 200 || r.status === 409 || r.status === 400,
  });

  if (bookRes.status === 409 || (bookRes.status === 400 && bookRes.body.includes('already booked'))) {
    doubleBookingBlocked.add(1);
  }

  if (!validOutcome) {
    dbErrorRate.add(1);
  } else {
    dbErrorRate.add(0);
  }

  sleep(1);
}
