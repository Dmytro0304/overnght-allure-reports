import { test, expect } from '@playwright/test';
import Stripe from 'stripe';
import { testLog } from '../utils/logger';
import {
  isValidStripeSecretKey,
  resolveStripeSecretKey,
} from '../utils/resolve-stripe-secret';

/**
 * Validates Stripe product billing intervals in **test mode** (e.g. monthly = 5 min,
 * annual = 1 day in your dashboard). Uses Test Clocks; no app server required.
 */
test.describe('Renewal via Stripe Test Clock', () => {
  test('monthly price: second paid invoice after clock advance', async (
    {},
    testInfo,
  ) => {
    const key = resolveStripeSecretKey();
    const monthlyPrice =
      process.env.STRIPE_PRICE_MONTHLY || 'price_1NlGIQFZcfYcnIYmACy0xnqK';
    if (!isValidStripeSecretKey(key)) {
      testInfo.skip(
        true,
        'Set STRIPE_SECRET_KEY or add STRIPE_SECRET to server/.env (sk_test_… / sk_live_…). Test Clocks need test-mode key.',
      );
      return;
    }

    const stripe = new Stripe(key!);
    const now = Math.floor(Date.now() / 1000);

    await test.step('Create clock + customer + subscription', async () => {
      const clock = await stripe.testHelpers.testClocks.create({
        frozen_time: now,
      });
      testLog('renewal', 'test clock created', clock.id);

      const customer = await stripe.customers.create({
        test_clock: clock.id,
        email: `e2e-renewal-${now}@test.invalid`,
      });

      await stripe.paymentMethods.attach('pm_card_visa', {
        customer: customer.id,
      });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: 'pm_card_visa' },
      });

      const sub = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: monthlyPrice }],
        default_payment_method: 'pm_card_visa',
      });
      testLog('renewal', 'subscription created', sub.id);

      const initial = await stripe.invoices.list({
        subscription: sub.id,
        limit: 10,
      });
      const initialPaid = initial.data.filter((i) => i.status === 'paid').length;
      expect(initialPaid).toBeGreaterThanOrEqual(1);

      const advanceSeconds = Number(process.env.E2E_RENEWAL_ADVANCE_SEC || 360);
      await stripe.testHelpers.testClocks.advance(clock.id, {
        frozen_time: now + advanceSeconds,
      });
      testLog('renewal', 'clock advanced', advanceSeconds);

      await new Promise((r) => setTimeout(r, 4000));

      const after = await stripe.invoices.list({
        subscription: sub.id,
        limit: 15,
      });
      const paidAfter = after.data.filter((i) => i.status === 'paid').length;
      expect(paidAfter).toBeGreaterThanOrEqual(2);
      testLog('renewal', 'paid invoice count after advance', paidAfter);
    });
  });

  test('annual test price: renewal after ~1 day interval', async ({}, testInfo) => {
    const key = resolveStripeSecretKey();
    const annualPrice =
      process.env.STRIPE_PRICE_ANNUAL || 'price_1SItx0FZcfYcnIYmxzXKbgcE';
    if (!isValidStripeSecretKey(key)) {
      testInfo.skip(
        true,
        'Set STRIPE_SECRET_KEY or STRIPE_SECRET in server/.env',
      );
      return;
    }

    const stripe = new Stripe(key!);
    const now = Math.floor(Date.now() / 1000);
    const clock = await stripe.testHelpers.testClocks.create({
      frozen_time: now,
    });
    const customer = await stripe.customers.create({
      test_clock: clock.id,
      email: `e2e-annual-${now}@test.invalid`,
    });
    await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id });
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: 'pm_card_visa' },
    });
    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: annualPrice }],
      default_payment_method: 'pm_card_visa',
    });

    const advanceSeconds = Number(process.env.E2E_ANNUAL_RENEWAL_ADVANCE_SEC || 87000);
    await stripe.testHelpers.testClocks.advance(clock.id, {
      frozen_time: now + advanceSeconds,
    });
    await new Promise((r) => setTimeout(r, 5000));

    const inv = await stripe.invoices.list({ subscription: sub.id, limit: 15 });
    const paid = inv.data.filter((i) => i.status === 'paid').length;
    expect(paid).toBeGreaterThanOrEqual(2);
    testLog('renewal', 'annual paid invoices', paid);
  });
});
