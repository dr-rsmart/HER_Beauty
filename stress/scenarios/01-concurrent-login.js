/**
 * k6 Scenario 1: Concurrent Login & Authentication Stress
 * -------------------------------------------------------
 * Evaluates bcrypt hashing CPU bottleneck, token issuance latency,
 * cookie parsing, and rate-limiting bypass header (x-perf-bypass).
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

export const loginSuccessRate = new Rate('login_success_rate');
export const loginDuration = new Trend('login_duration_ms', true);
export const bcryptThrottledCounter = new Counter('bcrypt_throttled_total');

export const options = {
  scenarios: {
    concurrent_login_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 },   // Warm-up ramp
        { duration: '1m', target: 1000 },   // Phase A target
        { duration: '2m', target: 1000 },   // Phase A steady
        { duration: '1m', target: 3000 },   // Phase B target
        { duration: '2m', target: 3000 },   // Phase B steady
        { duration: '30s', target: 0 },      // Ramp down
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    login_duration_ms: ['p(95)<1500', 'p(99)<3000'],
    login_success_rate: ['rate>0.95'],
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

export default function () {
  const vuId = (__VU % 1000) + 1;
  const email = `perf_user_${vuId}@stress.bookingtrack.internal`;
  const password = 'StressPass123!';

  const payload = JSON.stringify({ email, password });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-perf-bypass': PERF_SECRET,
    },
    timeout: '5s',
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  const duration = Date.now() - start;

  loginDuration.add(duration);

  const isSuccess = check(res, {
    'status is 200': (r) => r.status === 200,
    'has set-cookie bt_token': (r) => {
      const setCookie = r.headers['Set-Cookie'] || r.headers['set-cookie'] || '';
      return setCookie.includes('bt_token=');
    },
    'response has user payload': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.user && body.user.email === email;
      } catch (e) {
        return false;
      }
    },
  });

  loginSuccessRate.add(isSuccess);

  if (res.status === 429) {
    bcryptThrottledCounter.add(1);
  }

  sleep(1);
}
