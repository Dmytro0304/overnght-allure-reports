import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getDefaultUrlsForPlaywrightEnv } from './config';

const testsRoot = path.join(__dirname, '..');

const parentEnv = path.join(testsRoot, '..', '.env');
if (fs.existsSync(parentEnv)) {
  dotenv.config({ path: parentEnv });
}
dotenv.config({ path: path.join(testsRoot, '.env'), override: true });
dotenv.config({ path: path.join(testsRoot, '.env.local'), override: true });

const defaults = getDefaultUrlsForPlaywrightEnv();
const webBaseURL =
  process.env.BASE_URL?.replace(/\/$/, '').trim() || defaults.web;
const apiBaseURL =
  process.env.API_BASE_URL?.replace(/\/$/, '').trim() || defaults.api;

if (!process.env.BASE_URL?.trim()) {
  process.env.BASE_URL = webBaseURL;
}
if (!process.env.API_BASE_URL?.trim()) {
  process.env.API_BASE_URL = apiBaseURL;
}

const apiHealthURL =
  process.env.E2E_API_HEALTH_URL || `${apiBaseURL.replace(/\/$/, '')}/health`;
const startServers = process.env.E2E_START_SERVERS === '1';
const skipApiServer = process.env.E2E_SKIP_API_SERVER === '1';
/** Если Playwright сам поднимает web — не reuse: иначе можно поймать чужой `next dev` без NEXT_PUBLIC_BACKEND_URL (OAuth). */
const reuseWebServer = !process.env.CI && !startServers;

const MS_90S = 90_000;
const MS_2M = 120_000;

export default defineConfig({
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.cjs'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 90_000,
  expect: { timeout: 25_000 },
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: path.join(testsRoot, 'playwright-report'),
        open: 'never',
      },
    ],
    [
      'allure-playwright',
      {
        outputFolder: path.join(testsRoot, 'allure-results'),
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          PW_ENV: process.env.PW_ENV || process.env.PLAYWRIGHT_ENV || 'staging',
          BASE_URL: webBaseURL,
          API_BASE_URL: apiBaseURL,
          API_HEALTH: apiHealthURL,
        },
      },
    ],
    [
      'json',
      {
        outputFile: path.join(testsRoot, 'reports', 'last-run.json'),
      },
    ],
  ],
  use: {
    baseURL: webBaseURL,
    ignoreHTTPSErrors: true,
    launchOptions: {
      args: ['--disable-cache'],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30_000,
    actionTimeout: 25_000,
  },
  projects: [
    {
      name: 'api',
      testDir: path.join(testsRoot, 'api'),
      testMatch: '**/*.spec.ts',
      timeout: MS_90S,
      use: {
        baseURL: apiBaseURL,
      },
    },
    {
      name: 'ui',
      testDir: testsRoot,
      testMatch: ['ui/**/*.spec.ts', 'auth/**/*.spec.ts'],
      timeout: MS_2M,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: webBaseURL,
        // Как checksum trace: en-US / UTC (валидация, даты)
        locale: 'en-US',
        timezoneId: 'UTC',
      },
    },
  ],
  webServer: startServers
    ? [
        ...(skipApiServer
          ? []
          : [
              {
                command: 'npm run start:dev',
                cwd: path.join(testsRoot, '..', 'server'),
                url: apiHealthURL,
                reuseExistingServer: reuseWebServer,
                timeout: 180_000,
                stdout: 'pipe',
                stderr: 'pipe',
              },
            ]),
        {
          command: 'npm run dev',
          cwd: path.join(testsRoot, '..', 'web'),
          url: webBaseURL,
          reuseExistingServer: reuseWebServer,
          timeout: 180_000,
          stdout: 'pipe',
          stderr: 'pipe',
          env: {
            ...process.env,
            NEXT_PUBLIC_BACKEND_URL: apiBaseURL.replace(/\/$/, ''),
          },
        },
      ]
    : undefined,
});
