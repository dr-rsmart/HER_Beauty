import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.resolve(__dirname, '../test pack/screenshots');
const RAW_DIR = path.join(SCREENSHOT_DIR, 'raw');

fs.mkdirSync(RAW_DIR, { recursive: true });

const VIEWPORT = { width: 1440, height: 860 };
const SCALE = 2;
const BASE_URL = 'http://localhost:5176';

const manifest = {};

async function getBox(locator, padding = 6) {
  try {
    const count = await locator.count();
    if (count === 0) return null;
    const target = locator.first();
    if (!(await target.isVisible())) return null;
    const box = await target.boundingBox();
    if (!box) return null;
    if (
      box.width <= 0 ||
      box.height <= 0 ||
      box.y + box.height <= 8 ||
      box.y >= VIEWPORT.height - 8 ||
      box.x + box.width <= 8 ||
      box.x >= VIEWPORT.width - 8
    ) {
      return null;
    }
    const x = Math.max(6, box.x - padding);
    const y = Math.max(6, box.y - padding);
    const right = Math.min(VIEWPORT.width - 6, box.x + box.width + padding);
    const bottom = Math.min(VIEWPORT.height - 6, box.y + box.height + padding);
    const w = right - x;
    const h = bottom - y;
    if (w <= 12 || h <= 12) return null;
    return {
      x: Math.round(x * SCALE),
      y: Math.round(y * SCALE),
      w: Math.round(w * SCALE),
      h: Math.round(h * SCALE),
    };
  } catch {
    return null;
  }
}

async function snap(page, id, urlLabel, calloutSpecs) {
  await page.waitForTimeout(450);
  const rawPath = path.join(RAW_DIR, `${id}.png`);
  await page.screenshot({ path: rawPath, fullPage: false });

  const callouts = [];
  for (let i = 0; i < calloutSpecs.length; i++) {
    const spec = calloutSpecs[i];
    const box = await getBox(spec.locator, spec.pad ?? 6);
    if (box) {
      callouts.push({
        num: i + 1,
        label: spec.label,
        shape: spec.shape || 'rect',
        ...box,
      });
    } else {
      console.warn(`  [warn] Callout ${i + 1} (${spec.label}) not visible on ${id}`);
    }
  }
  manifest[id] = {
    id,
    rawFile: rawPath,
    annotatedFile: path.join(SCREENSHOT_DIR, `${id}.png`),
    url: urlLabel || page.url(),
    callouts,
  };
  console.log(`  Captured ${id}.png (${callouts.length} callouts)`);
}

async function newRolePage(browser) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
  });
  const page = await ctx.newPage();
  return { ctx, page };
}

async function loginWithScreen(page, email, password, snapId) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#email');
  await page.fill('#email', email);
  await page.fill('#password', password);
  if (snapId) {
    await snap(page, snapId, `${BASE_URL}/login`, [
      { locator: page.locator('#email'), label: `Enter ${email}` },
      { locator: page.locator('#password'), label: 'Enter Password' },
      { locator: page.locator('button[type="submit"]'), label: 'Click "Log in"' },
    ]);
  }
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 12000 });
  await page.waitForLoadState('networkidle');
}

