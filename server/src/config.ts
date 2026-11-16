/**
 * Centralized Configuration
 * -------------------------
 * Fail-fast environment validation. The server refuses to boot if any
 * required secret is missing or still set to a known-insecure default.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const INSECURE_DEFAULTS = [
  'BookingTrack-dev-secret-change-in-production',
  'TimeTrack-dev-secret-change-in-production',
  'change-me-in-production',
  'tt_perf_bench_2026',
];

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function fail(msg: string): never {
  logger.error(`[config] FATAL: ${msg}`);
  process.exit(1);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    fail(`Missing required environment variable "${name}". Set it in server/.env before starting.`);
  }
  return value;
}

function rejectInsecure(name: string, value: string): void {
  if (INSECURE_DEFAULTS.includes(value)) {
    if (isProduction()) {
      fail(
        `Environment variable "${name}" is set to a known-insecure default. Rotate it before running in production.`,
      );
    } else {
      logger.warn(
        `[config] WARNING: "${name}" uses a known-insecure default. This is only acceptable for local development.`,
      );
    }
  }
}

function validateJwtSecret(secret: string): void {
  rejectInsecure('JWT_SECRET', secret);
  if (isProduction() && secret.length < 32) {
    fail('JWT_SECRET must be at least 32 characters (256-bit entropy) in production.');
  }
}

function validateCorsOrigin(origin: string): string {
  if (isProduction()) {
    const origins = origin.split(',').map((o) => o.trim());
    for (const o of origins) {
      if (!o.startsWith('https://')) {
        fail(`Production CORS_ORIGIN "${o}" must use HTTPS protocol.`);
      }
      if (o.includes('localhost') || o === '*') {
        fail(`Production CORS_ORIGIN cannot be localhost or wildcard '*'.`);
      }
    }
  }
  return origin;
}

const JWT_SECRET = requireEnv('JWT_SECRET');
validateJwtSecret(JWT_SECRET);

const DATABASE_URL = requireEnv('DATABASE_URL');
if (!DATABASE_URL.startsWith('postgresql://') && !DATABASE_URL.startsWith('postgres://')) {
  fail(
    'DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://',
  );
}

const PORT = parseInt(process.env.PORT || '4005', 10);
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  fail(`Invalid PORT: ${process.env.PORT}`);
}

const rawCorsOrigin = isProduction()
  ? requireEnv('CORS_ORIGIN')
  : process.env.CORS_ORIGIN || 'http://localhost:5175,http://localhost:5173';
const CORS_ORIGIN = validateCorsOrigin(rawCorsOrigin);

const REDIS_URL = process.env.REDIS_URL ? process.env.REDIS_URL.trim() : null;
const PERF_TEST_SECRET = isProduction() ? null : process.env.PERF_TEST_SECRET || null;

export const config = {
  isProduction: isProduction(),
  jwtSecret: JWT_SECRET,
  databaseUrl: DATABASE_URL,
  port: PORT,
  corsOrigin: CORS_ORIGIN,
  redisUrl: REDIS_URL,
  perfTestSecret: PERF_TEST_SECRET,
} as const;

export default config;
