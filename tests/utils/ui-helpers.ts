import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export type DismissBannerOptions = {
  /** Ожидание появления бара; если бара нет — столько же ждём один раз (параллельные локаторы). По умолчанию 18 с. */
  detectTimeoutMs?: number;
};

/**
 * Обновлённые Terms (`TermsConsentBar`): галка «I agree to the updated Terms», затем «Accept & Continue».
 * Бар часто появляется асинхронно после `/me`.
 */
export async function acceptTermsConsentBarIfPresent(
  page: Page,
  detectTimeoutMs = 18_000,
): Promise<void> {
  const barHeading = page.getByRole('heading', {
    name: /updated our terms of service/i,
  });
  const acceptBtn = page.getByRole('button', { name: /Accept & Continue/i });
  const textHint = page.getByText(/We.?ve Updated Our Terms/i).first();

  const appeared = await waitForTermsBarVisible(barHeading, acceptBtn, textHint, detectTimeoutMs);
  if (!appeared) return;

  await tickTermsCheckbox(page);
  await expect(acceptBtn).toBeEnabled({ timeout: 15_000 });

  try {
    await acceptBtn.click({ timeout: 5_000 });
  } catch {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find((el) => /accept & continue/i.test(el.textContent ?? ''));
      (b as HTMLButtonElement | undefined)?.click();
    });
  }

  await barHeading.waitFor({ state: 'hidden', timeout: 40_000 }).catch(async () => {
    await acceptBtn.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  });
}

async function waitForTermsBarVisible(
  barHeading: ReturnType<Page['getByRole']>,
  acceptBtn: ReturnType<Page['getByRole']>,
  textHint: ReturnType<Page['locator']>,
  maxMs: number,
): Promise<boolean> {
  try {
    await Promise.any([
      barHeading.waitFor({ state: 'visible', timeout: maxMs }),
      acceptBtn.waitFor({ state: 'visible', timeout: maxMs }),
      textHint.waitFor({ state: 'visible', timeout: maxMs }),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function tickTermsCheckbox(page: Page): Promise<void> {
  const termsCheckbox = page.getByRole('checkbox', {
    name: /I agree to the updated Terms/i,
  });

  try {
    if (await termsCheckbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await termsCheckbox.click({ timeout: 5_000 });
      return;
    }
  } catch {
    /* fall through */
  }

  const label = page.locator('label').filter({ hasText: /I agree to the updated Terms/i }).first();
  try {
    await label.click({ timeout: 5_000 });
  } catch {
    await page.evaluate(() => {
      const labels = [...document.querySelectorAll('label')];
      const lb = labels.find((l) => /I agree to the updated Terms/i.test(l.textContent ?? ''));
      const cb = lb?.querySelector('[role="checkbox"]') as HTMLElement | null;
      cb?.click();
    });
  }
}

/** До 3 попыток, если бар переживает первый акцепт или монтируется с задержкой. */
export async function dismissBanner(page: Page, options?: DismissBannerOptions): Promise<void> {
  const ms = options?.detectTimeoutMs ?? 18_000;
  for (let i = 0; i < 3; i++) {
    await acceptTermsConsentBarIfPresent(page, ms);
    const barHeading = page.getByRole('heading', {
      name: /updated our terms of service/i,
    });
    const still = await barHeading.isVisible().catch(() => false);
    if (!still) break;
    await page.waitForTimeout(600);
  }
}

/** CookieConsentBar («Accept Cookies»), после Terms */
export async function dismissCookieConsentBarIfPresent(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /^accept cookies$/i });
  if (!(await btn.isVisible({ timeout: 2_500 }).catch(() => false))) return;
  try {
    await btn.click({ timeout: 4_000 });
  } catch {
    await page.evaluate(() => {
      (Array.from(document.querySelectorAll('button')).find((b) =>
        /^accept cookies$/i.test((b.textContent ?? '').trim()),
      ) as HTMLButtonElement | undefined)?.click();
    });
  }
  await page.waitForTimeout(450);
}
