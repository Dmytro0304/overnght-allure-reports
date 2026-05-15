/**
 * Общие проверки окружения для UI-тестов (локальный Next vs staging).
 */

export function isLocalWebBaseURL(baseURL: string | undefined): boolean {
  if (!baseURL) return false;
  try {
    const h = new URL(baseURL).hostname;
    return h === 'localhost' || h === '127.0.0.1';
  } catch {
    return false;
  }
}

export function getApiHostname(): string {
  const apiBaseRaw =
    process.env.API_BASE_URL?.replace(/\/$/, '').trim() ||
    'https://api.stg.overnght.com';
  try {
    return new URL(apiBaseRaw).hostname;
  } catch {
    return 'api.stg.overnght.com';
  }
}
