import { test, expect, type Page } from '@playwright/test';
import { getApiHostname, isLocalWebBaseURL } from '../utils/e2e-env';
import { LoginPage } from '../utils/pages/LoginPage';
import { ForgotPasswordPage } from '../utils/pages/ForgotPasswordPage';

async function expectToastWithText(page: Page, re: RegExp): Promise<void> {
  const anyText = page.getByText(re);
  const fromRole = page.getByRole('alert').filter({ hasText: re });
  const fromBody = page.locator('.Toastify__toast-body').filter({ hasText: re });
  await expect(fromRole.or(fromBody).or(anyText).first()).toBeVisible();
}

function resolveSignInCredentials(): { email: string; password: string } {
  const email =
    process.env.TEST_USER_EMAIL?.trim() || process.env.E2E_USER_EMAIL?.trim();
  const password =
    process.env.TEST_USER_PASSWORD?.trim() ||
    process.env.E2E_USER_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error(
      'Missing credentials: set TEST_USER_EMAIL + TEST_USER_PASSWORD ' +
        '(or E2E_USER_EMAIL + E2E_USER_PASSWORD for the same account).',
    );
  }
  return { email, password };
}

/** Пароль проходит Yup на форме логина, но не совпадает с учёткой. */
const INVALID_LOGIN_PASSWORD = 'WrongPass9!';

/**
 * TC-AUTH-001 / TC-AUTH-002 — Sign-In (docs/Test Cases.md §1).
 *
 * Env: TEST_USER_EMAIL, TEST_USER_PASSWORD (registered user).
 */
test.describe('Sign In', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ bypassCSP: true });

  test.beforeEach(async ({ page, baseURL }) => {
    if (!isLocalWebBaseURL(baseURL)) return;

    const email =
      process.env.TEST_USER_EMAIL?.trim() ||
      process.env.E2E_USER_EMAIL?.trim() ||
      'e2e@local.test';
    const loginJson = JSON.stringify({
      token: 'playwright-local-mock-jwt',
      success: true,
      message: '',
      admin: false,
      user: {
        id: 'e2e-user',
        email,
        firstName: 'E2E',
        lastName: 'Local',
      },
    });
    const meJson = JSON.stringify({
      id: 'e2e-user',
      email,
      firstName: 'E2E',
      lastName: 'Local',
      admin: false,
      verified: true,
      hasActiveSubscription: false,
      termsAcceptedVersion: '2026-01-01',
      latestTermsVersion: '2026-01-01',
      preferencesCompleted: true,
      settings: { timezone: null },
    });

    const apiHost = getApiHostname();

    // Первый зарегистрированный route срабатывает первым — один handler для login (успех / 401).
    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/login',
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        let password = '';
        try {
          const body = route.request().postDataJSON() as { password?: string };
          password = body?.password ?? '';
        } catch {
          await route.continue();
          return;
        }
        if (password === INVALID_LOGIN_PASSWORD) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({
              message: 'Invalid email or password.',
            }),
          });
          return;
        }
        await route.fulfill({
          status: 201,
          contentType: 'application/json; charset=utf-8',
          body: loginJson,
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
          body: meJson,
        });
      },
    );
    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/forgot-password',
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 201,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({ success: true }),
        });
      },
    );
  });

  test('TC-AUTH-001: successful login lands on home', async ({
    page,
    baseURL,
  }) => {
    test.skip(!baseURL, 'Playwright baseURL must be set (BASE_URL / PW_ENV)');

    const { email, password } = resolveSignInCredentials();

    await page.context().clearCookies();
    await page.goto(`${baseURL!.replace(/\/$/, '')}/auth/login`, {
      waitUntil: 'domcontentloaded',
    });

    const login = new LoginPage(page);
    await login.waitForLoginScreen();
    await login.login(email, password);

    await expect(page).toHaveURL(
      new RegExp(`^${baseURL!.replace(/\/$/, '')}/?`),
    );

    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toHaveCount(
      0,
    );
  });

  test('TC-AUTH-002: invalid credentials show toast and stay on login', async ({
    page,
    baseURL,
  }) => {
    test.skip(!baseURL, 'Playwright baseURL must be set (BASE_URL / PW_ENV)');

    const { email } = resolveSignInCredentials();

    await page.context().clearCookies();
    await page.goto(`${baseURL!.replace(/\/$/, '')}/auth/login`, {
      waitUntil: 'domcontentloaded',
    });

    const login = new LoginPage(page);
    await login.waitForLoginScreen();
    await login.login(email, INVALID_LOGIN_PASSWORD);

    await expect(page).toHaveURL(/\/auth\/login(\/|\?|$)/);
    await expectToastWithText(page, /invalid email or password/i);
  });

  test('TC-AUTH-003: forgot password sends reset and shows inbox confirmation', async ({
    page,
    baseURL,
  }) => {
    test.skip(!baseURL, 'Playwright baseURL must be set (BASE_URL / PW_ENV)');

    const { email } = resolveSignInCredentials();

    await page.context().clearCookies();
    await page.goto(`${baseURL!.replace(/\/$/, '')}/auth/login`, {
      waitUntil: 'domcontentloaded',
    });

    const login = new LoginPage(page);
    await login.waitForLoginScreen();

    const forgot = new ForgotPasswordPage(page);
    await forgot.openFromLogin();
    await forgot.submitRegisteredEmail(email);

    // Toast is transient — check it optimistically, but don't fail if it disappears first.
    // The "Check your inbox" heading is the authoritative success indicator.
    const toastVisible = await page
      .getByRole('alert')
      .filter({ hasText: /reset link sent/i })
      .or(page.locator('.Toastify__toast-body').filter({ hasText: /reset link sent/i }))
      .or(page.getByText(/reset link sent/i))
      .first()
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (!toastVisible) {
      // Toast may have already disappeared — verify via heading instead
      await expect(
        page.getByRole('heading', { name: /check your inbox/i }),
      ).toBeVisible({ timeout: 20_000 });
    }

    await expect(
      page.getByRole('heading', { name: /check your inbox/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText('We emailed you a special link to:', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Click to verify your email address', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Please check your inbox and follow the link to reset your password.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /back to login/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  });

  test('TC-AUTH-004: logout clears token and leaves guest header', async ({
    page,
    baseURL,
  }) => {
    test.skip(!baseURL, 'Playwright baseURL must be set (BASE_URL / PW_ENV)');

    const { email, password } = resolveSignInCredentials();

    await page.context().clearCookies();
    await page.goto(`${baseURL!.replace(/\/$/, '')}/auth/login`, {
      waitUntil: 'domcontentloaded',
    });

    const login = new LoginPage(page);
    await login.waitForLoginScreen();
    await login.login(email, password);

    await expect(page).toHaveURL(
      new RegExp(`^${baseURL!.replace(/\/$/, '')}/?`),
    );

    await expect(page.locator('#main-content')).toBeVisible();

    await page
      .locator('header div.cursor-pointer.rounded-full')
      .click({ timeout: 30_000 });
    await page.getByRole('button', { name: /^logout$/i }).click();

    await expect(page).toHaveURL(
      new RegExp(`^${baseURL!.replace(/\/$/, '')}/?$`),
    );

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === 'token')).toBeUndefined();

    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
