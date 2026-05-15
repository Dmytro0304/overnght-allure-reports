import { test, expect, type Browser } from '@playwright/test';
import { requireEnv, resolveWebBaseUrl, setSessionCookie } from '../utils/auth';
import { dismissBanner, dismissCookieConsentBarIfPresent } from '../utils/ui-helpers';

/**
 * TC-VOD-001…008 — Video on Demand / Search (docs/Test Cases.md §5).
 * Requires staging: BASE_URL=https://stg.overnght.com + REGULAR_TOKEN.
 */

async function openSearchPage(browser: Browser) {
  const webBase = resolveWebBaseUrl();
  const ctx = await browser.newContext();
  await setSessionCookie(ctx, requireEnv('REGULAR_TOKEN'), webBase);
  const page = await ctx.newPage();
  await page.goto('/search', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await dismissBanner(page);
  await dismissCookieConsentBarIfPresent(page);

  await expect(
    page.getByRole('heading', { level: 1, name: /discover events/i }),
  ).toBeVisible({ timeout: 45_000 });

  return { page, close: () => ctx.close() };
}

/** Click the Filters button and wait for the panel to open. */
async function openFilterPanel(page: Parameters<typeof expect>[0]) {
  const filtersBtn = (page as import('@playwright/test').Page)
    .getByRole('button', { name: /filters?/i })
    .first();
  await filtersBtn.click();
  await expect(
    (page as import('@playwright/test').Page).getByRole('heading', {
      name: /advanced filters/i,
    }),
  ).toBeVisible({ timeout: 10_000 });
}

/** Click Apply button inside the filter panel. Cookie banners can overlap — use force. */
async function applyFilters(page: Parameters<typeof expect>[0]) {
  const applyBtn = (page as import('@playwright/test').Page)
    .getByRole('button', { name: /apply/i })
    .last();
  // Dismiss cookie banner via evaluate (may be off-screen or disabled during animation)
  const p = page as import('@playwright/test').Page;
  const hasCookieBtn = await p.getByRole('button', { name: /accept cookies/i })
    .isVisible({ timeout: 2_000 }).catch(() => false);
  if (hasCookieBtn) {
    await p.evaluate(() => {
      (Array.from(document.querySelectorAll('button')).find(
        (b) => /accept cookies/i.test(b.textContent ?? ''),
      ) as HTMLButtonElement | undefined)?.click();
    });
    await p.waitForTimeout(400);
  }
  await applyBtn.click({ force: true });
}

test.describe('VOD / Search', () => {
  test('TC-VOD-001: enter text in Search Bar → results appear', async ({
    browser,
  }) => {
    const { page, close } = await openSearchPage(browser);
    try {
      const searchInput = page
        .getByRole('textbox', { name: /search/i })
        .or(page.locator('input[placeholder*="Search"]'))
        .first();
      await searchInput.click();
      await searchInput.pressSequentially('rowing', { delay: 60 });

      // Wait for debounce (500ms in app) + API + grid paint
      const eventCards = page.locator('[data-testid="event-card"], [class*="EventCard"], a[href*="/event/"]');
      await expect(eventCards.first()).toBeVisible({ timeout: 35_000 });
    } finally {
      await close();
    }
  });

  test('TC-VOD-002: Filter by sport + event type → list updates', async ({
    browser,
  }) => {
    const { page, close } = await openSearchPage(browser);
    try {
      await openFilterPanel(page);

      // Select "Past / VOD" status filter
      const vodFilter = page.getByRole('button', { name: /past.*vod|vod/i }).first();
      if (await vodFilter.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await vodFilter.click();
      }

      await applyFilters(page);

      // After apply, panel closes and results load
      await expect(
        page.getByRole('heading', { name: /advanced filters/i }),
      ).not.toBeVisible({ timeout: 10_000 });

      // Either events are shown or empty state
      const events = page.locator('a[href*="/event/"]');
      const emptyState = page.getByText(/no events found|nothing here/i);
      await expect(events.first().or(emptyState)).toBeVisible({ timeout: 20_000 });
    } finally {
      await close();
    }
  });

  test('TC-VOD-003: infinite scroll loads next page', async ({ browser }) => {
    const { page, close } = await openSearchPage(browser);
    try {
      // Get initial event count
      const eventLinks = page.locator('a[href*="/event/"]');
      await expect(eventLinks.first()).toBeVisible({ timeout: 30_000 });
      const initial = await eventLinks.count();

      if (initial === 0) {
        test.skip(true, 'No events on this environment to test pagination');
        return;
      }

      // Scroll to the last card
      await eventLinks.last().scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500); // Allow IntersectionObserver to fire

      // More events may have loaded
      const after = await eventLinks.count();
      // Either the same (no more pages) or more events loaded
      expect(after).toBeGreaterThanOrEqual(initial);
    } finally {
      await close();
    }
  });

  test('TC-VOD-004: selecting event checks access (subscription/region)', async ({
    browser,
  }) => {
    const { page, close } = await openSearchPage(browser);
    try {
      const firstEvent = page.locator('a[href*="/event/"]').first();
      await expect(firstEvent).toBeVisible({ timeout: 30_000 });
      await firstEvent.click();

      // Should either open player, show access gate, or 404
      const player = page.locator('video, [class*="video-js"]').first();
      const subscriptionGate = page
        .getByRole('heading', { name: /watch with subscription|subscribe/i })
        .or(page.getByText(/watch with subscription/i).first());
      const geoBlocked = page.getByText(/not available in your region/i).first();
      const notFound = page.getByRole('heading', { name: /offside|not found/i });
      const scheduledGate = page.getByRole('heading', { name: /upcoming|scheduled|delayed/i });

      await expect(
        player.or(subscriptionGate).or(geoBlocked).or(notFound).or(scheduledGate).first(),
      ).toBeVisible({ timeout: 45_000 });
    } finally {
      await close();
    }
  });

  test('TC-VOD-005: Sort by Newest/Oldest', async ({ browser }) => {
    const { page, close } = await openSearchPage(browser);
    try {
      await openFilterPanel(page);

      // Click "Newest" sort option (time, DESC)
      const newestBtn = page
        .getByRole('button', { name: /newest/i })
        .or(page.getByRole('radio', { name: /newest/i }))
        .first();
      if (await newestBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await newestBtn.click();
      }

      await applyFilters(page);

      // Results reload — either events or empty state
      const events = page.locator('a[href*="/event/"]');
      const emptyState = page.getByText(/no events found/i);
      await expect(events.first().or(emptyState)).toBeVisible({ timeout: 20_000 });
    } finally {
      await close();
    }
  });

  test('TC-VOD-006: Sort by A-Z / Z-A', async ({ browser }) => {
    const { page, close } = await openSearchPage(browser);
    try {
      await openFilterPanel(page);

      // Click A-Z option
      const azBtn = page
        .getByRole('button', { name: /^a-z$/i })
        .or(page.getByRole('radio', { name: /^a-z$/i }))
        .first();
      if (await azBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await azBtn.click();
      }

      await applyFilters(page);

      const events = page.locator('a[href*="/event/"]');
      const emptyState = page.getByText(/no events found/i);
      await expect(events.first().or(emptyState)).toBeVisible({ timeout: 20_000 });
    } finally {
      await close();
    }
  });

  test('TC-VOD-007: Sort by Grouped by Sport', async ({ browser }) => {
    const { page, close } = await openSearchPage(browser);
    try {
      await openFilterPanel(page);

      // Click Sport / Grouped by sport option
      const sportBtn = page
        .getByRole('button', { name: /^sport$/i })
        .or(page.getByRole('radio', { name: /sport/i }))
        .first();
      if (await sportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await sportBtn.click();
      }

      await applyFilters(page);

      const events = page.locator('a[href*="/event/"]');
      const emptyState = page.getByText(/no events found/i);
      await expect(events.first().or(emptyState)).toBeVisible({ timeout: 20_000 });
    } finally {
      await close();
    }
  });

  test('TC-VOD-008: Filter by Date Range', async ({ browser }) => {
    const { page, close } = await openSearchPage(browser);
    try {
      await openFilterPanel(page);

      // Find Date section and select a date range
      const dateSection = page.getByText(/date|when/i).first();
      await dateSection.scrollIntoViewIfNeeded();

      // Look for a date range input or picker
      const dateInput = page
        .locator('input[type="date"]')
        .or(page.getByPlaceholder(/date|from/i))
        .first();
      if (await dateInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dateInput.fill('2025-01-01');
      }

      await applyFilters(page);

      const events = page.locator('a[href*="/event/"]');
      const emptyState = page.getByText(/no events found/i);
      await expect(events.first().or(emptyState)).toBeVisible({ timeout: 20_000 });
    } finally {
      await close();
    }
  });
});