async function captureAll() {
  const browser = await chromium.launch({ headless: true });

  // =========================================================================
  // 1. PUBLIC & CLIENT / STUDENT FLOW (thandiwe@herbeauty.co.za)
  // =========================================================================
  console.log('--- Group: Public & Client / Student Flow ---');
  {
    const { ctx, page } = await newRolePage(browser);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=HER Beauty — Flagship Studio', { timeout: 12000 });

    await snap(page, '21_home_browse', `${BASE_URL}/`, [
      { locator: page.locator('text=GLOW20').first(), label: 'Check GLOW20 Privilege Banner', pad: 6 },
      { locator: page.locator('input[placeholder*="Search" i]').first(), label: 'Search Studios or Treatments' },
      { locator: page.locator('button:has-text("Hair, Nails & Protective Styling")').first(), label: 'Filter by Beauty Category' },
    ]);

    // Click Flagship Studio
    const flagshipLink = page.locator('a[href^="/providers/"]:has-text("HER Beauty — Flagship Studio")').first();
    const studioHref = await flagshipLink.getAttribute('href');
    await flagshipLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Wash, Deep Moisture Treatment & Silk Blowout', { timeout: 10000 });

    await snap(page, '22_studio_public_page', `${BASE_URL}${studioHref}`, [
      { locator: page.locator('h1').first(), label: 'Flagship Studio & Location' },
      { locator: page.getByRole('button', { name: /Book an appointment/i }).or(page.locator('a[href$="/book"]')).first(), label: 'Click "Book an appointment"' },
      { locator: page.locator('text=4 White Heart').first(), label: 'Jamestown Address & Hours', pad: 10 },
    ]);

    // Scroll to Artisans Showcase on public studio page (for Artisan test pack!)
    const artisansHeading = page.locator('h2:has-text("Meet Our Artisans")').first();
    if (await artisansHeading.count()) {
      await artisansHeading.evaluate((el) => {
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 85);
      });
      await page.waitForTimeout(400);
      await snap(page, '20_artisan_public_showcase', `${BASE_URL}${studioHref}`, [
        { locator: page.locator('div.rounded-2xl.border.bg-card:has-text("Amahle Sithole")').first(), label: 'Amahle · LEARN Apprentice' },
        { locator: page.locator('div.rounded-2xl.border.bg-card:has-text("Keisha Adams")').first(), label: 'Keisha · EARN Fellow' },
        { locator: page.locator('div.rounded-2xl.border.bg-card:has-text("Nomvula Dlamini")').first(), label: 'Nomvula · EMPOWER Mentor' },
      ]);
    }

    // Login as Student Client Thandiwe Ndlovu
    await loginWithScreen(page, 'thandiwe@herbeauty.co.za', 'Password123', '23_login_client');

    // Go to Flagship Studio Book Wizard
    await page.goto(`${BASE_URL}${studioHref}/book`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Wash, Deep Moisture Treatment & Silk Blowout', { timeout: 10000 });

    // Step 1: Select Service
    const svcBtn = page.locator('button:has-text("Wash, Deep Moisture Treatment & Silk Blowout")').first();
    await svcBtn.click();
    await page.getByRole('button', { name: /^Continue$/i }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await snap(page, '24_book_step1_service', `${BASE_URL}${studioHref}/book`, [
      { locator: svcBtn, label: 'Select Silk Blowout (R 320)' },
      { locator: page.locator('button:has-text("Wig Installation & Custom Styling")').first(), label: 'Compare Services & ZAR Rates' },
      { locator: page.getByRole('button', { name: /^Continue$/i }), label: 'Click "Continue"' },
    ]);

    await page.getByRole('button', { name: /^Continue$/i }).click();
    await page.waitForTimeout(350);

    // Step 2: Select Artisan
    const proBtn = page.locator('button:has-text("Nomvula Dlamini")').first();
    await proBtn.click();
    await page.getByRole('button', { name: /^Continue$/i }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await snap(page, '25_book_step2_artisan', `${BASE_URL}${studioHref}/book`, [
      { locator: proBtn, label: 'Select Nomvula Dlamini (EMPOWER)' },
      { locator: page.locator('button:has-text("Zanele Khumalo")').first(), label: 'Compare Pathway Stage Badges' },
      { locator: page.getByRole('button', { name: /^Continue$/i }), label: 'Click "Continue"' },
    ]);

    await page.getByRole('button', { name: /^Continue$/i }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Step 3: Pick Date & Open Slot (pick day index 3 so it doesn't collide with seeded bookings)
    const dayBtns = page.locator('div.no-scrollbar button');
    if ((await dayBtns.count()) > 3) {
      await dayBtns.nth(3).click();
      await page.waitForTimeout(500);
    }
    const openSlot = page.locator('div.grid button').first();
    await openSlot.waitFor({ state: 'visible', timeout: 8000 });
    await openSlot.click();
    await page.waitForTimeout(250);
    await snap(page, '26_book_step3_slot', `${BASE_URL}${studioHref}/book`, [
      { locator: dayBtns.nth(3), label: 'Pick Preferred Date' },
      { locator: openSlot, label: 'Select Open Chair Slot' },
      { locator: page.getByRole('button', { name: /^Continue$/i }), label: 'Click "Continue"' },
    ]);

    await page.getByRole('button', { name: /^Continue$/i }).click();
    await page.waitForTimeout(400);

    // Step 4: Apply Promo Code CAMPUS20 + Tick Policy & POPIA
    await page.fill('#promo-code', 'CAMPUS20');
    await page.getByRole('button', { name: /^Apply$/i }).click();
    await page.waitForTimeout(500);
    const checkboxes = page.locator('input[type="checkbox"]');
    if ((await checkboxes.count()) >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
    }
    // Scroll so promo card, POPIA checkboxes, and Confirm booking button are all cleanly visible
    const promoCard = page.locator('#promo-code').locator('..').locator('..');
    await promoCard.evaluate((el) => {
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 85);
    });
    await page.waitForTimeout(300);
    await snap(page, '27_book_step4_promo_popia', `${BASE_URL}${studioHref}/book`, [
      { locator: promoCard, label: 'Enter Promo Code "CAMPUS20" & Apply' },
      { locator: checkboxes.nth(0).locator('..').locator('..'), label: 'Tick 20% Deposit Policy & POPIA Boxes' },
      { locator: page.getByRole('button', { name: /Confirm booking/i }), label: 'Click "Confirm booking"' },
    ]);

    // Confirm Booking -> Receipt Screen
    await page.getByRole('button', { name: /Confirm booking/i }).click();
    await page.waitForSelector('text=You’re booked in', { timeout: 10000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await snap(page, '28_book_confirmed_receipt', `${BASE_URL}${studioHref}/book`, [
      { locator: page.locator('text=Booking Reference:').first(), label: 'Unique HER Reference Code' },
      { locator: page.locator('text=20% Booking Policy Deposit').locator('..'), label: '20% Deposit & Discount Summary' },
      { locator: page.getByRole('button', { name: /View my bookings/i }), label: 'Click "View my bookings"' },
    ]);

    // Client My Bookings
    await page.goto(`${BASE_URL}/my-bookings`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=HER-84920', { timeout: 10000 });
    await snap(page, '29_client_my_bookings', `${BASE_URL}/my-bookings`, [
      { locator: page.locator('a[href="/my-bookings"]').first(), label: 'My bookings Menu' },
      { locator: page.locator('section:has-text("Upcoming") > div > div').first(), label: 'Confirmed Appointment & Deposit' },
      { locator: page.getByRole('button', { name: /Cancel booking/i }).first(), label: 'Self-Service Cancel Option' },
    ]);

    // Client Loyalty & Care Profile
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=HER Loyalty & Personalised Care Profile', { timeout: 10000 });
    const loyaltyForm = page.locator('form:has(#loy-hair)').first();
    await loyaltyForm.evaluate((el) => {
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 95);
    });
    await page.waitForTimeout(300);
    await snap(page, '30_client_loyalty_profile', `${BASE_URL}/profile`, [
      { locator: page.locator('text=Beauty Pts').locator('..'), label: 'HER Circle VIP · 4,850 Beauty Pts' },
      { locator: page.locator('#loy-hair'), label: 'Hair Texture & Porosity Profile' },
      { locator: page.getByRole('button', { name: /Save Care Preferences/i }), label: 'Click "Save Care Preferences"' },
    ]);

    await ctx.close();
  }

  // =========================================================================
  // 2. STUDIO DIRECTORS & HUB ADMINS (admin@herbeauty.co.za)
  // =========================================================================
  console.log('--- Group: Studio Directors & Hub Admins ---');
  {
    const { ctx, page } = await newRolePage(browser);
    await loginWithScreen(page, 'admin@herbeauty.co.za', 'Password123', '09_login_director');

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=HER Beauty — Flagship Studio', { timeout: 10000 });
    await snap(page, '10_studio_dashboard_overview', `${BASE_URL}/dashboard`, [
      { locator: page.locator('a[href="/dashboard"]').filter({ hasText: 'Overview' }), label: 'Overview Tab' },
      { locator: page.locator('div.grid > div.rounded-2xl').first(), label: 'Studio KPI Cards' },
      { locator: page.locator('div.rounded-2xl.border.bg-card:has-text("HER-84920")').first(), label: "Today's Client Schedule" },
    ]);

    // Bookings Tab
    await page.goto(`${BASE_URL}/dashboard/bookings`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1:has-text("Bookings")', { timeout: 10000 });
    await page.waitForTimeout(400);
    await snap(page, '11_studio_bookings', `${BASE_URL}/dashboard/bookings`, [
      { locator: page.locator('a[href="/dashboard/bookings"]'), label: 'Bookings Tab' },
      { locator: page.locator('button:has-text("Pending")').first(), label: 'Filter by Status' },
      { locator: page.locator('div.mt-8.space-y-4 > div.rounded-2xl').first(), label: 'Confirm / Complete Appointment' },
    ]);

    // Services & Streams Tab
    await page.goto(`${BASE_URL}/dashboard/services`, { waitUntil: 'networkidle' });
    await page.waitForSelector('button:has-text("Add service")', { timeout: 10000 });
    await snap(page, '12_studio_services', `${BASE_URL}/dashboard/services`, [
      { locator: page.locator('a[href="/dashboard/services"]'), label: 'Click "Services & Streams" Tab' },
      { locator: page.getByRole('button', { name: /Add service/i }).first(), label: 'Click "+ Add service"' },
      { locator: page.locator('div.mt-8.space-y-4 > div.rounded-2xl').first(), label: 'Verify ZAR Rates & Bookable Switch' },
    ]);

    // Artisans & Pathway Tab
    await page.goto(`${BASE_URL}/dashboard/team`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Nomvula Dlamini', { timeout: 10000 });
    await snap(page, '13_studio_artisans_pathway', `${BASE_URL}/dashboard/team`, [
      { locator: page.locator('a[href="/dashboard/team"]'), label: 'Click "Artisans & Pathway" Tab' },
      { locator: page.getByRole('button', { name: /Add professional/i }).first(), label: 'Click "+ Add professional"' },
      { locator: page.locator('div.rounded-2xl.border.bg-card:has-text("Amahle Sithole")').first(), label: 'Check Pathway Stage & Commission' },
    ]);

    // Availability Tab
    await page.goto(`${BASE_URL}/dashboard/availability`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Open up time slots', { timeout: 10000 });
    await snap(page, '14_studio_availability', `${BASE_URL}/dashboard/availability`, [
      { locator: page.locator('a[href="/dashboard/availability"]'), label: 'Click "Availability" Tab' },
      { locator: page.locator('#slot-pro'), label: 'Choose Artisan, Date & Time Range' },
      { locator: page.getByRole('button', { name: /Add slots/i }).first(), label: 'Click "Add slots"' },
    ]);

    // Specials & Comms Tab
    await page.goto(`${BASE_URL}/dashboard/specials`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=CAMPUS20', { timeout: 10000 });
    await snap(page, '15_studio_specials_comms', `${BASE_URL}/dashboard/specials`, [
      { locator: page.locator('a[href="/dashboard/specials"]'), label: 'Click "Specials & Comms" Tab' },
      { locator: page.getByRole('button', { name: /New Campus Special/i }).first(), label: 'Click "New Campus Special"' },
      { locator: page.locator('div.rounded-2xl.border.bg-card:has-text("CAMPUS20")').first(), label: 'Verify CAMPUS20 Offer Card' },
    ]);

    // Contracts & POPIA Tab
    await page.goto(`${BASE_URL}/dashboard/contracts`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Contracts, Policies & Young Stylist Programme', { timeout: 10000 });
    await snap(page, '16_studio_contracts_popia', `${BASE_URL}/dashboard/contracts`, [
      { locator: page.locator('a[href="/dashboard/contracts"]'), label: 'Click "Contracts & POPIA" Tab' },
      { locator: page.getByRole('button', { name: /Issue Artisan Contract/i }).first(), label: 'Click "Issue Artisan Contract"' },
      { locator: page.locator('div.rounded-2xl.border.bg-card:has-text("Nomvula Dlamini")').first(), label: 'Review Artisan Contract & 50% Commission' },
    ]);

    // Studio & Brand Profile Tab
    await page.goto(`${BASE_URL}/dashboard/profile`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Business profile', { timeout: 10000 });
    await snap(page, '17_studio_brand_profile', `${BASE_URL}/dashboard/profile`, [
      { locator: page.locator('a[href="/dashboard/profile"]'), label: 'Studio & Brand Tab' },
      { locator: page.locator('text=Taking bookings').locator('..').locator('..'), label: 'Public Search Visibility' },
      { locator: page.getByRole('button', { name: /Preview public page/i }), label: 'Preview Public Studio Page' },
    ]);

    await ctx.close();
  }

  // =========================================================================
  // 3. ARTISANS & MENTORS — THE HER PATHWAY (nomvula@herbeauty.co.za)
  // =========================================================================
  console.log('--- Group: Artisans & Mentors (HER Pathway) ---');
  {
    const { ctx, page } = await newRolePage(browser);
    await loginWithScreen(page, 'nomvula@herbeauty.co.za', 'Password123', '18_login_artisan');

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=HER Beauty — Flagship Studio', { timeout: 10000 });
    await snap(page, '19_artisan_schedule_view', `${BASE_URL}/dashboard`, [
      { locator: page.locator('a[href="/profile"]').first(), label: 'Signed In as Nomvula Dlamini' },
      { locator: page.locator('span[title^="Real-time stream"]').first(), label: 'Green Live Updates Badge', shape: 'circle' },
      { locator: page.locator('div.rounded-2xl.border.bg-card:has-text("HER-84920")').first(), label: 'Assigned Client Appointment (HER-84920)' },
    ]);

    await ctx.close();
  }

  // =========================================================================
  // 4. PLATFORM MASTER & EXECUTIVE GOVERNANCE (founder@herbeauty.co.za & ricardovsmart@gmail.com)
  // =========================================================================
  console.log('--- Group: Platform Master & Executive Governance ---');
  {
    const { ctx, page } = await newRolePage(browser);
    await loginWithScreen(page, 'founder@herbeauty.co.za', 'ChangeMe123!', '01_login_master');

    await page.goto(`${BASE_URL}/master`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=HER Beauty Master Control Center', { timeout: 10000 });
    await snap(page, '02_master_console', `${BASE_URL}/master`, [
      { locator: page.getByRole('button', { name: /Onboard Studio Hub/i }), label: 'Click "+ Onboard Studio Hub"' },
      { locator: page.locator('div.luxury-gradient.rounded-3xl').first(), label: '5-Stage HER Pathway Metrics' },
      { locator: page.locator('text=Active Businesses').locator('..').locator('..'), label: '6 Active Studios & KPI Cards' },
    ]);

    // Open Create a New Studio modal
    await page.getByRole('button', { name: /Onboard Studio Hub/i }).click();
    await page.waitForSelector('#ob-name', { timeout: 6000 });
    await page.fill('#ob-name', 'HER Beauty — Franschhoek Boutique');
    await page.fill('#ob-city', 'Franschhoek');
    await page.fill('#ob-fname', 'Nadia');
    await page.fill('#ob-sname', 'Jacobs');
    await page.fill('#ob-email', 'franschhoek@herbeauty.co.za');
    await snap(page, '03_create_studio_modal', `${BASE_URL}/master`, [
      { locator: page.locator('#ob-name'), label: 'Enter New Studio Name' },
      { locator: page.locator('#ob-email'), label: 'Assign Studio Admin Email' },
      { locator: page.getByRole('button', { name: /Onboard Business/i }), label: 'Click "Onboard Business"' },
    ]);
    await page.getByRole('button', { name: /Cancel/i }).click();
    await page.waitForTimeout(300);

    // Scroll to Studio Directory & Impersonate (scoped directly to the Flagship Studio row!)
    const flagshipRow = page.locator('div.rounded-2xl.border.bg-card:has-text("HER Beauty — Flagship Studio")').first();
    await flagshipRow.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -140));
    await page.waitForTimeout(350);
    await snap(page, '04_master_impersonate_list', `${BASE_URL}/master`, [
      { locator: flagshipRow.locator('p.font-display').first(), label: 'Flagship Studio Hub', pad: 6 },
      { locator: flagshipRow.locator('label:has-text("Active")'), label: 'Active / Suspend Switch' },
      { locator: flagshipRow.getByRole('button', { name: /Impersonate/i }), label: 'Click "Impersonate"' },
    ]);

    // Click Impersonate -> Verify Top Impersonation Banner
    await flagshipRow.getByRole('button', { name: /Impersonate/i }).click();
    await page.waitForSelector('text=Return to Master Console', { timeout: 10000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await snap(page, '05_impersonation_active', `${BASE_URL}/dashboard`, [
      { locator: page.locator('span:has-text("Impersonating:")').first(), label: 'Active Impersonation Banner', pad: 6 },
      { locator: page.getByRole('button', { name: /Return to Master Console/i }), label: 'Return to Master Console' },
      { locator: page.locator('div.grid > div.rounded-2xl').first(), label: 'Live Studio KPIs' },
    ]);

    // Return to Master Console
    await page.getByRole('button', { name: /Return to Master Console/i }).click();
    await page.waitForSelector('text=HER Beauty Master Control Center', { timeout: 10000 });

    // Platform Simulator (/demo)
    await page.goto(`${BASE_URL}/demo`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Platform Simulator', { timeout: 10000 });
    const chloeCard = page.locator('div.rounded-3xl.border.bg-card:has-text("Chloe Laurent")').first();
    await snap(page, '06_platform_simulator', `${BASE_URL}/demo`, [
      { locator: page.locator('a[href="/demo"]').first(), label: 'Click "Simulator" in Top Menu' },
      { locator: chloeCard.locator('div.flex.items-start.gap-4').first(), label: 'Review Role Persona Card', pad: 8 },
      { locator: chloeCard.getByRole('button', { name: /Launch Persona/i }), label: 'Click "Launch Persona" Button' },
    ]);

    // Activity History / Audit Log (/audit) - now populated with real bookings & impersonation events!
    await page.goto(`${BASE_URL}/audit`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Immutable Audit Trail', { timeout: 10000 });
    await page.waitForTimeout(500);
    await snap(page, '07_audit_trail', `${BASE_URL}/audit`, [
      { locator: page.locator('a[href="/audit"]').first(), label: 'Audit Menu' },
      { locator: page.locator('input[placeholder*="Filter by actor" i]'), label: 'Search Actor or Action' },
      { locator: page.locator('div.space-y-3 > div.rounded-2xl').first(), label: 'Recorded Activity Entry' },
    ]);

    await ctx.close();
  }

  // =========================================================================
  // 5. PLATFORM MASTER PROFILE (founder@herbeauty.co.za)
  // =========================================================================
  console.log('--- Group: Platform Master Profile ---');
  {
    const { ctx, page } = await newRolePage(browser);
    await loginWithScreen(page, 'founder@herbeauty.co.za', 'ChangeMe123!', null);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#prof-email', { timeout: 10000 });
    await snap(page, '08_ricardo_master_profile', `${BASE_URL}/profile`, [
      { locator: page.locator('text=master').first(), label: 'MASTER Governance Role', pad: 6 },
      { locator: page.locator('#prof-email'), label: 'founder@herbeauty.co.za' },
      { locator: page.getByRole('button', { name: /Save details/i }), label: 'Save Account Details' },
    ]);
    await ctx.close();
  }

  await browser.close();

  const manifestPath = path.join(SCREENSHOT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nSaved 29+ screenshots & manifest to ${manifestPath}`);
}

captureAll().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});

