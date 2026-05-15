import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { setReactInputValue } from '../react-controlled-input';

const LOGIN_PATH = '/auth/login';

const WAIT_FORM_MS = 60_000;

export class LoginPage {
  constructor(private readonly page: Page) {}

  async waitForLoginScreen(): Promise<void> {
    const emailInput = this.page.getByRole('textbox', { name: /email/i });
    const signInButton = this.page.getByRole('button', { name: 'Sign In' });

    await emailInput
      .or(signInButton)
      .first()
      .waitFor({ state: 'visible', timeout: WAIT_FORM_MS });

    if (
      (await signInButton.isVisible()) &&
      !(await emailInput.isVisible())
    ) {
      await signInButton.click();
      await emailInput.waitFor({ state: 'visible', timeout: WAIT_FORM_MS });
    }

    // Wait for React hydration: form should be fully interactive.
    // We detect this by waiting for the Log In button to exist in the DOM
    // (even disabled), which signals Formik has rendered the controlled form.
    await this.page.getByRole('button', { name: 'Log In' }).waitFor({
      state: 'attached',
      timeout: WAIT_FORM_MS,
    });
    // Extra tick for React to finish initial render + state setup
    await this.page.waitForLoadState('networkidle').catch(() => {/* ok */});
  }

  async goto(): Promise<void> {
    await this.page.goto(LOGIN_PATH, { waitUntil: 'load', timeout: 30_000 });
    await this.waitForLoginScreen();
  }

  async login(userEmail: string, userPassword: string): Promise<void> {
    const submit = this.page.getByRole('button', { name: 'Log In' });

    // Step 1: set via pressSequentially (triggers React onChange for each keystroke)
    await this.page.locator('input[name="email"]').click();
    await this.page.locator('input[name="email"]').fill('');
    await this.page.locator('input[name="email"]').pressSequentially(userEmail, { delay: 15 });

    await this.page.locator('input[name="password"]').click();
    await this.page.locator('input[name="password"]').fill('');
    await this.page.locator('input[name="password"]').pressSequentially(userPassword, { delay: 15 });

    // Step 2: blur both fields to trigger Formik touched/validate
    await this.page.keyboard.press('Tab');
    await this.page
      .getByRole('heading', { name: /welcome back/i })
      .click({ timeout: 5_000 })
      .catch(() => this.page.locator('body').click({ position: { x: 8, y: 8 } }));

    // Step 3: if Formik still didn't receive values, use the React nativeInputValueSetter trick
    if (!(await submit.isEnabled())) {
      await setReactInputValue(this.page, 'input[name="email"]', userEmail);
      await setReactInputValue(this.page, 'input[name="password"]', userPassword);

      // Blur again to trigger Formik's touched + runAllValidations
      await this.page.locator('input[name="password"]').focus();
      await this.page.keyboard.press('Tab');
      await this.page.locator('body').click({ position: { x: 8, y: 8 } });
    }

    // Wait for Formik to enable the button (up to 8s)
    try {
      await expect(submit).toBeEnabled({ timeout: 8_000 });
      await submit.click();
    } catch {
      // Last resort: Enter key from password field submits the form via Formik
      await this.page.locator('input[name="password"]').click();
      await this.page.locator('input[name="password"]').press('Enter');
    }
  }
}
