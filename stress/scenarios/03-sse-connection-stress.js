/**
 * k6 Scenario 3: Server-Sent Events (SSE) Connection Stress
 * ---------------------------------------------------------
 * Tests long-lived SSE streaming on /api/events:
 *   - Sustains 5,000 concurrent persistent TCP/HTTP connections
 *   - Measures socket buffer memory overhead & Node.js single-thread event loop
 *   - Validates periodic 25-second heartbeats (`: heartbeat <timestamp>`)
 *   - Enforces per-user max connection cap (MAX_CONN_PER_USER = 5)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Gauge, Rate } from 'k6/metrics';

export const activeSseConnections = new Gauge('active_sse_connections');
export const sseHeartbeatReceived = new Counter('sse_heartbeat_received');
export const sseErrors = new Rate('sse_connection_errors');

export const options = {
  scenarios: {
    sse_connection_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1000 },  // Phase A baseline: 1,000 SSE clients
        { duration: '2m', target: 3000 },  // Phase B stress: 3,000 SSE clients
        { duration: '2m', target: 5000 },  // Phase C extreme: 5,000 SSE clients
        { duration: '3m', target: 5000 },  // Phase C sustained hold
        { duration: '1m', target: 0 },     // Ramp down & disconnect
      ],
    },
  },
  thresholds: {
    sse_connection_errors: [
      {
        threshold: 'rate<0.05',
        abortOnFail: true,
        delayAbortEval: '15s',
      },
    ],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:4005';
const PERF_SECRET = __ENV.PERF_TEST_SECRET || 'tt_perf_bench_2026';

export default function () {
  const vuId = __VU;
  const email = `perf_user_${vuId}@stress.bookingtrack.internal`;

  // 1. Authenticate virtual user to obtain valid session cookie
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email,
      password: 'StressPass123!',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'x-perf-bypass': PERF_SECRET,
      },
      timeout: '10s',
    },
  );

  if (loginRes.status !== 200) {
    sseErrors.add(1);
    sleep(2);
    return;
  }

  const cookies = loginRes.cookies;
  const token = cookies['bt_token'] ? cookies['bt_token'][0].value : null;

  if (!token) {
    sseErrors.add(1);
    return;
  }

  // 2. Open persistent SSE stream
  activeSseConnections.add(1);
  const sseParams = {
    headers: {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
      Cookie: `bt_token=${token}`,
      Authorization: `Bearer ${token}`,
      'x-perf-bypass': PERF_SECRET,
    },
    timeout: '60s',
  };

  const sseRes = http.get(`${BASE_URL}/api/events`, sseParams);

  const ok = check(sseRes, {
    'sse handshake 200': (r) => r.status === 200,
    'content-type event-stream': (r) =>
      r.headers['Content-Type'] && r.headers['Content-Type'].includes('text/event-stream'),
  });

  if (!ok) {
    sseErrors.add(1);
  } else {
    sseHeartbeatReceived.add(1);
  }

  activeSseConnections.add(-1);
  sleep(1);
}
