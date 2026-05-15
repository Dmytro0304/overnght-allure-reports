import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { loginAs } from '../utils/stagingWebAuth';
import { fillStripeCard, clickPayOnce } from '../utils/stripe-elements';
import { dismissBanner } from '../utils/ui-helpers';
import { getApiBaseUrl } from '../utils/env';
import { testLog } from '../utils/logger';
import { ensureDupUserEmailVerified } from '../utils/ensureDupUserVerified';

/**
 * Attempts to reproduce **two active Stripe subscriptions** for one user using real UI flows
 * (not direct DB / API subscribe). Cards: see repo `docs/testing_stripe_cards.md`.
 *
 * Preconditions:
 *   E2E_DUP_USER_EMAIL / E2E_DUP_USER_PASSWORD — disposable staging user with **no** active subscription.
 *   ADMIN_TOKEN — required on staging so the dup user can be marked **email verified** (otherwise
 *   `AuthProvider` keeps the session on `/auth/verify-email` and never reaches `/s/start`).
 *
 * **Invariant:** At most one `active: true` row per user. Tests **fail** if the race creates two actives
 * (documents the product bug).
 *
 * `retries: 0` — avoid duplicate charges if a retry re-clicks pay.
 *
 * Run with **`--workers=1`**. The **parallel** cases may complete a purchase; later tests in the same
 * run then skip (`Dup user already has active subscription`). Use a **fresh** dup account for a
 * full-file run, or run a single scenario per user via `--grep`.
 */
