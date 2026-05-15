import type { APIRequestContext } from '@playwright/test';
import { getApiBaseUrl } from './env';

/**
 * Web `AuthProvider` redirects users with `verified: false` to `/auth/verify-email`,
 * which blocks reaching `/s/start` subscription checkout in E2E.
 *
 * When `ADMIN_TOKEN` is present, mark the dup user verified via `PUT /admin/users/:id`.
 */
export async function ensureDupUserEmailVerified(
  request: APIRequestContext,
  email: string,
): Promise<{ ok: boolean; reason: string }> {
  const admin = process.env.ADMIN_TOKEN?.trim();
  if (!admin) {
    return {
      ok: false,
      reason:
        'ADMIN_TOKEN not set — cannot mark E2E dup user verified (required to pass AuthProvider gate)',
    };
  }

  const api = getApiBaseUrl();
  const list = await request.get(
    `${api}/admin/users?search=${encodeURIComponent(email)}&limit=20&page=1`,
    { headers: { Authorization: `Bearer ${admin}` } },
  );

  if (!list.ok()) {
    return { ok: false, reason: `admin users list failed HTTP ${list.status}: ${await list.text()}` };
  }

  const body = (await list.json()) as {
    data?: { id: string; email: string; verified: boolean }[];
  };
  const row = body.data?.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!row) {
    return { ok: false, reason: `no admin list row for ${email}` };
  }

  if (row.verified) {
    return { ok: true, reason: 'already verified' };
  }

  const put = await request.put(`${api}/admin/users/${row.id}`, {
    headers: {
      Authorization: `Bearer ${admin}`,
      'Content-Type': 'application/json',
    },
    data: { verified: true },
  });

  if (!put.ok()) {
    return { ok: false, reason: `admin PUT verified failed HTTP ${put.status}: ${await put.text()}` };
  }

  return { ok: true, reason: 'verified via admin' };
}
