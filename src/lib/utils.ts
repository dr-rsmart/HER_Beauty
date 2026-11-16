/**
 * BookingTrack Domain Utilities & Formatters
 * ------------------------------------------
 * Exact like-for-like helpers matching the Base44 BookingTrack UI:
 * Categories, South African ZAR formatting, 12h time, human dates,
 * relative upcoming notices, and working hours defaults.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Stethoscope,
  Scissors,
  Wrench,
  Smile,
  Sparkles,
  Dumbbell,
  Store,
  type LucideIcon,
} from 'lucide-react';
import type { WorkingHoursDay, BookingStatus } from '../../contracts';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export interface CategoryMeta {
  value: string;
  label: string;
  Icon: LucideIcon;
  blurb: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { value: 'Doctor', label: 'Doctors', Icon: Stethoscope, blurb: 'Clinics & physicians' },
  { value: 'Salon', label: 'Salons', Icon: Scissors, blurb: 'Hair, nails & beauty' },
  { value: 'Mechanic', label: 'Mechanics', Icon: Wrench, blurb: 'Auto service & repair' },
  { value: 'Dentist', label: 'Dentists', Icon: Smile, blurb: 'Dental care' },
  { value: 'Spa & Wellness', label: 'Spa & Wellness', Icon: Sparkles, blurb: 'Massage & treatments' },
  { value: 'Fitness', label: 'Fitness', Icon: Dumbbell, blurb: 'Training & classes' },
  { value: 'Other', label: 'Other', Icon: Store, blurb: 'Anything else' },
];

export function getCategoryMeta(category?: string | null): CategoryMeta {
  return CATEGORIES.find((c) => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
}

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function defaultWorkingHours(): WorkingHoursDay[] {
  return DAYS_OF_WEEK.map((day) => ({
    day,
    open: '09:00',
    close: '17:00',
    closed: day === 'Sunday',
  }));
}

export function timeToMinutes(timeStr?: string | null): number {
  const [h, m] = String(timeStr || '00:00')
    .split(':')
    .map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = String(Math.floor(normalized / 60)).padStart(2, '0');
  const m = String(normalized % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatTime12(timeStr?: string | null): string {
  if (!timeStr) return '';
  const [h, m] = String(timeStr).split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatDateHuman(dateStr?: string | null): string {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(dateStr);
  const dt = new Date(y, m - 1, d);
  return `${SHORT_DAYS[dt.getDay()]}, ${d} ${SHORT_MONTHS[dt.getMonth()]} ${y}`;
}

export function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDateStr(baseDateStr: string, days: number): {
  dateStr: string;
  dayShort: string;
  dayNum: string;
  monthShort: string;
} {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return {
    dateStr: `${year}-${month}-${day}`,
    dayShort: SHORT_DAYS[dt.getDay()],
    dayNum: String(dt.getDate()),
    monthShort: SHORT_MONTHS[dt.getMonth()],
  };
}

export function formatDuration(minutes?: number | null): string {
  const total = Number(minutes) || 0;
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatZAR(amount?: number | string | null): string | null {
  if (amount == null || amount === '') return null;
  const num = Number(amount);
  if (isNaN(num)) return null;
  const [intPart, decPart] = num.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart === '00' ? `R${grouped}` : `R${grouped}.${decPart}`;
}

export const STATUS_BADGE_CLASSES: Record<BookingStatus | string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  completed: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
};

export function relativeTimeNotice(dateStr?: string | null, startTime?: string | null): string | null {
  if (!dateStr || !startTime) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = startTime.split(':').map(Number);
  if (!y || !m || !d) return null;

  const target = new Date(y, m - 1, d, hh || 0, mm || 0, 0);
  const now = new Date();
  const diffMinutes = Math.round((target.getTime() - now.getTime()) / 60000);
  if (diffMinutes < 0) return null;
  if (diffMinutes <= 60) {
    return `Starts in ${diffMinutes <= 5 ? 'moments' : `${diffMinutes} min`}`;
  }

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (
    target.getFullYear() === tomorrow.getFullYear() &&
    target.getMonth() === tomorrow.getMonth() &&
    target.getDate() === tomorrow.getDate()
  ) {
    return 'Tomorrow';
  }

  const diffHours = Math.round(diffMinutes / 60);
  return diffHours < 24 ? `In ${diffHours} hours` : `In ${Math.round(diffHours / 24)} days`;
}
