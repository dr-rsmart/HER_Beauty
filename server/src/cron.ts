/**
 * Background Cron Runner
 * ----------------------
 * Uses distributed DB lock (`CronLock`) to:
 * 1. Auto-stamp 24-hour upcoming appointment reminders
 * 2. Auto-complete past confirmed bookings whose end time has passed
 */

import prisma from './prisma.js';
import { logger } from './logger.js';
import { businessNow, businessDateStr } from './timezone.js';
import { broadcastEvent } from './sse.js';

let cronTimer: NodeJS.Timeout | null = null;
const INSTANCE_ID = `bt-node-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;

async function acquireLock(jobName: string, ttlMs: number): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  try {
    await prisma.cronLock.deleteMany({
      where: { jobName, expiresAt: { lt: now } },
    });
    await prisma.cronLock.create({
      data: { jobName, lockedBy: INSTANCE_ID, lockedAt: now, expiresAt },
    });
    return true;
  } catch {
    return false;
  }
}

async function releaseLock(jobName: string): Promise<void> {
  try {
    await prisma.cronLock.deleteMany({
      where: { jobName, lockedBy: INSTANCE_ID },
    });
  } catch {
    // ignore
  }
}

export async function runBookingMaintenanceTick(): Promise<void> {
  const locked = await acquireLock('booking_maintenance', 55_000);
  if (!locked) return;

  try {
    const { dateStr, timeStr } = businessNow();

    // Auto-stamp reminders for tomorrow's confirmed/pending appointments in business timezone (SAST)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomorrowStr = businessDateStr(tomorrow);

    const dueReminders = await prisma.booking.findMany({
      where: {
        date: { in: [dateStr, tomorrowStr] },
        status: { in: ['confirmed', 'pending'] },
        reminderSentAt: null,
      },
      take: 50,
    });

    for (const b of dueReminders) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { reminderSentAt: new Date() },
      });
      broadcastEvent(
        'booking:reminder',
        { bookingId: b.id, providerId: b.providerId },
        { providerId: b.providerId, customerId: b.customerId },
      );
    }

    // Auto-complete past confirmed bookings whose end time has passed
    const pastDue = await prisma.booking.findMany({
      where: {
        status: 'confirmed',
        OR: [
          { date: { lt: dateStr } },
          { date: dateStr, endTime: { lte: timeStr } },
        ],
      },
      take: 50,
    });

    for (const b of pastDue) {
      const completed = await prisma.booking.update({
        where: { id: b.id },
        data: { status: 'completed' },
      });
      broadcastEvent(
        'booking:updated',
        { booking: { ...b, status: 'completed', updatedAt: completed.updatedAt.toISOString() } },
        { providerId: b.providerId, customerId: b.customerId },
      );
    }
  } catch (err) {
    logger.warn({ err }, '[cron] Maintenance tick warning:');
  } finally {
    await releaseLock('booking_maintenance');
  }
}

export function startCron(): void {
  if (cronTimer) return;
  cronTimer = setInterval(() => {
    void runBookingMaintenanceTick();
  }, 60_000);
  cronTimer.unref?.();
  logger.info('[cron] BookingTrack maintenance cron started (60s interval).');
}

export function stopCron(): void {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}
