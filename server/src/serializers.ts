/**
 * Entity Serializers
 * ------------------
 * Maps Prisma models (`Provider`, `Service`, `Professional`, `Slot`, `Booking`)
 * to clean JSON payloads supporting both snake_case (Base44 like-for-like UI)
 * and camelCase (TimeTrack enterprise conventions).
 */

import type {
  Provider,
  Service,
  Professional,
  Slot,
  Booking,
} from '@prisma/client';

export interface WorkingHoursDay {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface ProviderRecord {
  id: string;
  name: string;
  category: string;
  tagline: string;
  about: string;
  phone: string;
  email: string;
  website: string;
  street: string;
  city: string;
  postcode: string;
  country: string;
  cover_image: string;
  working_hours: WorkingHoursDay[];
  owner_email: string;
  ownerUserId?: string | null;
  status: 'published' | 'draft';
  isActive: boolean;
  billingTier?: string;
  vatNumber?: string;
  registrationNumber?: string;
  primaryContactName?: string;
  created_date: string;
  updated_date: string;
}

export interface ServiceRecord {
  id: string;
  provider_id: string;
  name: string;
  category_name?: string;
  stream?: string;
  description: string;
  duration_minutes: number;
  price: number | null;
  price_note: string;
  image_url?: string;
  popular?: boolean;
  professional_ids: string[];
  active: boolean;
  created_date: string;
  updated_date: string;
}

export interface ProfessionalRecord {
  id: string;
  provider_id: string;
  name: string;
  email?: string | null;
  title: string;
  bio: string;
  photo_url: string;
  pathway_stage?: string;
  pathway_role?: string;
  specialties?: string[];
  rating?: number;
  review_count?: number;
  experience_years?: number;
  commission_rate?: number;
  leaves?: unknown[];
  service_ids: string[];
  active: boolean;
  has_login?: boolean;
  login_role?: string | null;
  created_date: string;
  updated_date: string;
}

export interface SlotRecord {
  id: string;
  provider_id: string;
  professional_id: string;
  service_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: 'open' | 'booked' | 'blocked';
  booking_id: string | null;
  created_date: string;
  updated_date: string;
}

export interface BookingRecord {
  id: string;
  reference_code?: string;
  provider_id: string;
  provider_name: string;
  service_id: string | null;
  service_name: string;
  professional_id: string | null;
  professional_name: string | null;
  slot_id: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  price: number | null;
  deposit_amount?: number | null;
  promo_code?: string;
  discount_percent?: number;
  popia_consent?: boolean;
  notes: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  reminder_sent_at: string | null;
  created_date: string;
  updated_date: string;
}

export const DEFAULT_WORKING_HOURS: WorkingHoursDay[] = [
  { day: 'Monday', open: '09:00', close: '17:00', closed: false },
  { day: 'Tuesday', open: '09:00', close: '17:00', closed: false },
  { day: 'Wednesday', open: '09:00', close: '17:00', closed: false },
  { day: 'Thursday', open: '09:00', close: '17:00', closed: false },
  { day: 'Friday', open: '09:00', close: '17:00', closed: false },
  { day: 'Saturday', open: '09:00', close: '17:00', closed: false },
  { day: 'Sunday', open: '09:00', close: '17:00', closed: true },
];

export function serializeProvider(p: Provider): ProviderRecord {
  const rawHours = Array.isArray(p.workingHours)
    ? (p.workingHours as unknown as WorkingHoursDay[])
    : DEFAULT_WORKING_HOURS;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    tagline: p.tagline || '',
    about: p.about || '',
    phone: p.phone || '',
    email: p.email || '',
    website: p.website || '',
    street: p.street || '',
    city: p.city || '',
    postcode: p.postcode || '',
    country: p.country || 'South Africa',
    cover_image: p.coverImage || '',
    working_hours: rawHours.length > 0 ? rawHours : DEFAULT_WORKING_HOURS,
    owner_email: p.ownerEmail,
    ownerUserId: p.ownerUserId,
    status: p.status,
    isActive: p.isActive,
    billingTier: p.billingTier,
    vatNumber: p.vatNumber || '',
    registrationNumber: p.registrationNumber || '',
    primaryContactName: p.primaryContactName || '',
    created_date: p.createdAt.toISOString(),
    updated_date: p.updatedAt.toISOString(),
  };
}

type ServiceInput = Omit<Service, 'categoryName' | 'stream' | 'imageUrl' | 'popular'> &
  Partial<Pick<Service, 'categoryName' | 'stream' | 'imageUrl' | 'popular'>>;

