/**
 * Prometheus Metrics Endpoint
 */

import { Router } from 'express';
import { getMetricsSnapshot } from '../metrics.js';
import { getClientCount } from '../sse.js';

const router = Router();

router.get('/', (_req, res) => {
  const m = getMetricsSnapshot();
  const sseClients = getClientCount();
  const lines = [
    '# HELP bookingtrack_http_requests_total Total HTTP requests handled',
    '# TYPE bookingtrack_http_requests_total counter',
    `bookingtrack_http_requests_total ${m.httpRequestsTotal}`,
    `bookingtrack_http_responses_2xx_total ${m.http2xx}`,
    `bookingtrack_http_responses_4xx_total ${m.http4xx}`,
    `bookingtrack_http_responses_5xx_total ${m.http5xx}`,
    '# HELP bookingtrack_bookings_created_total Total bookings created',
    '# TYPE bookingtrack_bookings_created_total counter',
    `bookingtrack_bookings_created_total ${m.bookingsCreated}`,
    `bookingtrack_bookings_cancelled_total ${m.bookingsCancelled}`,
    '# HELP bookingtrack_sse_active_clients Active SSE connections',
    '# TYPE bookingtrack_sse_active_clients gauge',
    `bookingtrack_sse_active_clients ${sseClients}`,
    '',
  ];
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(lines.join('\n'));
});

export default router;
