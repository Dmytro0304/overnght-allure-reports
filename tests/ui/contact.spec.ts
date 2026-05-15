import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { getApiHostname, isLocalWebBaseURL } from '../utils/e2e-env';
import { setFormikField, setFormikValues, waitForFormikReady } from '../utils/formik';
import { setReactInputValue } from '../utils/react-controlled-input';
import { loginAs } from '../utils/stagingWebAuth';
import { dismissBanner } from '../utils/ui-helpers';

/**
 * TC-CONTACT-001…003 — Contact Support (docs/Test Cases.md §10).
 *
 * Hybrid approach (most reliable per our testing):
 *  - Email: pressSequentially (keyboard events → Formik onChange)
 *  - Category / Issue: fiber approach via setFormikField (bypasses Radix Select portal issues)
 *  - Checkbox / Textarea: real UI click + fill
 *  - Submit: click (form values are valid → button enabled by Formik)
 */
test.describe('Contact Support', () => {
  test.use({ bypassCSP: true });

  const TEST_EMAIL = 'tester@example.com';
  const FORM_SEL = 'form:has(input[name="email"])';

  test.beforeEach(async ({ page, baseURL }) => {
    if (!isLocalWebBaseURL(baseURL)) return;
    const apiHost = getApiHostname();

    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/me',
      async (route) => {
        if (route.request().method() !== 'GET') { await route.continue(); return; }
        await route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Unauthorized"}' });
      },
    );
    await page.route(
      (url) =>
        url.hostname === apiHost &&
        (url.pathname === '/platform/user-support' || url.pathname.endsWith('/user-support')),
      async (route) => {
        if (route.request().method() !== 'POST') { await route.continue(); return; }
        await route.fulfill({ status: 201, contentType: 'application/json', body: '{"success":true}' });
      },
    );
  });

  async function gotoContact(page: Parameters<typeof setFormikField>[0], baseURL?: string) {
    const detectOpts =
      isLocalWebBaseURL(baseURL) ? { detectTimeoutMs: 4_000 } : { detectTimeoutMs: 18_000 };

    if (!isLocalWebBaseURL(baseURL)) {
      // On staging, log in so the API accepts the contact form submission
      const email = process.env.E2E_USER_EMAIL?.trim() ?? '';
      const password = process.env.E2E_USER_PASSWORD?.trim() ?? '';
      if (email && password) {
        await loginAs(page as import('@playwright/test').Page, email, password, '/contact');
      } else {
        await (page as import('@playwright/test').Page).goto('/contact', { waitUntil: 'domcontentloaded' });
      }
    } else {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
    }

    await dismissBanner(page, detectOpts);

    await expect(page.getByRole('heading', { name: 'Contact Support' })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10_000 });

    await dismissBanner(page, detectOpts);
  }

  /** Как на логине: blur + pressSequentially для email (если поле не disabled); затем setValues и при необходимости native setter. */
  async function ensureSubmitRequestEnabled(page: Page, fields: Record<string, unknown>) {
    const submit = page.getByRole('button', { name: /submit request/i });
    await waitForFormikReady(page, FORM_SEL);

    const emailInput = page.locator('input[name="email"]');
    const emailEditable = await emailInput.isEnabled();

    let effectiveEmail = TEST_EMAIL;
    if (!emailEditable) {
      effectiveEmail = (await emailInput.inputValue()).trim() || TEST_EMAIL;
    } else {
      await emailInput.click();
      await emailInput.fill('');
      await emailInput.pressSequentially(TEST_EMAIL, { delay: 15 });
      await page.keyboard.press('Tab');
    }

    await page
      .getByRole('heading', { name: 'Contact Support' })
      .click({ timeout: 5_000 })
      .catch(() => page.locator('body').click({ position: { x: 8, y: 8 } }));

    const merged = { ...fields, email: fields.email ?? effectiveEmail };
    await setFormikValues(page, FORM_SEL, merged);
    await page.waitForTimeout(280);

    if (!(await submit.isEnabled())) {
      if (emailEditable) {
        await setReactInputValue(page, 'input[name="email"]', effectiveEmail);
        await emailInput.focus();
        await page.keyboard.press('Tab');
        await page.locator('body').click({ position: { x: 8, y: 8 } });
      }
      await setFormikValues(page, FORM_SEL, merged);
      await page.waitForTimeout(280);
    }

    await expect(submit).toBeEnabled({ timeout: 12_000 });
  }

  /** Fill email via pressSequentially (reliable for text inputs with Formik). */
  async function fillEmail(page: Parameters<typeof setFormikField>[0], email: string) {
    const emailInput = page.locator('input[name="email"]');
    await emailInput.click();
    await emailInput.pressSequentially(email, { delay: 15 });
    await emailInput.press('Tab');
  }

  /** Submit → ждём POST user-support (staging); затем тост успеха (строчка может разрываться в DOM). */
  async function submitContactAndExpectSuccess(page: Page) {
    const submit = page.getByRole('button', { name: /submit request/i });
    const postDone = page.waitForResponse(
      (res) => res.request().method() === 'POST' && /user-support/i.test(res.url()),
      { timeout: 28_000 },
    );
    await submit.click();
    const res = await postDone;
    expect(res.ok()).toBeTruthy();

    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: /support request sent successfully|please check your email/i })
        .or(
          page
            .locator('.Toastify__toast-body')
            .filter({ hasText: /support request sent successfully|please check your email/i }),
        )
        .or(page.getByText(/support request sent successfully/i))
        .first(),
    ).toBeVisible({ timeout: 22_000 });
  }

  test('TC-CONTACT-001: submit without observation → success toast', async ({
    page, baseURL,
  }) => {
    test.skip(isLocalWebBaseURL(baseURL), 'TC-CONTACT-001: Formik race condition with mocked API on localhost — runs on staging only');

    await gotoContact(page, baseURL);

    await ensureSubmitRequestEnabled(page, {
      category: 'Subscription',
      issue: 'resubscribe',
      issueLabel: 'How do I resubscribe?',
      emailSubject: 'Your Overnght Subscription: Resubscribe',
    });

    await submitContactAndExpectSuccess(page);
  });

  test('TC-CONTACT-002: submit with observation → success toast', async ({
    page, baseURL,
  }) => {
    test.skip(isLocalWebBaseURL(baseURL), 'TC-CONTACT-002: Formik race condition with mocked API on localhost — runs on staging only');

    await gotoContact(page, baseURL);
    await waitForFormikReady(page, FORM_SEL);

    await setFormikField(page, FORM_SEL, 'email', TEST_EMAIL);
    await setFormikField(page, FORM_SEL, 'category', 'Other');
    await setFormikField(page, FORM_SEL, 'issue', 'other');

    // Check "Add observation" via the Radix Checkbox
    await page.locator('#showObservation').click();
    const obsTextarea = page.locator('textarea[name="observation"]');
    await expect(obsTextarea).toBeVisible({ timeout: 5_000 });
    await obsTextarea.fill('Observation text for e2e test');

    // Touch observation field via fiber so Formik validation runs
    await setFormikField(page, FORM_SEL, 'showObservation', true);
    await setFormikField(page, FORM_SEL, 'observation', 'Observation text for e2e test');

    await ensureSubmitRequestEnabled(page, {
      category: 'Other',
      issue: 'other',
      issueLabel: 'Other issue',
      emailSubject: 'Support Request: Other',
      showObservation: true,
      observation: 'Observation text for e2e test',
    });

    await submitContactAndExpectSuccess(page);
  });

  test('TC-CONTACT-003: observation checked but empty → submit disabled', async ({
    page, baseURL,
  }) => {
    // Pure frontend validation — no API call, works everywhere

    await gotoContact(page);

    // Button is already disabled without fields
    await expect(page.getByRole('button', { name: /submit request/i })).toBeDisabled();

    // Even with observation checkbox checked (but empty), button stays disabled
    await page.locator('#showObservation').click();
    await expect(page.locator('textarea[name="observation"]')).toBeVisible({ timeout: 5_000 });

    await expect(page.getByRole('button', { name: /submit request/i })).toBeDisabled();
  });
});
