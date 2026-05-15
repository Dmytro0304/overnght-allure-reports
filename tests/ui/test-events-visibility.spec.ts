import { test, expect, request as playwrightRequest } from '@playwright/test';
import { requireEnv, resolveApiBaseUrl, resolveWebBaseUrl, setSessionCookie } from '../utils/auth';
import { getTestAndProdEvents } from '../utils/events';

test.describe('Test events visibility (UI)', () => {
  test.describe.configure({ mode: 'serial' });

  let testEvent: { id: string; name: string; isTest: boolean; isFree?: boolean };

  test.beforeAll(async () => {
    const api = await playwrightRequest.newContext({
      baseURL: resolveApiBaseUrl(),
    });
    try {
      const bundle = await getTestAndProdEvents(api);
      testEvent = bundle.testEvent;
    } finally {
      await api.dispose();
    }
  });

  test('Home — admin sees the test event card (highlighted); regular does not', async ({
    browser,
  }) => {
    const webBase = resolveWebBaseUrl();

    const adminContext = await browser.newContext();
    await setSessionCookie(adminContext, requireEnv('ADMIN_TOKEN'), webBase);
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/', { waitUntil: 'domcontentloaded' });
    await adminPage.getByRole('link', { name: testEvent.name }).first().scrollIntoViewIfNeeded();
    await expect(
      adminPage.getByRole('link', { name: testEvent.name }).first(),
    ).toBeVisible({ timeout: 45_000 });

    const testCard = adminPage.locator(`a[href$="/event/${testEvent.id}"]`).first();
    await expect(testCard).toBeVisible();
    await expect(
      testCard.locator('[class*="ring-red-500"]').first(),
    ).toBeVisible();

    await adminContext.close();

    const regContext = await browser.newContext();
    await setSessionCookie(regContext, requireEnv('REGULAR_TOKEN'), webBase);
    const regPage = await regContext.newPage();
    await regPage.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(regPage.locator(`a[href$="/event/${testEvent.id}"]`)).toHaveCount(0);

    await regContext.close();
  });

  test('Event detail — admin: banner, robots meta, player shell', async ({
    browser,
  }) => {
    const webBase = resolveWebBaseUrl();
    const ctx = await browser.newContext();
    await setSessionCookie(ctx, requireEnv('ADMIN_TOKEN'), webBase);
    const page = await ctx.newPage();

    await page.goto(`/event/${testEvent.id}`, { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('status').filter({ hasText: /test event/i }),
    ).toBeVisible();

    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots ?? '').toMatch(/noindex/i);
    expect(robots ?? '').toMatch(/nofollow/i);

    const video = page.locator('video, [class*="video-js"]').first();
    const subscriptionGate = page.getByRole('heading', {
      name: /Watch with Subscription/i,
    });
    const scheduledGate = page.getByRole('heading', {
      name: /Upcoming Event|Event Delayed/i,
    });
    await expect(video.or(subscriptionGate).or(scheduledGate).first()).toBeVisible({
      timeout: 60_000,
    });

    await ctx.close();
  });

  test('Event detail — regular: test event URL shows 404 page', async ({
    browser,
  }) => {
    const webBase = resolveWebBaseUrl();
    const ctx = await browser.newContext();
    await setSessionCookie(ctx, requireEnv('REGULAR_TOKEN'), webBase);
    const page = await ctx.newPage();

    await page.goto(`/event/${testEvent.id}`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /Page Not Found/i }),
    ).toBeVisible();

    await ctx.close();
  });

  test('Direct access — /event/:testId and /stream/:testId as regular → 404', async ({
    browser,
  }) => {
    const webBase = resolveWebBaseUrl();
    const ctx = await browser.newContext();
    await setSessionCookie(ctx, requireEnv('REGULAR_TOKEN'), webBase);
    const page = await ctx.newPage();

    await page.goto(`/event/${testEvent.id}`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /Page Not Found/i }),
    ).toBeVisible();

    await page.goto(`/stream/${testEvent.id}`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /Page Not Found/i }),
    ).toBeVisible();

    await ctx.close();
  });
});
