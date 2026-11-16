/**
 * k6 Scenario 2: Business Dashboard Load Scenario
 * ------------------------------------------------
 * Simulates business owners / managers loading their business portal:
 *   1. GET /api/auth/me (Identity & linked provider lookup)
 *   2. GET /api/bookings/stats (Aggregated counts, revenue sum, today's schedule)
 *   3. GET /api/bookings?tab=upcoming (Upcoming appointments)
 *   4. GET /api/slots?date_gte=today (Availability calendar query)
 *   5. GET /api/audit (Recent audit log entries)
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const dashboardDuration = new Trend('dashboard_load_duration_ms', true);
export const dashboardSuccessRate = new Rate('dashboard_success_rate');

export const options = {
  scenarios: {
    dashboard_load: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 3000,
      stages: [
        { duration: '30s', target: 200 },   // Warm-up 200 req/s
        { duration: '2m', target: 1000 },   // Baseline 1,000 req/s
        { duration: '2m', target: 2500 },   // Stress 2,500 req/s
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    dashboard_load_duration_ms: ['p(95)<800', 'p(99)<2500'],
    dashboard_success_rate: ['rate>0.98'],
    http_req_failed: [
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

// Reusable authenticated session cache per VU
export function setup() {
  // Pre-authenticate clinic admin Diana Prince for provider tests
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'admin@bookingtrack.com',
      password: 'Password123',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'x-perf-bypass': PERF_SECRET,
      },
    },
  );

  const cookies = loginRes.cookies;
  const token = cookies['bt_token'] ? cookies['bt_token'][0].value : null;

  return { token };
}

export default function (data) {
  const token = data.token;
  const headers = {
    'Content-Type': 'application/json',
    'x-perf-bypass': PERF_SECRET,
  };
  if (token) {
    headers['Cookie'] = `bt_token=${token}`;
    headers['Authorization'] = `Bearer ${token}`;
  }

  const start = Date.now();
  let allSuccess = true;

  group('Dashboard Full Page Load', () => {
    // 1. Me
    const meRes = http.get(`${BASE_URL}/api/auth/me`, { headers });
    allSuccess = allSuccess && check(meRes, { 'auth/me status is 200': (r) => r.status === 200 });

    // 2. Booking Stats
    const statsRes = http.get(`${BASE_URL}/api/bookings/stats`, { headers });
    allSuccess = allSuccess && check(statsRes, { 'stats status is 200': (r) => r.status === 200 });

    // 3. Upcoming Bookings
    const bookingsRes = http.get(`${BASE_URL}/api/bookings?tab=upcoming&limit=50`, { headers });
    allSuccess = allSuccess && check(bookingsRes, { 'bookings status is 200': (r) => r.status === 200 });

    // 4. Calendar Slots
    const slotsRes = http.get(`${BASE_URL}/api/slots?limit=100`, { headers });
    allSuccess = allSuccess && check(slotsRes, { 'slots status is 200': (r) => r.status === 200 });

    // 5. Audit Log
    const auditRes = http.get(`${BASE_URL}/api/audit?limit=25`, { headers });
    allSuccess = allSuccess && check(auditRes, { 'audit status is 200': (r) => r.status === 200 });
  });

  dashboardDuration.add(Date.now() - start);
  dashboardSuccessRate.add(allSuccess);

  sleep(1);
}
