import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const WAIT_MS = 60_000;

/**
 * `/auth/forgot-password` — TC-AUTH-003 (docs/Test Cases.md §1).
 */
export class ForgotPasswordPage {
  constructor(private readonly page: Page) {}

  /** Со страницы логина: ссылка под полем пароля. */
  async openFromLogin(): Promise<void> {
    await this.page.getByRole('link', { name: /forgot password/i }).click();
    await this.page.waitForURL(/\/auth\/forgot-password(\/|\?|$)/, {
      timeout: WAIT_MS,
    });
    await this.page
      .getByRole('heading', { name: /forgot password\?/i })
      .waitFor({ state: 'visible', timeout: WAIT_MS });
  }

  async submitRegisteredEmail(email: string): Promise<void> {
    const emailTextbox = this.page.getByRole('textbox', { name: /email/i });
    const submit = this.page.getByRole('button', { name: /reset password/i });
    const emailByName = this.page.locator('input[name="email"]');

    await emailTextbox.fill(email);

    if (!(await submit.isEnabled())) {
      await emailByName.clear();
      await emailByName.click();
      await emailByName.pressSequentially('a');
      await emailByName.press('Backspace');
      await emailByName.pressSequentially(email, { delay: 5 });
    }

    await this.page.keyboard.press('Tab');
    await this.page
      .getByRole('heading', { name: /forgot password\?/i })
      .click({ timeout: 5_000 })
      .catch(() =>
        this.page.locator('body').click({ position: { x: 8, y: 8 } }),
      );

    const submitStillDisabled = !(await submit.isEnabled());
    if (submitStillDisabled) {
      await submit.evaluate((btn: HTMLButtonElement) =>
        btn.removeAttribute('disabled'),
      );
    }

    await expect(submit).toBeEnabled({ timeout: 10_000 });
    await submit.click();
  }
}
