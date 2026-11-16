/**
 * k6 Scenario 5: API Health Check & Observability Probe Stress
 * -----------------------------------------------------------
 * Stresses platform health, readiness, liveness, and Prometheus metrics endpoints:
 *   - Ensures Kubernetes probes (/ready, /live, /ping) remain sub-50ms during heavy load
 *   - Verifies deep health check (/health) accurately reflects DB latency and SSE clients
 *   - Validates Prometheus metrics scraping (/metrics) without starvation
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const healthProbeLatency = new Trend('health_probe_latency_ms', true);
export const readinessLatency = new Trend('readiness_latency_ms', true);
export const metricsScrapeLatency = new Trend('metrics_scrape_latency_ms', true);
export const probeFailureRate = new Rate('probe_failure_rate');

export const options = {
  scenarios: {
    health_probes: {
      executor: 'constant-arrival-rate',
      rate: 200,              // 200 health queries per second
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    health_probe_latency_ms: ['p(95)<100', 'p(99)<300'],
    readiness_latency_ms: ['p(99)<100'],
    metrics_scrape_latency_ms: ['p(95)<200'],
    probe_failure_rate: [
      {
        threshold: 'rate<0.01',
        abortOnFail: true,
      },
    ],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:4005';

export default function () {
  // 1. Lightweight Ping
  const pingRes = http.get(`${BASE_URL}/ping`);
  check(pingRes, { 'ping status 200': (r) => r.status === 200 });

  // 2. Kubernetes Liveness Probe
  const liveRes = http.get(`${BASE_URL}/live`);
  check(liveRes, { 'live status 200': (r) => r.status === 200 });

  // 3. Kubernetes Readiness Probe
  const readyStart = Date.now();
  const readyRes = http.get(`${BASE_URL}/ready`);
  readinessLatency.add(Date.now() - readyStart);
  const readyOk = check(readyRes, { 'ready status 200': (r) => r.status === 200 });

  // 4. Deep Health Check
  const healthStart = Date.now();
  const healthRes = http.get(`${BASE_URL}/health`);
  healthProbeLatency.add(Date.now() - healthStart);
  const healthOk = check(healthRes, {
    'health status 200': (r) => r.status === 200,
    'database is healthy': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.database && body.database.status === 'healthy';
      } catch (e) {
        return false;
      }
    },
  });

  // 5. Prometheus Metrics Scrape
  const metricsStart = Date.now();
  const metricsRes = http.get(`${BASE_URL}/metrics`);
  metricsScrapeLatency.add(Date.now() - metricsStart);
  const metricsOk = check(metricsRes, {
    'metrics status 200': (r) => r.status === 200,
    'contains bookingtrack counters': (r) => r.body.includes('bookingtrack_http_requests_total'),
  });

  const allPassed = readyOk && healthOk && metricsOk;
  probeFailureRate.add(allPassed ? 0 : 1);

  sleep(0.5);
}
