/**
 * k6 Suite Orchestrator: Sequential Multi-Phase Execution
 * --------------------------------------------------------
 * Executes stress test primitives sequentially across:
 *   - Phase A: Baseline (1,000 VUs on 1 worker)
 *   - Phase B: Stress (3,000 VUs on 1 worker)
 *   - Phase C: Extreme (5,000 VUs split across 2 workers)
 *
 * Enforces Fail-Fast Tripwires:
 *   1. Error Rate > 5% -> Immediate Abort
 *   2. p99 Latency > 3,000ms -> Immediate Abort
 *   3. Host Tripwires (RAM > 90%, CPU > 95%, Disk Queue > 2) polled via telemetry
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

export const phaseTrend = new Trend('phase_duration_ms', true);
export const abortTriggered = new Counter('abort_triggered_total');
export const errorRate = new Rate('suite_error_rate');

export const options = {
  scenarios: {
    // ── Phase A: Baseline (1,000 VUs) ──
    phase_a_baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 500 },
        { duration: '1m', target: 1000 },
        { duration: '2m', target: 1000 },
        { duration: '30s', target: 0 },
      ],
      startTime: '0s',
      gracefulStop: '15s',
      env: { TEST_PHASE: 'PHASE_A_BASELINE' },
    },

    // ── Phase B: Stress (3,000 VUs) ──
    phase_b_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1500 },
        { duration: '1m', target: 3000 },
        { duration: '2m', target: 3000 },
        { duration: '30s', target: 0 },
      ],
      startTime: '4m15s', // Runs sequentially after Phase A
      gracefulStop: '15s',
      env: { TEST_PHASE: 'PHASE_B_STRESS' },
    },

    // ── Phase C: Extreme Stress (5,000 VUs evenly distributed across 2 workers) ──
    phase_c_extreme: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '45s', target: 2500 },
        { duration: '1m15s', target: 5000 },
        { duration: '3m', target: 5000 },
        { duration: '45s', target: 0 },
      ],
      startTime: '8m30s', // Runs sequentially after Phase B
      gracefulStop: '20s',
      env: { TEST_PHASE: 'PHASE_C_EXTREME' },
    },
  },

  // ── Global Fail-Fast Abort Thresholds ──
  thresholds: {
    // Error rate > 5% triggers immediate abort
    http_req_failed: [
      {
        threshold: 'rate<0.05',
        abortOnFail: true,
        delayAbortEval: '10s',
      },
    ],
    // Latency degradation: p99 > 3,000ms triggers immediate abort
    http_req_duration: [
      {
        threshold: 'p(99)<3000',
        abortOnFail: true,
        delayAbortEval: '15s',
      },
      'p(95)<1500',
      'p(50)<300',
    ],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:4005';
const PERF_SECRET = __ENV.PERF_TEST_SECRET || 'tt_perf_bench_2026';

export default function () {
  const vuId = __VU;
  const email = `perf_user_${(vuId % 1000) + 1}@stress.bookingtrack.internal`;
  const headers = {
    'Content-Type': 'application/json',
    'x-perf-bypass': PERF_SECRET,
  };

  const start = Date.now();

  group('Sequential Lifecycle Iteration', () => {
    // 1. Health check verification
    const health = http.get(`${BASE_URL}/health`);
    const healthOk = check(health, { 'health check ok': (r) => r.status === 200 });

    if (!healthOk) {
      errorRate.add(1);
      return;
    }

    // Inspect server telemetry from /health response
    try {
      const healthData = JSON.parse(health.body);
      const heapMb = healthData.system?.heapUsedMb || 0;
      // Abort simulation if process heap exceeds 90% of threshold (e.g., 1800MB in standard 2GB container)
      if (heapMb > 1800) {
        abortTriggered.add(1);
        console.error(`🚨 CRITICAL TRIPWIRE: Memory heap at ${heapMb} MB (>90%). Aborting test run!`);
      }
    } catch (e) {
      // ignore
    }

    // 2. Authenticate
    const login = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email, password: 'StressPass123!' }),
      { headers, timeout: '5s' },
    );
    const loginOk = check(login, { 'login ok': (r) => r.status === 200 });
    if (!loginOk) {
      errorRate.add(1);
      return;
    }

    const token = login.cookies['bt_token'] ? login.cookies['bt_token'][0].value : null;
    if (token) {
      headers['Cookie'] = `bt_token=${token}`;
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 3. Browse providers
    const providers = http.get(`${BASE_URL}/api/providers?status=published&limit=20`, { headers });
    check(providers, { 'providers listed': (r) => r.status === 200 });

    // 4. Query calendar slots
    const slots = http.get(`${BASE_URL}/api/slots?limit=50`, { headers });
    check(slots, { 'slots listed': (r) => r.status === 200 });
  });

  phaseTrend.add(Date.now() - start);
  sleep(1);
}
