import type { AuthRole } from './auth';
import { getAuthHeaders } from './auth';

/** Minimal request surface (matches Playwright APIRequestContext#get). */
export interface ApiRequestLike {
  get(
    url: string,
    options?: {
      headers?: Record<string, string>;
      params?: Record<string, string>;
    },
  ): Promise<{
    ok(): boolean;
    status(): number;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }>;
}

/** Shape returned by GET /platform/events list items */
export interface PlatformEventItem {
  id: string;
  name: string;
  isTest: boolean;
  /** Prefer free test events for player-focused E2E (subscription bypass). */
  isFree?: boolean;
}

function normalizeListRow(raw: Record<string, unknown>): PlatformEventItem {
  const id = String(raw.id ?? '');
  const name = String(raw.name ?? '');
  const isTest = raw.isTest === true || raw.is_test === true;
  const isFree = raw.isFree === true || raw.is_free === true;
  return { id, name, isTest, isFree };
}

/**
 * Walks paginated GET /platform/events as admin until one test and one prod event are found.
 */
export async function getTestAndProdEvents(
  request: ApiRequestLike,
): Promise<{ testEvent: PlatformEventItem; prodEvent: PlatformEventItem }> {
  const headers = getAuthHeaders('admin');
  const testHits: PlatformEventItem[] = [];
  const prodHits: PlatformEventItem[] = [];

  let page = 1;
  const maxPages = 40;

  while (page <= maxPages && (testHits.length === 0 || prodHits.length === 0)) {
    const res = await request.get('/platform/events', {
      headers,
      params: {
        page: String(page),
        limit: '50',
      },
    });

    if (!res.ok()) {
      throw new Error(
        `Admin events list failed: HTTP ${res.status()} ${await res.text()}`,
      );
    }

    const body = (await res.json()) as {
      data?: Record<string, unknown>[];
      pagination?: { totalPages: number };
    };
    const rows = (body.data ?? []).map((r) => normalizeListRow(r));

    for (const row of rows) {
      if (row.isTest === true) testHits.push(row);
      else prodHits.push(row);
    }

    const totalPages = body.pagination?.totalPages ?? page;
    if (page >= totalPages) break;
    page += 1;
  }

  if (testHits.length === 0) {
    throw new Error(
      'No test events found (isTest: true). Seed or mark at least one test event on the target environment.',
    );
  }
  if (prodHits.length === 0) {
    throw new Error(
      'No production events found (isTest: false). Need at least one non-test event.',
    );
  }

  const testEvent = testHits.find((e) => e.isFree === true) ?? testHits[0];

  return { testEvent, prodEvent: prodHits[0] };
}

export async function fetchAllEventIdsAcrossPages(
  request: ApiRequestLike,
  role: AuthRole,
  extraParams: Record<string, string> = {},
): Promise<string[]> {
  const headers = getAuthHeaders(role);
  const ids: string[] = [];
  let page = 1;
  let totalPages = 1;

  for (;;) {
    const res = await request.get('/platform/events', {
      headers,
      params: {
        page: String(page),
        limit: '25',
        ...extraParams,
      },
    });
    if (!res.ok()) {
      throw new Error(`List failed page ${page}: HTTP ${res.status()}`);
    }
    const body = (await res.json()) as {
      data?: Record<string, unknown>[];
      pagination?: { totalPages: number };
    };
    for (const raw of body.data ?? []) {
      ids.push(normalizeListRow(raw).id);
    }
    totalPages = body.pagination?.totalPages ?? 1;
    if (page >= totalPages) break;
    page += 1;
  }

  return ids;
}
