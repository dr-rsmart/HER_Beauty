/**
 * Frontend Domain & Formatting Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  CATEGORIES,
  getCategoryMeta,
  defaultWorkingHours,
  timeToMinutes,
  minutesToTime,
  formatTime12,
  formatDateHuman,
  formatDuration,
  formatZAR,
} from '../src/lib/utils';

describe('BookingTrack Frontend Utilities & Formatters', () => {
  it('resolves South African provider categories with fallback to Other', () => {
    expect(CATEGORIES.length).toBe(7);
    expect(getCategoryMeta('Doctor').label).toBe('Doctors');
    expect(getCategoryMeta('Salon').label).toBe('Salons');
    expect(getCategoryMeta('UnknownCategory').value).toBe('Other');
  });

  it('generates default 7-day working hours with Sunday closed', () => {
    const hours = defaultWorkingHours();
    expect(hours).toHaveLength(7);
    expect(hours.find((h) => h.day === 'Monday')?.closed).toBe(false);
    expect(hours.find((h) => h.day === 'Sunday')?.closed).toBe(true);
  });

  it('converts between HH:mm strings, minutes, and 12-hour AM/PM labels', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
    expect(formatTime12('09:05')).toBe('9:05 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
    expect(formatTime12('14:30')).toBe('2:30 PM');
  });

  it('formats durations and South African Rand (ZAR) amounts', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30m');

    expect(formatZAR(null)).toBeNull();
    expect(formatZAR(650)).toBe('R650');
    expect(formatZAR(1450)).toBe('R1 450');
    expect(formatZAR(1450.5)).toBe('R1 450.50');
  });

  it('formats YYYY-MM-DD dates into human-readable strings', () => {
    expect(formatDateHuman('2026-11-04')).toBe('Wed, 4 Nov 2026');
  });
});
