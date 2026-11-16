# HER Beauty — Project Scope

> Contemporary student-centred beauty studio & social enterprise in Jamestown, Western Cape.
> Founder: Dr Kim Dreyer. Brand promise: **where beauty meets opportunity.**

---

## 0. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| UI | React 18 · TypeScript 5.6 |
| Styling | Tailwind CSS 3.4 (custom `brand` palette) |
| Icons | `lucide-react` |
| Dates | `date-fns` |
| Class utils | `clsx` + `tailwind-merge` |
| Persistence | **File-backed singleton** (`src/lib/data-store.ts` → `.data/her-beauty-store.json`) |
| Real-time | **Server-Sent Events** (`/api/events` + `src/lib/sse.ts` + `src/lib/useSSE.ts`) |
| Deck tooling | Python 3.14 + `python-pptx` 1.0.2 + `Pillow` |

Scripts: `npm run dev` · `build` · `start` · `lint` (`lint` = `next lint`,
configured via `.eslintrc.json`; `next build` skips ESLint via `next.config.js`).

---

## 1. FEATURES (BookingTrack Functional Parity)

### 1.1 Architecture — role portals, session auth & simulator

`src/app/page.tsx` loads every dataset in a single `Promise.all`, subscribes to
real-time Server-Sent Events (`/api/events`), and swaps a portal based on
`currentRole`. Seamless 1-click role switching in `Navigation.tsx` is paired
with full session authentication, customer registration, password rotation,
POPIA privacy & concierge support (`AuthSecurityModal.tsx`), and Master
branch impersonation / Persona Simulator.

| Role | Component |
|---|---|
| `master` | `MasterPortal.tsx` |
| `admin` | `AdminPortal.tsx` |
| `stylist` | `StylistPortal.tsx` |
| `customer` | `CustomerPortal.tsx` |

Shared chrome: `Navigation.tsx` (sticky header, Master Impersonation / Simulator
banner, announcement bar, role pills, live SSE indicator badge, Account &
Security trigger, profile trigger), `LayerProfileModal.tsx`,
`AuthSecurityModal.tsx`, `AuditTrailView.tsx`, `SlotGeneratorPanel.tsx`,
`PathwayBadge.tsx`, and `BrandLogo.tsx`.

Brand facts live in a single source of truth, `src/lib/brand.ts` (`BRAND`,
`FOUNDER`, `CONTACT`, `PATHWAY_STAGES`, `REVENUE_STREAMS`, `BRAND_PILLARS`,
`BRAND_ASSOCIATIONS`, `LOYALTY_TIERS`, `BRAND_ASSETS`).
`BrandLogo` is rendered on every surface — nav, all four portals, modals,
the loading screen and the footer.

### 1.2 Customer Portal

- Hero driven by editable `LandingPageContent` (title, subtitle, image,
  announcement bar, brand story, address, hours).
- Service discovery with live keyword search, category filtering, bookability
  filtering, `priceNote` and `popular` badges.
- **Booking engine** (`#booking-engine`) — 4 steps: service → stylist (including
  **"Any Available Artisan"** auto-assignment) → 14-day interactive date strip +
  live conflict-free slots → client intake & POPIA confirmation. Slots come from
  `/api/bookings/slots`, combining explicit `AvailabilitySlot` records with
  weekly `StylistScheduleRule[]`, approved `StylistLeave[]`, service duration
  and existing bookings.
- **Meet Our Artisans** (`#our-artisans`) — showcase of active stylists with
  pathway badges, ratings, specialties and 1-click "Book with [Artisan]".
- **My Bookings & 24-Hour Reminders** (`#my-bookings`) — 24h upcoming reminder
  banner, Upcoming vs Past & Cancelled appointments, and customer booking
  cancellation with automatic slot release.
- Promo codes against `SpecialOffer`, featured specials, featured stylists,
  deposit amount and a `referenceCode` on confirmation.
- Customer profile: tier (`HER Circle` / `Campus Member` / `Community Member`),
  hair type, skin concerns, allergies, preferred stylist, beauty points,
  referral code, birthday-offer eligibility.
- **Booking terms & POPIA consent** (slides 02/09): the confirm step requires
  acceptance of the `BookingPolicy` clauses (deposit %, cancellation window,
  no-show fee) and POPIA consent for special personal information — recorded
  via `POST /api/contracts`.

### 1.3 Stylist Portal

KPI cards (Today's Schedule, Awaiting Confirmation, Projected Commission,
Approved Leaves) and tabs: **appointments** (filter by `All`, `Today`,
`Upcoming`, `Pending`, `In Progress`, `Completed`, `Cancelled`; actions:
`Confirm`, `Start Service`, `Mark Completed`, `Send Reminder`, `Cancel` with
slot release), **schedule** (interactive 7-day working-hours editor + embedded
**Bulk Availability Slot Generator**), **leaves** (request, view & remove
blackouts), **profile** (bio, specialties, interactive service-offering pills,
commission rate). A **contract & commission summary card** (from
`StylistContract`) shows the active agreement type, commission, mentorship hours
and term.

