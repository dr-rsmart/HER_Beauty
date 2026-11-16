/**
 * BookingTrack API Server
 * -----------------------
 * Express 5 + Prisma + PostgreSQL + Server-Sent Events Real-time
 * Built on the TimeTrack enterprise foundation.
 */

import config from './config.js';
import { logger } from './logger.js';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './errorResponse.js';
import { addClient, closeAllClients } from './sse.js';
import { startCron, stopCron } from './cron.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { csrfOriginCheck } from './middleware/csrf.js';
import { recordHttpRequest } from './metrics.js';
import { buildOpenApiDocument } from './openapi.js';
import prisma from './prisma.js';

import authRoutes from './routes/auth.js';
import providerRoutes from './routes/providers.js';
import serviceRoutes from './routes/services.js';
import professionalRoutes from './routes/professionals.js';
import slotRoutes from './routes/slots.js';
import bookingRoutes from './routes/bookings.js';
import auditRoutes from './routes/audit.js';
import masterRoutes from './routes/master.js';
import uploadRoutes from './routes/uploads.js';
import healthRoutes from './routes/health.js';
import metricsRoutes from './routes/metrics.js';
import herRoutes from './routes/her.js';

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
const PORT = config.port;
const CORS_ORIGIN = config.corsOrigin;

// ── Middleware ──
app.use(requestIdMiddleware);

app.use((_req, res, next) => {
  res.on('finish', () => recordHttpRequest(res.statusCode));
  next();
});

app.use(
  cors({
    origin: CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(csrfOriginCheck);

// ── Security Headers ──
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=()');
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https: wss:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
  }
  next();
});

const isPerfBypass = (req: express.Request) => {
  return Boolean(config.perfTestSecret && req.headers['x-perf-bypass'] === config.perfTestSecret);
};

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isPerfBypass,
  message: { error: 'Too many requests, please try again later.' },
});

// ── Health, Liveness, Readiness & Metrics Probes ──
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/ready', (req, res, next) => {
  req.url = '/ready';
  healthRoutes(req, res, next);
});
app.use('/api/ready', (req, res, next) => {
  req.url = '/ready';
  healthRoutes(req, res, next);
});
app.use('/live', (req, res, next) => {
  req.url = '/live';
  healthRoutes(req, res, next);
});
app.use('/api/live', (req, res, next) => {
  req.url = '/live';
  healthRoutes(req, res, next);
});
app.use('/ping', (req, res, next) => {
  req.url = '/ping';
  healthRoutes(req, res, next);
});
app.use('/api/ping', (req, res, next) => {
  req.url = '/ping';
  healthRoutes(req, res, next);
});
app.use('/metrics', metricsRoutes);
app.use('/api/metrics', metricsRoutes);

// ── Real-time SSE Stream (/api/events) ──
app.get('/api/events', requireAuth, (req, res) => {
  const authUser = req.authUser!;
  addClient(res, {
    id: authUser.id,
    role: authUser.role,
    providerId: authUser.providerId,
  });
});

// ── API Router (/api and /api/v1) ──
const apiRouter = express.Router();
apiRouter.get('/openapi.json', (_req, res) => {
  res.json(buildOpenApiDocument());
});
apiRouter.use('/auth', authRoutes);
apiRouter.use('/providers', providerRoutes);
apiRouter.use('/services', serviceRoutes);
apiRouter.use('/professionals', professionalRoutes);
apiRouter.use('/slots', slotRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/master', masterRoutes);
apiRouter.use('/uploads', uploadRoutes);
apiRouter.use('/her', herRoutes);

app.use('/api', apiLimiter, apiRouter);
app.use('/api/v1', apiLimiter, apiRouter);

// ── Static Frontend & SPA Fallback ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDistPath = path.resolve(__dirname, '../../dist');

if (fs.existsSync(staticDistPath)) {
  app.use(
    express.static(staticDistPath, {
      maxAge: config.isProduction ? '1y' : 0,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }),
  );

  app.use((req, res, next) => {
    if (
      (req.method !== 'GET' && req.method !== 'HEAD') ||
      req.path.startsWith('/api') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/ready') ||
      req.path.startsWith('/live') ||
      req.path.startsWith('/ping') ||
      req.path.startsWith('/metrics')
    ) {
      return next();
    }
    res.sendFile(path.join(staticDistPath, 'index.html'));
  });
}

// ── 404 & Error Handlers ──
app.use('/api', notFoundHandler);
app.use('/api/v1', notFoundHandler);
app.use(errorHandler);

// ── Boot & Graceful Shutdown ──
export async function startServer() {
  await prisma.$connect();
  startCron();

  server.listen(PORT, () => {
    logger.info(`[server] BookingTrack API listening on http://localhost:${PORT}`);
  });
}

const shutdown = async (signal: string) => {
  logger.info(`[server] ${signal} received — shutting down gracefully...`);
  stopCron();
  closeAllClients();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    logger.error({ err }, '[server] Failed to start:');
    process.exit(1);
  });
}

export { app, server };
export default app;
