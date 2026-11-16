#!/usr/bin/env node
/**
 * BookingTrack Pre-Deployment Verification Pipeline
 * -------------------------------------------------
 * Runs environment check, database integrity check, strict TypeScript typecheck,
 * and full Vitest test suite prior to deployment.
 */

import { spawnSync } from 'child_process';

console.log('🚀 Running BookingTrack Pre-Deployment Verification Pipeline...\n');

const steps = [
  { name: '[1/4] Environment & Cryptographic Check', cmd: 'node', args: ['server/env_check.mjs'] },
  { name: '[2/4] Database Health & Tenant Integrity Check', cmd: 'node', args: ['server/db_check.mjs'] },
  { name: '[3/4] Strict TypeScript Typecheck (Web + Server)', cmd: 'npm', args: ['run', 'typecheck'] },
  { name: '[4/4] Automated Unit & API Integration Test Suite', cmd: 'npm', args: ['test'] },
];

for (const step of steps) {
  console.log(`--- ${step.name} ---`);
  const fullCmd = `${step.cmd} ${step.args.join(' ')}`;
  const res = spawnSync(fullCmd, { stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    console.error(`\n❌ ${step.name} failed. Aborting predeploy check.`);
    process.exit(1);
  }
}

console.log('\n✨ ALL PRE-DEPLOYMENT CHECKS PASSED. BookingTrack is ready for production!');