### 1.4 Admin Portal

Tabs: **overview** (4 live KPI cards — Today, Upcoming, Awaiting Confirmation,
Completed Revenue — plus Today's Salon Schedule with instant actions),
**bookings** (full Bookings Manager with status tabs, search, stylist filter,
Confirm, Start, Complete, Send Reminder & Cancel with slot release),
**stylists** (provision new stylists, edit existing team members & service
assignments, toggle `Available` switch, remove stylists), **services** (CRUD,
`Bookable` toggle switch, `priceNote`, and `Who can perform it` stylist pills),
**availability** (Bulk Slot Generator across 1–8 weeks + explicit slot
lock/unlock/remove + leaves & weekly hours), **specials**, **cms**, **brand**,
**comms**, **contracts**, **audit** (Immutable Audit Trail with entity filter,
search, POPIA IP redaction & before/after JSON diffs), and **profile**.

### 1.5 Master Portal

Tabs: **overview** (Enterprise metrics, **Social Impact — The HER Pathway**,
Stylist Revenue Attribution, Service Performance, and **Contracts & Compliance
Governance**), **branches** (**Studio Branch Control Center**: cross-branch KPIs,
search, onboard new studio branch with temporary password reveal modal,
active/suspended toggle switch, and 1-click branch impersonation),
**simulator** (**Platform Simulator** launching Executive, Salon Admin, Stylist
and VIP Client personas with a top return banner), and **audit** (Master
Immutable Audit Trail).

### 1.6 The HER Pathway — social-impact spine

`LEARN → PRACTISE → EARN → GROW → EMPOWER` is a first-class domain concept, not
decoration:

- on the `Stylist` type (`pathwayStage`, `pathwayRole`);
- rendered by `PathwayBadge` (light and dark surface variants);
- measured in `EnterpriseMetrics`;
- the recurring chevron motif on slides 1, 2 and 8 of the business-plan deck.

### 1.7 API surface

All under `src/app/api/**`, uniform `{ success, ...payload }` /
`{ success: false, error }` contract with `try/catch` + HTTP 500:

`stylists` · `stylists/[id]` · `services` · `services/[id]` · `bookings` ·
`bookings/slots` · `slots` · `specials` · `broadcasts` · `landing` · `brand` ·
`profiles` · `enterprise/metrics` · `contracts` · `audit` · `master` · `auth` ·
`events` (SSE) · `health`.

### 1.8 Business-plan deck

`presentation/generate_pptx.py` → `presentation/HER_Business_Plan.pptx`:
10 slides, 16:9, token-driven, with reusable helpers (`add_header`, `add_card`,
`add_bullets`, `add_pathway`, `add_logo`). Uses the slimmed
`presentation/her-logo-deck.png` (512 px) instead of the 2 MB master artwork
(`her-logo-master.jpg`), and measures the real PNG aspect ratio from the IHDR
chunk.

Regenerate with:

```powershell
cd presentation; python generate_pptx.py
```

### 1.9 Explicitly out of scope today

No auth/session · no persistence (state resets on server restart) · no payment
gateway (deposits are flags) · no real email/SMS delivery · no image upload
(Unsplash URLs) · no tests.

### 1.10 Contracts, policies & consent

Four domain entities model the governance layer of the business concept:

- `BookingPolicy` — deposit %, cancellation window, no-show fee, late-arrival
  grace, retail returns, clause text. Drives the booking-engine T&Cs and the
  deposit calculation (`createBooking`).
- `StylistContract` — type (`permanent` / `fixed_term` / `learnership` /
  `independent`), commission, pathway stage, mentorship hours, probation,
  status, signing reference.
- `ConsentRecord` — POPIA / marketing / special-information consent, versioned
  and revocable; written on booking confirmation.
- `ProgrammeAgreement` — the Young Stylist Programme (cohort, curriculum
  modules, capacity, mentors, stipend), linking a `learnership` contract to a
  structured pathway.

Surfaced in Admin (Contracts tab), Stylist (contract card), Master (governance)
and Customer (T&C + POPIA checkboxes). `GET` / `POST /api/contracts`. **Legal
copy is plain-language and not legal advice.**

---

## 2. UI/UX — COLOUR SCHEME

### 2.1 Palette

Single source of truth: `tailwind.config.ts` → `theme.extend.colors.brand`.
Derived from `her-logo.png`: **warm copper / rose-gold metallic on linen-ivory
and deep espresso.**

| Token | Hex | Role |
|---|---|---|
| `brand-dark` | `#1F1614` | Deep espresso — nav, footer, dark bands |
| `brand-dark2` | `#2C1E1B` | Lighter espresso — cards on dark |
| `brand-copper` | `#9E5540` | **Primary accent** — CTAs, active states, rules |
| `brand-copperLight` | `#D49B88` | Secondary accent, hovers |
| `brand-copperPale` | `#E2B8AB` | Champagne highlight — text on espresso |
| `brand-linen` | `#FAF6F0` | Warm ivory — page background, light text |
| `brand-card` | `#FFFFFF` | Elevated card surface |
| `brand-textDark` | `#241B18` | Deep warm charcoal body text |
| `brand-muted` | `#7D6F6A` | Muted taupe — captions |
| `brand-mutedLight` | `#B5A59E` | Soft taupe — borders, tertiary text |

A compatibility ramp (`brand-50…900`) and aliases (`gold`, `rose`, `charcoal`,
`cream`) keep older utility classes working.

**The Python deck constants (`DARK`, `DARK2`, `COPPER`, `COPPER_LIGHT`,
`COPPER_PALE`, `LINEN`, `CARD`, `TEXT_DARK`, `MUTED`, `MUTED_LIGHT`) are
byte-identical to these hexes — web and deck are one design system.**

### 2.2 Typography

- **Display / headings:** Playfair Display (`--font-playfair`, `font-serif`),
  auto-applied to `h1–h4`; wide tracking (`tracking-[0.25em]`) for the wordmark.
- **Body / UI:** Plus Jakarta Sans (exposed as `--font-sans`; `font-sans` maps
  to it via `tailwind.config.ts`).
- **Data / labels:** `font-mono` for role badges, pathway stages, metric captions.
- **Deck:** Segoe UI for both roles (Playfair is not guaranteed on a presenting
  machine).

### 2.3 Signature treatments (`globals.css`)

- `.luxury-gradient` — `135deg, #1f1614 → #2c1e1b → #3a221b`.
- `.gold-gradient-text` / `.rose-gold-gradient-text` — clipped copper gradients.
- Custom 6 px scrollbars: linen track, `copperLight` thumb → `copper` on hover.
- Logo mark: the app renders the full `her-logo-master.jpg` artwork directly
  (served from `public/logo/her-logo-master.jpg`) on a light surface via
  `BrandLogo`. `favicon.ico`, `icon.svg` and `og.png` remain derived raster
  assets produced by `scripts/prepare_brand_assets.py`.


### 2.4 Semantic colour rules

- **Copper = action & authority** — active nav pill, primary buttons, card top
  accent bars, focus rings.
- **Espresso = structure** — nav, footer, hero overlays, stat bands.
- **Linen = canvas** — never pure white at page level; white is reserved for
  elevated cards.
- **Pathway encoding** — GROW/EMPOWER (mentors) carry solid copper
  (`bg-brand-copper/15 text-brand-copper`); LEARN/PRACTISE/EARN (developing
  talent) carry linen (`bg-brand-linen text-brand-muted`). Deliberately
  different, never "lesser". A dark-surface variant exists for espresso panels.
- **Role identity borders** — master `border-brand-copper`, admin
  `border-rose-400`, stylist `border-blue-400`, customer `border-emerald-400`.
- Non-brand hues (emerald / amber / rose / blue) appear **only** for status
  semantics: confirmed / pending / cancelled / info.

### 2.5 Layout & interaction conventions

`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` containers · `rounded-2xl` /
`rounded-3xl` cards · `shadow-2xl` on hero, `shadow-md` on active pills ·
`transition-all` on interactive elements · sticky `z-50` header with
`backdrop-blur-md` · `scroll-mt-24` anchors · below `lg` the role switcher
falls back to a native `<select>`.

---

## 3. Known consistency debt

1. No persistence layer — contracts, consent records and metrics live only in
   the in-memory store and reset on server restart. Introducing a storage seam
   is the largest outstanding piece of real engineering.
2. Enterprise metrics are seeded/illustrative (labelled as such in the Master
   portal) — real instrumentation would replace the `+ historical base` offsets
   in `getEnterpriseMetrics()`.
3. Booking "payment" is a flag; there is no payment gateway or real deposit
   capture.

### Resolved

- `stone-*` greys across all four portals migrated to the `brand` tokens
  (`brand-dark`, `brand-dark2`, `brand-muted`, `brand-mutedLight`,
  `brand-copperPale`, `brand-linen`) — 762 occurrences, zero remaining.
- `--font-inter` → `--font-sans` (the variable now matches Plus Jakarta Sans).
- Gradient "H" placeholder logo replaced by real raster assets + `BrandLogo`
  (the old `via-rose-300` gradient is gone).
- `bg-[#faf8f5]` in `page.tsx` → `bg-brand-linen` (token-governed).
- ESLint: `.eslintrc.json` (`next/core-web-vitals`) + `eslint` /
  `eslint-config-next` devDependencies, with `next.config.js`
  `eslint.ignoreDuringBuilds: true` so `next build` does not require a local
  install. Run `npm install` once to enable `npm run lint`.
- Deck logo aspect ratio was hardcoded to `718/577` while the asset is square
  (2048×2048), stretching every logo ~24% → now measured from the PNG header.
- Deck weight 2.03 MB → 240 KB via `presentation/her-logo-deck.png` (512 px);
  the fallback master now points at the real `her-logo-master.jpg`.
- Slide 5 `+` connectors overlapped chip edges → now centred in the gaps.
- Slide 9 footnote overlapped the standard footer → raised to 6.72".
