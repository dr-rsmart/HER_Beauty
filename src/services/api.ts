/**
 * BookingTrack API Client
 * -----------------------
 * Centralized fetch wrapper with credentials, session error interception,
 * and typed endpoints for Auth, Providers, Services, Professionals, Slots,
 * Bookings, Audit Logs, and Platform Master operations.
 */

import type {
  CurrentUser,
  ProviderRecord,
  ServiceRecord,
  ProfessionalRecord,
  SlotRecord,
  BookingRecord,
  AuditLogRecord,
  SpecialOfferRecord,
  BroadcastMessageRecord,
  StylistContractRecord,
  ProgrammeAgreementRecord,
  ConsentRecordItem,
  BookingPolicyRecord,
  CustomerLoyaltyRecord,
  SessionErrorCode,
} from '../../contracts';

export type {
  CurrentUser,
  ProviderRecord,
  ServiceRecord,
  ProfessionalRecord,
  SlotRecord,
  BookingRecord,
  AuditLogRecord,
  SpecialOfferRecord,
  BroadcastMessageRecord,
  StylistContractRecord,
  ProgrammeAgreementRecord,
  ConsentRecordItem,
  BookingPolicyRecord,
  CustomerLoyaltyRecord,
  SessionErrorCode,
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: { path: string; message: string }[];

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type SessionHandler = (code: SessionErrorCode, message: string) => void;
let sessionHandler: SessionHandler | null = null;
let suppressUnauthenticated = false;

export function registerSessionHandler(handler: SessionHandler | null): void {
  sessionHandler = handler;
}

export function suppressUnauthenticatedErrors(): () => void {
  suppressUnauthenticated = true;
  return () => {
    suppressUnauthenticated = false;
  };
}

function notifySessionError(code: SessionErrorCode, message: string): void {
  if (code === 'UNAUTHENTICATED' && suppressUnauthenticated) return;
  if (sessionHandler) sessionHandler(code, message);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers: optionHeaders, ...requestOptions } = options;
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(optionHeaders || {}),
    },
    ...requestOptions,
  });

  if (!res.ok) {
    let body: Record<string, unknown> = {};
    try {
      body = await res.json();
    } catch {
      // non-JSON
    }
    const code = body.code as string | undefined;
    const errorMsg = (body.error as string) || `Request failed (${res.status})`;

    if (res.status === 401) {
      const isCredentialCheck =
        path.startsWith('/auth/login') ||
        path.startsWith('/auth/register') ||
        path.startsWith('/auth/change-password');
      if (!isCredentialCheck) {
        notifySessionError('UNAUTHENTICATED', errorMsg);
      }
    } else if (res.status === 403 && code === 'COMPANY_SUSPENDED') {
      notifySessionError('COMPANY_SUSPENDED', errorMsg);
    }

    throw new ApiError(
      errorMsg,
      res.status,
      code,
      body.details as { path: string; message: string }[] | undefined,
    );
  }

  return res.json() as Promise<T>;
}