export function serializeService(s: ServiceInput): ServiceRecord {
  return {
    id: s.id,
    provider_id: s.providerId,
    name: s.name,
    category_name: s.categoryName || 'Natural Hair & Treatments',
    stream: s.stream || 'salon',
    description: s.description || '',
    duration_minutes: s.durationMinutes,
    price: s.price != null ? Number(s.price) : null,
    price_note: s.priceNote || '',
    image_url: s.imageUrl || '',
    popular: Boolean(s.popular),
    professional_ids: s.professionalIds || [],
    active: s.active,
    created_date: s.createdAt.toISOString(),
    updated_date: s.updatedAt.toISOString(),
  };
}

type ProfessionalInput = Omit<
  Professional,
  | 'pathwayStage'
  | 'pathwayRole'
  | 'specialties'
  | 'rating'
  | 'reviewCount'
  | 'experienceYears'
  | 'commissionRate'
  | 'leaves'
> &
  Partial<
    Pick<
      Professional,
      | 'pathwayStage'
      | 'pathwayRole'
      | 'specialties'
      | 'rating'
      | 'reviewCount'
      | 'experienceYears'
      | 'commissionRate'
      | 'leaves'
    >
  >;

export function serializeProfessional(
  p: ProfessionalInput,
  loginMeta?: { has_login?: boolean; login_role?: string | null },
): ProfessionalRecord {
  return {
    id: p.id,
    provider_id: p.providerId,
    name: p.name,
    email: p.email ?? null,
    title: p.title || '',
    bio: p.bio || '',
    photo_url: p.photoUrl || '',
    pathway_stage: p.pathwayStage || 'GROW',
    pathway_role: p.pathwayRole || p.title || 'Senior Stylist',
    specialties: Array.isArray(p.specialties) ? p.specialties : [],
    rating: p.rating ?? 4.95,
    review_count: p.reviewCount ?? 48,
    experience_years: p.experienceYears ?? 4,
    commission_rate: p.commissionRate ?? 0.45,
    leaves: Array.isArray(p.leaves) ? (p.leaves as unknown[]) : [],
    service_ids: p.serviceIds || [],
    active: p.active,
    ...(loginMeta?.has_login !== undefined ? { has_login: loginMeta.has_login } : {}),
    ...(loginMeta?.login_role !== undefined ? { login_role: loginMeta.login_role } : {}),
    created_date: p.createdAt.toISOString(),
    updated_date: p.updatedAt.toISOString(),
  };
}

export function serializeSlot(s: Slot): SlotRecord {
  return {
    id: s.id,
    provider_id: s.providerId,
    professional_id: s.professionalId,
    service_id: s.serviceId ?? null,
    date: s.date,
    start_time: s.startTime,
    end_time: s.endTime,
    status: s.status,
    booking_id: s.bookingId ?? null,
    created_date: s.createdAt.toISOString(),
    updated_date: s.updatedAt.toISOString(),
  };
}

type BookingInput = Omit<
  Booking,
  'referenceCode' | 'depositAmount' | 'promoCode' | 'discountPercent' | 'popiaConsent'
> &
  Partial<
    Pick<
      Booking,
      'referenceCode' | 'depositAmount' | 'promoCode' | 'discountPercent' | 'popiaConsent'
    >
  >;

export function serializeBooking(b: BookingInput): BookingRecord {
  const numPrice = b.price != null ? Number(b.price) : null;
  const numDeposit =
    b.depositAmount != null
      ? Number(b.depositAmount)
      : numPrice != null
        ? Math.round(numPrice * 0.2 * 100) / 100
        : null;
  return {
    id: b.id,
    reference_code: b.referenceCode || `HER-${b.id.slice(-5).toUpperCase()}`,
    provider_id: b.providerId,
    provider_name: b.providerName,
    service_id: b.serviceId ?? null,
    service_name: b.serviceName,
    professional_id: b.professionalId ?? null,
    professional_name: b.professionalName ?? null,
    slot_id: b.slotId ?? null,
    customer_id: b.customerId ?? null,
    customer_name: b.customerName,
    customer_email: b.customerEmail,
    customer_phone: b.customerPhone || '',
    date: b.date,
    start_time: b.startTime,
    end_time: b.endTime,
    price: numPrice,
    deposit_amount: numDeposit,
    promo_code: b.promoCode || '',
    discount_percent: b.discountPercent ?? 0,
    popia_consent: b.popiaConsent !== false,
    notes: b.notes || '',
    status: b.status,
    reminder_sent_at: b.reminderSentAt ? b.reminderSentAt.toISOString() : null,
    created_date: b.createdAt.toISOString(),
    updated_date: b.updatedAt.toISOString(),
  };
}
