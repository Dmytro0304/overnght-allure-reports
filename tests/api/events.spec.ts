import { test, expect } from '@playwright/test';
import { createApiClient } from '../utils/apiClient';
import {
  getTestAndProdEvents,
  type PlatformEventItem,
} from '../utils/events';

test.describe('GET /platform/events', () => {
  let fixtures: { test: PlatformEventItem; prod: PlatformEventItem };

  test.beforeAll(async ({ request }) => {
    const bundle = await getTestAndProdEvents(request);
    fixtures = { test: bundle.testEvent, prod: bundle.prodEvent };
  });

  test('admin sees test events in the list', async ({ request }) => {
    const client = createApiClient(request);
    const res = await client.get('platform/events', 'admin', {
      params: { page: 1, limit: 1000 },
    });
    expect(res.ok(), `HTTP ${res.status()}`).toBe(true);

    const body = (await res.json()) as { data: PlatformEventItem[] };
    const ids = new Set(body.data.map((e) => e.id));
    expect(
      ids.has(fixtures.test.id),
      'Admin listing should include the known test event id',
    ).toBe(true);
  });

  test('regular user does not see test events in the list', async ({
    request,
  }) => {
    const client = createApiClient(request);
    const res = await client.get('platform/events', 'regular', {
      params: { page: 1, limit: 1000 },
    });
    expect(res.ok(), `HTTP ${res.status()}`).toBe(true);

    const body = (await res.json()) as { data: PlatformEventItem[] };
    const hasTest = body.data.some(
      (e) => e.isTest === true || (e as { is_test?: boolean }).is_test === true,
    );
    expect(hasTest, 'Regular user must not receive isTest=true events').toBe(
      false,
    );
    const ids = new Set(body.data.map((e) => e.id));
    expect(
      ids.has(fixtures.test.id),
      'Regular listing must not include the test event id',
    ).toBe(false);
  });
});
