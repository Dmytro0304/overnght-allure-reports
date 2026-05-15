/**
 * Целевые окружения для Playwright. Активное: PW_ENV или PLAYWRIGHT_ENV (`dev` | `staging`), по умолчанию staging.
 * Явные BASE_URL / API_BASE_URL в .env имеют приоритет над значениями ниже.
 */
export const projects = [
  { name: 'dev', use: { baseURL: 'http://localhost:3000' } },
  { name: 'staging', use: { baseURL: 'https://stg.overnght.com' } },
] as const;

export type PlaywrightEnvName = (typeof projects)[number]['name'];

const API_BASE_BY_ENV: Record<PlaywrightEnvName, string> = {
  dev: 'http://localhost:4000',
  staging: 'https://api.stg.overnght.com',
};

export function resolvePlaywrightEnv(): PlaywrightEnvName {
  const v = (process.env.PW_ENV || process.env.PLAYWRIGHT_ENV || 'staging')
    .toLowerCase()
    .trim();
  if (v === 'dev') return 'dev';
  return 'staging';
}

export function getDefaultUrlsForPlaywrightEnv(): { web: string; api: string } {
  const name = resolvePlaywrightEnv();
  const row = projects.find((p) => p.name === name)!;
  return {
    web: row.use.baseURL,
    api: API_BASE_BY_ENV[name],
  };
}
