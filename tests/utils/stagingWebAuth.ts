import type { Page } from '@playwright/test';
import { testLog } from './logger';

function getApiBase(): string {
  const explicit = process.env.E2E_API_BASE?.replace(/\/$/, '');
  if (explicit) return explicit;
  const base = process.env.BASE_URL || '';
  try {
    const { hostname } = new URL(base);
    if (hostname === 'stg.overnght.com' || hostname.endsWith('.stg.overnght.com')) {
      return 'https://api.stg.overnght.com';
    }
  } catch {
    /* fall through */
  }
  return 'http://localhost:4000';
}

/**
 * Staging: POST /login then set `token` cookie (same as web client).
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
  redirectPath = '/s/start',
) {
  const api = getApiBase();
  testLog('auth', 'API login', { api, email, redirectPath });

  const res = await page.request.post(`${api}/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });
  const body = (await res.json().catch(() => ({}))) as {
    token?: string;
    message?: string | string[];
  };

  if (!res.ok()) {
    const msg =
      typeof body.message === 'string'
        ? body.message
        : JSON.stringify(body.message ?? body);
    throw new Error(`Login failed HTTP ${res.status()}: ${msg}`);
  }

  const token = body.token;
  if (!token) {
    throw new Error('Login response missing token');
  }

  const base = new URL(process.env.BASE_URL || 'http://localhost:3000');

  await page.context().addCookies([
    {
      name: 'token',
      value: token,
      domain: base.hostname,
      path: '/',
      sameSite: 'Lax',
      secure: base.protocol === 'https:',
      httpOnly: false,
    },
  ]);

  const path = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
  await page.goto(`${base.origin}${path}`);
  testLog('auth', 'Opened with session', `${base.origin}${path}`);
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}
