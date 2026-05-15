import { test, expect } from '@playwright/test';
import { loginAs, requireEnv } from '../utils/stagingWebAuth';
import { fillStripeCard, clickPayOnce } from '../utils/stripe-elements';
import { testLog } from '../utils/logger';
import { dismissBanner } from '../utils/ui-helpers';

/**
 * Serial suite: purchase → blocked re-purchase → cancel → reactivate → add payment method.
 * E2E_USER_EMAIL must NOT have an active Stripe subscription at the start.
 *
 * retries: 0 — never retry payment tests; a retry would create a duplicate subscription.
 */
test.describe.serial('Subscription lifecycle & duplicate-checkout guard', () => {
  test.describe.configure({ retries: 0 });

  const email = () => requireEnv('E2E_USER_EMAIL');
  const password = () => requireEnv('E2E_USER_PASSWORD');

  test('subscribe monthly with test card', async ({ page }) => {
    await test.step('Login', async () => {
      await loginAs(page, email(), password(), '/s/start');
    });

    const planHeading = page.getByRole('heading', { name: 'Choose Your Plan' });
    const hasPlanPicker = await planHeading
      .waitFor({ state: 'visible', timeout: 12_000 })
      .then(() => true)
      .catch(() => false);

    if (!hasPlanPicker) {
      testLog(
        'lifecycle',
        'Skip new purchase: plan picker not shown (account likely already subscribed)',
      );
      await expect(page).toHaveURL(/\/subscription/, { timeout: 15_000 });
      return;
    }

    await test.step('Choose plan & pay', async () => {
      await page.getByRole('button', { name: 'Get Started' }).first().click();
      await fillStripeCard(page, { number: '4242424242424242', cvc: '111' });
      const submitBtn = page.getByRole('button', { name: /complete subscription/i });
      await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
      await clickPayOnce(page, submitBtn);
    });

    await test.step('Success', async () => {
      await expect(
        page.getByRole('heading', { name: /welcome to overnght/i }),
      ).toBeVisible({ timeout: 90_000 });
      testLog('lifecycle', 'Subscription success');
    });
  });

  test('cannot start second checkout while subscription is active (redirect)', async ({
    page,
  }) => {
    await test.step('Login targeting /s/start', async () => {
      await loginAs(page, email(), password(), '/s/start');
    });

    await test.step('Redirected away from plan picker', async () => {
      await expect(page).toHaveURL(/\/subscription/, { timeout: 20_000 });
      await expect(
        page.getByRole('heading', { name: /subscription details/i }),
      ).toBeVisible();
      testLog('lifecycle', 'Blocked second checkout via redirect');
    });
  });

  test('cancel at period end (UI)', async ({ page }) => {
    // Badge text may be "Cancelled", "Cancels Dec 2026", "Cancels at period end", etc.
    const cancelledBadge = page
      .locator('[data-slot="badge"]')
      .filter({ hasText: /cancell?ed|cancels/i })
      .first();

    await test.step('Open subscription page', async () => {
      await loginAs(page, email(), password(), '/subscription');
      await page.getByRole('heading', { name: /subscription details/i }).waitFor();
      await page.getByText(/overnght.*subscription/i).first().waitFor({
        state: 'visible',
        timeout: 25_000,
      });
    });

    await test.step('Dismiss cookie banner', async () => {
      await dismissBanner(page);
      testLog('lifecycle', 'Cookie banner dismissed');
    });

    await test.step('Confirm cancel (if still active)', async () => {
      if (await cancelledBadge.isVisible().catch(() => false)) {
        testLog('lifecycle', 'Already in Cancelled state — skip cancel click');
        return;
      }
      const cancelBtn = page.getByRole('button', {
        name: /cancel subscription/i,
      });
      const canCancel = await cancelBtn
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true)
        .catch(() => false);

      if (!canCancel) {
        testLog('lifecycle', 'No cancel button (check subscription type or loading state)');
        return;
      }

      // Use evaluate click — bypasses backdrop that blocks Playwright's regular .click()
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => /cancel subscription/i.test(b.textContent ?? ''),
        ) as HTMLButtonElement | undefined;
        btn?.click();
      });
      testLog('lifecycle', 'Cancel Subscription clicked');

      // Wait for the confirmation bottom sheet to animate in, then disable its backdrop too
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        document
          .querySelectorAll<HTMLElement>(
            'div.absolute.inset-0',
          )
          .forEach((el) => {
            el.style.pointerEvents = 'none';
          });
      });

      // The confirmation sheet has "Yes, Cancel" as the confirm CTA (and "No, Keep" as dismiss)
      const confirmBtn = page.getByRole('button', { name: /yes,?\s*cancel/i }).first();

      const confirmVisible = await confirmBtn
        .waitFor({ state: 'visible', timeout: 12_000 })
        .then(() => true)
        .catch(() => false);

      if (confirmVisible) {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(
            (b) => /yes,?\s*cancel/i.test(b.textContent ?? ''),
          ) as HTMLButtonElement | undefined;
          btn?.click();
        });
        testLog('lifecycle', 'Cancel confirmed via "Yes, Cancel" (evaluate)');
      } else {
        testLog('lifecycle', 'Confirmation button not visible — checking cancelled state directly');
      }
    });

    await test.step('Cancelled state visible', async () => {
      // After cancel, the page shows either a "Cancels…" badge OR a "Reactivate" button.
      const reactivateBtn = page.getByRole('button', { name: /reactivate/i }).first();
      const cancelled = await Promise.race([
        cancelledBadge.waitFor({ state: 'visible', timeout: 35_000 }).then(() => 'badge'),
        reactivateBtn.waitFor({ state: 'visible', timeout: 35_000 }).then(() => 'reactivate'),
      ]).catch(() => 'not_found');

      if (cancelled === 'not_found') {
        throw new Error('Subscription cancellation not reflected in UI (no badge or Reactivate button)');
      }
      testLog('lifecycle', `Cancel flow completed — indicator: ${cancelled}`);
    });
  });

  // TC-SUBSCRIPTION-004: Reactivate subscription after cancel
  test('reactivate subscription after cancel (TC-SUBSCRIPTION-004)', async ({ page }) => {
    await test.step('Open subscription page', async () => {
      await loginAs(page, email(), password(), '/subscription');
      await page.getByRole('heading', { name: /subscription details/i }).waitFor({ timeout: 20_000 });
      await dismissBanner(page);
    });

    await test.step('Click Reactivate if in cancelled state', async () => {
      const reactivateBtn = page.getByRole('button', {
        name: /reactivate subscription|reactive subscription/i,
      });
      const canReactivate = await reactivateBtn
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true)
        .catch(() => false);

      if (!canReactivate) {
        testLog('lifecycle', 'Reactivate button not visible — check if subscription is already active or fully expired');
        return;
      }
      await page.evaluate(() => {
        (Array.from(document.querySelectorAll('button')).find(
          (b) => /reactivate/i.test(b.textContent ?? ''),
        ) as HTMLButtonElement | undefined)?.click();
      });
      testLog('lifecycle', 'Reactivate clicked');
    });

    await test.step('Active state restored — Cancel button present', async () => {
      await expect(
        page.getByRole('button', { name: /cancel subscription/i }),
      ).toBeVisible({ timeout: 30_000 });
      testLog('lifecycle', 'Subscription reactivated successfully');
    });
  });

  // TC-SUBSCRIPTION-005: Add new payment method
  test('add new payment method (TC-SUBSCRIPTION-005)', async ({ page }) => {
    await test.step('Open subscription page', async () => {
      await loginAs(page, email(), password(), '/subscription');
      await page.getByRole('heading', { name: /subscription details/i }).waitFor({ timeout: 20_000 });
      await dismissBanner(page);
    });

    await test.step('Open Change Payment Method', async () => {
      const changeBtn = page.getByRole('button', { name: /change payment method/i });
      const hasChangeBtn = await changeBtn
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true)
        .catch(() => false);

      if (!hasChangeBtn) {
        testLog('lifecycle', 'Change Payment Method button not found — user may not have active subscription');
        return;
      }
      await page.evaluate(() => {
        (Array.from(document.querySelectorAll('button')).find(
          (b) => /change payment method/i.test(b.textContent ?? ''),
        ) as HTMLButtonElement | undefined)?.click();
      });
    });

    await test.step('Click Add New Payment Method', async () => {
      const addBtn = page.getByRole('button', { name: /add new payment method/i });
      await addBtn.waitFor({ state: 'visible', timeout: 20_000 });
      await page.evaluate(() => {
        (Array.from(document.querySelectorAll('button')).find(
          (b) => /add new payment method/i.test(b.textContent ?? ''),
        ) as HTMLButtonElement | undefined)?.click();
      });
    });

    await test.step('Fill card details and submit', async () => {
      await fillStripeCard(page, { number: '4242424242424242', cvc: '111' });
      const addPayBtn = page.getByRole('button', { name: /add payment method/i }).last();
      await expect(addPayBtn).toBeEnabled({ timeout: 30_000 });
      await clickPayOnce(page, addPayBtn);
      testLog('lifecycle', 'Add payment method submitted');
    });

    await test.step('Payment method appears in list', async () => {
      const success = await Promise.race([
        page.getByText(/•••• 4242/i).waitFor({ state: 'visible', timeout: 60_000 }).then(() => 'card_visible'),
        page.getByText(/payment method added|successfully added/i).waitFor({ state: 'visible', timeout: 60_000 }).then(() => 'toast_visible'),
      ]).catch(() => 'timeout');

      if (success === 'timeout') {
        testLog('lifecycle', 'Add payment method: result inconclusive — check UI manually');
      } else {
        testLog('lifecycle', `Payment method added (${success})`);
      }
      await expect(
        page.locator('text=/•••• 4242/').or(page.getByText(/payment method added|successfully added/i)),
      ).toBeVisible({ timeout: 60_000 });
    });
  });
});
