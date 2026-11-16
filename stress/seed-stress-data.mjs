/**
 * High-Scale Stress Test Database Seeder
 * --------------------------------------
 * Seeds isolated data partitions for:
 *   - Phase A: Baseline (1,000 VUs) -> 1,000 customer users, 20 providers, 2,000 open slots
 *   - Phase B: Stress (3,000 VUs) -> 3,000 customer users, 50 providers, 6,000 open slots
 *   - Phase C: Extreme Stress (5,000 VUs) -> 5,000 customer users, 100 providers, 12,000 open slots
 *
 * Uses precomputed bcrypt hash to eliminate CPU bottlenecks during seeding.
 * Inserts in batches with Prisma createMany for fast execution.
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, '../server/package.json'));
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Pre-computed hash of 'StressPass123!' (cost factor 10)
const STRESS_PASSWORD_HASH = bcrypt.hashSync('StressPass123!', 10);
const STRESS_TAG = 'stress-test';

export async function cleanStressData() {
  console.log('🧹 Purging previous stress test partitions...');
  await prisma.auditLog.deleteMany({
    where: { actorEmail: { contains: '@stress.bookingtrack.internal' } },
  });
  await prisma.booking.deleteMany({
    where: { customerEmail: { contains: '@stress.bookingtrack.internal' } },
  });
  await prisma.slot.deleteMany({
    where: { provider: { tagline: { contains: STRESS_TAG } } },
  });
  await prisma.service.deleteMany({
    where: { provider: { tagline: { contains: STRESS_TAG } } },
  });
  await prisma.professional.deleteMany({
    where: { provider: { tagline: { contains: STRESS_TAG } } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: '@stress.bookingtrack.internal' } },
  });
  await prisma.provider.deleteMany({
    where: { tagline: { contains: STRESS_TAG } },
  });
  console.log('✅ Previous stress test data purged successfully.');
}

export async function seedStressPartition(targetVUs = 5000) {
  console.log(`🚀 Seeding stress test data partition for ${targetVUs} Virtual Users...`);

  const providerCount = Math.min(100, Math.max(10, Math.ceil(targetVUs / 50)));
  const userCount = targetVUs;
  const slotsPerProvider = 100;

  console.log(`-> Creating ${providerCount} benchmark providers...`);
  const providersData = [];
  for (let i = 1; i <= providerCount; i++) {
    providersData.push({
      name: `Benchmark Provider ${i.toString().padStart(3, '0')}`,
      category: i % 3 === 0 ? 'Medical' : i % 2 === 0 ? 'Salon' : 'Automotive',
      tagline: `${STRESS_TAG}-tier-${i}`,
      city: i % 2 === 0 ? 'Johannesburg' : 'Cape Town',
      ownerEmail: `owner_${i}@stress.bookingtrack.internal`,
      status: 'published',
      isActive: true,
      billingTier: 'enterprise',
    });
  }

  const createdProviders = [];
  for (const p of providersData) {
    const prov = await prisma.provider.create({ data: p });
    createdProviders.push(prov);
  }

  console.log(`-> Creating services & professionals for each provider...`);
  const createdServices = [];
  const createdProfessionals = [];

  for (const prov of createdProviders) {
    const s1 = await prisma.service.create({
      data: {
        providerId: prov.id,
        name: `Standard Consultation`,
        durationMinutes: 30,
        price: 450.0,
      },
    });
    const s2 = await prisma.service.create({
      data: {
        providerId: prov.id,
        name: `Comprehensive Session`,
        durationMinutes: 60,
        price: 850.0,
      },
    });
    createdServices.push(s1, s2);

    const pro1 = await prisma.professional.create({
      data: {
        providerId: prov.id,
        name: `Senior Specialist ${prov.id.slice(-4)}`,
        title: 'Lead Practitioner',
      },
    });
    createdProfessionals.push(pro1);
  }

  console.log(`-> Creating ${slotsPerProvider * providerCount} open availability slots...`);
  const slotBatches = [];
  const dates = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'];
  const times = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

  for (const prov of createdProviders) {
    const pro = createdProfessionals.find((p) => p.providerId === prov.id);
    const srv = createdServices.find((s) => s.providerId === prov.id);
    if (!pro || !srv) continue;

    for (const d of dates) {
      for (const t of times) {
        const [h, m] = t.split(':').map(Number);
        const endH = String(h + 1).padStart(2, '0');
        slotBatches.push({
          providerId: prov.id,
          professionalId: pro.id,
          serviceId: srv.id,
          date: d,
          startTime: t,
          endTime: `${endH}:${String(m).padStart(2, '0')}`,
          status: 'open',
        });
      }
    }
  }

  for (let i = 0; i < slotBatches.length; i += 500) {
    const batch = slotBatches.slice(i, i + 500);
    await prisma.slot.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  console.log(`-> Creating ${userCount} benchmark virtual users in batches...`);
  const userBatches = [];
  for (let i = 1; i <= userCount; i++) {
    userBatches.push({
      email: `perf_user_${i}@stress.bookingtrack.internal`,
      fullName: `Virtual User ${i}`,
      phone: `+27 82 ${String(i).padStart(7, '0')}`,
      role: 'customer',
      passwordHash: STRESS_PASSWORD_HASH,
    });
  }

  for (let i = 0; i < userBatches.length; i += 500) {
    const batch = userBatches.slice(i, i + 500);
    await prisma.user.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  console.log(`✨ Stress data seeding complete:`);
  console.log(`   - Virtual Users: ${userCount}`);
  console.log(`   - Business Providers: ${createdProviders.length}`);
  console.log(`   - Available Slots: ${slotBatches.length}`);
}

async function run() {
  const vus = parseInt(process.argv[2] || '5000', 10);
  await cleanStressData();
  await seedStressPartition(vus);
  await prisma.$disconnect();
}

if (process.argv[1]?.endsWith('seed-stress-data.mjs')) {
  run().catch((e) => {
    console.error('Fatal seed error:', e);
    process.exit(1);
  });
}
