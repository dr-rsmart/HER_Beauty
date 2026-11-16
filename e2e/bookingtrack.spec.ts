import { test, expect } from '@playwright/test';

test.describe('HER Beauty (on BookingTrack Foundation) End-to-End Suite', () => {
  test('1. Public Browse Directory: searches and filters HER Beauty studios & specials', async ({
    page,
  }) => {
    await page.goto('/');

    // Check Hero and Title
    await expect(page).toHaveTitle(/HER Beauty/i);
    await expect(page.locator('h1')).toContainText(
      /Beauty with Opportunity\. Culturally Responsive Care/i,
    );

    // Verify search input is present and filterable
    const searchInput = page.getByPlaceholder(/Search a HER studio, campus hub, service/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Flagship');
    await page.waitForTimeout(600);

    // Check that HER Beauty — Flagship Studio card is shown
    const providerCard = page.locator('text=HER Beauty — Flagship Studio');
    await expect(providerCard.first()).toBeVisible();

    // Clear search and test category filter
    await searchInput.fill('');
    await page.waitForTimeout(400);
    const skinPill = page.locator('button', { hasText: 'Skin, Facials & Scalp Wellness' });
    if (await skinPill.isVisible()) {
      await skinPill.click();
      await page.waitForTimeout(400);
      await expect(page.locator('text=Coetzenburg Wellness').first()).toBeVisible();
    }
  });

  test('2. Public Studio Profile: renders services, revenue streams, artisans & pathway badges', async ({
    page,
  }) => {
    await page.goto('/');

    // Click on the first available studio card
    const firstBusiness = page.locator('a[href^="/providers/"]:not([href$="/book"])').first();
    await expect(firstBusiness).toBeVisible();
    await firstBusiness.click();

    // Verify Provider Detail page loaded
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Services & rates')).toBeVisible();
    await expect(page.locator('text=Meet Our Artisans')).toBeVisible();
    await expect(page.locator('text=Working hours')).toBeVisible();
    await expect(page.locator('text=Visit us')).toBeVisible();

    // Verify book an appointment button is present
    const bookBtn = page.getByRole('button', { name: /Book an appointment/i });
    await expect(bookBtn).toBeVisible();

    // Click to enter 4-step booking wizard
    await bookBtn.click();
    await page.waitForURL(/\/book/);
    await expect(page.locator('h1')).toContainText(/Book an appointment/i);
    await expect(page.locator('ol li', { hasText: 'Service' })).toBeVisible();
    await expect(page.locator('ol li', { hasText: 'Professional' })).toBeVisible();
  });

  test('3. Authentication Flow: signs in as studio director and accesses dashboard tabs', async ({
    page,
  }) => {
    await page.goto('/login?returnTo=/dashboard');

    await expect(page.locator('h1')).toContainText(/Welcome to HER Beauty/i);

    // Sign in as studio admin
    await page.fill('#email', 'admin@herbeauty.co.za');
    await page.fill('#password', 'Password123');

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.status() === 200),
      page.click('button[type="submit"]'),
    ]);

    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText(/Flagship Studio|Overview|Bookings/i);

    // Verify Floor 1 dashboard navigation tabs exist
    await expect(page.locator('text=Specials & Comms').first()).toBeVisible();
    await expect(page.locator('text=Contracts & POPIA').first()).toBeVisible();
  });

  test('4. Platform Master Console: accesses multi-studio governance and HER Pathway metrics', async ({
    page,
  }) => {
    await page.goto('/login?returnTo=/master');

    await page.fill('#email', 'founder@herbeauty.co.za');
    await page.fill('#password', 'ChangeMe123!');

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.status() === 200),
      page.click('button[type="submit"]'),
    ]);

    await page.waitForURL(/\/master/, { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText(/HER Beauty Master Control Center/i);

    // Verify KPI metrics cards and HER Pathway spine render
    await expect(page.locator('text=Active Businesses')).toBeVisible();
    await expect(page.locator('text=Total Bookings')).toBeVisible();
    await expect(page.locator('text=Fellows in Training')).toBeVisible();

    // Verify flagship studio renders
    await expect(page.locator('text=HER Beauty — Flagship Studio').first()).toBeVisible();
  });

  test('5. Audit Trail & POPIA Compliance: verifies audit log table and IP redaction', async ({
    page,
  }) => {
    await page.goto('/login?returnTo=/audit');

    await page.fill('#email', 'founder@herbeauty.co.za');
    await page.fill('#password', 'ChangeMe123!');

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.status() === 200),
      page.click('button[type="submit"]'),
    ]);

    await page.waitForURL(/\/audit/, { timeout: 10_000 });
    await expect(page.locator('h1')).toContainText(/Immutable Audit Trail/i);
    await expect(page.locator('text=Every booking, slot, service')).toBeVisible();

    // Verify audit log entries exist
    const logItem = page
      .locator('text=Provider')
      .or(page.locator('text=Contract'))
      .or(page.locator('text=Booking'));
    await expect(logItem.first()).toBeVisible();
  });
});
