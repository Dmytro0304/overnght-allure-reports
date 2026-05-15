import type { Page } from '@playwright/test';

const WAIT_MS = 60_000;

export type RegistrationFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

/**
 * `/auth/registration` — TC-REGISTR-* (docs/Test Cases.md §2).
 */
export class RegistrationPage {
  constructor(private readonly page: Page) {}

  async gotoRegistration(baseUrl: string): Promise<void> {
    const root = baseUrl.replace(/\/$/, '');
    await this.page.goto(`${root}/auth/registration`, {
      waitUntil: 'domcontentloaded',
    });
    await this.waitForRegistrationScreen();
  }

  async waitForRegistrationScreen(): Promise<void> {
    await this.page
      .getByRole('heading', { name: /welcome on overnght/i })
      .waitFor({ state: 'visible', timeout: WAIT_MS });
  }

  /**
   * Formik: `fill()` на коротких прогонах иногда не обновляет стейт; как логин — последовательный ввод.
   */
  async fillAndCreateAccount(values: RegistrationFormValues): Promise<void> {
    const submit = this.page.getByRole('button', { name: /create account/i });

    for (const { name, text } of [
      { name: 'firstName', text: values.firstName },
      { name: 'lastName', text: values.lastName },
      { name: 'email', text: values.email },
      { name: 'password', text: values.password },
      { name: 'confirmPassword', text: values.password },
    ]) {
      const loc = this.page.locator(`input[name="${name}"]`);
      await loc.click();
      await loc.clear();
      await loc.pressSequentially(text, { delay: 8 });
    }

    await this.page
      .getByRole('checkbox', {
        name: /I agree to the Terms of Use and Privacy Policy/i,
      })
      .click();

    if (!(await submit.isEnabled())) {
      for (const { name, text } of [
        { name: 'firstName', text: values.firstName },
        { name: 'lastName', text: values.lastName },
        { name: 'email', text: values.email },
        { name: 'password', text: values.password },
        { name: 'confirmPassword', text: values.password },
      ]) {
        const loc = this.page.locator(`input[name="${name}"]`);
        await loc.clear();
        await loc.click();
        await loc.pressSequentially('a');
        await loc.press('Backspace');
        await loc.pressSequentially(text, { delay: 5 });
      }
    }

    await this.page.keyboard.press('Tab');
    await this.page
      .getByRole('heading', { name: /welcome on overnght/i })
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

    const confirmPassword = this.page.locator('input[name="confirmPassword"]');
    /** Enter на последнем поле — стабильно дергает Formik onSubmit (без нативного GET с query). */
    await confirmPassword.press('Enter');
  }
}
