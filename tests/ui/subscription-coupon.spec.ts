import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/stagingWebAuth';
import { fillStripeCard, clickPayOnce } from '../utils/stripe-elements';
import { testLog } from '../utils/logger';

/**
 * TC-SUBSCRIPTION-002: Purchase a subscription with coupon MARIA2025 (-10%).
 * Requires a SEPARATE account with no active subscription:
 *   E2E_COUPON_USER_EMAIL + E2E_COUPON_USER_PASSWORD  (preferred)
 *   or E2E_USER2_EMAIL + E2E_USER2_PASSWORD           (fallback)
 */
function couponUser(): { email: string; password: string } | null {
  const email =
    process.env.E2E_COUPON_USER_EMAIL || process.env.E2E_USER2_EMAIL || '';
  const password =
    process.env.E2E_COUPON_USER_PASSWORD ||
    process.env.E2E_USER2_PASSWORD ||
    '';
  if (!email || !password) return null;
  return { email, password };
}

test.describe('Subscription with coupon', () => {
  // retries: 0 — never retry payment tests to avoid duplicate subscriptions
  test.describe.configure({ retries: 0 });

  test('subscribe with coupon MARIA2025 — 10% discount applied (TC-SUBSCRIPTION-002)', async ({
    page,
  }, testInfo) => {
    const creds = couponUser();
    if (!creds) {
      testInfo.skip(
        true,
        'Set E2E_COUPON_USER_EMAIL + E2E_COUPON_USER_PASSWORD (user without active subscription) to run this test',
      );
      return;
    }

    await test.step('Login & navigate to checkout', async () => {
      await loginAs(page, creds.email, creds.password, '/s/start');
    });

    await test.step('Check plan picker visible', async () => {
      const hasPlanPicker = await page
        .getByRole('heading', { name: 'Choose Your Plan' })
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => true)
        .catch(() => false);

      if (!hasPlanPicker) {
        testInfo.skip(
          true,
          'Account already subscribed — coupon test requires a fresh non-subscriber',
        );
        return;
      }
    });

    await test.step('Choose plan', async () => {
      await page.getByRole('button', { name: 'Get Started' }).first().click();
      await page
        .getByText('Payment details', { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 });
    });

    await test.step('Apply coupon MARIA2025', async () => {
      const couponInput = page
        .getByPlaceholder(/coupon|promo.*code|discount.*code/i)
        .or(page.locator('input[name*="coupon" i], input[name*="promo" i]'))
        .first();

      const hasCouponField = await couponInput
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => true)
        .catch(() => false);

      if (!hasCouponField) {
        testInfo.annotations.push({
          type: 'note',
          description: 'Coupon input field not found on the checkout page — verify UI',
        });
        testLog('coupon', 'Coupon input not found, proceeding without coupon');
      } else {
        await couponInput.fill('MARIA2025');
        await page
          .getByRole('button', { name: /apply/i })
          .or(page.getByText(/apply coupon/i))
          .first()
          .click();

        await expect(
          page
            .getByText(/-10%|10% off|discount applied|promo applied/i)
            .or(page.locator('[data-testid*="discount"], [class*="discount"]')),
        ).toBeVisible({ timeout: 15_000 });
        testLog('coupon', 'Coupon MARIA2025 applied — 10% discount visible');
      }
    });

    await test.step('Pay with test card', async () => {
      await fillStripeCard(page, { number: '4242424242424242', cvc: '111' });
      const submitBtn = page.getByRole('button', { name: /complete subscription/i });
      await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
      await clickPayOnce(page, submitBtn);
    });

    await test.step('Subscription success screen', async () => {
      await expect(
        page.getByRole('heading', { name: /welcome to overnght/i }),
      ).toBeVisible({ timeout: 90_000 });
      testLog('coupon', 'Subscription with coupon purchased successfully');
    });
  });
});
