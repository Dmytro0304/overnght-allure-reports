#!/usr/bin/env node
/**
 * Отправка короткого сообщения в Slack через Incoming Webhook (полезная ссылка на Allure).
 *
 * Env:
 *   SLACK_WEBHOOK_URL — обязательно (https://hooks.slack.com/services/...)
 *   ALLURE_REPORT_PUBLIC_URL — опционально, добавится в текст
 *   PW_ENV — опционально
 *
 * Сводка по тестам читается из reports/last-run.json (как в telegram-notify).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

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

const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
if (!webhook) {
  console.error('❌ SLACK_WEBHOOK_URL не задан.');
  process.exit(1);
}

const jsonReport = path.join(pkgRoot, 'reports', 'last-run.json');
let statsLine = '';
try {
  const raw = JSON.parse(fs.readFileSync(jsonReport, 'utf8'));
  const s = raw.stats || {};
  statsLine = `passed ${s.expected ?? '?'}, failed ${s.unexpected ?? '?'}, skipped ${s.skipped ?? '?'}`;
} catch {
  statsLine = 'stats unavailable';
}

const env = (process.env.PW_ENV || 'staging').toUpperCase();
const reportUrl =
  process.env.ALLURE_REPORT_PUBLIC_URL?.trim() ||
  process.env.ALLURE_REPORT_URL?.trim() ||
 '';

let text = `*Overnght E2E (${env})* — ${statsLine}`;
if (reportUrl) text += `\n<${reportUrl}|Allure report>`;

const body = JSON.stringify({ text });

const u = new URL(webhook);
const opts = {
  hostname: u.hostname,
  path: u.pathname + u.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = https.request(opts, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Slack webhook OK');
      process.exit(0);
    }
    console.error('❌ Slack:', res.statusCode, data);
    process.exit(1);
  });
});
req.on('error', (e) => {
  console.error('❌', e.message);
  process.exit(1);
});
req.write(body);
req.end();
