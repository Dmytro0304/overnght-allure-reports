#!/usr/bin/env node
/**
 * Rich Slack summary (Incoming Webhook) — формат как в примере, axios POST.
 *
 * Env:
 *   SLACK_WEBHOOK или SLACK_WEBHOOK_URL — обязательно
 *   ALLURE_REPORT_PUBLIC_URL / ALLURE_REPORT_URL — опционально (иначе GitHub Pages по умолчанию)
 *   PW_ENV — опционально (staging → Stage в тексте)
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

function loadDotenv(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {
    /* ok */
  }
}

const pkgRoot = path.join(__dirname, '..', '..');
loadDotenv(path.join(pkgRoot, '.env'));
loadDotenv(path.join(pkgRoot, '.env.local'));
const monoEnv = path.join(pkgRoot, '..', '.env');
if (fs.existsSync(monoEnv)) loadDotenv(monoEnv);

const webhookUrl = (
  process.env.SLACK_WEBHOOK ||
  process.env.SLACK_WEBHOOK_URL ||
  ''
).trim();

const DEFAULT_ALLURE =
  'https://dmytro0304.github.io/overnght-allure-reports/';

const jsonReport = path.join(pkgRoot, 'reports', 'last-run.json');

let passed = 0,
  failed = 0,
  skipped = 0,
  flaky = 0,
  total = 0;
const failures = [];

function collectSuite(suites, prefix) {
  for (const suite of suites || []) {
    const p = prefix ? `${prefix} › ${suite.title}` : suite.title || '';
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        total++;
        switch (t.status) {
          case 'expected':
            passed++;
            break;
          case 'skipped':
            skipped++;
            break;
          case 'flaky':
            flaky++;
            passed++;
            break;
          default:
            failed++;
            failures.push({
              title: [p, spec.title].filter(Boolean).join(' › '),
              error: (t.results?.[0]?.error?.message || 'Unknown error')
                .split('\n')[0]
                .slice(0, 140),
            });
        }
      }
    }
    collectSuite(suite.suites, p);
  }
}

try {
  const raw = JSON.parse(fs.readFileSync(jsonReport, 'utf8'));
  collectSuite(raw.suites, '');
} catch {
  /* stats stay zero if нет отчёта */
}

async function sendSlackReport(message) {
  await axios.post(webhookUrl, { text: message });
}

function envLabel() {
  const e = (process.env.PW_ENV || 'staging').toLowerCase();
  if (e === 'staging' || e === 'stage') return 'Stage';
  if (e === 'dev') return 'Dev';
  return e.charAt(0).toUpperCase() + e.slice(1);
}

const now = new Date();
const dd = String(now.getUTCDate()).padStart(2, '0');
const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
const yyyy = now.getUTCFullYear();
const hh = String(now.getUTCHours()).padStart(2, '0');
const min = String(now.getUTCMinutes()).padStart(2, '0');
const dateStr = `${dd}.${mm}.${yyyy}, ${hh}:${min} (UTC)`;

let failuresBlock = '—';
if (failures.length > 0) {
  failuresBlock = failures
    .slice(0, 10)
    .map((f, i) => `${i + 1}. ${f.title.slice(0, 120)} — ${f.error.slice(0, 80)}`)
    .join('\n');
  if (failures.length > 10) failuresBlock += `\n…и ещё ${failures.length - 10}.`;
}

const reportUrl =
  process.env.ALLURE_REPORT_PUBLIC_URL?.trim() ||
  process.env.ALLURE_REPORT_URL?.trim() ||
  DEFAULT_ALLURE;

const allureDate = `${yyyy}-${mm}-${dd}`;

let flakyLine = '';
if (flaky > 0) {
  flakyLine = `\n:warning: Flaky (passed after retry): ${flaky}`;
}

const message =
  `Overnght E2E\n` +
  `Environment: ${envLabel()}\n` +
  `:spiral_calendar_pad: ${dateStr}\n\n` +
  `:white_check_mark: Passed:  ${passed}\n` +
  `:x: Failed:  ${failed}\n` +
  `:black_right_pointing_double_triangle_with_vertical_bar: Skipped: ${skipped}${flakyLine}\n` +
  `:bar_chart: Total:   ${total}\n\n` +
  `Failures:\n${failuresBlock}\n\n` +
  `:white_check_mark: Overnght Allure report — ${allureDate}\n` +
  `${reportUrl}`;

(async () => {
  if (!webhookUrl) {
    console.error('❌ Задайте SLACK_WEBHOOK или SLACK_WEBHOOK_URL.');
    process.exit(1);
  }
  try {
    await sendSlackReport(message);
    console.log('✅ Slack webhook OK');
  } catch (e) {
    console.error('❌ Slack:', e.response?.data || e.message);
    process.exit(1);
  }
})();
