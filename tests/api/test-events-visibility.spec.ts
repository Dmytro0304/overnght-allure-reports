import { test, expect } from '@playwright/test';
import {
  getAuthHeaders,
  getUnauthenticatedHeaders,
} from '../utils/auth';
import {
  getTestAndProdEvents,
  fetchAllEventIdsAcrossPages,
} from '../utils/events';

test.describe('Test events visibility (API)', () => {
  let testEvent: { id: string; name: string; isTest: boolean };
  let prodEvent: { id: string; name: string; isTest: boolean };

  test.beforeAll(async ({ request }) => {
    const bundle = await getTestAndProdEvents(request);
    testEvent = bundle.testEvent;
    prodEvent = bundle.prodEvent;
  });

  test('GET /platform/events — admin sees test events in the list', async ({
    request,
  }) => {
    const res = await request.get('/platform/events', {
      headers: getAuthHeaders('admin'),
      params: { limit: '100', page: '1' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { data: { id: string }[] };
    const ids = (body.data ?? []).map((e) => e.id);
    expect(ids).toContain(testEvent.id);
  });

  test('GET /platform/events — regular user list excludes all test events', async ({
    request,
  }) => {
    const ids = await fetchAllEventIdsAcrossPages(request, 'regular');
    expect(ids).not.toContain(testEvent.id);
  });

  test('GET /platform/events/:id — admin 200 for test event; regular 404; regular 200 for prod', async ({
    request,
  }) => {
    const adminTest = await request.get(`/platform/events/${testEvent.id}`, {
      headers: getAuthHeaders('admin'),
    });
    expect(adminTest.status()).toBe(200);

    const regTest = await request.get(`/platform/events/${testEvent.id}`, {
      headers: getAuthHeaders('regular'),
    });
    expect(regTest.status()).toBe(404);

    const regProd = await request.get(`/platform/events/${prodEvent.id}`, {
      headers: getAuthHeaders('regular'),
    });
    expect(regProd.status()).toBe(200);
  });

  test('Search via GET /platform/events?search= — admin finds test event; regular does not', async ({
    request,
  }) => {
    const q = testEvent.name.trim();
    expect(q.length).toBeGreaterThan(1);

    const adminRes = await request.get('/platform/events', {
      headers: getAuthHeaders('admin'),
      params: { search: q, limit: '50', page: '1' },
    });
    expect(adminRes.ok()).toBeTruthy();
    const adminBody = (await adminRes.json()) as { data: { id: string }[] };
    expect((adminBody.data ?? []).map((e) => e.id)).toContain(testEvent.id);

    const regRes = await request.get('/platform/events', {
      headers: getAuthHeaders('regular'),
      params: { search: q, limit: '50', page: '1' },
    });
    expect(regRes.ok()).toBeTruthy();
    const regBody = (await regRes.json()) as { data: { id: string }[] };
    expect((regBody.data ?? []).map((e) => e.id)).not.toContain(testEvent.id);
  });

  /**
   * Legacy POST /search has no JWT — response must not surface test events.
   * (If this fails, wire is_test filtering into SearchService or retire the endpoint.)
   */
  test('POST /search — anonymous response must not include test events', async ({
    request,
  }) => {
    const res = await request.post('/search', {
      headers: {
        ...getUnauthenticatedHeaders(),
        'Content-Type': 'application/json',
      },
      data: {
        search: testEvent.name,
        page: 1,
        limit: 50,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      data?: { events?: { id: string; isTest?: boolean }[] };
    };
    const events = body.data?.events ?? [];
    const leaked = events.filter((e: Record<string, unknown>) => {
      const id = e.id as string;
      const isTest =
        e.isTest === true || e.is_test === true;
      return id === testEvent.id || isTest;
    });
    expect(leaked, 'Test events leaked via POST /search').toEqual([]);
  });

  test('GET /global-search?q= — results must not include the test event', async ({
    request,
  }) => {
    const res = await request.get('/global-search', {
      params: { q: testEvent.name, types: 'events' },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      events?: { items?: { id: string }[] };
    };
    const ids = (body.events?.items ?? []).map((i) => i.id);
    expect(ids).not.toContain(testEvent.id);
  });

  test('GET /platform/events/:id/stream — admin 200 + JSON body; regular 404 for test event', async ({
    request,
  }) => {
    const adminRes = await request.get(`/platform/events/${testEvent.id}/stream`, {
      headers: getAuthHeaders('admin'),
    });
    expect(
      adminRes.status(),
      `admin stream: ${await adminRes.text()}`,
    ).toBe(200);
    const streamJson = await adminRes.json();
    expect(streamJson).toBeTruthy();

    const regRes = await request.get(`/platform/events/${testEvent.id}/stream`, {
      headers: getAuthHeaders('regular'),
    });
    expect(regRes.status()).toBe(404);
  });

  test('GET /platform/events/:id/moments — admin returns 200; regular has no moments (empty) or 404', async ({
    request,
  }) => {
    const adminRes = await request.get(
      `/platform/events/${testEvent.id}/moments`,
      {
        headers: getAuthHeaders('admin'),
        params: { page: '1', limit: '50' },
      },
    );
    expect(adminRes.ok()).toBeTruthy();

    const regRes = await request.get(
      `/platform/events/${testEvent.id}/moments`,
      {
        headers: getAuthHeaders('regular'),
        params: { page: '1', limit: '50' },
      },
    );

    if (regRes.status() === 404) {
      return;
    }

    expect(regRes.ok()).toBeTruthy();
    const body = (await regRes.json()) as { data?: unknown[] };
    expect(
      body.data ?? [],
      'Non-admin should not receive moments for a hidden test event',
    ).toEqual([]);
  });

  test('Pagination — test event id never appears in any regular page', async ({
    request,
  }) => {
    const ids = await fetchAllEventIdsAcrossPages(request, 'regular', {
      limit: '10',
    });
    expect(ids).not.toContain(testEvent.id);
  });

  test('Filters LIVE / UPCOMING — regular views never include the test event id', async ({
    request,
  }) => {
    for (const status of ['LIVE', 'SCHEDULED'] as const) {
      const ids = await fetchAllEventIdsAcrossPages(request, 'regular', {
        status,
        limit: '20',
      });
      expect(ids, `leak with status=${status}`).not.toContain(testEvent.id);
    }
  });

  test('Security: no Authorization — lists must not include test events', async ({
    request,
  }) => {
    const ids: string[] = [];
    let page = 1;
    let totalPages = 1;
    for (;;) {
      const res = await request.get('/platform/events', {
        headers: getUnauthenticatedHeaders(),
        params: { page: String(page), limit: '25' },
      });
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as {
        data: { id: string }[];
        pagination?: { totalPages: number };
      };
      for (const row of body.data ?? []) {
        ids.push(row.id);
      }
      totalPages = body.pagination?.totalPages ?? 1;
      if (page >= totalPages) break;
      page += 1;
    }
    expect(ids).not.toContain(testEvent.id);
  });

  test('Security: regular + test event id → 404 (not 403)', async ({
    request,
  }) => {
    const res = await request.get(`/platform/events/${testEvent.id}`, {
      headers: getAuthHeaders('regular'),
    });
    expect(res.status()).toBe(404);
  });

  test('Security: unauthenticated GET /platform/events/:id for test event → 404', async ({
    request,
  }) => {
    const res = await request.get(`/platform/events/${testEvent.id}`, {
      headers: getUnauthenticatedHeaders(),
    });
    expect(res.status()).toBe(404);
  });

  test('GET /events/public/* — regular user never sees test event in any feed', async ({
    request,
  }) => {
    const h = getAuthHeaders('regular');
    for (const path of [
      '/events/public/live',
      '/events/public/ongoing',
      '/events/public/past',
      '/events/public/shows',
    ] as const) {
      const res = await request.get(path, {
        headers: h,
        params: { limit: '100' },
      });
      expect(res.ok(), `${path}: ${await res.text()}`).toBeTruthy();
      const j = (await res.json()) as { events?: { id: string }[] };
      const ids = (j.events ?? []).map((e) => e.id);
      expect(ids, path).not.toContain(testEvent.id);
    }
  });

  test('GET /events/public/* — admin sees test event in at least one feed (union of buckets)', async ({
    request,
  }) => {
    const h = getAuthHeaders('admin');
    const union = new Set<string>();
    for (const path of [
      '/events/public/live',
      '/events/public/ongoing',
      '/events/public/past',
      '/events/public/shows',
    ]) {
      const res = await request.get(path, {
        headers: h,
        params: { limit: '100' },
      });
      expect(res.ok(), path).toBeTruthy();
      const j = (await res.json()) as { events?: { id: string }[] };
      for (const e of j.events ?? []) {
        union.add(e.id);
      }
    }
    expect(
      union.has(testEvent.id),
      'Admin JWT must surface the test event in some /events/public/* bucket it qualifies for (live / ongoing / past / shows).',
    ).toBe(true);
  });

  /**
   * These routes have no OptionalJwtAuthGuard — Bearer is ignored. Everyone is treated as public;
   * test events stay hidden even if the client sends an admin token.
   */
  test('POST /search and GET /global-search — admin Bearer still does not return test events', async ({
    request,
  }) => {
    const post = await request.post('/search', {
      headers: {
        ...getAuthHeaders('admin'),
        'Content-Type': 'application/json',
      },
      data: {
        search: testEvent.name,
        page: 1,
        limit: 50,
      },
    });
    expect(post.ok()).toBeTruthy();
    const postEvents =
      ((await post.json()) as { data?: { events?: { id: string }[] } }).data
        ?.events ?? [];
    expect(postEvents.map((e) => e.id)).not.toContain(testEvent.id);

    const gRes = await request.get('/global-search', {
      headers: getAuthHeaders('admin'),
      params: { q: testEvent.name, types: 'events' },
    });
    expect(gRes.ok()).toBeTruthy();
    const gItems =
      ((await gRes.json()) as { events?: { items?: { id: string }[] } }).events
        ?.items ?? [];
    expect(gItems.map((i) => i.id)).not.toContain(testEvent.id);
  });
});
