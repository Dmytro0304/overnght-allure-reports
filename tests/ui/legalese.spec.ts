import { test, expect } from '@playwright/test';

/**
 * TC-LEGAL-001 / TC-LEGAL-002 — Legalese (docs/Test Cases.md §8).
 * Страницы статические — работают без авторизации.
 */
test.describe('Legalese', () => {
  test('TC-LEGAL-001: Terms of Use page opens with content', async ({ page }) => {
    await page.goto('/legalese/termsOfService', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { name: 'Terms of Use', level: 1 }),
    ).toBeVisible({ timeout: 45_000 });

    // Проверяем наличие контента (use .first() in case text appears multiple times)
    await expect(page.getByText('Table of Contents', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Last Modified:', { exact: false }).first()).toBeVisible();
  });

  test('TC-LEGAL-002: Privacy Policy section reachable via hash', async ({ page }) => {
    await page.goto('/legalese/termsOfService#privacy-policy', {
      waitUntil: 'domcontentloaded',
    });

    // Page loads (title "Terms of Use" or dedicated privacy page)
    await expect(
      page.getByRole('heading', { name: /terms of use|privacy policy/i, level: 1 }),
    ).toBeVisible({ timeout: 45_000 });

    // Privacy Policy content present on the page
    const privacyHeading = page.getByRole('heading', { name: /privacy policy/i }).first();
    await privacyHeading.scrollIntoViewIfNeeded();
    await expect(privacyHeading).toBeVisible({ timeout: 20_000 });
  });
});
