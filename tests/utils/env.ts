/**
 * API origin for `platform/*` and other JSON endpoints.
 * Staging: https://api.stg.overnght.com
 */
export function getApiBaseUrl(): string {
  const explicit = process.env.API_BASE_URL?.replace(/\/$/, '');
  if (explicit) return explicit;

  const fromBase = process.env.BASE_URL;
  if (fromBase) {
    try {
      const { hostname } = new URL(fromBase);
      if (hostname === 'stg.overnght.com' || hostname.startsWith('stg.')) {
        return 'https://api.stg.overnght.com';
      }
    } catch {
      /* ignore */
    }
  }
  return process.env.FALLBACK_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
}
