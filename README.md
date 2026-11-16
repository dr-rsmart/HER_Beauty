# HER Beauty — Studio & Social Enterprise (on BookingTrack Foundation)

- **Live Production App (Railway):** [her-beauty-production.up.railway.app](https://her-beauty-production.up.railway.app/)
- **GitHub Repository:** [https://github.com/dr-rsmart/HER_Beauty](https://github.com/dr-rsmart/HER_Beauty)

**Contemporary student-centred hair, nails & beauty studio and social enterprise** — built with **BookingTrack** as the **Foundation** (Express 5 + Prisma PostgreSQL + React 19 + React Router 7 + RBAC + atomic slot transactions + SSE real-time + immutable AuditLog) and **HER Beauty** as **Floor 1** (Director Mrs Monean N Jacobs, Warm Copper / Deep Espresso / Linen design system, **The HER Pathway** `LEARN → PRACTISE → EARN → GROW → EMPOWER`, 21 services across 5 revenue streams, Specials, Stylist Contracts, Cohort 2025 Young Stylist Programme, and POPIA governance).

---

## Architecture & Improvements over Base44

| Area | Base44 Prototype | BookingTrack (TimeTrack Architecture) |
| --- | --- | --- |
| **Schema & Typing** | Untyped document collections | Native Prisma PostgreSQL schema (`Role`, `ProviderStatus`, `SlotStatus`, `BookingStatus`) + composite indexes |
| **Slot Reservation** | Separate client-side `Booking.create` + `Slot.update` calls | Atomic Prisma `$transaction` preventing double-booking race conditions and releasing slots automatically on cancellation |
| **Authentication** | Third-party client token | `httpOnly` cookie-first JWT (`bt_token`) + `pwdEpoch` session revocation + forced temporary password rotation |
| **Multi-Tenancy & RBAC** | Flat `owner_email` filter | `master` (cross-tenant platform governance & impersonation), `admin`, `manager`, `employee`, `customer` |
| **Audit Trail** | None | Immutable `AuditLog` with before/after JSON diffs + POPIA IP redaction |
| **Real-Time** | Polling / manual reload | Managed SSE broadcaster (`/api/events`) with heartbeats, per-user connection caps, and live dashboard/booking updates |
| **Observability** | None | Deep health (`/health`), readiness (`/ready`), liveness (`/live`), ping (`/ping`), and Prometheus metrics (`/metrics`) |

---

## Seeded Accounts

Standard accounts use password: **`Password123`**. All Master accounts use password: **`ChangeMe123!`**.

| Email | Alias | Role | Password | Business / Persona |
| --- | --- | --- | --- | --- |
| `founder@herbeauty.co.za` | — | `master` | `ChangeMe123!` | Mrs Monean N Jacobs — Platform Director & Master Governance |
| `admin@herbeauty.co.za` | `admin@bookingtrack.com` | `admin` | `Password123` | Chloe Laurent — **HER Beauty — Flagship Studio** |
| `tygervalley@herbeauty.co.za` | `thabo@bookingtrack.com` | `manager` | `Password123` | Thabo Mokoena — **Tygervalley Medical & Campus Hub** |
| `rondebosch@herbeauty.co.za` | `ayesha@bookingtrack.com` | `manager` | `Password123` | Ayesha Pillay — **Rondebosch Student Sanctuary** |
| `coetzenburg@herbeauty.co.za` | `pieter@bookingtrack.com` | `admin` | `Password123` | Pieter van der Merwe — **Coetzenburg Wellness & Skin Bar** |
| `academy@herbeauty.co.za` | `naledi@bookingtrack.com` | `admin` | `Password123` | Naledi Khumalo — **Young Stylist Academy & Training Hub** |
| `events@herbeauty.co.za` | `riaan@bookingtrack.com` | `admin` | `Password123` | Riaan Botha — **Winelands Bridal & Events Collective** |
| `nomvula@herbeauty.co.za` | — | `manager` | `Password123` | Nomvula Dlamini — Master Stylist & Senior Mentor (EMPOWER) |
| `thandiwe@herbeauty.co.za` | — | `customer` | `Password123` | Thandiwe Ndlovu — VIP Customer (HER Circle) |
| `sipho@herbeauty.co.za` | `sipho@bookingtrack.com` | `customer` | `Password123` | Sipho Khuzwayo — Customer |
| `anke@herbeauty.co.za` | `lerato@bookingtrack.com` | `customer` | `Password123` | Anke van der Merwe — Customer |

---

## Quick Start

```bash
# 1. Install dependencies, push Prisma schema, and seed demo data
npm run setup

# 2. Run API (:4000) and Web (:5173) concurrently
npm run dev
```

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run Express 5 API + Vite web concurrently |
| `npm run setup` | Install root & server deps, push Prisma schema, seed database |
| `npm run seed` | Re-seed South African businesses, slots, bookings & users |
| `npm run build` | Build frontend (`dist/`) and backend (`server/dist/`) |
| `npm run typecheck` | Typecheck frontend and backend |
| `npm test` | Run Vitest unit & API integration suite |
