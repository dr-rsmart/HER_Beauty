#!/usr/bin/env node
/**
 * Production-Safe Startup Script for BookingTrack
 * -----------------------------------------------
 * 1. Verifies required environment variables via env_check.mjs
 * 2. Syncs database schema safely (never uses --accept-data-loss)
 * 3. Starts compiled Express 5 server (server/dist/index.js) with signal forwarding
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'server');

function log(msg) {
  console.log(`[production-start] ${msg}`);
}

try {
  log('Verifying environment constraints...');
  execSync('node env_check.mjs', { cwd: SERVER_DIR, stdio: 'inherit' });
  log('Syncing Prisma schema with production database...');
  execSync('npx prisma db push --schema=prisma/schema.prisma --skip-generate', {
    cwd: SERVER_DIR,
    stdio: 'inherit',
  });
  if (process.env.AUTO_SEED === 'true') {
    log('AUTO_SEED=true detected. Seeding database with HER Beauty data...');
    execSync('node dist/seed.js', { cwd: SERVER_DIR, stdio: 'inherit' });
  }
} catch (err) {
  log(`❌ Startup preflight failed: ${err.message}`);
  process.exit(1);
}

log('Starting BookingTrack API & Static Server...');
const serverProcess = spawn('node', ['dist/index.js'], {
  cwd: SERVER_DIR,
  stdio: 'inherit',
  env: { ...process.env },
});

serverProcess.on('exit', (code) => {
  log(`Server exited with code ${code}`);
  process.exit(code ?? 0);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    log(`Received ${signal}, forwarding to server...`);
    serverProcess.kill(signal);
  });
}
