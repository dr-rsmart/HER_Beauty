/**
 * HER Beauty — single source of truth for brand identity (Floor 1 on BookingTrack Foundation).
 *
 * Every business fact below is taken from the approved business plan
 * (presentation/generate_pptx.py) and SCOPE.md.
 */

export const BRAND = {
  /** Trading name used across the UI. */
  name: 'HER Beauty',
  /** Registered / enterprise name (footer, legal lines). */
  enterpriseName: 'HER Beauty Studio & Social Enterprise',
  /** Brand promise — never "Haute Esthétique & Coiffure". */
  slogan: 'Where beauty meets opportunity',
  sloganExtended:
    'Where beauty meets opportunity — and where young talent is given the space to grow.',
  /** Logo tagline (the line inside the emblem ring). */
  tagline: 'Hair · Nails · Beauty',
  /** Identity line printed inside the logo artwork. */
  identityLine: 'HER Beauty. HER Style. HER Identity.',
  /** Descriptor used in metadata & OG copy. */
  descriptor:
    'Contemporary hair, nails & beauty studio and social enterprise in Jamestown.',
  announcementBar:
    '✨ Special Privilege: Glow-Up specials live at HER Beauty with code GLOW20.',
} as const;

export const FOUNDER = {
  name: 'Mrs Monean N Jacobs',
  title: 'Director',
  email: 'founder@herbeauty.co.za',
} as const;

export const CONTACT = {
  address: '4 White Heart, Jamestown 7600',
  addressLines: [
    '4 White Heart',
    'Jamestown 7600',
  ],
  phone: '081 047 0327',
  phoneHref: 'tel:0810470327',
  email: 'founder@herbeauty.co.za',
  emailHref: 'mailto:founder@herbeauty.co.za',
  hoursSummary: 'Mon - Fri: 08:30 - 18:00 | Sat: 09:00 - 16:00 | Sun: Closed',
  hours: [
    { days: 'Mon – Fri', time: '08:30 – 18:00' },
    { days: 'Saturday', time: '09:00 – 16:00' },
    { days: 'Sunday', time: 'Closed' },
  ],
} as const;

export const SOCIAL_CHANNELS = [
  'Instagram',
  'TikTok',
  'Facebook',
  'WhatsApp Business',
] as const;

export const PATHWAY_STAGES = [
  { stage: 'LEARN', blurb: 'Foundational skills, mentorship & salon culture.' },
  { stage: 'PRACTISE', blurb: 'Supervised chair time and portfolio building.' },
  { stage: 'EARN', blurb: 'Paid client work through the Young Stylist Programme.' },
  { stage: 'GROW', blurb: 'Specialisation, senior styling & client ownership.' },
  { stage: 'EMPOWER', blurb: 'Mentorship, leadership & entrepreneurial development.' },
] as const;

export type PathwayStageKey = (typeof PATHWAY_STAGES)[number]['stage'];

export const BRAND_PILLARS = [
  {
    title: 'Beauty',
    description: 'Professional services that help clients look and feel confident.',
  },
  {
    title: 'Culture',
    description:
      'A modern identity celebrating diverse hair, beauty and self-expression.',
  },
  {
    title: 'Opportunity',
    description:
      'A platform where emerging stylists develop practical and entrepreneurial skills.',
  },
  {
    title: 'Community',
    description:
      'Connecting clients, professionals, young people and the broader community.',
  },
] as const;

export const BRAND_ASSOCIATIONS = [
  'Quality',
  'Inclusion',
  'Confidence',
  'Skills',
  'Opportunity',
] as const;

export const LOYALTY_TIERS = [
  {
    name: 'Community Member',
    pointsRequired: 0,
    perk: 'Birthday offer & member pricing',
  },
  {
    name: 'Campus Member',
    pointsRequired: 2500,
    perk: 'Referral rewards & priority booking',
  },
  {
    name: 'HER Circle',
    pointsRequired: 4000,
    perk: 'VIP access, package discounts & dedicated concierge',
  },
] as const;

export const REVENUE_STREAMS = [
  {
    id: 'salon',
    title: 'Salon',
    description: 'Core hair & beauty appointments',
  },
  {
    id: 'packages',
    title: 'Packages',
    description: 'Student, protective-style, event & group packages',
  },
  {
    id: 'retail',
    title: 'Retail',
    description: 'Professional hair-care, accessories & merchandise',
  },
  {
    id: 'training',
    title: 'Training',
    description: 'Workshops, masterclasses & stylist training',
  },
  {
    id: 'events',
    title: 'Events',
    description: 'Pop-ups, graduations & activations',
  },
] as const;

export type RevenueStreamId = (typeof REVENUE_STREAMS)[number]['id'];

export const BRAND_ASSETS = {
  logo: '/logo/her-logo-master.jpg',
  logoChip: '/logo/her-logo-chip.png',
  logoMonoCopper: '/logo/her-logo-mono-copper.png',
  logoMonoLinen: '/logo/her-logo-mono-linen.png',
  favicon: '/favicon.ico',
  iconSvg: '/icon.svg',
  ogImage: '/og.png',
} as const;
