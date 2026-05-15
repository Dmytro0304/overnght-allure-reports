import type { Page } from '@playwright/test';

/**
 * Проставляет значение controlled input так же, как для логина Formik — см. LoginPage.login().
 */
export async function setReactInputValue(page: Page, selector: string, value: string): Promise<void> {
  await page.evaluate(
    ({ sel, val }) => {
      const el = document.querySelector(sel) as (HTMLInputElement & {
        _valueTracker?: { setValue: (v: string) => void };
      }) | null;
      if (!el) return;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(el, val);
      } else {
        el.value = val;
      }
      if (el._valueTracker) {
        el._valueTracker.setValue('');
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { sel: selector, val: value },
  );
}
