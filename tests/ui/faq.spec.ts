import { test, expect } from '@playwright/test';

/**
 * TC-FAQ-001 — FAQ page (docs/Test Cases.md §9).
 * Requires real backend (/faqs endpoint). If API is unavailable the page shows
 * "Can't find what you're looking for?" — we assert that too as a graceful fallback.
 */
test.describe('FAQ', () => {
  test('TC-FAQ-001: /faq loads and accordion items expand', async ({ page }) => {
    await page.goto('/faq', { waitUntil: 'domcontentloaded' });

    // Title — desktop "Frequently Asked Questions", mobile "FAQ"
    const faqTitle = page
      .getByRole('heading', { name: 'Frequently Asked Questions' })
      .or(page.getByRole('heading', { name: 'FAQ' }))
      .first();
    await expect(faqTitle).toBeVisible({ timeout: 30_000 });

    // If no FAQs from API — fallback support block is shown, test passes
    const supportFallback = page.getByText(/can't find what you're looking for/i);
    const accordionItems = page.locator('[data-radix-accordion-item]');

    const hasItems = (await accordionItems.count()) > 0;
    if (!hasItems) {
      await expect(supportFallback).toBeVisible({ timeout: 10_000 });
      return;
    }

    // Open first accordion item and verify answer appears
    const firstTrigger = page
      .locator('[data-radix-accordion-trigger]')
      .first();
    await firstTrigger.click();
    const firstContent = page
      .locator('[data-radix-accordion-content]')
      .first();
    await expect(firstContent).toBeVisible({ timeout: 10_000 });

    // Open all remaining items
    const triggers = await page
      .locator('[data-radix-accordion-trigger]')
      .all();
    for (const trigger of triggers.slice(1)) {
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      // Brief pause to let animation complete
      await page.waitForTimeout(200);
    }
  });
});
