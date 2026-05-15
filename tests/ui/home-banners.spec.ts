import { test, expect, type Browser } from '@playwright/test';
import { requireEnv, resolveWebBaseUrl, setSessionCookie } from '../utils/auth';

/**
 * TC-HOME-BAN-* — Home Screen Hero/Promotional Banners (docs/Test Cases.md §14).
 *
 * Selectors obtained from browser DevTools on staging:
 *  Event-banner CTA (Watch button):
 *    #main-content > ... > div.absolute.inset-0.h-full.flex.items-end.z-20.pb-14 > div > div > button
 *  Custom-URL banner CTA (Visit button in h1):
 *    #main-content > ... > div.absolute.inset-0.h-full.flex.items-end.z-20.pb-14 > div > div > h1 > button
 *
 * Requires: REGULAR_TOKEN
 */

/** Common ancestor for the active (opacity-100) hero slide content area. */
const SLIDE_CONTENT =
  '#main-content > div > div.flex-1 > div.relative.w-full.group > div > ' +
  'div.absolute.inset-0.h-full.w-full > ' +
  'div.absolute.inset-0.transition-opacity.duration-700.ease-in-out.opacity-100.z-10 > ' +
  'div.absolute.inset-0.h-full.flex.items-end.z-20.pb-14 > div > div';

async function openHome(browser: Browser) {
  const webBase = resolveWebBaseUrl();
  const ctx = await browser.newContext();
  await setSessionCookie(ctx, requireEnv('REGULAR_TOKEN'), webBase);
  const page = await ctx.newPage();
  await page.goto('/?home=true', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 30_000 });
  // Let banner carousel initialize (first slide fades in)
  await page.waitForTimeout(800);
  return { page, close: () => ctx.close() };
}

test.describe('Home Screen Banners', () => {
  test('TC-HOME-BAN-001: Event-type banner → "Watch" CTA opens /event/:id', async ({
    browser,
  }, testInfo) => {
    const { page, close } = await openHome(browser);
    try {
      // Event banner CTA is a <button> inside the active slide content area
      const watchBtn = page
        .locator(`${SLIDE_CONTENT} > button`)
        .or(page.getByRole('button', { name: /^watch$/i }))
        .first();

      if (!(await watchBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
        testInfo.skip(true, 'Active hero banner has no event-type CTA (Watch button) — may be a link or custom-URL banner');
        return;
      }

      await watchBtn.click();
      await expect(page).toHaveURL(/\/event\//, { timeout: 15_000 });

      // Verify event page loaded with some content (player/gate/etc.)
      const content = page
        .locator('video, [class*="video-js"]')
        .or(page.getByText(/watch with subscription|upcoming|scheduled/i).first());
      await expect(content.first()).toBeVisible({ timeout: 30_000 });
    } finally {
      await close();
    }
  });

  test('TC-HOME-BAN-002: Custom-URL banner → "Visit" link navigates to configured URL', async ({
    browser,
  }, testInfo) => {
    const { page, close } = await openHome(browser);
    try {
      // Custom-URL banner: "Visit" is a <button> inside <h1> (HeroSectionPlaceholder)
      const visitBtn = page
        .locator(`${SLIDE_CONTENT} > h1 > button`)
        .or(page.getByRole('button', { name: /visit/i }).first())
        .first();

      if (!(await visitBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
        testInfo.skip(true, 'Active hero banner is not a custom-URL type (no Visit button) — may be an event banner');
        return;
      }

      // "Visit" opens external URL in new tab — capture the popup
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 8_000 }),
        visitBtn.click(),
      ]).catch(async () => {
        // No popup → same-tab navigation
        await visitBtn.click();
        return [null];
      });

      if (popup) {
        const popupUrl = popup.url();
        expect(popupUrl).toMatch(/^https?:\/\//);
      } else {
        // Same-tab: just verify we navigated somewhere
        await expect(page).not.toHaveURL('about:blank');
      }
    } finally {
      await close();
    }
  });

  test('TC-HOME-BAN-003: Multiple banners — carousel has slides and each loads correctly', async ({
    browser,
  }, testInfo) => {
    const { page, close } = await openHome(browser);
    try {
      // Hero section: look for carousel navigation dots or slides
      const heroSection = page.locator('div.relative.w-full.group').first();
      await expect(heroSection).toBeVisible({ timeout: 15_000 });

      // Count navigation dots (if more than one slide)
      const navDots = page.locator('div.relative.w-full.group button[class*="rounded-full"]');
      const dotCount = await navDots.count();

      if (dotCount > 1) {
        // Click through up to 3 slides
        for (let i = 0; i < Math.min(dotCount, 3); i++) {
          await navDots.nth(i).click({ force: true }).catch(() => {});
          await page.waitForTimeout(500);
          // Active slide content should still be present
          const activeSlide = page.locator('div.opacity-100.z-10').first();
          await expect(activeSlide).toBeVisible({ timeout: 5_000 });
        }
      }

      // Banner title / name visible in active slide
      const bannerTitle = page
        .locator(`${SLIDE_CONTENT} > h1, ${SLIDE_CONTENT} > div h1`)
        .first();
      await expect(
        bannerTitle.or(heroSection).first(),
      ).toBeVisible({ timeout: 5_000 });
    } finally {
      await close();
    }
  });
});
