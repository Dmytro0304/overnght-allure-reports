import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { getDefaultUrlsForPlaywrightEnv } from './config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const cleanTestArtifacts = require('./scripts/clean-test-artifacts.cjs') as (
  root: string,
) => void;

export default async function globalSetup() {
  const testsRoot = path.join(__dirname, '..');
  const parentEnv = path.join(testsRoot, '..', '.env');
  if (fs.existsSync(parentEnv)) {
    dotenv.config({ path: parentEnv });
  }
  dotenv.config({ path: path.join(testsRoot, '.env'), override: true });
  dotenv.config({ path: path.join(testsRoot, '.env.local'), override: true });

  cleanTestArtifacts(testsRoot);

  const defaults = getDefaultUrlsForPlaywrightEnv();
  const web = process.env.BASE_URL?.trim() || defaults.web;
  const apiHealth =
    process.env.E2E_API_HEALTH_URL ||
    `${defaults.api.replace(/\/$/, '')}/health`;

  const dir = path.join(testsRoot, 'allure-results');
  fs.mkdirSync(dir, { recursive: true });
  const envLines = [
    `BASE_URL=${web}`,
    `API=${apiHealth}`,
    `Node=${process.version}`,
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'environment.properties'), envLines + '\n');
  const categoriesSrc = path.join(__dirname, 'allure', 'categories.json');
  if (fs.existsSync(categoriesSrc)) {
    fs.copyFileSync(categoriesSrc, path.join(dir, 'categories.json'));
  }
  fs.writeFileSync(
    path.join(dir, 'executor.json'),
    JSON.stringify(
      {
        name: process.env.GITHUB_ACTIONS ? 'GitHub Actions' : 'Local',
        type: 'e2e',
        buildName: process.env.GITHUB_RUN_ID || `local-${Date.now()}`,
        reportUrl: process.env.ALLURE_REPORT_URL || '',
      },
      null,
      2,
    ),
  );
}
