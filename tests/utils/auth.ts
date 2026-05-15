export type AuthRole = 'admin' | 'regular';

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

/**
 * API requests: Bearer JWT for admin vs regular users.
 */
export function getAuthHeaders(role: AuthRole): Record<string, string> {
  const token =
    role === 'admin' ? requireEnv('ADMIN_TOKEN') : requireEnv('REGULAR_TOKEN');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
}

export function getUnauthenticatedHeaders(): Record<string, string> {
  return { Accept: 'application/json' };
}

/**
 * Resolve REST API origin. Override with API_BASE_URL when needed.
 */
export function resolveApiBaseUrl(): string {
  const explicit = process.env.API_BASE_URL?.replace(/\/$/, '');
  if (explicit) return explicit;

  const web = process.env.BASE_URL || 'https://stg.overnght.com';
  try {
    const { hostname } = new URL(web);
    if (
      hostname === 'stg.overnght.com' ||
      hostname.endsWith('.stg.overnght.com')
    ) {
      return 'https://api.stg.overnght.com';
    }
  } catch {
    /* ignore */
  }
  return 'http://localhost:4000';
}

/**
 * Web origin for Playwright (no trailing slash).
 */
export function resolveWebBaseUrl(): string {
  const raw = process.env.BASE_URL || 'https://stg.overnght.com';
  return raw.replace(/\/$/, '');
}

type Cookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  sameSite: 'Lax' | 'Strict' | 'None';
  secure: boolean;
  httpOnly: boolean;
};

/**
 * Mirror web client: JWT stored in `token` cookie for the site origin.
 */
export async function setSessionCookie(
  context: { addCookies: (cookies: Cookie[]) => Promise<void> },
  token: string,
  webBaseUrl: string = resolveWebBaseUrl(),
): Promise<void> {
  const origin = webBaseUrl.includes('://') ? webBaseUrl : `https://${webBaseUrl}`;
  const base = new URL(origin);
  await context.addCookies([
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
}
