/**
 * HER Beauty (on BookingTrack Foundation) Seed Script
 * ---------------------------------------------------
 * Populates the PostgreSQL `her_beauty` schema with:
 * - Director & Platform Master (`founder@herbeauty.co.za` Mrs Monean N Jacobs, `ricardovsmart@gmail.com` Ricardo Smart)
 * - Studio Admins & Managers (`admin@herbeauty.co.za` Chloe Laurent, `nomvula@herbeauty.co.za`, `zanele@herbeauty.co.za`, `keisha@herbeauty.co.za`, plus BookingTrack aliases)
 * - Campus & VIP Customers (`thandiwe@herbeauty.co.za`, `sipho@herbeauty.co.za`, `anke@herbeauty.co.za`, plus `@bookingtrack.com` aliases)
 * - 6 published HER Beauty Studio Branches & Revenue Stream Hubs (Jamestown Flagship Studio, Tygervalley Hub, Rondebosch Sanctuary, Coetzenburg Wellness Bar, Young Stylist Academy, Winelands Bridal & Events)
 * - 21 authentic HER Beauty Services across the 5 revenue streams (Salon, Packages, Retail, Training, Events)
 * - Artisans across all 5 stages of The HER Pathway (LEARN -> PRACTISE -> EARN -> GROW -> EMPOWER)
 * - 14 days of open time slots, realistic bookings, Campus Specials, Broadcasts, Stylist Contracts, Cohort 2025 Programme Agreement, POPIA Consents, and Loyalty Profiles.
 *
 * All seeded accounts use password: "Password123" (Master accounts: "ChangeMe123!")
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { logger } from './logger.js';
import { businessNow } from './timezone.js';

const PASSWORD_HASH = bcrypt.hashSync('Password123', 10);
const MASTER_PASSWORD_HASH = bcrypt.hashSync('ChangeMe123!', 10);

const HER_WORKING_HOURS = [
  { day: 'Monday', open: '08:30', close: '18:00', closed: false },
  { day: 'Tuesday', open: '08:30', close: '18:00', closed: false },
  { day: 'Wednesday', open: '08:30', close: '18:00', closed: false },
  { day: 'Thursday', open: '08:30', close: '18:00', closed: false },
  { day: 'Friday', open: '08:30', close: '18:00', closed: false },
  { day: 'Saturday', open: '09:00', close: '16:00', closed: false },
  { day: 'Sunday', open: '09:00', close: '16:00', closed: true },
];

function addDays(baseDateStr: string, offset: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offset));
  return dt.toISOString().slice(0, 10);
}

async function main() {
  logger.info('[seed] Starting HER Beauty (Floor 1 on BookingTrack Foundation) database seed...');

  await prisma.auditLog.deleteMany();
  await prisma.cronLock.deleteMany();
  await prisma.retentionPolicy.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.stylistContract.deleteMany();
  await prisma.programmeAgreement.deleteMany();
  await prisma.broadcastMessage.deleteMany();
  await prisma.specialOffer.deleteMany();
  await prisma.customerLoyalty.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.service.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();

  const { dateStr: today } = businessNow();

  // ── 1. Founder & Platform Master Accounts ──
  const founderUser = await prisma.user.create({
    data: {
      email: 'founder@herbeauty.co.za',
      fullName: 'Mrs Monean N Jacobs',
      phone: '081 047 0327',
      role: 'master',
      passwordHash: MASTER_PASSWORD_HASH,
    },
  });

  await prisma.user.create({
    data: {
      email: 'ricardovsmart@gmail.com',
      fullName: 'Ricardo Smart',
      phone: '+27 82 555 0101',
      role: 'master',
      passwordHash: MASTER_PASSWORD_HASH,
    },
  });

  // ── 2. Customers (HER Beauty Campus & VIP Clients + BookingTrack Aliases) ──
  const thandiwe = await prisma.user.create({
    data: {
      email: 'thandiwe@herbeauty.co.za',
      fullName: 'Thandiwe Ndlovu',
      phone: '+27 (0)82 555 0199',
      role: 'customer',
      passwordHash: PASSWORD_HASH,
    },
  });
  await prisma.user.create({
    data: {
      email: 'thandiwe@bookingtrack.com',
      fullName: 'Thandiwe Ndlovu',
      phone: '+27 (0)82 555 0199',
      role: 'customer',
      passwordHash: PASSWORD_HASH,
    },
  });

  const sipho = await prisma.user.create({
    data: {
      email: 'sipho@bookingtrack.com',
      fullName: 'Sipho Khuzwayo',
      phone: '+27 (0)71 444 3322',
      role: 'customer',
      passwordHash: PASSWORD_HASH,
    },
  });
  await prisma.user.create({
    data: {
      email: 'sipho@herbeauty.co.za',
      fullName: 'Sipho Khuzwayo',
      phone: '+27 (0)71 444 3322',
      role: 'customer',
      passwordHash: PASSWORD_HASH,
    },
  });
  await prisma.user.create({
    data: {
      email: 'sipho@timetrack.com',
      fullName: 'Sipho Khuzwayo',
      phone: '+27 (0)71 444 3322',
      role: 'customer',
      passwordHash: PASSWORD_HASH,
    },
  });

  const anke = await prisma.user.create({
    data: {
      email: 'lerato@bookingtrack.com',
      fullName: 'Anke van der Merwe',
      phone: '+27 (0)83 777 1199',
      role: 'customer',
      passwordHash: PASSWORD_HASH,
    },
  });
  await prisma.user.create({
    data: {
      email: 'anke@herbeauty.co.za',
      fullName: 'Anke van der Merwe',
      phone: '+27 (0)83 777 1199',
      role: 'customer',
      passwordHash: PASSWORD_HASH,
    },
  });
  await prisma.user.create({
    data: {
      email: 'lerato@timetrack.com',
      fullName: 'Anke van der Merwe',
      phone: '+27 (0)83 777 1199',
      role: 'customer',
      passwordHash: PASSWORD_HASH,
    },
  });

  // ── Helper to create a HER Beauty Studio Branch + Owner + Alias Accounts ──
  async function createStudioBundle(cfg: {
    id?: string;
    ownerEmail: string;
    aliasEmails: string[];
    ownerName: string;
    ownerPhone: string;
    ownerRole?: 'admin' | 'manager';
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
    coverImage: string;
    billingTier: string;
    vatNumber: string;
    registrationNumber: string;
    services: Array<{
      name: string;
      categoryName: string;
      stream: string;
      description: string;
      durationMinutes: number;
      price: number;
      priceNote?: string;
      imageUrl?: string;
      popular?: boolean;
    }>;
    professionals: Array<{
      name: string;
      email?: string;
      title: string;
      bio: string;
      photoUrl: string;
      pathwayStage: string;
      pathwayRole: string;
      specialties: string[];
      rating: number;
      reviewCount: number;
      experienceYears: number;
      commissionRate: number;
      leaves?: unknown[];
      staffRole?: 'manager' | 'employee';
    }>;
  }) {
    const owner = await prisma.user.create({
      data: {
        email: cfg.ownerEmail,
        fullName: cfg.ownerName,
        phone: cfg.ownerPhone,
        role: cfg.ownerRole || 'admin',
        passwordHash: PASSWORD_HASH,
      },
    });

    const provider = await prisma.provider.create({
      data: {
        ...(cfg.id ? { id: cfg.id } : {}),
        name: cfg.name,
        category: cfg.category,
        tagline: cfg.tagline,
        about: cfg.about,
        phone: cfg.phone,
        email: cfg.email,
        website: cfg.website,
        street: cfg.street,
        city: cfg.city,
        postcode: cfg.postcode,
        country: 'South Africa',
        coverImage: cfg.coverImage,
        workingHours: HER_WORKING_HOURS as unknown as Prisma.InputJsonValue,
        ownerEmail: owner.email,
        ownerUserId: owner.id,
        status: 'published',
        isActive: true,
        billingTier: cfg.billingTier,
        vatNumber: cfg.vatNumber,
        registrationNumber: cfg.registrationNumber,
        primaryContactName: cfg.ownerName,
      },
    });

    await prisma.user.update({
      where: { id: owner.id },
      data: { providerId: provider.id },
    });

    for (const aliasEmail of cfg.aliasEmails) {
      await prisma.user.create({
        data: {
          email: aliasEmail,
          fullName: cfg.ownerName,
          phone: cfg.ownerPhone,
          role: cfg.ownerRole || 'admin',
          passwordHash: PASSWORD_HASH,
          providerId: provider.id,
        },
      });
    }

    const createdPros = [];
    for (const p of cfg.professionals) {
      const pro = await prisma.professional.create({
        data: {
          providerId: provider.id,
          name: p.name,
          email: p.email || null,
          title: p.title,
          bio: p.bio,
          photoUrl: p.photoUrl,
          pathwayStage: p.pathwayStage,
          pathwayRole: p.pathwayRole,
          specialties: p.specialties,
          rating: p.rating,
          reviewCount: p.reviewCount,
          experienceYears: p.experienceYears,
          commissionRate: p.commissionRate,
          leaves: (p.leaves || []) as Prisma.InputJsonValue,
          active: true,
        },
      });
      createdPros.push(pro);

      if (p.email) {
        const existingStaff = await prisma.user.findUnique({ where: { email: p.email } });
        if (!existingStaff) {
          await prisma.user.create({
            data: {
              email: p.email,
              fullName: p.name,
              phone: cfg.phone,
              role: p.staffRole || 'employee',
              passwordHash: PASSWORD_HASH,
              providerId: provider.id,
            },
          });
        }
      }
    }

    const proIds = createdPros.map((p) => p.id);

    const createdServices = [];
    for (const s of cfg.services) {
      const svc = await prisma.service.create({
        data: {
          providerId: provider.id,
          name: s.name,
          categoryName: s.categoryName,
          stream: s.stream,
          description: s.description,
          durationMinutes: s.durationMinutes,
          price: new Prisma.Decimal(s.price),
          priceNote: s.priceNote || '',
          imageUrl: s.imageUrl || '',
          popular: Boolean(s.popular),
          professionalIds: proIds,
          active: true,
        },
      });
      createdServices.push(svc);
    }

    const serviceIds = createdServices.map((s) => s.id);
    for (const pro of createdPros) {
      await prisma.professional.update({
        where: { id: pro.id },
        data: { serviceIds },
      });
    }

    const slotTimes = [
      ['09:00', '09:30'],
      ['09:30', '10:00'],
      ['10:00', '10:30'],
      ['11:00', '11:30'],
      ['11:30', '12:00'],
      ['13:00', '13:30'],
      ['14:00', '14:30'],
      ['14:30', '15:00'],
      ['15:30', '16:00'],
      ['16:30', '17:00'],
    ];

    const slotsToInsert: Array<{
      providerId: string;
      professionalId: string;
      serviceId: string | null;
      date: string;
      startTime: string;
      endTime: string;
      status: 'open';
    }> = [];

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const dateStr = addDays(today, dayOffset);
      for (const pro of createdPros) {
        for (const [startTime, endTime] of slotTimes) {
          slotsToInsert.push({
            providerId: provider.id,
            professionalId: pro.id,
            serviceId: null,
            date: dateStr,
            startTime,
            endTime,
            status: 'open',
          });
        }
      }
    }

    await prisma.slot.createMany({ data: slotsToInsert });

    return { provider, owner, professionals: createdPros, services: createdServices };
  }

  // ── Studio 1: HER Beauty — Flagship Studio ──
  const flagship = await createStudioBundle({
    id: 'cmwj41xzt000cmn3zqag4i0le',
    ownerEmail: 'admin@herbeauty.co.za',
    aliasEmails: ['admin@bookingtrack.com', 'admin@timetrack.com'],
    ownerName: 'Chloe Laurent',
    ownerPhone: '081 047 0327',
    ownerRole: 'admin',
    name: 'HER Beauty — Flagship Studio',
    category: 'Salon',
    tagline: 'Where beauty meets opportunity — Flagship Studio',
    about:
      'HER is a contemporary hair, nails and beauty studio. Directed by Mrs Monean N Jacobs, we unite professional, culturally responsive styling with The HER Pathway (LEARN → PRACTISE → EARN → GROW → EMPOWER) youth development model.',
    phone: '081 047 0327',
    email: 'founder@herbeauty.co.za',
    website: 'https://herbeauty.co.za',
    street: '4 White Heart',
    city: 'Jamestown',
    postcode: '7600',
    coverImage:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&auto=format&fit=crop&q=80',
    billingTier: 'flagship',
    vatNumber: '4820193847',
    registrationNumber: '2024/760012/07',
    services: [
      {
        name: 'Wash, Deep Moisture Treatment & Silk Blowout',
        categoryName: 'Natural Hair & Treatments',
        stream: 'salon',
        description:
          'Intense botanical moisture infusion, steam treatment, scalp massage, and smooth silk blowout.',
        durationMinutes: 75,
        price: 320,
        imageUrl:
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80',
        popular: true,
      },
      {
        name: 'Loc Maintenance & Scalp Rebalancing',
        categoryName: 'Natural Hair & Treatments',
        stream: 'salon',
        description:
          'Cleansing wash, retwist, palm-rolling, and essential oil conditioning treatment.',
        durationMinutes: 90,
        price: 380,
        imageUrl:
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
        popular: true,
      },
      {
        name: 'Knotless Braids (Medium Length)',
        categoryName: 'Braiding & Protective Styles',
        stream: 'salon',
        description:
          'Pain-free, lightweight knotless box braids with clean partings and hot-water sealed finish.',
        durationMinutes: 180,
        price: 650,
        priceNote: 'from',
        imageUrl:
          'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&auto=format&fit=crop&q=80',
        popular: true,
      },
      {
        name: 'Cornrows & Trendsetting Twists',
        categoryName: 'Braiding & Protective Styles',
        stream: 'salon',
        description:
          'Artistic directional cornrows, flat-twists, or Senegalese twists tailored to personal aesthetic.',
        durationMinutes: 90,
        price: 350,
        imageUrl:
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
      {
        name: 'Wig Installation & Custom Styling',
        categoryName: 'Braiding & Protective Styles',
        stream: 'salon',
        description:
          'Precision cornrow foundation, lace melting, customization, and heat styling finish.',
        durationMinutes: 120,
        price: 550,
        imageUrl:
          'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
      {
        name: 'Precision Haircut, Trim & Refresh',
        categoryName: 'General Hair Care & Styling',
        stream: 'salon',
        description:
          'Texture-responsive precision cut, split-end dust, and daily maintenance consultation.',
        durationMinutes: 45,
        price: 250,
        imageUrl:
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
        popular: true,
      },
      {
        name: 'Student Gel Overlay & Classic Manicure',
        categoryName: 'Nails & Hand Care',
        stream: 'salon',
        description:
          'Clean cuticle work, strengthening rubber base overlay, and long-lasting salon gel finish.',
        durationMinutes: 60,
        price: 240,
        imageUrl:
          'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&auto=format&fit=crop&q=80',
        popular: true,
      },
      {
        name: 'Signature Hair-Care Consultation',
        categoryName: 'Natural Hair & Treatments',
        stream: 'salon',
        description:
          'Texture mapping, scalp health review and a personalised care plan — complimentary, redeemable against any same-day service.',
        durationMinutes: 20,
        price: 0,
        priceNote: 'complimentary',
        imageUrl:
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
      {
        name: 'Extensions & Add-Length Installation',
        categoryName: 'Braiding & Protective Styles',
        stream: 'salon',
        description:
          'Premium human-hair extensions installed into braids, twists or crochet bases with blended, natural finish.',
        durationMinutes: 150,
        price: 480,
        imageUrl:
          'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
      {
        name: 'Colour & Professional Treatments',
        categoryName: 'General Hair Care & Styling',
        stream: 'salon',
        description:
          'Selected professional chemical services: gloss, toner, balayage or bond-building treatment, tailored to texture.',
        durationMinutes: 120,
        price: 520,
        priceNote: 'from',
        imageUrl:
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
      {
        name: 'Special-Event Styling',
        categoryName: 'General Hair Care & Styling',
        stream: 'salon',
        description:
          'Graduation, matric dance or gala styling — sleek updos, silk press or structured curls with all-day hold.',
        durationMinutes: 75,
        price: 395,
        imageUrl:
          'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&auto=format&fit=crop&q=80',
        popular: true,
      },
      {
        name: 'Express Glow Facial & Brow Shape',
        categoryName: 'Beauty & Skin',
        stream: 'salon',
        description:
          'Deep cleanse, gentle exfoliation, hydration mask and precision brow shape for a campus-ready glow.',
        durationMinutes: 45,
        price: 280,
        imageUrl:
          'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
      {
        name: 'Soft Glam Makeup Application',
        categoryName: 'Beauty & Skin',
        stream: 'salon',
        description:
          'Everyday-elegant to event-ready soft glam with skin-prep, lash finish and setting seal.',
        durationMinutes: 60,
        price: 350,
        imageUrl:
          'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
      {
        name: 'Back-to-Campus Student Package',
        categoryName: 'Packages & Bundles',
        stream: 'packages',
        description:
          'Wash & treatment, silk blowout or twist-out, gel manicure and a retail travel kit — one student-friendly price.',
        durationMinutes: 120,
        price: 540,
        imageUrl:
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
        popular: true,
      },
      {
        name: 'Graduation Group Package (4 Guests)',
        categoryName: 'Packages & Bundles',
        stream: 'packages',
        description:
          'Four event hair & makeup looks with a private styling bay, refreshments and group photos — celebrate together.',
        durationMinutes: 180,
        price: 1600,
        imageUrl:
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80',
        popular: true,
      },
      {
        name: 'HER Signature Hair-Care Retail Kit',
        categoryName: 'Retail & Product Bar',
        stream: 'retail',
        description:
          'Sulphate-free shampoo, deep conditioner, leave-in and sealing oil — stylist-recommended collection for your texture.',
        durationMinutes: 15,
        price: 420,
        imageUrl:
          'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
      {
        name: 'Protective Style Care & Accessories Bundle',
        categoryName: 'Retail & Product Bar',
        stream: 'retail',
        description:
          'Braiding gel, edge control, silk scarf, satin pillowcase and spray bottle — everything to extend your style.',
        durationMinutes: 15,
        price: 260,
        imageUrl:
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
      {
        name: 'Braiding Masterclass (Saturday Intensive)',
        categoryName: 'Training & Masterclasses',
        stream: 'training',
        description:
          'Hands-on knotless braiding, parting geometry and speed technique with our Braiding Lead — mannequin head and kit included.',
        durationMinutes: 240,
        price: 850,
        imageUrl:
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80',
        popular: true,
      },
      {
        name: 'Young Stylist Foundation Workshop',
        categoryName: 'Training & Masterclasses',
        stream: 'training',
        description:
          'The HER Pathway starts here: hair fundamentals, client care, hygiene and salon business basics for aspiring stylists.',
        durationMinutes: 180,
        price: 450,
        imageUrl:
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
      {
        name: 'Graduation Pop-Up Styling Bar',
        categoryName: 'Events & Activations',
        stream: 'events',
        description:
          'Mobile HER beauty bar at your ceremony: touch-up styling, gloss finishing and glam station for graduates and guests.',
        durationMinutes: 120,
        price: 950,
        imageUrl:
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
      {
        name: 'Campus Activation Beauty Bar',
        categoryName: 'Events & Activations',
        stream: 'events',
        description:
          'Full-day branded activation for societies, residences and sponsors — styling bar, nail express, retail corner and content wall.',
        durationMinutes: 240,
        price: 2400,
        imageUrl:
          'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&auto=format&fit=crop&q=80',
        popular: false,
      },
    ],
    professionals: [
      {
        name: 'Nomvula Dlamini',
        email: 'nomvula@herbeauty.co.za',
        title: 'Master Stylist & Senior Mentor',
        bio: 'Master Texture Specialist & Head Mentor. Over 10 years of expertise across natural hair wellness, precision loc crafting, and empowering the next generation.',
        photoUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
        pathwayStage: 'EMPOWER',
        pathwayRole: 'Master Stylist & Senior Mentor',
        specialties: ['Natural Hair Care', 'Loc Maintenance', 'Silk Blowouts', 'Stylist Mentorship'],
        rating: 4.98,
        reviewCount: 142,
        experienceYears: 10,
        commissionRate: 0.5,
        staffRole: 'manager',
        leaves: [
          {
            id: 'leave_1',
            startDate: '2026-11-18',
            endDate: '2026-11-20',
            reason: 'National Hair Skills & Youth Empowerment Conference',
            status: 'approved',
          },
        ],
      },
      {
        name: 'Zanele Khumalo',
        email: 'zanele@herbeauty.co.za',
        title: 'Senior Protective Stylist & Braiding Lead',
        bio: 'Celebrated across the community for fast, pain-free knotless braiding, twists, and creative line artistry.',
        photoUrl:
          'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&auto=format&fit=crop&q=80',
        pathwayStage: 'GROW',
        pathwayRole: 'Senior Protective Stylist',
        specialties: ['Knotless Braids', 'Cornrows', 'Twists', 'Lace Wig Installs'],
        rating: 4.96,
        reviewCount: 118,
        experienceYears: 6,
        commissionRate: 0.45,
        staffRole: 'employee',
      },
      {
        name: 'Keisha Adams',
        email: 'keisha@herbeauty.co.za',
        title: 'Young Stylist Programme Fellow',
        bio: 'Emerging Stylist & Young Stylist Programme Fellow. Specialized in natural hair care, precision blowouts, and clean nail overlays with enthusiastic student client rapport.',
        photoUrl:
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
        pathwayStage: 'EARN',
        pathwayRole: 'Young Stylist Programme Fellow',
        specialties: ['Natural Hair Care', 'Student Gel Nails', 'Blowouts & Treatments', 'Student Specials'],
        rating: 4.93,
        reviewCount: 64,
        experienceYears: 2,
        commissionRate: 0.4,
        staffRole: 'employee',
      },
      {
        name: 'Lindiwe Mbeki',
        email: 'lindiwe@herbeauty.co.za',
        title: 'Associate Braider & Texture Stylist',
        bio: 'Supervised chair-time artisan building her protective-styling and botanical treatment portfolio under Nomvula Dlamini.',
        photoUrl:
          'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&auto=format&fit=crop&q=80',
        pathwayStage: 'PRACTISE',
        pathwayRole: 'Supervised Chair Artisan',
        specialties: ['Cornrows', 'Moisture Treatments', 'Silk Press Prep'],
        rating: 4.91,
        reviewCount: 38,
        experienceYears: 1,
        commissionRate: 0.35,
        staffRole: 'employee',
      },
      {
        name: 'Amahle Sithole',
        email: 'amahle@herbeauty.co.za',
        title: 'Young Stylist Cohort Apprentice',
        bio: 'Cohort 2025 entrant mastering foundational scalp care, hygiene standards, and natural texture consultations.',
        photoUrl:
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
        pathwayStage: 'LEARN',
        pathwayRole: 'Cohort 2025 Apprentice',
        specialties: ['Scalp Care', 'Consultations', 'Botanical Wash'],
        rating: 4.89,
        reviewCount: 21,
        experienceYears: 1,
        commissionRate: 0.3,
        staffRole: 'employee',
      },
    ],
  });

  // ── Studio 2: HER Beauty — Tygervalley Medical & Campus Hub ──
  const tygervalley = await createStudioBundle({
    ownerEmail: 'tygervalley@herbeauty.co.za',
    aliasEmails: ['thabo@bookingtrack.com', 'thabo@timetrack.com'],
    ownerName: 'Thabo Mokoena',
    ownerPhone: '+27 (0)21 938 4410',
    ownerRole: 'manager',
    name: 'HER Beauty — Tygervalley Medical & Campus Hub',
    category: 'Salon',
    tagline: 'Protective styling & natural hair wellness for health-science students',
    about:
      'Serving Tygerberg & Bellville students with express silk blowouts, knotless braiding, and evening clinical-schedule slots.',
    phone: '+27 (0)21 938 4410',
    email: 'tygervalley@herbeauty.co.za',
    website: 'https://herbeauty.co.za/tygervalley',
    street: 'Tygervalley Student Quarter, Francie van Zijl Drive',
    city: 'Cape Town (Bellville)',
    postcode: '7530',
    coverImage:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&auto=format&fit=crop&q=80',
    billingTier: 'campus',
    vatNumber: '4820193847',
    registrationNumber: '2025/114890/07',
    services: [
      {
        name: 'Clinical-Shift Express Wash & Silk Blowout',
        categoryName: 'Natural Hair & Treatments',
        stream: 'salon',
        description: 'Fast 60-minute deep hydration wash and sleek blowout tailored to busy clinical schedules.',
        durationMinutes: 60,
        price: 295,
        popular: true,
      },
      {
        name: 'Protective Knotless Braids',
        categoryName: 'Braiding & Protective Styles',
        stream: 'salon',
        description: 'Low-tension protective braiding ideal for theater caps and ward rotations.',
        durationMinutes: 150,
        price: 620,
        popular: true,
      },
      {
        name: 'Hygienic Short Gel Manicure',
        categoryName: 'Nails & Hand Care',
        stream: 'salon',
        description: 'Clean, clinical-compliant short nail care and rubber base overlay.',
        durationMinutes: 45,
        price: 220,
      },
    ],
    professionals: [
      {
        name: 'Zinhle Dlamini',
        title: 'Senior Campus Stylist',
        bio: 'Protective style lead for Tygerberg health-science students.',
        photoUrl:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        pathwayStage: 'GROW',
        pathwayRole: 'Senior Campus Stylist',
        specialties: ['Protective Braiding', 'Silk Blowouts'],
        rating: 4.95,
        reviewCount: 74,
        experienceYears: 5,
        commissionRate: 0.45,
      },
      {
        name: 'Chloe Abrahams',
        title: 'Nail & Skin Artisan',
        bio: 'Young Stylist graduate specialising in gel overlays and express facials.',
        photoUrl:
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
        pathwayStage: 'EARN',
        pathwayRole: 'Young Stylist Fellow',
        specialties: ['Gel Overlays', 'Brow Shaping'],
        rating: 4.92,
        reviewCount: 49,
        experienceYears: 2,
        commissionRate: 0.4,
      },
    ],
  });

  // ── Studio 3: HER Beauty — Rondebosch Student Sanctuary ──
  const rondebosch = await createStudioBundle({
    ownerEmail: 'rondebosch@herbeauty.co.za',
    aliasEmails: ['ayesha@bookingtrack.com', 'ayesha@timetrack.com'],
    ownerName: 'Ayesha Pillay',
    ownerPhone: '+27 (0)21 650 3390',
    ownerRole: 'manager',
    name: 'HER Beauty — Rondebosch Student Sanctuary',
    category: 'Salon',
    tagline: 'Curated natural hair care, manicures & Young Stylist fellowships',
    about:
      'Southern Suburbs student beauty hub delivering protective styles, botanical hair care kits, and Saturday braiding masterclasses.',
    phone: '+27 (0)21 650 3390',
    email: 'rondebosch@herbeauty.co.za',
    website: 'https://herbeauty.co.za/rondebosch',
    street: 'Main Road Student Precinct, Rondebosch',
    city: 'Cape Town (Rondebosch)',
    postcode: '7700',
    coverImage:
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=1200&auto=format&fit=crop&q=80',
    billingTier: 'campus',
    vatNumber: '4820193847',
    registrationNumber: '2025/229841/07',
    services: [
      {
        name: 'Botanical Curl Definition & Steam Therapy',
        categoryName: 'Natural Hair & Treatments',
        stream: 'salon',
        description: 'Shea, argan & jojoba curl hydration with hooded ozone steam.',
        durationMinutes: 60,
        price: 340,
        popular: true,
      },
      {
        name: 'Back-to-Campus Student Package',
        categoryName: 'Packages & Bundles',
        stream: 'packages',
        description: 'Wash & treatment, silk blowout or twist-out, gel manicure and retail kit.',
        durationMinutes: 120,
        price: 540,
        popular: true,
      },
    ],
    professionals: [
      {
        name: 'Mieke Botha',
        title: 'Lead Stylist & Mentor',
        bio: '8 years in texture-inclusive cutting, colour and youth mentorship.',
        photoUrl:
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
        pathwayStage: 'EMPOWER',
        pathwayRole: 'Lead Stylist & Mentor',
        specialties: ['Precision Cuts', 'Botanical Colour'],
        rating: 4.97,
        reviewCount: 91,
        experienceYears: 8,
        commissionRate: 0.5,
      },
    ],
  });

  // ── Studio 4: HER Beauty — Coetzenburg Wellness & Skin Bar ──
  await createStudioBundle({
    ownerEmail: 'coetzenburg@herbeauty.co.za',
    aliasEmails: ['pieter@bookingtrack.com', 'pieter@timetrack.com'],
    ownerName: 'Pieter van der Merwe',
    ownerPhone: '+27 (0)21 808 9150',
    ownerRole: 'admin',
    name: 'HER Beauty — Coetzenburg Wellness & Skin Bar',
    category: 'Spa & Wellness',
    tagline: 'Express glow facials, scalp rebalancing & botanical skin rituals',
    about:
      'Dedicated skin, brow and scalp wellness sanctuary steps from scenic grounds, powered by indigenous botanicals.',
    phone: '+27 (0)21 808 9150',
    email: 'coetzenburg@herbeauty.co.za',
    website: 'https://herbeauty.co.za/coetzenburg',
    street: '4 White Heart',
    city: 'Jamestown',
    postcode: '7600',
    coverImage:
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    billingTier: 'campus',
    vatNumber: '4820193847',
    registrationNumber: '2025/334512/07',
    services: [
      {
        name: 'Express Glow Facial & Brow Shape',
        categoryName: 'Beauty & Skin',
        stream: 'salon',
        description: 'Deep cleanse, gentle exfoliation, hydration mask and precision brow shape.',
        durationMinutes: 45,
        price: 280,
        popular: true,
      },
      {
        name: 'Rooibos Scalp Detox & Tension Massage',
        categoryName: 'Natural Hair & Treatments',
        stream: 'salon',
        description: 'Clarifying rooibos infusion and 45-minute cranial & neck release.',
        durationMinutes: 45,
        price: 310,
      },
    ],
    professionals: [
      {
        name: 'Ané van der Merwe',
        title: 'Senior Somatologist & Brow Specialist',
        bio: 'Botanical skincare educator and mentor in the HER Pathway.',
        photoUrl:
          'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&auto=format&fit=crop&q=80',
        pathwayStage: 'GROW',
        pathwayRole: 'Senior Skin & Brow Specialist',
        specialties: ['Glow Facials', 'Brow Architecture'],
        rating: 4.96,
        reviewCount: 68,
        experienceYears: 5,
        commissionRate: 0.45,
      },
    ],
  });

  // ── Studio 5: HER Beauty — Young Stylist Academy & Training Hub ──
  await createStudioBundle({
    ownerEmail: 'academy@herbeauty.co.za',
    aliasEmails: ['naledi@bookingtrack.com', 'naledi@timetrack.com'],
    ownerName: 'Naledi Khumalo',
    ownerPhone: '+27 (0)21 808 9180',
    ownerRole: 'admin',
    name: 'HER Beauty — Young Stylist Academy & Training Hub',
    category: 'Salon',
    tagline: 'Workshops, Saturday braiding masterclasses & SETA-aligned youth training',
    about:
      'The heartbeat of The HER Pathway (LEARN → PRACTISE → EARN → GROW → EMPOWER). Aspiring stylists develop practical salon craft, client care, financial literacy and entrepreneurship.',
    phone: '+27 (0)21 808 9180',
    email: 'academy@herbeauty.co.za',
    website: 'https://herbeauty.co.za/academy',
    street: 'Bird Street Creative Precinct',
    city: 'Jamestown',
    postcode: '7600',
    coverImage:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=1200&auto=format&fit=crop&q=80',
    billingTier: 'flagship',
    vatNumber: '4820193847',
    registrationNumber: '2024/760012/07',
    services: [
      {
        name: 'Braiding Masterclass (Saturday Intensive)',
        categoryName: 'Training & Masterclasses',
        stream: 'training',
        description: 'Hands-on knotless braiding, parting geometry and speed technique — kit included.',
        durationMinutes: 240,
        price: 850,
        popular: true,
      },
      {
        name: 'Young Stylist Foundation Workshop',
        categoryName: 'Training & Masterclasses',
        stream: 'training',
        description: 'Hair fundamentals, client care, hygiene and salon business basics.',
        durationMinutes: 180,
        price: 450,
        popular: true,
      },
    ],
    professionals: [
      {
        name: 'Lerato Mokoena',
        title: 'Academy Director & Master Educator',
        bio: 'Leads Cohort 2025 curriculum across practical hair craft and salon entrepreneurship.',
        photoUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        pathwayStage: 'EMPOWER',
        pathwayRole: 'Academy Director & Educator',
        specialties: ['Curriculum Design', 'Masterclasses', 'Entrepreneurship'],
        rating: 4.99,
        reviewCount: 112,
        experienceYears: 11,
        commissionRate: 0.5,
      },
    ],
  });

  // ── Studio 6: HER Beauty — Winelands Bridal & Events Collective ──
  await createStudioBundle({
    ownerEmail: 'events@herbeauty.co.za',
    aliasEmails: ['riaan@bookingtrack.com', 'riaan@timetrack.com'],
    ownerName: 'Riaan Botha',
    ownerPhone: '+27 (0)21 808 9195',
    ownerRole: 'admin',
    name: 'HER Beauty — Winelands Bridal & Events Collective',
    category: 'Salon',
    tagline: 'Graduation pop-up bars, matric dance glam & campus activations',
    about:
      'Bringing HER Beauty beyond the salon chair with mobile styling bars for graduations, residence formals, bridal parties and activations.',
    phone: '+27 (0)21 808 9195',
    email: 'events@herbeauty.co.za',
    website: 'https://herbeauty.co.za/events',
    street: '18 Dorp Street Heritage Quarter',
    city: 'Jamestown',
    postcode: '7600',
    coverImage:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&auto=format&fit=crop&q=80',
    billingTier: 'standard',
    vatNumber: '4820193847',
    registrationNumber: '2025/441209/07',
    services: [
      {
        name: 'Graduation Pop-Up Styling Bar',
        categoryName: 'Events & Activations',
        stream: 'events',
        description: 'Touch-up styling, gloss finishing and glam station for graduates and guests.',
        durationMinutes: 120,
        price: 950,
        popular: true,
      },
      {
        name: 'Campus Activation Beauty Bar',
        categoryName: 'Events & Activations',
        stream: 'events',
        description: 'Full-day branded activation for societies, residences and sponsors.',
        durationMinutes: 240,
        price: 2400,
      },
    ],
    professionals: [
      {
        name: 'Tariq Abrahams',
        title: 'Events & Activations Lead',
        bio: 'Coordinates mobile styling bars, graduation glam squads and residence pop-ups.',
        photoUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        pathwayStage: 'GROW',
        pathwayRole: 'Events & Editorial Stylist',
        specialties: ['Editorial Hair', 'Graduation Glam', 'Pop-Up Bars'],
        rating: 4.94,
        reviewCount: 53,
        experienceYears: 4,
        commissionRate: 0.45,
      },
    ],
  });

  // ── Seed Initial Bookings at HER Beauty — Flagship Studio & Campus Hubs ──
  const tomorrow = addDays(today, 1);
  const twoDaysOut = addDays(today, 2);
  const yesterday = addDays(today, -1);
  const threeDaysAgo = addDays(today, -3);

  // 1. Today's confirmed booking at Flagship Studio for Thandiwe
  const flagshipTodaySlot = await prisma.slot.findFirst({
    where: {
      providerId: flagship.provider.id,
      date: today,
      startTime: '10:00',
      status: 'open',
    },
  });
  const b1 = await prisma.booking.create({
    data: {
      referenceCode: 'HER-84920',
      providerId: flagship.provider.id,
      providerName: flagship.provider.name,
      serviceId: flagship.services[0].id,
      serviceName: flagship.services[0].name,
      professionalId: flagship.professionals[0].id,
      professionalName: flagship.professionals[0].name,
      slotId: flagshipTodaySlot?.id ?? null,
      customerId: thandiwe.id,
      customerName: thandiwe.fullName,
      customerEmail: thandiwe.email,
      customerPhone: thandiwe.phone || '+27 (0)82 555 0199',
      date: today,
      startTime: '10:00',
      endTime: '11:15',
      price: flagship.services[0].price,
      depositAmount: new Prisma.Decimal(64),
      promoCode: 'CAMPUS20',
      discountPercent: 20,
      popiaConsent: true,
      notes: 'Student orientation week prep, deep hydration focus.',
      status: 'confirmed',
    },
  });
  if (flagshipTodaySlot) {
    await prisma.slot.update({
      where: { id: flagshipTodaySlot.id },
      data: { status: 'booked', bookingId: b1.id },
    });
  }

  // 2. Today's pending booking at Flagship Studio for Anke
  const flagshipPendingSlot = await prisma.slot.findFirst({
    where: {
      providerId: flagship.provider.id,
      date: today,
      startTime: '14:00',
      status: 'open',
    },
  });
  const b2 = await prisma.booking.create({
    data: {
      referenceCode: 'HER-84922',
      providerId: flagship.provider.id,
      providerName: flagship.provider.name,
      serviceId: flagship.services[6].id,
      serviceName: flagship.services[6].name,
      professionalId: flagship.professionals[2].id,
      professionalName: flagship.professionals[2].name,
      slotId: flagshipPendingSlot?.id ?? null,
      customerId: anke.id,
      customerName: anke.fullName,
      customerEmail: anke.email,
      customerPhone: anke.phone || '+27 (0)83 777 1199',
      date: today,
      startTime: '14:00',
      endTime: '15:00',
      price: flagship.services[6].price,
      depositAmount: new Prisma.Decimal(48),
      popiaConsent: true,
      notes: 'Natural nude rubber base overlay with minimalist accent.',
      status: 'pending',
    },
  });
  if (flagshipPendingSlot) {
    await prisma.slot.update({
      where: { id: flagshipPendingSlot.id },
      data: { status: 'booked', bookingId: b2.id },
    });
  }

  // 3. Tomorrow's confirmed Knotless Braids booking for Thandiwe
  const flagshipTomorrowSlot = await prisma.slot.findFirst({
    where: {
      providerId: flagship.provider.id,
      date: tomorrow,
      startTime: '13:00',
      status: 'open',
    },
  });
  const b3 = await prisma.booking.create({
    data: {
      referenceCode: 'HER-84921',
      providerId: flagship.provider.id,
      providerName: flagship.provider.name,
      serviceId: flagship.services[2].id,
      serviceName: flagship.services[2].name,
      professionalId: flagship.professionals[1].id,
      professionalName: flagship.professionals[1].name,
      slotId: flagshipTomorrowSlot?.id ?? null,
      customerId: thandiwe.id,
      customerName: thandiwe.fullName,
      customerEmail: thandiwe.email,
      customerPhone: thandiwe.phone || '+27 (0)82 555 0199',
      date: tomorrow,
      startTime: '13:00',
      endTime: '16:00',
      price: flagship.services[2].price,
      depositAmount: new Prisma.Decimal(130),
      popiaConsent: true,
      notes: 'Mid-back knotless braids with natural parting.',
      status: 'confirmed',
    },
  });
  if (flagshipTomorrowSlot) {
    await prisma.slot.update({
      where: { id: flagshipTomorrowSlot.id },
      data: { status: 'booked', bookingId: b3.id },
    });
  }

  // 4. Upcoming Loc Maintenance booking for Sipho
  const siphoSlot = await prisma.slot.findFirst({
    where: {
      providerId: flagship.provider.id,
      date: twoDaysOut,
      startTime: '11:00',
      status: 'open',
    },
  });
  const b4 = await prisma.booking.create({
    data: {
      referenceCode: 'HER-84923',
      providerId: flagship.provider.id,
      providerName: flagship.provider.name,
      serviceId: flagship.services[1].id,
      serviceName: flagship.services[1].name,
      professionalId: flagship.professionals[0].id,
      professionalName: flagship.professionals[0].name,
      slotId: siphoSlot?.id ?? null,
      customerId: sipho.id,
      customerName: sipho.fullName,
      customerEmail: sipho.email,
      customerPhone: sipho.phone || '+27 (0)71 444 3322',
      date: twoDaysOut,
      startTime: '11:00',
      endTime: '12:30',
      price: flagship.services[1].price,
      depositAmount: new Prisma.Decimal(76),
      popiaConsent: true,
      notes: 'Palm-roll retwist and rosemary essential oil treatment.',
      status: 'confirmed',
    },
  });
  if (siphoSlot) {
    await prisma.slot.update({
      where: { id: siphoSlot.id },
      data: { status: 'booked', bookingId: b4.id },
    });
  }

  // 5. Completed bookings at Flagship Studio, Tygervalley & Rondebosch (for revenue KPIs)
  await prisma.booking.create({
    data: {
      referenceCode: 'HER-84915',
      providerId: flagship.provider.id,
      providerName: flagship.provider.name,
      serviceId: flagship.services[11].id,
      serviceName: flagship.services[11].name,
      professionalId: flagship.professionals[2].id,
      professionalName: flagship.professionals[2].name,
      customerId: thandiwe.id,
      customerName: thandiwe.fullName,
      customerEmail: thandiwe.email,
      customerPhone: thandiwe.phone || '+27 (0)82 555 0199',
      date: threeDaysAgo,
      startTime: '15:00',
      endTime: '15:45',
      price: new Prisma.Decimal(280),
      depositAmount: new Prisma.Decimal(56),
      status: 'completed',
      notes: 'Gentle botanical hydration facial before campus gala.',
    },
  });

  await prisma.booking.create({
    data: {
      referenceCode: 'HER-84916',
      providerId: flagship.provider.id,
      providerName: flagship.provider.name,
      serviceId: flagship.services[14].id,
      serviceName: flagship.services[14].name,
      professionalId: flagship.professionals[0].id,
      professionalName: flagship.professionals[0].name,
      customerId: sipho.id,
      customerName: sipho.fullName,
      customerEmail: sipho.email,
      customerPhone: sipho.phone || '+27 (0)71 444 3322',
      date: yesterday,
      startTime: '09:00',
      endTime: '12:00',
      price: new Prisma.Decimal(1600),
      depositAmount: new Prisma.Decimal(320),
      status: 'completed',
      notes: 'Graduation Group Package for 4 guests.',
    },
  });

  await prisma.booking.create({
    data: {
      referenceCode: 'HER-84917',
      providerId: tygervalley.provider.id,
      providerName: tygervalley.provider.name,
      serviceId: tygervalley.services[1].id,
      serviceName: tygervalley.services[1].name,
      professionalId: tygervalley.professionals[0].id,
      professionalName: tygervalley.professionals[0].name,
      customerId: anke.id,
      customerName: anke.fullName,
      customerEmail: anke.email,
      customerPhone: anke.phone || '+27 (0)83 777 1199',
      date: yesterday,
      startTime: '10:00',
      endTime: '12:30',
      price: tygervalley.services[1].price,
      depositAmount: new Prisma.Decimal(124),
      status: 'completed',
    },
  });

  await prisma.booking.create({
    data: {
      referenceCode: 'HER-84918',
      providerId: rondebosch.provider.id,
      providerName: rondebosch.provider.name,
      serviceId: rondebosch.services[1].id,
      serviceName: rondebosch.services[1].name,
      professionalId: rondebosch.professionals[0].id,
      professionalName: rondebosch.professionals[0].name,
      customerId: thandiwe.id,
      customerName: thandiwe.fullName,
      customerEmail: thandiwe.email,
      customerPhone: thandiwe.phone || '+27 (0)82 555 0199',
      date: yesterday,
      startTime: '13:00',
      endTime: '15:00',
      price: rondebosch.services[1].price,
      depositAmount: new Prisma.Decimal(108),
      status: 'completed',
    },
  });

  // ── Seed Floor 1: HER Beauty Special Offers ──
  await prisma.specialOffer.createMany({
    data: [
      {
        providerId: flagship.provider.id,
        title: 'Back-to-Campus Glow-Up Package',
        code: 'CAMPUS20',
        discountPercentage: 20,
        description:
          'Receive 20% off when combining a natural hair treatment or wash & silk blowout with any manicure this semester.',
        validFrom: '2026-09-01',
        validUntil: '2026-12-31',
        bannerImage:
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
        featuredOnLanding: true,
        targetAudience: 'all',
      },
      {
        providerId: flagship.provider.id,
        title: 'Orientation Activation & First-Year Welcome',
        code: 'WELCOME15',
        discountPercentage: 15,
        description:
          '15% off your first appointment at our Flagship Studio.',
        validFrom: '2026-01-01',
        validUntil: '2026-12-31',
        bannerImage:
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
        featuredOnLanding: true,
        targetAudience: 'new_clients',
      },
      {
        providerId: flagship.provider.id,
        title: 'Student Beauty Days',
        code: 'GLOW25',
        discountPercentage: 25,
        description:
          'Student-friendly packages across nails, brows and express treatments every first Wednesday of the month.',
        validFrom: '2026-09-01',
        validUntil: '2026-12-31',
        bannerImage:
          'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&auto=format&fit=crop&q=80',
        featuredOnLanding: true,
        targetAudience: 'all',
      },
      {
        providerId: flagship.provider.id,
        title: 'Hair & Beauty Culture Events',
        code: 'CULTURE10',
        discountPercentage: 10,
        description:
          'Celebrate identity & self-expression at our seasonal Hair & Beauty Culture Events with curated styling sessions.',
        validFrom: '2026-10-01',
        validUntil: '2026-12-31',
        bannerImage:
          'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop&q=80',
        featuredOnLanding: false,
        targetAudience: 'all',
      },
      {
        providerId: flagship.provider.id,
        title: 'Study-Break Campaign',
        code: 'STUDY15',
        discountPercentage: 15,
        description:
          'Exam-season treat: 15% off gentle protective styling and restorative treatments during study breaks.',
        validFrom: '2026-10-15',
        validUntil: '2026-12-31',
        bannerImage:
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
        featuredOnLanding: false,
        targetAudience: 'all',
      },
      {
        providerId: flagship.provider.id,
        title: 'HER Beauty Glow-Up Privilege',
        code: 'GLOW20',
        discountPercentage: 20,
        description:
          '20% Glow-Up special across natural hair, protective styling, nails and botanical beauty care.',
        validFrom: '2026-01-01',
        validUntil: '2026-12-31',
        bannerImage:
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
        featuredOnLanding: false,
        targetAudience: 'all',
      },
    ],
  });

  // ── Seed Floor 1: Broadcast Messages ──
  await prisma.broadcastMessage.createMany({
    data: [
      {
        providerId: flagship.provider.id,
        senderId: flagship.owner.id,
        senderRole: 'admin',
        targetGroup: 'all_stylists',
        subject: 'Updated Young Stylist Mentorship & Saturday Shift Rosters',
        body: 'All stylists: please confirm your training modules and submit any practical assessment reviews before Friday.',
        channel: 'in_app',
      },
      {
        providerId: flagship.provider.id,
        senderId: flagship.owner.id,
        senderRole: 'admin',
        targetGroup: 'all_customers',
        subject: 'Special Offer: Study-Break & Protective Styling',
        body: 'Prepare for exam season with our gentle knotless braids, loc rebalancing, and deep moisture botanical treatments using code GLOW20.',
        channel: 'email',
      },
    ],
  });

  // ── Seed Floor 1: Stylist Contracts & Young Stylist Programme Agreements ──
  await prisma.stylistContract.createMany({
    data: [
      {
        providerId: flagship.provider.id,
        professionalId: flagship.professionals[0].id,
        stylistName: 'Nomvula Dlamini',
        contractType: 'permanent',
        startDate: '2024-02-01',
        commissionRate: 0.5,
        pathwayStage: 'EMPOWER',
        mentorshipHoursPerMonth: 20,
        status: 'active',
        signedAt: '2024-01-28',
        documentRef: 'HER-CON-0001',
      },
      {
        providerId: flagship.provider.id,
        professionalId: flagship.professionals[1].id,
        stylistName: 'Zanele Khumalo',
        contractType: 'fixed_term',
        startDate: '2024-03-01',
        endDate: '2027-02-28',
        commissionRate: 0.45,
        pathwayStage: 'GROW',
        mentorshipHoursPerMonth: 10,
        probationEndsAt: '2024-05-31',
        status: 'active',
        signedAt: '2024-02-20',
        documentRef: 'HER-CON-0002',
      },
      {
        providerId: flagship.provider.id,
        professionalId: flagship.professionals[2].id,
        stylistName: 'Keisha Adams',
        contractType: 'learnership',
        startDate: '2025-01-15',
        endDate: '2026-01-14',
        commissionRate: 0.4,
        pathwayStage: 'EARN',
        mentorshipHoursPerMonth: 40,
        probationEndsAt: '2025-04-15',
        status: 'active',
        signedAt: '2025-01-10',
        documentRef: 'HER-CON-0003',
      },
      {
        providerId: flagship.provider.id,
        professionalId: flagship.professionals[3].id,
        stylistName: 'Lindiwe Mbeki',
        contractType: 'learnership',
        startDate: '2025-01-15',
        endDate: '2026-01-14',
        commissionRate: 0.35,
        pathwayStage: 'PRACTISE',
        mentorshipHoursPerMonth: 45,
        status: 'active',
        signedAt: '2025-01-12',
        documentRef: 'HER-CON-0004',
      },
      {
        providerId: flagship.provider.id,
        professionalId: flagship.professionals[4].id,
        stylistName: 'Amahle Sithole',
        contractType: 'learnership',
        startDate: '2025-02-01',
        endDate: '2026-01-31',
        commissionRate: 0.3,
        pathwayStage: 'LEARN',
        mentorshipHoursPerMonth: 60,
        status: 'active',
        signedAt: '2025-01-29',
        documentRef: 'HER-CON-0005',
      },
    ],
  });

  await prisma.programmeAgreement.create({
    data: {
      providerId: flagship.provider.id,
      cohort: '2025',
      name: 'Young Stylist Programme — Cohort 2025',
      startDate: '2025-01-15',
      endDate: '2026-01-14',
      capacity: 6,
      enrolledNames: ['Keisha Adams', 'Lindiwe Mbeki', 'Amahle Sithole'],
      mentorNames: ['Nomvula Dlamini', 'Zanele Khumalo'],
      curriculumModules: [
        'Practical salon experience & professional standards',
        'Customer service & appointment management',
        'Hygiene & safety awareness',
        'Portfolio development',
        'Financial literacy & business knowledge',
        'Entrepreneurship skills',
        'Diverse hair textures & techniques',
      ],
      stipendAmount: 2500,
      status: 'active',
    },
  });

  // ── Seed Floor 1: POPIA Consent Records & Customer Loyalty Profiles ──
  await prisma.consentRecord.createMany({
    data: [
      {
        providerId: flagship.provider.id,
        customerId: thandiwe.id,
        customerEmail: thandiwe.email,
        customerName: thandiwe.fullName,
        type: 'special_info',
        granted: true,
        version: '1.2',
      },
      {
        providerId: flagship.provider.id,
        customerId: thandiwe.id,
        customerEmail: thandiwe.email,
        customerName: thandiwe.fullName,
        type: 'marketing',
        granted: true,
        version: '1.2',
      },
      {
        providerId: flagship.provider.id,
        customerId: sipho.id,
        customerEmail: sipho.email,
        customerName: sipho.fullName,
        type: 'special_info',
        granted: true,
        version: '1.2',
      },
    ],
  });

  await prisma.customerLoyalty.createMany({
    data: [
      {
        email: 'thandiwe@herbeauty.co.za',
        customerName: 'Thandiwe Ndlovu',
        tier: 'HER Circle',
        preferredStylist: 'Nomvula Dlamini (Master Texture Specialist)',
        hairType: 'Type 4C Coily Texture, High Porosity',
        skinConcerns: 'Hydration Focus, Gentle Botanical Care',
        allergies: 'Sulfates & Mineral Oils (Prefers Shea, Argan & Jojoba botanicals)',
        beautyPoints: 4850,
        referralCode: 'THANDIWE-HER',
        birthdayOfferEligible: true,
        savedCardLast4: '4921 (Standard Bank Student Debit)',
        memberSince: 'January 2024',
      },
      {
        email: 'thandiwe@bookingtrack.com',
        customerName: 'Thandiwe Ndlovu',
        tier: 'HER Circle',
        preferredStylist: 'Nomvula Dlamini (Master Texture Specialist)',
        hairType: 'Type 4C Coily Texture, High Porosity',
        skinConcerns: 'Hydration Focus, Gentle Botanical Care',
        allergies: 'Sulfates & Mineral Oils (Prefers Shea, Argan & Jojoba botanicals)',
        beautyPoints: 4850,
        referralCode: 'THANDIWE-HER',
        birthdayOfferEligible: true,
        savedCardLast4: '4921 (Standard Bank Student Debit)',
        memberSince: 'January 2024',
      },
      {
        email: 'sipho@bookingtrack.com',
        customerName: 'Sipho Khuzwayo',
        tier: 'Campus Member',
        preferredStylist: 'Nomvula Dlamini (Master Texture Specialist)',
        hairType: 'Type 4B Locs, Medium Porosity',
        skinConcerns: 'Scalp Rebalancing & Rosemary Hydration',
        allergies: 'None recorded',
        beautyPoints: 2950,
        referralCode: 'SIPHO-HER',
        birthdayOfferEligible: true,
        savedCardLast4: '8812 (FNB Student Cheque)',
        memberSince: 'March 2024',
      },
      {
        email: 'sipho@herbeauty.co.za',
        customerName: 'Sipho Khuzwayo',
        tier: 'Campus Member',
        preferredStylist: 'Nomvula Dlamini (Master Texture Specialist)',
        hairType: 'Type 4B Locs, Medium Porosity',
        skinConcerns: 'Scalp Rebalancing & Rosemary Hydration',
        allergies: 'None recorded',
        beautyPoints: 2950,
        referralCode: 'SIPHO-HER',
        birthdayOfferEligible: true,
        savedCardLast4: '8812 (FNB Student Cheque)',
        memberSince: 'March 2024',
      },
    ],
  });

  // ── Seed Initial Audit Log Entries ──
  await prisma.auditLog.createMany({
    data: [
      {
        entity: 'Provider',
        entityId: flagship.provider.id,
        action: 'onboard',
        actorId: founderUser.id,
        actorEmail: founderUser.email,
        actorRole: 'master',
        justification: 'Onboarded flagship studio HER Beauty — Flagship Studio',
        ipAddress: '196.21.104.12',
        providerId: flagship.provider.id,
      },
      {
        entity: 'Booking',
        entityId: b1.id,
        action: 'create',
        actorId: thandiwe.id,
        actorEmail: thandiwe.email,
        actorRole: 'customer',
        justification: `Booked "${b1.serviceName}" (${b1.referenceCode}) at ${flagship.provider.name}`,
        ipAddress: '105.224.88.41',
        providerId: flagship.provider.id,
      },
      {
        entity: 'Contract',
        entityId: 'HER-CON-0003',
        action: 'create',
        actorId: flagship.owner.id,
        actorEmail: flagship.owner.email,
        actorRole: 'admin',
        justification: 'Enrolled Keisha Adams in Young Stylist Programme Cohort 2025 (EARN pathway stage)',
        ipAddress: '196.21.104.15',
        providerId: flagship.provider.id,
      },
    ],
  });

  logger.info('[seed] HER Beauty (Floor 1 on BookingTrack Foundation) database seed completed!');
}

main()
  .catch((err) => {
    logger.error({ err }, '[seed] Fatal seed error:');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