// ── Auth API ──
export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: CurrentUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { email: string; password: string; fullName?: string; phone?: string }) =>
    request<{ user: CurrentUser; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  session: () =>
    request<{ authenticated: boolean; user: CurrentUser | null }>('/auth/session'),
  me: () => request<CurrentUser>('/auth/me'),
  updateProfile: (data: { fullName: string; phone?: string }) =>
    request<{ user: CurrentUser }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  changePassword: (data: { currentPassword?: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  keepPassword: () =>
    request<{ success: boolean }>('/auth/keep-password', { method: 'POST' }),
  forgotPassword: (email: string) =>
    request<{
      success: boolean;
      message: string;
      adminEmail: string | null;
      adminName: string | null;
      providerName?: string | null;
    }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};

// ── Providers API ──
export const providersApi = {
  list: (params?: {
    status?: string;
    category?: string;
    search?: string;
    owner_email?: string;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.owner_email) qs.set('owner_email', params.owner_email);
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return request<{ items: ProviderRecord[] }>(`/providers${q ? `?${q}` : ''}`);
  },
  mine: () => request<{ provider: ProviderRecord | null }>('/providers/mine'),
  get: (id: string) => request<ProviderRecord>(`/providers/${encodeURIComponent(id)}`),
  create: (data: Partial<ProviderRecord>) =>
    request<ProviderRecord>('/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ProviderRecord>) =>
    request<ProviderRecord>(`/providers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── Services API ──
export const servicesApi = {
  list: (params: { provider_id: string; active?: boolean; limit?: number }) => {
    const qs = new URLSearchParams({ provider_id: params.provider_id });
    if (params.active !== undefined) qs.set('active', String(params.active));
    if (params.limit) qs.set('limit', String(params.limit));
    return request<{ items: ServiceRecord[] }>(`/services?${qs.toString()}`);
  },
  create: (data: Partial<ServiceRecord> & { provider_id: string; name: string }) =>
    request<ServiceRecord>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ServiceRecord>) =>
    request<ServiceRecord>(`/services/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/services/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

// ── Professionals API ──
export const professionalsApi = {
  list: (params: { provider_id: string; active?: boolean; limit?: number }) => {
    const qs = new URLSearchParams({ provider_id: params.provider_id });
    if (params.active !== undefined) qs.set('active', String(params.active));
    if (params.limit) qs.set('limit', String(params.limit));
    return request<{ items: ProfessionalRecord[] }>(`/professionals?${qs.toString()}`);
  },
  create: (data: Partial<ProfessionalRecord> & { provider_id: string; name: string }) =>
    request<ProfessionalRecord>('/professionals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ProfessionalRecord>) =>
    request<ProfessionalRecord>(`/professionals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/professionals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  resetPassword: (id: string) =>
    request<{ success: boolean; message: string }>(
      `/professionals/${encodeURIComponent(id)}/reset-password`,
      { method: 'POST' },
    ),
};

// ── Slots API ──
export const slotsApi = {
  list: (params: {
    provider_id: string;
    professional_id?: string;
    service_id?: string;
    date?: string;
    date_gte?: string;
    status?: string;
    limit?: number;
  }) => {
    const qs = new URLSearchParams({ provider_id: params.provider_id });
    if (params.professional_id) qs.set('professional_id', params.professional_id);
    if (params.service_id) qs.set('service_id', params.service_id);
    if (params.date) qs.set('date', params.date);
    if (params.date_gte) qs.set('date_gte', params.date_gte);
    if (params.status) qs.set('status', params.status);
    if (params.limit) qs.set('limit', String(params.limit));
    return request<{ items: SlotRecord[] }>(`/slots?${qs.toString()}`);
  },
  bulkCreate: (
    items: Array<{
      provider_id: string;
      professional_id: string;
      service_id?: string | null;
      date: string;
      start_time: string;
      end_time: string;
      status?: string;
    }>,
  ) =>
    request<{ count: number }>('/slots/bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  update: (id: string, data: Partial<SlotRecord>) =>
    request<SlotRecord>(`/slots/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/slots/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

// ── Bookings API ──
export const bookingsApi = {
  stats: (providerId: string) =>
    request<{
      todayCount: number;
      upcomingCount: number;
      pendingCount: number;
      revenue: number;
      todaySchedule: BookingRecord[];
    }>(`/bookings/stats?provider_id=${encodeURIComponent(providerId)}`),
  list: (params?: {
    provider_id?: string;
    customer_id?: string;
    tab?: string;
    status?: string;
    date?: string;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.provider_id) qs.set('provider_id', params.provider_id);
    if (params?.customer_id) qs.set('customer_id', params.customer_id);
    if (params?.tab) qs.set('tab', params.tab);
    if (params?.status) qs.set('status', params.status);
    if (params?.date) qs.set('date', params.date);
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return request<{ items: BookingRecord[] }>(`/bookings${q ? `?${q}` : ''}`);
  },
  create: (data: Partial<BookingRecord> & { provider_id: string; date: string; start_time: string; end_time: string }) =>
    request<BookingRecord>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<BookingRecord>) =>
    request<BookingRecord>(`/bookings/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  sendReminder: (id: string) =>
    request<BookingRecord>(`/bookings/${encodeURIComponent(id)}/remind`, {
      method: 'POST',
    }),
};

// ── Audit API ──
export const auditApi = {
  list: (params?: { entity?: string; action?: string; search?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.entity) qs.set('entity', params.entity);
    if (params?.action) qs.set('action', params.action);
    if (params?.search) qs.set('search', params.search);
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return request<{ items: AuditLogRecord[] }>(`/audit${q ? `?${q}` : ''}`);
  },
};

// ── Master Platform API ──
export interface MasterStats {
  totalProviders: number;
  publishedProviders: number;
  activeProviders: number;
  totalProfessionals: number;
  totalServices: number;
  totalUsers: number;
  totalBookings: number;
  todayBookings: number;
  openSlots: number;
  completedRevenue: number;
}

export interface MasterProviderItem {
  id: string;
  name: string;
  category: string;
  city: string;
  status: string;
  isActive: boolean;
  billingTier: string;
  phone: string;
  email: string;
  street: string;
  vatNumber: string;
  registrationNumber: string;
  primaryContactName: string;
  ownerEmail: string;
  ownerFullName: string;
  serviceCount: number;
  professionalCount: number;
  bookingCount: number;
  slotCount: number;
  createdAt: string;
}

export const masterApi = {
  stats: () => request<MasterStats>('/master/stats'),
  listProviders: () => request<{ items: MasterProviderItem[] }>('/master/providers'),
  onboardProvider: (data: {
    name: string;
    category: string;
    city: string;
    phone?: string;
    street?: string;
    billingTier?: string;
    vatNumber?: string;
    registrationNumber?: string;
    primaryContactName?: string;
    adminEmail: string;
    adminFirstName: string;
    adminSurname: string;
  }) =>
    request<{
      success: boolean;
      providerId: string;
      message: string;
      temporaryPassword: string;
    }>('/master/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleProviderStatus: (id: string, isActive: boolean) =>
    request<{ success: boolean; isActive: boolean; message: string }>(
      `/master/providers/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      },
    ),
  impersonate: (providerId: string) =>
    request<{ success: boolean; message: string }>(
      `/master/impersonate/${encodeURIComponent(providerId)}`,
      { method: 'POST' },
    ),
  demoLogin: (email: string) =>
    request<{ success: boolean; message: string }>('/master/demo-login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  stopImpersonation: () =>
    request<{ success: boolean; message: string }>('/master/stop-impersonation', {
      method: 'POST',
    }),
};

// ── File Upload Helper ──
export const uploadsApi = {
  uploadFile: async (file: File): Promise<{ file_url: string }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
    return request<{ file_url: string }>('/uploads', {
      method: 'POST',
      body: JSON.stringify({ dataUrl }),
    });
  },
};

// ── HER Beauty Floor 1 Domain API (/api/her) ──
export interface PathwayMetricsResponse {
  stageCounts: Record<string, number>;
  youngStylistsInTraining: number;
  mentorshipHoursCompleted: number;
  studentDiscountSessions: number;
  stylistsTrainedTotal: number;
  employmentOpportunitiesCreated: number;
  entrepreneurshipWorkshopsDelivered: number;
  communityPartnerships: number;
  stylistsProgressedToIncome: number;
  independentBusinessesLaunched: number;
  activeCohorts: number;
  streamServiceCounts: Record<string, number>;
}

export const herApi = {
  listSpecials: (providerId?: string) =>
    request<{ items: SpecialOfferRecord[] }>(
      `/her/specials${providerId ? `?provider_id=${encodeURIComponent(providerId)}` : ''}`,
    ),
  validatePromoCode: (code: string) =>
    request<{
      valid: boolean;
      offer: {
        id: string;
        title: string;
        code: string;
        discountPercentage: number;
        description: string;
      };
    }>(`/her/specials/validate?code=${encodeURIComponent(code)}`),
  createSpecial: (data: Partial<SpecialOfferRecord> & { title: string; code: string }) =>
    request<SpecialOfferRecord>('/her/specials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteSpecial: (id: string) =>
    request<{ success: boolean }>(`/her/specials/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  listBroadcasts: (providerId?: string) =>
    request<{ items: BroadcastMessageRecord[] }>(
      `/her/broadcasts${providerId ? `?provider_id=${encodeURIComponent(providerId)}` : ''}`,
    ),
  sendBroadcast: (data: {
    provider_id?: string;
    targetGroup: string;
    subject: string;
    body: string;
    channel: string;
  }) =>
    request<BroadcastMessageRecord>('/her/broadcasts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getContracts: (providerId?: string) =>
    request<{
      bookingPolicy: BookingPolicyRecord;
      stylistContracts: StylistContractRecord[];
      programmeAgreements: ProgrammeAgreementRecord[];
      consentRecords: ConsentRecordItem[];
    }>(`/her/contracts${providerId ? `?provider_id=${encodeURIComponent(providerId)}` : ''}`),
  createContract: (data: Record<string, unknown>) =>
    request<StylistContractRecord>('/her/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getLoyalty: () => request<CustomerLoyaltyRecord>('/her/loyalty'),
  updateLoyalty: (data: Partial<CustomerLoyaltyRecord>) =>
    request<CustomerLoyaltyRecord>('/her/loyalty', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getPathwayMetrics: () => request<PathwayMetricsResponse>('/her/pathway-metrics'),
};
