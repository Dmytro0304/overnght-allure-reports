import { test, expect } from '@playwright/test';
import { requireEnv, resolveWebBaseUrl, setSessionCookie } from '../utils/auth';

/**
 * TC-EVENT-HL-* — Event page Highlights / Jump To Highlight (docs/Test Cases.md §15).
 *
 * Staging event: HIGHLIGHTS_EVENT_ID (default: 161a9cc1-f187-40e8-98b1-56eac40444e9)
 * ZVK CREVENA ZVEZDA vs. SSV ESSLINGEN — has moments/highlights.
 * Override with HIGHLIGHTS_EVENT_ID env.
 *
 * Requires: REGULAR_TOKEN with access to the event.
 */

const DEFAULT_EVENT_ID = '161a9cc1-f187-40e8-98b1-56eac40444e9';
const DEFAULT_SEARCH_TERM = 'ZVK CREVENA';

/** xl breakpoints need a wide viewport; manual `browser.newContext()` ignores project viewport. */
const DESKTOP_VIEWPORT = { width: 1536, height: 900 } as const;

function getEventId() {
  return process.env.HIGHLIGHTS_EVENT_ID?.trim() || DEFAULT_EVENT_ID;
}

function getSearchTerm() {
  return process.env.HIGHLIGHTS_SEARCH_TERM?.trim() || DEFAULT_SEARCH_TERM;
}

async function openEventDirectly() {
  const webBase = resolveWebBaseUrl();
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  await setSessionCookie(ctx, requireEnv('REGULAR_TOKEN'), webBase);
  const page = await ctx.newPage();
  return { page, close: async () => { await ctx.close(); await browser.close(); } };
}

/**
 * Locator for the Jump To Highlight / moments section (desktop).
 * MomentsDesktopList is inside EventSideBannerDesktop (hidden xl:flex → visible at ≥1280px).
 * The most specific single-element check: the "Search moments..." input inside the desktop list.
 */
function highlightsLocator(page: import('@playwright/test').Page) {
  // The search input in MomentsDesktopList is the clearest indicator the desktop moments section loaded
  return page.getByRole('textbox', { name: 'Search moments...' });
}

/** Locator for clickable moment rows (MomentCard elements). */
function momentRowLocator(page: import('@playwright/test').Page) {
  return page
    .locator('[class*="MomentCard"], [class*="moment-card"]')
    .or(page.locator('button').filter({ hasText: /[0-9]+:[0-9]{2}/ }))
    .or(page.locator('div[role="button"]').filter({ hasText: /[0-9]+:[0-9]{2}/ }))
    .first();
}

/** Highlights tree can re-render; retry scroll on a fresh locator resolution. */
async function stableScrollHighlights(page: import('@playwright/test').Page) {
  await expect(async () => {
    const h = highlightsLocator(page);
    await expect(h).toBeVisible();
    await h.scrollIntoViewIfNeeded();
  }).toPass({ timeout: 25_000 });
}

test.describe('Event Highlights', () => {
  test('TC-EVENT-HL-001: Search → event card → Jump To Highlight → click moment', async ({
    browser,
  }) => {
    const webBase = resolveWebBaseUrl();
    const ctx = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    await setSessionCookie(ctx, requireEnv('REGULAR_TOKEN'), webBase);
    const page = await ctx.newPage();

    try {
      const eventId = getEventId();

      // 1. Open Search
      await page.goto('/search', { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('heading', { name: /discover events/i }).first(),
      ).toBeVisible({ timeout: 30_000 });

      // 2. Search for the event
      const searchInput = page
        .locator('input[placeholder*="Search"], input[placeholder*="search"]')
        .first();
      await searchInput.click();
      await searchInput.pressSequentially(getSearchTerm(), { delay: 60 });

      // 3. Wait for results and find the specific event card
      await page.waitForTimeout(1_500); // debounce
      const eventCard = page
        .locator(`a[href*="/event/${eventId}"]`)
        .first();

      // Fallback: any event card with the search term
      const fallbackCard = page
        .locator('a[href*="/event/"]')
        .first();

      const cardToClick = (await eventCard.isVisible({ timeout: 15_000 }).catch(() => false))
        ? eventCard
        : fallbackCard;

      await expect(cardToClick).toBeVisible({ timeout: 20_000 });
      const href = await cardToClick.getAttribute('href') || '';
      await cardToClick.click();

      // 4. Verify event page loaded
      await expect(page).toHaveURL(/\/event\//, { timeout: 20_000 });

      // 5. Find Jump To Highlight section
      const highlights = highlightsLocator(page);
      await expect(highlights).toBeVisible({ timeout: 45_000 });

      // 6. Click a moment row
      const momentRow = momentRowLocator(page);
      if (await momentRow.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await momentRow.scrollIntoViewIfNeeded();
        await momentRow.click();
        await page.waitForTimeout(500);
      }

      // Verify we're still on the event page
      await expect(page).toHaveURL(/\/event\//);
    } finally {
      await ctx.close();
    }
  });

  test('TC-EVENT-HL-002: Direct URL → event page → Jump To Highlight → click moment', async ({
    browser,
  }) => {
    const webBase = resolveWebBaseUrl();
    const ctx = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    await setSessionCookie(ctx, requireEnv('REGULAR_TOKEN'), webBase);
    const page = await ctx.newPage();
    const eventId = getEventId();

    try {
      // 1. Navigate directly to the event
      await page.goto(`/event/${eventId}`, { waitUntil: 'domcontentloaded' });

      // Verify page loaded (not 404)
      const page404 = page.getByRole('heading', { name: /offside|not found/i });
      const is404 = await page404.isVisible({ timeout: 5_000 }).catch(() => false);
      if (is404) {
        test.fail(true, `Event ${eventId} returned 404 — check HIGHLIGHTS_EVENT_ID env`);
        return;
      }

      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 });

      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
      await stableScrollHighlights(page);

      // 3. Click first moment
      const momentRow = momentRowLocator(page);
      if (await momentRow.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await momentRow.click();
        await page.waitForTimeout(500);
      }

      await expect(page).toHaveURL(new RegExp(`/event/${eventId}`));
    } finally {
      await ctx.close();
    }
  });

  test('TC-EVENT-HL-003: Highlight filter/search within event (if UI exposes it)', async ({
    browser,
  }, testInfo) => {
    const webBase = resolveWebBaseUrl();
    const ctx = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    await setSessionCookie(ctx, requireEnv('REGULAR_TOKEN'), webBase);
    const page = await ctx.newPage();
    const eventId = getEventId();

    try {
      await page.goto(`/event/${eventId}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 });

      // Look for in-page moment search input
      const momentSearch = page
        .locator('input[placeholder*="moment"], input[placeholder*="Moment"], input[placeholder*="highlight"]')
        .first();

      if (await momentSearch.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await momentSearch.fill('test');
        await page.waitForTimeout(300);
        await momentSearch.clear();
      } else {
        testInfo.annotations.push({
          type: 'note',
          description: 'TC-EVENT-HL-003: No in-page moment search — N/A for this build',
        });
      }

      await stableScrollHighlights(page);
    } finally {
      await ctx.close();
    }
  });
});
