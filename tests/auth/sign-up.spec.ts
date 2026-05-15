import { test, expect } from '@playwright/test';
import { getApiHostname, isLocalWebBaseURL } from '../utils/e2e-env';
import { RegistrationPage } from '../utils/pages/RegistrationPage';

const REG_PASSWORD = 'RegFlow9!';
const MOCK_OTP = '123456';

/**
 * TC-REGISTR-001 … TC-REGISTR-003 — Sign Up (docs/Test Cases.md §2).
 *
 * TC-REGISTR-001: только localhost — моки `/signup`, `/me`, `/verify-email`, `/sports` (OTP из письма на staging не автоматизируем здесь).
 */
test.describe('Sign Up', () => {
  test.use({ bypassCSP: true });

  test.beforeEach(async ({ page, baseURL }) => {
    if (!isLocalWebBaseURL(baseURL)) return;

    const apiHost = getApiHostname();
    const ctx = { email: '', verified: false };

    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/signup',
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        let body: { email?: string; firstName?: string; lastName?: string };
        try {
          body = route.request().postDataJSON() as typeof body;
        } catch {
          await route.continue();
          return;
        }
        ctx.email = body.email || '';
        const email = ctx.email;
        const firstName = body.firstName || 'E2E';
        const lastName = body.lastName || 'Register';
        await route.fulfill({
          status: 201,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({
            token: 'playwright-reg-mock-jwt',
            success: true,
            message: '',
            admin: false,
            user: {
              id: 'reg-user-id',
              email,
              firstName,
              lastName,
              fullName: `${firstName} ${lastName}`,
              createdAt: new Date().toISOString(),
              subscription: null,
            },
          }),
        });
      },
    );

    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/me',
      async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({
            id: 'reg-user-id',
            email: ctx.email || 'pending@local.test',
            firstName: 'E2E',
            lastName: 'Register',
            admin: false,
            verified: ctx.verified,
            hasActiveSubscription: false,
            termsAcceptedVersion: '2026-01-01',
            latestTermsVersion: '2026-01-01',
            preferencesCompleted: false,
            settings: { timezone: null },
          }),
        });
      },
    );

    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/verify-email',
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        ctx.verified = true;
        await route.fulfill({ status: 204 });
      },
    );

    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/sports',
      async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({
            data: [
              {
                id: '00000000-0000-4000-8000-000000000001',
                index: 0,
                name: 'Basketball',
                image: null,
              },
            ],
          }),
        });
      },
    );
  });

  test('TC-REGISTR-001: sign up, verify OTP, skip preferences → home', async ({
    page,
    baseURL,
  }) => {
    test.skip(!baseURL, 'Playwright baseURL must be set (BASE_URL / PW_ENV)');
    test.skip(
      !isLocalWebBaseURL(baseURL),
      'TC-REGISTR-001: full flow uses mocked OTP; on staging use mail capture or run locally.',
    );

    const email = `e2e.reg.${Date.now()}@local.test`;

    await page.context().clearCookies();
    const reg = new RegistrationPage(page);
    await reg.gotoRegistration(baseURL!);
    await reg.fillAndCreateAccount({
      firstName: 'E2E',
      lastName: 'Register',
      email,
      password: REG_PASSWORD,
    });

    await expect(page).toHaveURL(/\/auth\/verify-email(\/|\?|$)/);
    await page
      .getByRole('heading', { name: /verify your email/i })
      .waitFor({ state: 'visible', timeout: 60_000 });

    // input-otp обрабатывает нажатия через onKeyDown; page.keyboard.type()
    // надёжнее pressSequentially, т.к. идёт через браузерный OS-уровень.
    const otpInput = page.locator('input[data-input-otp]');
    await otpInput.click();
    await page.keyboard.type(MOCK_OTP, { delay: 100 });

    // Ждём активацию кнопки (value.length === 6 → useEffect auto-submits)
    const verifyBtn = page.getByRole('button', { name: /verify email/i });
    try {
      await expect(verifyBtn).toBeEnabled({ timeout: 5_000 });
    } catch {
      // Fallback: type again with slower delay
      await otpInput.click({ clickCount: 3 });
      await page.keyboard.type(MOCK_OTP, { delay: 150 });
    }

    // If auto-submit (useEffect) didn't navigate, click button manually
    const onVerifyPage = page.url().includes('/auth/verify-email');
    if (onVerifyPage) {
      try {
        await expect(verifyBtn).toBeEnabled({ timeout: 5_000 });
        await verifyBtn.click();
      } catch {/* already navigated */}
    }

    await page.waitForURL(/\/preferences(\/|\?|$)/, { timeout: 45_000 });
    await page
      .getByRole('heading', { name: /tell us about you/i })
      .waitFor({ state: 'visible', timeout: 60_000 });

    await page.getByRole('button', { name: /skip for now/i }).click();

    await expect(page).toHaveURL(
      new RegExp(`^${baseURL!.replace(/\/$/, '')}/?`),
    );
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toHaveCount(
      0,
    );
  });

  test('TC-REGISTR-002: Continue with Google starts OAuth', async ({
    page,
    baseURL,
  }) => {
    test.skip(
      process.env.E2E_OAUTH !== '1',
      'OAuth: set E2E_OAUTH=1 — redirect depends on Google IdP and stable NEXT_PUBLIC_BACKEND_URL.',
    );
    test.skip(!baseURL, 'Playwright baseURL must be set (BASE_URL / PW_ENV)');

    await page.context().clearCookies();
    const reg = new RegistrationPage(page);
    await reg.gotoRegistration(baseURL!);

    const apiOrigin =
      process.env.API_BASE_URL?.replace(/\/$/, '').trim() ||
      'https://api.stg.overnght.com';

    await Promise.all([
      page.waitForURL(
        (u) =>
          u.href.startsWith(`${apiOrigin}/auth/google`) ||
          u.pathname.includes('/auth/google') ||
          u.hostname.endsWith('google.com'),
        { timeout: 60_000, waitUntil: 'commit' },
      ),
      page.getByRole('button', { name: /continue with google/i }).click(),
    ]);
  });

  test('TC-REGISTR-003: Continue with Apple starts OAuth', async ({
    page,
    baseURL,
  }) => {
    test.skip(
      process.env.E2E_OAUTH !== '1',
      'OAuth: set E2E_OAUTH=1 — redirect depends on Apple IdP and stable NEXT_PUBLIC_BACKEND_URL.',
    );
    test.skip(!baseURL, 'Playwright baseURL must be set (BASE_URL / PW_ENV)');

    await page.context().clearCookies();
    const reg = new RegistrationPage(page);
    await reg.gotoRegistration(baseURL!);

    const apiOrigin =
      process.env.API_BASE_URL?.replace(/\/$/, '').trim() ||
      'https://api.stg.overnght.com';

    await Promise.all([
      page.waitForURL(
        (u) =>
          u.href.startsWith(`${apiOrigin}/auth/apple`) ||
          u.pathname.includes('/auth/apple') ||
          u.hostname.endsWith('apple.com') ||
          u.hostname.endsWith('icloud.com'),
        { timeout: 60_000, waitUntil: 'commit' },
      ),
      page.getByRole('button', { name: /continue with apple/i }).click(),
    ]);
  });
});