test.describe('Subscription duplicate reproduction (user flows)', () => {
  test.describe.configure({ retries: 0 });

  function dupCreds():
    | { email: string; password: string }
    | null {
    const email = process.env.E2E_DUP_USER_EMAIL?.trim();
    const password = process.env.E2E_DUP_USER_PASSWORD?.trim();
    if (!email || !password) return null;
    return { email, password };
  }

  async function countActiveSubs(
    request: APIRequestContext,
    email: string,
    password: string,
  ): Promise<{ total: number; active: number; subs: { id: string; active: boolean; status?: string }[] }> {
    const api = getApiBaseUrl();
    const lr = await request.post(`${api}/login`, {
      data: { email, password },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(lr.ok(), await lr.text()).toBeTruthy();
    const { token } = (await lr.json()) as { token: string };
    const sr = await request.get(`${api}/v2.0/subscriptions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(sr.ok(), await sr.text()).toBeTruthy();
    const body = (await sr.json()) as {
      subscriptions?: { id: string; active: boolean; status?: string }[];
    };
    const subs = body.subscriptions ?? [];
    const active = subs.filter((s) => s.active).length;
    return { total: subs.length, active, subs };
  }

  async function openPlanAndPayment(page: Page) {
    await page.getByRole('heading', { name: 'Choose Your Plan' }).waitFor({
      state: 'visible',
      timeout: 20_000,
    });
    await page.getByRole('button', { name: 'Get Started' }).first().click();
  }

  test('Parallel: two contexts, Visa + Mastercard, simultaneous Complete (race)', async ({
    browser,
    request,
  }, testInfo) => {
    const creds = dupCreds();
    if (!creds) {
      testInfo.skip(true, 'Set E2E_DUP_USER_EMAIL + E2E_DUP_USER_PASSWORD');
      return;
    }
    const { email, password } = creds;

    const verified = await ensureDupUserEmailVerified(request, email);
    if (!verified.ok) {
      testInfo.skip(true, verified.reason);
      return;
    }

    const before = await countActiveSubs(request, email, password);
    if (before.active > 0) {
      testInfo.skip(true, 'Dup user already has active subscription; use a fresh account');
      return;
    }

    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    try {
      await Promise.all([
        loginAs(page1, email, password, '/s/start'),
        loginAs(page2, email, password, '/s/start'),
      ]);
      await Promise.all([dismissBanner(page1), dismissBanner(page2)]);

      // /s/start shows TokenValidation until useUser() resolves — wait before asserting plan UI.
      await Promise.all([
        page1
          .getByRole('heading', { name: 'Choose Your Plan' })
          .waitFor({ state: 'visible', timeout: 25_000 }),
        page2
          .getByRole('heading', { name: 'Choose Your Plan' })
          .waitFor({ state: 'visible', timeout: 25_000 }),
      ]);

      await Promise.all([openPlanAndPayment(page1), openPlanAndPayment(page2)]);

      await Promise.all([
        fillStripeCard(page1, { number: '4242424242424242', cvc: '111' }),
        fillStripeCard(page2, { number: '5555555555554444', cvc: '111' }),
      ]);

      const b1 = page1.getByRole('button', { name: /complete subscription/i });
      const b2 = page2.getByRole('button', { name: /complete subscription/i });
      await Promise.all([
        expect(b1).toBeEnabled({ timeout: 30_000 }),
        expect(b2).toBeEnabled({ timeout: 30_000 }),
      ]);

      await Promise.all([clickPayOnce(page1, b1), clickPayOnce(page2, b2)]);

      await Promise.all([
        page1.waitForTimeout(8000),
        page2.waitForTimeout(8000),
      ]);

      const after = await countActiveSubs(request, email, password);
      testLog('dup-repro', 'After parallel pay', after);
      await testInfo.attach('parallel-result', {
        body: JSON.stringify(after, null, 2),
        contentType: 'application/json',
      });

      expect(
        after.active,
        `Data integrity: at most one active subscription. Got ${after.active} active of ${after.total} total. If 2, duplicate-subscription bug reproduced.`,
      ).toBeLessThanOrEqual(1);
    } finally {
      await ctx1.close();
      await ctx2.close();
    }
  });

  const threeDsStallScenarios: { title: string; pan: string }[] = [
    {
      title: '3DS stall: always-authenticate (4000002760003184), Visa in tab B',
      pan: '4000002760003184',
    },
    {
      title: '3DS stall: 3DS Required OK — 4000000000003220 (Stripe testing doc), Visa in tab B',
      pan: '4000000000003220',
    },
  ];

  for (const spec of threeDsStallScenarios) {
    /** Tab A uses a regulatory 3DS card; tab B runs a normal Visa checkout. See `docs/testing_stripe_cards.md`. */
    test(spec.title, async ({ browser, request }, testInfo) => {
      const creds = dupCreds();
      if (!creds) {
        testInfo.skip(true, 'Set E2E_DUP_USER_EMAIL + E2E_DUP_USER_PASSWORD');
        return;
      }
      const { email, password } = creds;

      const verified = await ensureDupUserEmailVerified(request, email);
      if (!verified.ok) {
        testInfo.skip(true, verified.reason);
        return;
      }

      const before = await countActiveSubs(request, email, password);
      if (before.active > 0) {
        testInfo.skip(true, 'Dup user already has active subscription; use a fresh account');
        return;
      }

      const ctx = await browser.newContext();
      const pageA = await ctx.newPage();
      const pageB = await ctx.newPage();

      try {
        await loginAs(pageA, email, password, '/s/start');
        await dismissBanner(pageA);
        await pageA
          .getByRole('heading', { name: 'Choose Your Plan' })
          .waitFor({ state: 'visible', timeout: 25_000 });

        await openPlanAndPayment(pageA);
        await fillStripeCard(pageA, { number: spec.pan, cvc: '111' });
        const btnA = pageA.getByRole('button', { name: /complete subscription/i });
        await expect(btnA).toBeEnabled({ timeout: 30_000 });
        await clickPayOnce(pageA, btnA);

        await pageA
          .getByRole('button', { name: /complete authentication/i })
          .first()
          .waitFor({ state: 'visible', timeout: 12_000 })
          .catch(() => {});
        await pageA.waitForTimeout(2000);

        await loginAs(pageB, email, password, '/s/start');
        await dismissBanner(pageB);
        const planB = pageB.getByRole('heading', { name: 'Choose Your Plan' });
        const secondPickerVisible = await planB
          .waitFor({ state: 'visible', timeout: 20_000 })
          .then(() => true)
          .catch(() => false);

        await testInfo.attach('second-tab-plan-picker-visible', {
          body: String(secondPickerVisible),
          contentType: 'text/plain',
        });

        if (secondPickerVisible) {
          await openPlanAndPayment(pageB);
          await fillStripeCard(pageB, { number: '4242424242424242', cvc: '111' });
          const btnB = pageB.getByRole('button', { name: /complete subscription/i });
          await expect(btnB).toBeEnabled({ timeout: 30_000 });
          await clickPayOnce(pageB, btnB);
          await expect(
            pageB.getByRole('heading', { name: /welcome to overnght/i }),
          ).toBeVisible({ timeout: 90_000 });
        }

        const completeAuth = pageA.getByRole('button', { name: /complete authentication/i }).first();
        if (await completeAuth.isVisible({ timeout: 3000 }).catch(() => false)) {
          await completeAuth.click();
          await pageA.waitForTimeout(3000);
        }

        const after = await countActiveSubs(request, email, password);
        testLog('dup-repro', `After 3DS stall attempt (${spec.pan})`, after);
        await testInfo.attach('3ds-stall-result', {
          body: JSON.stringify({ pan: spec.pan, ...after }, null, 2),
          contentType: 'application/json',
        });

        expect(
          after.active,
          `At most one active subscription expected. Got ${after.active} active. If 2, incomplete+second-checkout bug reproduced.`,
        ).toBeLessThanOrEqual(1);
      } finally {
        await ctx.close();
      }
    });
  }

  test('Parallel: two tabs, one context (shared session cookie), Visa + Mastercard', async ({
    browser,
    request,
  }, testInfo) => {
    const creds = dupCreds();
    if (!creds) {
      testInfo.skip(true, 'Set E2E_DUP_USER_EMAIL + E2E_DUP_USER_PASSWORD');
      return;
    }
    const { email, password } = creds;

    const verified = await ensureDupUserEmailVerified(request, email);
    if (!verified.ok) {
      testInfo.skip(true, verified.reason);
      return;
    }

    const before = await countActiveSubs(request, email, password);
    if (before.active > 0) {
      testInfo.skip(true, 'Dup user already has active subscription; use a fresh account');
      return;
    }

    const webOrigin = new URL(process.env.BASE_URL || 'http://localhost:3000').origin;
    const ctx = await browser.newContext();
    const page1 = await ctx.newPage();
    const page2 = await ctx.newPage();

    try {
      await loginAs(page1, email, password, '/s/start');
      await page2.goto(`${webOrigin}/s/start`);

      await Promise.all([dismissBanner(page1), dismissBanner(page2)]);

      await Promise.all([
        page1.getByRole('heading', { name: 'Choose Your Plan' }).waitFor({ state: 'visible', timeout: 25_000 }),
        page2.getByRole('heading', { name: 'Choose Your Plan' }).waitFor({ state: 'visible', timeout: 25_000 }),
      ]);

      await Promise.all([openPlanAndPayment(page1), openPlanAndPayment(page2)]);

      await Promise.all([
        fillStripeCard(page1, { number: '4242424242424242', cvc: '222' }),
        fillStripeCard(page2, { number: '5555555555554444', cvc: '222' }),
      ]);

      const b1 = page1.getByRole('button', { name: /complete subscription/i });
      const b2 = page2.getByRole('button', { name: /complete subscription/i });
      await Promise.all([
        expect(b1).toBeEnabled({ timeout: 30_000 }),
        expect(b2).toBeEnabled({ timeout: 30_000 }),
      ]);

      await Promise.all([clickPayOnce(page1, b1), clickPayOnce(page2, b2)]);

      await Promise.all([page1.waitForTimeout(8000), page2.waitForTimeout(8000)]);

      const after = await countActiveSubs(request, email, password);
      testLog('dup-repro', 'After parallel pay (same context, two tabs)', after);
      await testInfo.attach('parallel-same-context-result', {
        body: JSON.stringify(after, null, 2),
        contentType: 'application/json',
      });

      expect(
        after.active,
        `Data integrity: at most one active subscription. Got ${after.active} active of ${after.total} total.`,
      ).toBeLessThanOrEqual(1);
    } finally {
      await ctx.close();
    }
  });

  test('Sequential: Visa success then second /s/start is blocked (expect 1 active)', async ({
    page,
    request,
  }, testInfo) => {
    const creds = dupCreds();
    if (!creds) {
      testInfo.skip(true, 'Set E2E_DUP_USER_EMAIL + E2E_DUP_USER_PASSWORD');
      return;
    }
    const { email, password } = creds;

    const verified = await ensureDupUserEmailVerified(request, email);
    if (!verified.ok) {
      testInfo.skip(true, verified.reason);
      return;
    }

    const before = await countActiveSubs(request, email, password);
    if (before.active > 0) {
      testInfo.skip(true, 'Dup user already has active subscription; use a fresh account');
      return;
    }

    await loginAs(page, email, password, '/s/start');
    await dismissBanner(page);

    const plan = page.getByRole('heading', { name: 'Choose Your Plan' });
    await plan.waitFor({ state: 'visible', timeout: 25_000 });

    await openPlanAndPayment(page);
    await fillStripeCard(page, { number: '4242424242424242', cvc: '111' });
    const submit = page.getByRole('button', { name: /complete subscription/i });
    await expect(submit).toBeEnabled({ timeout: 30_000 });
    await clickPayOnce(page, submit);
    await expect(
      page.getByRole('heading', { name: /welcome to overnght/i }),
    ).toBeVisible({ timeout: 90_000 });

    await loginAs(page, email, password, '/s/start');
    await dismissBanner(page);
    await expect(page).toHaveURL(/\/subscription/, { timeout: 20_000 });

    const after = await countActiveSubs(request, email, password);
    expect(
      after.active,
      `After one purchase + redirect guard: expected exactly 1 active, got ${after.active}. Subs: ${JSON.stringify(after.subs)}`,
    ).toBe(1);
  });
});
