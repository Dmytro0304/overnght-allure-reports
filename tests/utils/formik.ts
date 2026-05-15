import type { Page } from '@playwright/test';

/**
 * Finds the Formik context by traversing React fiber dependencies of an input element.
 * Calls setFieldValue + setFieldTouched directly, bypassing UI interaction entirely.
 *
 * Approach:
 *  1. Find an input element inside the target form.
 *  2. Walk UP the fiber tree via fiber.return.
 *  3. Check fiber.dependencies.firstContext — React's linked list of consumed contexts.
 *  4. When the context value has setFieldValue, call it (with await for Promise resolution).
 *
 * Use form:has(input[name="..."]) to target the specific Formik form.
 */
export async function setFormikField(
  page: Page,
  formSelector: string,
  field: string,
  value: unknown,
): Promise<void> {
  const result = await page.evaluate(
    async ({ sel, fieldName, fieldValue }) => {
      const formEl = document.querySelector(sel);
      if (!formEl) return `Form not found: ${sel}`;

      const inputEl = formEl.querySelector('input, textarea, button[type="submit"]');
      if (!inputEl) return `No input inside ${sel}`;

      const fiberKey = Object.keys(inputEl).find(
        (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'),
      );
      if (!fiberKey) return 'React fiber not found on input';

      let fiber: any = (inputEl as any)[fiberKey];
      let depth = 0;

      while (fiber && depth < 600) {
        depth++;

        // Helper to call setFieldValue + setFieldTouched then flush React renders
        const applyField = async (ctx: any) => {
          await ctx.setFieldValue(fieldName, fieldValue);
          await ctx.setFieldTouched(fieldName, true, true);
          // Wait for React to flush batched renders (rAF = next paint cycle)
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          // Extra microtask tick for any async validation callbacks
          await new Promise<void>((r) => queueMicrotask(() => queueMicrotask(r)));
        };

        // Method 1: fiber.dependencies.firstContext (React 18/19 useContext consumed list)
        const deps = fiber.dependencies;
        if (deps) {
          let dep = deps.firstContext;
          while (dep) {
            const val = dep.memoizedValue;
            if (val && typeof val === 'object' && typeof val.setFieldValue === 'function') {
              await applyField(val);
              return null;
            }
            dep = dep.next;
          }
        }

        // Method 2: memoizedProps.value — context Provider fiber
        const propsValue = fiber.memoizedProps?.value ?? fiber.pendingProps?.value;
        if (
          propsValue &&
          typeof propsValue === 'object' &&
          typeof propsValue.setFieldValue === 'function'
        ) {
          await applyField(propsValue);
          return null;
        }

        fiber = fiber.return;
      }

      return `Formik context not found after ${depth} levels`;
    },
    { sel: formSelector, fieldName: field, fieldValue: value },
  );

  if (result) {
    throw new Error(`setFormikField(${formSelector}, ${field}): ${result}`);
  }
}

/**
 * Set all Formik values at once using ctx.setValues() — avoids intermediate
 * validation failures that occur when setting fields one by one.
 * This is the safest bypass approach for multi-field forms.
 */
export async function setFormikValues(
  page: Page,
  formSelector: string,
  values: Record<string, unknown>,
): Promise<void> {
  const result = await page.evaluate(
    async ({ sel, vals }) => {
      const formEl = document.querySelector(sel);
      if (!formEl) return `Form not found: ${sel}`;
      const inputEl = formEl.querySelector('input, textarea, button[type="submit"]');
      if (!inputEl) return `No input inside ${sel}`;
      const fiberKey = Object.keys(inputEl).find(
        (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'),
      );
      if (!fiberKey) return 'React fiber not found on input';

      let fiber: any = (inputEl as any)[fiberKey];
      let depth = 0;

      const findCtx = (): any => {
        let f = fiber;
        let d = 0;
        while (f && d < 600) {
          d++;
          const deps = f.dependencies;
          if (deps?.firstContext) {
            let dep = deps.firstContext;
            while (dep) {
              const val = dep.memoizedValue;
              if (val && typeof val === 'object' && typeof val.setFieldValue === 'function') return val;
              dep = dep.next;
            }
          }
          const pv = f.memoizedProps?.value ?? f.pendingProps?.value;
          if (pv && typeof pv === 'object' && typeof pv.setFieldValue === 'function') return pv;
          f = f.return;
        }
        return null;
      };

      const ctx = findCtx();
      if (!ctx) return `Formik context not found after ${depth} levels`;

      // Merge with current values and set all at once (avoids intermediate invalid states)
      const merged = { ...ctx.values, ...vals };
      if (typeof ctx.setValues === 'function') {
        await ctx.setValues(merged, true); // true = shouldValidate
      } else {
        // Fallback: setFieldValue for each
        for (const [k, v] of Object.entries(vals)) {
          ctx.setFieldValue(k, v);
        }
      }
      // Touch all changed fields
      for (const key of Object.keys(vals)) {
        if (typeof ctx.setFieldTouched === 'function') {
          ctx.setFieldTouched(key, true, false);
        }
      }
      // Validate the full form
      if (typeof ctx.validateForm === 'function') {
        await ctx.validateForm(merged);
      }
      // Flush React renders
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => queueMicrotask(() => queueMicrotask(r)));
      return null;
    },
    { sel: formSelector, vals: values },
  );

  if (result) {
    throw new Error(`setFormikValues(${formSelector}): ${result}`);
  }
}

/**
 * Wait until the Formik context is accessible from an input inside the form.
 * Call this before setFormikField/setFormikFields on pages where forms start
 * empty (no pre-filled value to wait on).
 */
export async function waitForFormikReady(
  page: Page,
  formSelector: string,
  timeoutMs = 15_000,
): Promise<void> {
  await page.waitForFunction(
    ({ sel }) => {
      const formEl = document.querySelector(sel);
      if (!formEl) return false;
      const inputEl = formEl.querySelector('input, textarea, button[type="submit"]');
      if (!inputEl) return false;
      const fiberKey = Object.keys(inputEl).find(
        (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'),
      );
      if (!fiberKey) return false;
      let fiber: any = (inputEl as any)[fiberKey];
      let depth = 0;
      while (fiber && depth < 600) {
        depth++;
        const deps = fiber.dependencies;
        if (deps?.firstContext) {
          let dep = deps.firstContext;
          while (dep) {
            if (dep.memoizedValue && typeof dep.memoizedValue.setFieldValue === 'function') {
              return true;
            }
            dep = dep.next;
          }
        }
        const pv = fiber.memoizedProps?.value ?? fiber.pendingProps?.value;
        if (pv && typeof pv.setFieldValue === 'function') return true;
        fiber = fiber.return;
      }
      return false;
    },
    { sel: formSelector },
    { timeout: timeoutMs },
  );
}

/**
 * Set multiple Formik fields at once.
 * Waits for Formik to be ready before setting values.
 */
export async function setFormikFields(
  page: Page,
  formSelector: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await waitForFormikReady(page, formSelector);
  for (const [field, value] of Object.entries(fields)) {
    await setFormikField(page, formSelector, field, value);
  }
}
