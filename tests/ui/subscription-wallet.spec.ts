import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/stagingWebAuth';
import { testLog } from '../utils/logger';

function walletUser(): { email: string; password: string } | null {
  const email =
    process.env.E2E_WALLET_USER_EMAIL ||
    process.env.E2E_DECLINE_USER_EMAIL ||
    process.env.E2E_USER2_EMAIL ||
    '';
  const password =
    process.env.E2E_WALLET_USER_PASSWORD ||
    process.env.E2E_DECLINE_USER_PASSWORD ||
    process.env.E2E_USER2_PASSWORD ||
    process.env.E2E_USER_PASSWORD ||
    '';
  if (!email || !password) return null;
  return { email, password };
}

/**
 * Always runs: проверяем, что экран оплаты открывается (карта).
 * Apple Pay / Google Pay появляются только если canMakePayment() === true;
 * при E2E_REQUIRE_WALLET_BUTTON=1 тест упадёт, если кошелька нет.
 */
test.describe('Wallet / Payment Request checkout', () => {
  test('payment step: card flow + optional Payment Request UI', async ({
    page,
  }, testInfo) => {
    const creds = walletUser();
    if (!creds) {
      testInfo.skip(
        true,
        'Нужен аккаунт без подписки: E2E_DECLINE_USER_EMAIL или E2E_WALLET_USER_EMAIL (+ пароль)',
      );
      return;
    }

    await loginAs(page, creds.email, creds.password, '/s/start');

    if (page.url().includes('/subscription')) {
      testInfo.skip(
        true,
        'У пользователя уже есть подписка — для wallet-теста нужен другой аккаунт без активной подписки',
      );
      return;
    }

    await page.getByRole('heading', { name: 'Choose Your Plan' }).waitFor({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: 'Get Started' }).first().click();
    await page.getByText('Payment details', { exact: false }).waitFor();

    await expect(
      page.getByRole('button', { name: /complete subscription/i }),
    ).toBeVisible({ timeout: 20_000 });

    const walletLocator = page
      .locator(
        'iframe[src*="payment-request"], iframe[title*="Google" i], iframe[title*="Apple" i], iframe[title*="Pay" i]',
      )
      .first();

    const walletVisible = await walletLocator
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (walletVisible) {
      testLog('wallet', 'Payment Request / wallet iframe visible');
    } else {
      testInfo.annotations.push({
        type: 'note',
        description:
          'Wallet (Apple/Google Pay) не отображается в этом окружении — нормально для Chromium headless / Linux.',
      });
      testLog(
        'wallet',
        'No Payment Request iframe (card checkout still validated)',
      );
    }

    if (process.env.E2E_REQUIRE_WALLET_BUTTON === '1') {
      expect(
        walletVisible,
        'E2E_REQUIRE_WALLET_BUTTON=1: ожидалась кнопка кошелька',
      ).toBe(true);
    }
  });
});
