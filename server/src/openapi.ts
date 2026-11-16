/**
 * OpenAPI 3.1 Specification Builder
 * ---------------------------------
 * Machine-readable API contract served at GET /api/openapi.json and /api/v1/openapi.json.
 */

export function buildOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'BookingTrack Enterprise API',
      version: '1.0.0',
      description:
        'Multi-tenant South African appointment booking, professional scheduling, and business management platform API.',
    },
    servers: [
      { url: '/api/v1', description: 'Versioned v1 API' },
      { url: '/api', description: 'Default API' },
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Deep health check (PostgreSQL, Redis, SSE, memory)',
          responses: { '200': { description: 'Healthy' }, '503': { description: 'Degraded' } },
        },
      },
      '/auth/login': {
        post: {
          summary: 'Authenticate user and issue httpOnly session cookie',
          responses: { '200': { description: 'Authenticated' }, '401': { description: 'Invalid credentials' } },
        },
      },
      '/auth/register': {
        post: {
          summary: 'Register new customer or business owner account',
          responses: { '201': { description: 'Account created' }, '409': { description: 'Duplicate email' } },
        },
      },
      '/auth/session': {
        get: {
          summary: 'Anonymous-safe session probe for SPA boot',
          responses: { '200': { description: 'Session status' } },
        },
      },
      '/auth/me': {
        get: {
          summary: 'Current authenticated user profile & provider context',
          responses: { '200': { description: 'CurrentUser' }, '401': { description: 'Unauthenticated' } },
        },
      },
      '/providers': {
        get: {
          summary: 'List published South African service providers with search & category filters',
          responses: { '200': { description: 'Paginated ProviderRecord list' } },
        },
        post: {
          summary: 'Create a new business provider profile',
          responses: { '201': { description: 'Created ProviderRecord' } },
        },
      },
      '/providers/mine': {
        get: {
          summary: 'Fetch the authenticated user’s business provider profile',
          responses: { '200': { description: 'ProviderRecord or null' } },
        },
      },
      '/providers/{id}': {
        get: {
          summary: 'Get public business profile by ID',
          responses: { '200': { description: 'ProviderRecord' }, '404': { description: 'Not found' } },
        },
        patch: {
          summary: 'Update business profile, working hours, or visibility status',
          responses: { '200': { description: 'Updated ProviderRecord' }, '403': { description: 'Access denied' } },
        },
      },
      '/services': {
        get: {
          summary: 'List bookable services for a provider',
          responses: { '200': { description: 'Paginated ServiceRecord list' } },
        },
        post: {
          summary: 'Create a bookable service (owner/manager only)',
          responses: { '201': { description: 'Created ServiceRecord' }, '403': { description: 'Access denied' } },
        },
      },
      '/professionals': {
        get: {
          summary: 'List professionals for a provider',
          responses: { '200': { description: 'Paginated ProfessionalRecord list' } },
        },
        post: {
          summary: 'Add a professional team member (owner/manager only)',
          responses: { '201': { description: 'Created ProfessionalRecord' }, '403': { description: 'Access denied' } },
        },
      },
      '/slots': {
        get: {
          summary: 'List availability time slots for a provider',
          responses: { '200': { description: 'Paginated SlotRecord list' } },
        },
        post: {
          summary: 'Create a single non-overlapping time slot',
          responses: { '201': { description: 'Created SlotRecord' }, '409': { description: 'Slot overlap' } },
        },
      },
      '/slots/bulk': {
        post: {
          summary: 'Bulk-generate non-overlapping availability slots across weeks',
          responses: { '201': { description: 'Created count & skipped overlap count' } },
        },
      },
      '/bookings': {
        get: {
          summary: 'List customer or provider bookings',
          responses: { '200': { description: 'Paginated BookingRecord list' } },
        },
        post: {
          summary: 'Atomically reserve an open slot and create a booking',
          responses: { '201': { description: 'Created BookingRecord' }, '409': { description: 'Slot already taken' } },
        },
      },
      '/bookings/stats': {
        get: {
          summary: 'Provider dashboard KPI statistics and today schedule',
          responses: { '200': { description: 'Provider KPI summary' } },
        },
      },
      '/audit': {
        get: {
          summary: 'Immutable audit trail with POPIA IP redaction',
          responses: { '200': { description: 'Paginated AuditLogRecord list' } },
        },
      },
      '/master/stats': {
        get: {
          summary: 'Cross-tenant platform KPIs (30s TTL cached)',
          responses: { '200': { description: 'MasterStats' } },
        },
      },
    },
  };
}
