import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { getAuthHeaders } from '../utils/auth';
import { getApiBaseUrl } from '../utils/env';

/**
 * Data-integrity checks for "at most one active subscription per user".
 *
 * Root-cause analysis: backend only blocks create when an existing row has `active: true`
 * (see `StripeSubscriptionsService.createSubscription`). Incomplete Stripe subs are stored
 * with `active: false`, so a second checkout is allowed and can yield two rows that later
 * both become active. There is no DB partial unique index on (userId) WHERE active.
 *
 * Reproduction (manual / future automated with Stripe test keys):
 * - Parallel POST /v2.0/subscriptions with two different `paymentMethodId` values (different
 *   Stripe idempotency keys) before either payment settles.
 * - Or: leave first subscription in `incomplete` + `active: false`, start checkout again.
 *
 * Webhook replay does not INSERT rows (handlers only UPDATE by `stripeId`).
 *
 * Placeholders (manual / future automation — do NOT use `test.skip(true)` here:
 * it marks the whole describe as skipped in Playwright):
 * - Parallel POST /v2.0/subscriptions with two `pm_` IDs (needs Stripe test PM creation).
 * - Replay Stripe webhook: handlers only UPDATE by `stripeId`; duplicates come from API INSERT paths.
 */

type SubscriptionRow = {
  id: string;
  active: boolean;
  status?: string;
};

function countActive(subs: SubscriptionRow[] | undefined): number {
  return (subs ?? []).filter((s) => s.active === true).length;
}

async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const api = getApiBaseUrl();
  const res = await request.post(`${api}/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(
    res.ok(),
    `Login failed HTTP ${res.status()}: ${await res.text()}`,
  ).toBeTruthy();
  const body = (await res.json()) as { token?: string };
  expect(body.token, 'Login response must include token').toBeTruthy();
  return body.token as string;
}

async function fetchMySubscriptions(
  request: APIRequestContext,
  bearer: string,
): Promise<SubscriptionRow[]> {
  const api = getApiBaseUrl();
  const res = await request.get(`${api}/v2.0/subscriptions`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      Accept: 'application/json',
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as { subscriptions?: SubscriptionRow[] };
  return body.subscriptions ?? [];
}

test.describe('Subscription duplicates — API invariants', () => {
  test('REGULAR_TOKEN: at most one active subscription row', async ({
    request,
  }) => {
    const api = getApiBaseUrl();
    const res = await request.get(`${api}/v2.0/subscriptions`, {
      headers: getAuthHeaders('regular'),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { subscriptions?: SubscriptionRow[] };
    const activeCount = countActive(body.subscriptions);
    expect(
      activeCount,
      'Multiple active subscription rows for the same user — data integrity violation (see subscription-duplicate investigation)',
    ).toBeLessThanOrEqual(1);
  });

  test('E2E_USER_EMAIL (wallet): at most one active after /login', async ({
    request,
  }, testInfo) => {
    const email = process.env.E2E_USER_EMAIL?.trim();
    const password = process.env.E2E_USER_PASSWORD?.trim();
    if (!email || !password) {
      testInfo.skip(true, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD');
      return;
    }

    const token = await apiLogin(request, email, password);
    const subs = await fetchMySubscriptions(request, token);
    const activeCount = countActive(subs);
    expect(
      activeCount,
      `User ${email} has ${activeCount} active subscription(s); expected ≤ 1`,
    ).toBeLessThanOrEqual(1);
  });

  test('Admin user detail: E2E wallet user has ≤ 1 active subscription', async ({
    request,
  }, testInfo) => {
    const adminToken = process.env.ADMIN_TOKEN?.trim();
    const email = process.env.E2E_USER_EMAIL?.trim();
    if (!adminToken || !email) {
      testInfo.skip(true, 'Set ADMIN_TOKEN + E2E_USER_EMAIL');
      return;
    }

    const api = getApiBaseUrl();
    const listRes = await request.get(`${api}/admin/users`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Accept: 'application/json',
      },
      params: { search: email, limit: '10', page: '1' },
    });
    expect(listRes.ok(), await listRes.text()).toBeTruthy();
    const listBody = (await listRes.json()) as {
      data: { id: string; email: string }[];
    };
    const row = listBody.data?.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    expect(row, `Admin search must find user ${email}`).toBeTruthy();

    const detailRes = await request.get(`${api}/admin/users/${row!.id}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Accept: 'application/json',
      },
    });
    expect(detailRes.ok(), await detailRes.text()).toBeTruthy();
    const detail = (await detailRes.json()) as {
      subscriptions?: SubscriptionRow[];
    };
    const activeCount = countActive(detail.subscriptions);
    expect(
      activeCount,
      `Admin view: user ${email} has ${activeCount} active subscription(s)`,
    ).toBeLessThanOrEqual(1);
  });
});
