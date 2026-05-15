import type { Page, Locator } from '@playwright/test';

/** Expiry for Stripe unified expiry field (e.g. 12/30). */
const DEFAULT_EXP = '1230';
const DEFAULT_CVC = '123';

/**
 * Fills Stripe Payment Element split iframes (card number, expiry, CVC).
 * Uses title-based frame locators from Stripe.js hosted fields.
 */
export async function fillStripeCard(
  page: Page,
  opts: { number: string; exp?: string; cvc?: string },
) {
  const exp = (opts.exp ?? DEFAULT_EXP).replace(/\s/g, '');
  const cvc = opts.cvc ?? DEFAULT_CVC;

  // Wait for any payment form heading — title differs by context:
  //   "Payment details"    → subscription checkout
  //   "Add Payment Method" → add payment method flow
  //   "Card Details"       → split-field card entry panel
  await Promise.race([
    page.getByText('Payment details', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 }),
    page.getByText('Add Payment Method', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 }),
    page.getByText('Card Details', { exact: false }).first().waitFor({ state: 'visible', timeout: 30_000 }),
  ]);

  const stripeEditableInput = (frame: ReturnType<Page['frameLocator']>) =>
    frame.locator('input:not([name="hidden"]):not([aria-hidden="true"])').first();

  const numberFrame = page.frameLocator(
    'iframe[title*="card number" i], iframe[title*="Card number" i]',
  );
  const numberInput = stripeEditableInput(numberFrame);
  await numberInput.waitFor({ state: 'visible', timeout: 30_000 });
  // Use pressSequentially to trigger Stripe.js keyboard event listeners (fill() alone may not)
  await numberInput.pressSequentially(opts.number, { delay: 20 });

  const expFrame = page.frameLocator(
    'iframe[title*="expiration" i], iframe[title*="expiry" i], iframe[title*="MM / YY" i]',
  );
  const expInput = stripeEditableInput(expFrame);
  await expInput.waitFor({ state: 'visible', timeout: 15_000 });
  await expInput.pressSequentially(exp, { delay: 20 });

  const cvcFrame = page.frameLocator(
    'iframe[title*="CVC" i], iframe[title*="security" i]',
  );
  const cvcInput = stripeEditableInput(cvcFrame);
  await cvcInput.waitFor({ state: 'visible', timeout: 15_000 });
  await cvcInput.pressSequentially(cvc, { delay: 20 });

  // Give Stripe's validation loop time to process all three fields and enable the submit button
  await page.waitForTimeout(1500);
}

/**
 * Clicks a payment submit button exactly once, then waits for it to become
 * disabled or detached (Stripe disables it during processing).
 * Prevents accidental double-submission in case of slow rendering.
 */
export async function clickPayOnce(
  page: Page,
  buttonLocator: Locator,
  { submitTimeoutMs = 10_000 }: { submitTimeoutMs?: number } = {},
): Promise<void> {
  await buttonLocator.waitFor({ state: 'visible' });
  // Use evaluate to bypass any overlay backdrops that may intercept pointer events
  // (e.g., promo/cookie bottom-sheets on the /subscription page)
  const btnText = (await buttonLocator.textContent())?.trim() ?? '';
  await page.evaluate((text) => {
    const btn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === text && !b.disabled,
    );
    btn?.click();
  }, btnText);
  // Wait for Stripe to disable the button (processing state) — stops any retry from re-clicking
  await buttonLocator
    .waitFor({ state: 'detached', timeout: submitTimeoutMs })
    .catch(() =>
      page
        .waitForFunction(
          (sel) => {
            const el = document.querySelector(sel);
            return !el || (el as HTMLButtonElement).disabled;
          },
          `button:is([name*="complete" i], [aria-label*="complete" i])`,
          { timeout: submitTimeoutMs },
        )
        .catch(() => {}),
    );
}
