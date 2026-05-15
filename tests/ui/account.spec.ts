import { test, expect, type Page } from '@playwright/test';
import { getApiHostname, isLocalWebBaseURL } from '../utils/e2e-env';
import { setFormikFields, setFormikValues } from '../utils/formik';
import { loginAs, requireEnv } from '../utils/stagingWebAuth';
import { dismissBanner, dismissCookieConsentBarIfPresent } from '../utils/ui-helpers';

const MOCK_USER = {
  id: 'e2e-account-user',
  email: 'account@e2e.local',
  firstName: 'E2E',
  lastName: 'Account',
  admin: false,
  verified: true,
  hasActiveSubscription: true, // prevent subscribe promo modal (fires after 3s otherwise)
  termsAcceptedVersion: '2026-01-01',
  latestTermsVersion: '2026-01-01',
  preferencesCompleted: true,
  settings: { timezone: null },
};

/**
 * TC-ACCOUNT-001…004 — User Account (docs/Test Cases.md §6).
 *
 * localhost: full API mock via page.route (fast, no side-effects).
 * staging:   real API via loginAs (TC-ACCOUNT-001/003/004 only; TC-002 stays localhost).
 */
test.describe('User Account', () => {
  test.use({ bypassCSP: true });

  test.beforeEach(async ({ page, baseURL }) => {
    if (!isLocalWebBaseURL(baseURL)) return;
    const apiHost = getApiHostname();

    await page.context().addCookies([{
      name: 'token',
      value: 'playwright-account-mock-jwt',
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
      secure: false,
      httpOnly: false,
    }]);

    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/me',
      async (route) => {
        if (route.request().method() !== 'GET') { await route.continue(); return; }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) });
      },
    );
    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/platform/users/settings',
      async (route) => {
        if (route.request().method() !== 'PUT') { await route.continue(); return; }
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
      },
    );
    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/users/user-profile',
      async (route) => {
        if (route.request().method() !== 'POST') { await route.continue(); return; }
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
      },
    );
    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/users/password',
      async (route) => {
        if (route.request().method() !== 'POST') { await route.continue(); return; }
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
      },
    );
    await page.route(
      (url) => url.hostname === apiHost && url.pathname === '/forgot-password',
      async (route) => {
        if (route.request().method() !== 'POST') { await route.continue(); return; }
        await route.fulfill({ status: 201, contentType: 'application/json', body: '{"success":true}' });
      },
    );
  });

  /** Navigate to /account — mock session on localhost, real login on staging. */
  async function gotoAccountPage(page: Page, baseURL: string | undefined) {
    if (isLocalWebBaseURL(baseURL)) {
      await page.goto('/account', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
    } else {
      await loginAs(page, requireEnv('E2E_USER_EMAIL'), requireEnv('E2E_USER_PASSWORD'), '/account');
    }
  }

  test('TC-ACCOUNT-001: update first/last name → success toast', async ({
    page, baseURL,
  }) => {
    await gotoAccountPage(page, baseURL);

    if (!isLocalWebBaseURL(baseURL)) await dismissBanner(page);

    await expect(
      page.getByRole('heading', { name: /personal information/i }),
    ).toBeVisible({ timeout: 30_000 });

    const firstNameInput = page.locator('input[name="firstName"]').first();
    await expect(firstNameInput).toBeVisible({ timeout: 15_000 });

    // Terms часто монтируются после ответа /me — второй проход перед полями
    if (!isLocalWebBaseURL(baseURL)) await dismissBanner(page);

    if (isLocalWebBaseURL(baseURL)) {
      await expect(firstNameInput).toHaveValue(MOCK_USER.firstName, { timeout: 15_000 });
    }

    const personalFormSel = 'form:has(input[name="firstName"])';
    await page.locator(personalFormSel).first().waitFor({ state: 'attached' });

    if (isLocalWebBaseURL(baseURL)) {
      await setFormikFields(page, personalFormSel, { firstName: 'NewFirst', lastName: 'NewLast' });
    } else {
      // Alternate letter-only values (Yup rejects digits in names on staging)
      const currentFirst = await firstNameInput.inputValue().catch(() => '');
      const newFirst = currentFirst.includes('Gamma') ? 'AutoDeltaFirst' : 'AutoGammaFirst';
      const newLast = currentFirst.includes('Gamma') ? 'AutoDeltaLast' : 'AutoGammaLast';
      await firstNameInput.click();
      await firstNameInput.fill('');
      await firstNameInput.pressSequentially(newFirst, { delay: 20 });
      const lastNameInput = page.locator('input[name="lastName"]').first();
      await lastNameInput.click();
      await lastNameInput.fill('');
      await lastNameInput.pressSequentially(newLast, { delay: 20 });
      await page.keyboard.press('Tab');
      await page.locator('body').click({ position: { x: 8, y: 8 } }).catch(() => {});
    }

    const updateBtn = page.getByRole('button', { name: /update profile/i }).first();
    await expect(updateBtn).toBeEnabled({ timeout: 8_000 });
    await updateBtn.click();

    await expect(
      page.getByText(/profile updated successfully/i),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('TC-ACCOUNT-002: change password → success toast', async ({
    page, baseURL,
  }) => {
    test.skip(!isLocalWebBaseURL(baseURL), 'Changing real user password is risky on staging — localhost mock only');

    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(
      page.getByRole('heading', { name: /password.*security|security.*password/i }),
    ).toBeVisible({ timeout: 30_000 });

    const passwordFormSel = 'form:has(input[name="currentPassword"])';
    await page.locator(passwordFormSel).first().waitFor({ state: 'attached' });

    await setFormikValues(page, passwordFormSel, {
      currentPassword: 'Current9!',
      newPassword: 'NewPass9!',
      confirmNewPassword: 'NewPass9!',
    });

    const updatePwBtn = page.getByRole('button', { name: /update password/i }).first();
    await expect(updatePwBtn).toBeEnabled({ timeout: 10_000 });
    await updatePwBtn.click();

    await expect(
      page.getByText(/password updated successfully/i),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('TC-ACCOUNT-003: forgot password from account page', async ({
    page, baseURL,
  }) => {
    await gotoAccountPage(page, baseURL);

    await dismissBanner(
      page,
      isLocalWebBaseURL(baseURL) ? { detectTimeoutMs: 4_000 } : undefined,
    );

    // Dismiss cookie banner if it covers the link
    const acceptCookies = page.getByRole('button', { name: /accept cookies/i });
    if (await acceptCookies.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await acceptCookies.click();
    }

    const forgotLink = page.getByRole('link', { name: /forgot password/i }).first();
    await expect(forgotLink).toBeVisible({ timeout: 20_000 });
    await forgotLink.scrollIntoViewIfNeeded();
    await forgotLink.click({ force: true });

    await page.waitForURL(/\/auth\/forgot-password/, { timeout: 20_000 });
    await expect(
      page.getByRole('heading', { name: /forgot password/i }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10_000 });

    const emailToUse = isLocalWebBaseURL(baseURL) ? MOCK_USER.email : requireEnv('E2E_USER_EMAIL');
    await setFormikValues(page, 'form:has(input[name="email"])', { email: emailToUse });

    const resetBtn = page.getByRole('button', { name: /reset password/i });
    await expect(resetBtn).toBeEnabled({ timeout: 8_000 });
    await resetBtn.click();

    await expect(
      page.getByRole('heading', { name: /check your inbox/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('TC-ACCOUNT-004: timezone change persists and saves successfully', async ({
    page, baseURL,
  }) => {
    const apiHost = getApiHostname();

    // On localhost: intercept the PUT to capture the saved timezone value
    let savedTimezone = '';
    if (isLocalWebBaseURL(baseURL)) {
      await page.route(
        (url) => url.hostname === apiHost && url.pathname === '/platform/users/settings',
        async (route) => {
          const method = route.request().method();
          if (method === 'PUT') {
            const body = route.request().postDataJSON() as { settings?: { key: string; value: string }[] };
            savedTimezone = body?.settings?.[0]?.value ?? '';
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
            return;
          }
          await route.continue();
        },
      );
      await page.route(
        (url) => url.hostname === apiHost && url.pathname.startsWith('/platform/users/settings/'),
        async (route) => {
          if (route.request().method() === 'DELETE') {
            savedTimezone = '';
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
            return;
          }
          await route.continue();
        },
      );
    }

    await gotoAccountPage(page, baseURL);
    await dismissBanner(page);
    await dismissCookieConsentBarIfPresent(page);

    const settingsHeading = page.getByRole('heading', { name: /^settings$/i }).first();
    await expect(settingsHeading).toBeVisible({ timeout: 30_000 });
    await settingsHeading.scrollIntoViewIfNeeded();

    const deviceTzSwitch = page.locator('#device-tz-toggle');

    await expect(deviceTzSwitch).toBeVisible({ timeout: 15_000 });

    let combo = page.getByRole('combobox').first();
    if (!(await combo.isVisible().catch(() => false))) {
      await deviceTzSwitch.click();
      await page.waitForTimeout(400);
      combo = page.getByRole('combobox').first();
      await expect(combo).toBeVisible({ timeout: 15_000 });
    }

    const putPromise = page.waitForResponse(
      (res) =>
        res.request().method() === 'PUT' &&
        /\/platform\/users\/settings$/i.test(new URL(res.url()).pathname) &&
        res.ok(),
      { timeout: 35_000 },
    );

    const triggerText = ((await combo.innerText()) ?? '').toLowerCase().replace(/\s+/g, ' ');

    await combo.click();
    await page.waitForSelector('[role="option"]', { timeout: 12_000 });

    // Picking the same IANA option Radix already shows does not call onValueChange → no toast.
    const optionRows = page.locator('[role="option"]');
    const n = await optionRows.count();
    let picked = false;
    for (let i = 0; i < n; i++) {
      const opt = optionRows.nth(i);
      const label = ((await opt.innerText()) ?? '').toLowerCase().replace(/\s+/g, ' ');
      if (!label || label.includes('event timezone')) continue;
      const token = label.split(' ').find((w) => w.length >= 4) ?? label.slice(0, 12);
      if (token && triggerText.includes(token)) continue;
      await opt.click();
      picked = true;
      break;
    }
    if (!picked) {
      await page.getByRole('option', { name: /paris/i }).first().click();
    }

    await putPromise;

    await expect(
      page.getByText(/settings updated successfully/i),
    ).toBeVisible({ timeout: 20_000 });

    if (isLocalWebBaseURL(baseURL)) {
      expect(savedTimezone).toBeTruthy();
    }
  });
});
