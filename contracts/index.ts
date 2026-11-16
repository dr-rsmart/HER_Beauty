/**
 * Shared API Contracts for BookingTrack
 * -------------------------------------
 * Type definitions shared between the React frontend and Express 5 backend.
 */

export type Role = 'master' | 'admin' | 'manager' | 'employee' | 'customer';

export type ProviderCategory =
  | 'Doctor'
  | 'Salon'
  | 'Mechanic'
  | 'Dentist'
  | 'Spa & Wellness'
  | 'Fitness'
  | 'Other';

export type ProviderStatus = 'published' | 'draft';

export type SlotStatus = 'open' | 'booked' | 'blocked';

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type SessionErrorCode =
  | 'UNAUTHENTICATED'
  | 'COMPANY_SUSPENDED'
  | 'EMPLOYEE_TERMINATED'
  | 'ROLE_REVOKED';

export type ApiErrorCode =
  | SessionErrorCode
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'ACCESS_DENIED'
  | 'DUPLICATE_RECORD'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export interface WorkingHoursDay {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  full_name?: string;
  phone?: string | null;
  role: Role;
  providerId: string | null;
  provider?: {
    id: string;
    name: string;
    category: string;
    status: string;
    isActive: boolean;
  } | null;
  mustChangePassword?: boolean;
  usingDefaultPassword?: boolean;
  originalRole?: Role;
  demoEmail?: string;
}

export interface ProviderRecord {
  id: string;
  name: string;
  category: ProviderCategory | string;
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
  status: ProviderStatus;
  isActive: boolean;
  billingTier?: string;
  vatNumber?: string;
  registrationNumber?: string;
  primaryContactName?: string;
  created_date: string;
  updated_date: string;
}

export type PathwayStage = 'LEARN' | 'PRACTISE' | 'EARN' | 'GROW' | 'EMPOWER';

export type RevenueStreamId = 'salon' | 'packages' | 'retail' | 'training' | 'events';

export interface ServiceRecord {
  id: string;
  provider_id: string;
  name: string;
  category_name?: string;
  stream?: RevenueStreamId | string;
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

export interface StylistLeaveItem {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'approved' | 'pending' | 'declined';
}

export interface ProfessionalRecord {
  id: string;
  provider_id: string;
  name: string;
  email?: string | null;
  title: string;
  bio: string;
  photo_url: string;
  pathway_stage?: PathwayStage | string;
  pathway_role?: string;
  specialties?: string[];
  rating?: number;
  review_count?: number;
  experience_years?: number;
  commission_rate?: number;
  leaves?: StylistLeaveItem[];
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
  status: SlotStatus;
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
  status: BookingStatus;
  reminder_sent_at: string | null;
  created_date: string;
  updated_date: string;
}

export interface SpecialOfferRecord {
  id: string;
  provider_id?: string | null;
  title: string;
  code: string;
  discountPercentage: number;
  description: string;
  validFrom: string;
  validUntil: string;
  bannerImage: string;
  featuredOnLanding: boolean;
  targetAudience: string;
  applicableServiceIds: string[];
}

export interface BroadcastMessageRecord {
  id: string;
  provider_id?: string | null;
  senderId: string;
  senderRole: string;
  targetGroup: string;
  subject: string;
  body: string;
  channel: string;
  sentAt: string;
}

export interface StylistContractRecord {
  id: string;
  provider_id?: string | null;
  professional_id?: string | null;
  stylistName: string;
  contractType: 'permanent' | 'fixed_term' | 'learnership' | 'independent' | string;
  startDate: string;
  endDate?: string | null;
  commissionRate: number;
  pathwayStage: PathwayStage | string;
  mentorshipHoursPerMonth: number;
  probationEndsAt?: string | null;
  status: 'draft' | 'active' | 'expired' | 'terminated' | string;
  signedAt?: string | null;
  documentRef: string;
}

export interface ProgrammeAgreementRecord {
  id: string;
  provider_id?: string | null;
  cohort: string;
  name: string;
  startDate: string;
  endDate: string;
  capacity: number;
  enrolledNames: string[];
  mentorNames: string[];
  curriculumModules: string[];
  stipendAmount: number;
  status: string;
}

export interface ConsentRecordItem {
  id: string;
  provider_id?: string | null;
  customerId?: string | null;
  customerEmail: string;
  customerName: string;
  type: 'special_info' | 'marketing' | 'booking_policy' | string;
  granted: boolean;
  version: string;
  grantedAt: string;
  revokedAt?: string | null;
}

export interface BookingPolicyRecord {
  id: string;
  version: string;
  effectiveFrom: string;
  depositPercent: number;
  depositForfeitable: boolean;
  cancellationHours: number;
  noShowFeePercent: number;
  lateArrivalGraceMinutes: number;
  retailReturnDays: number;
  clauseText: string[];
}

export interface CustomerLoyaltyRecord {
  id: string;
  email: string;
  customerName: string;
  tier: 'HER Circle' | 'Campus Member' | 'Community Member' | string;
  preferredStylist: string;
  hairType: string;
  skinConcerns: string;
  allergies: string;
  beautyPoints: number;
  referralCode: string;
  birthdayOfferEligible: boolean;
  savedCardLast4: string;
  memberSince: string;
}

export interface AuditLogRecord {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  changes: Record<string, { before: unknown; after: unknown }> | null;
  justification: string | null;
  ipAddress: string | null;
  providerId: string | null;
  timestamp: string;
}
