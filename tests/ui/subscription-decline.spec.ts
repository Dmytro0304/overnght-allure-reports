import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/stagingWebAuth';
import { fillStripeCard, clickPayOnce } from '../utils/stripe-elements';
import { testLog } from '../utils/logger';

function declineAccount(): { email: string; password: string } | null {
  const email =
    process.env.E2E_DECLINE_USER_EMAIL || process.env.E2E_USER2_EMAIL || '';
  if (!email) return null;
  const password =
    process.env.E2E_DECLINE_USER_PASSWORD ||
    process.env.E2E_USER2_PASSWORD ||
    process.env.E2E_USER_PASSWORD ||
    '';
  if (!password) return null;
  return { email, password };
}

test.describe('Declined / insufficient funds', () => {
  test.describe.configure({ retries: 0 });
  test('insufficient funds card shows failure UX', async ({ page }, testInfo) => {
    const creds = declineAccount();
    if (!creds) {
      testInfo.skip(
        true,
        'Set E2E_DECLINE_USER_EMAIL or E2E_USER2_EMAIL (+ password) for this test',
      );
      return;
    }

    await test.step('Login & open checkout', async () => {
      await loginAs(page, creds.email, creds.password, '/s/start');
      await page.getByRole('heading', { name: 'Choose Your Plan' }).waitFor();
      await page.getByRole('button', { name: 'Get Started' }).first().click();
    });

    await test.step('Pay with insufficient_funds test card', async () => {
      await fillStripeCard(page, { number: '4000000000009995' });
      const submitBtn = page.getByRole('button', { name: /complete subscription/i });
      await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
      await clickPayOnce(page, submitBtn);
      testLog('decline', 'Submitted insufficient funds card');
    });

    await test.step('Human-readable error', async () => {
      await expect(
        page.getByRole('heading', {
          name: /insufficient funds|payment unsuccessful|card declined/i,
        }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText(/no charges were made/i)).toBeVisible();
    });
  });

  test('generic decline card', async ({ page }, testInfo) => {
    const creds = declineAccount();
    if (!creds) {
      testInfo.skip(true, 'Decline user env not configured');
      return;
    }

    await loginAs(page, creds.email, creds.password, '/s/start');
    await page.getByRole('button', { name: 'Get Started' }).first().click();
    await fillStripeCard(page, { number: '4000000000000002' });
    const submitBtn2 = page.getByRole('button', { name: /complete subscription/i });
    await expect(submitBtn2).toBeEnabled({ timeout: 15_000 });
    await clickPayOnce(page, submitBtn2);

    await expect(
      page.getByRole('heading', { name: /card declined|payment unsuccessful/i }),
    ).toBeVisible({ timeout: 60_000 });
  });
});
