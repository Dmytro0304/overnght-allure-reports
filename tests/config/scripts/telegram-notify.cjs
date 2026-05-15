#!/usr/bin/env node
/**
 * Sends a Playwright test summary to a Telegram chat (plain text, UTC time).
 *
 * Usage (after test run):
 *   node config/scripts/telegram-notify.cjs
 *
 * Required env:
 *   TELEGRAM_BOT_TOKEN  — Bot token from @BotFather
 *   TELEGRAM_CHAT_ID    — Chat ID or @username
 *
 * Optional env:
 *   PW_ENV                   — staging | dev (default: staging)
 *   ALLURE_REPORT_PUBLIC_URL — ссылка на опубликованный отчёт (GitHub Pages), добавляется в конец сообщения
 *   ALLURE_REPORT_URL        — запасной вариант, если PUBLIC_URL не задан
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load env from root .env → tests/.env → tests/.env.local (same order as playwright)
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
  } catch { /* file may not exist */ }
}

const pkgRoot = path.join(__dirname, '..', '..');
loadDotenv(path.join(pkgRoot, '.env'));
loadDotenv(path.join(pkgRoot, '.env.local'));
const monoEnv = path.join(pkgRoot, '..', '.env');
try {
  if (fs.existsSync(monoEnv)) loadDotenv(monoEnv);
} catch {
  /* optional parent repo when tests lived inside monorepo */
}

// ─── Config ──────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error(
    '❌  TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set.\n' +
      'Example: TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=@channel node config/scripts/telegram-notify.cjs'
  );
  process.exit(0);
}

const testsRoot = pkgRoot;
const jsonReport = path.join(testsRoot, 'reports', 'last-run.json');

// ─── Parse last-run.json ─────────────────────────────────────────────────────

let passed = 0, failed = 0, skipped = 0, flaky = 0, total = 0;
const failures = [];

function collectSuite(suites, prefix) {
  for (const suite of suites || []) {
    const p = prefix ? `${prefix} › ${suite.title}` : (suite.title || '');
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        total++;
        switch (t.status) {
          case 'expected':  passed++;  break;
          case 'skipped':  skipped++; break;
          case 'flaky':    flaky++;   passed++; break;
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
} catch (e) {
  console.warn('⚠️  Could not read last-run.json:', e.message);
}

// ─── Build message ────────────────────────────────────────────────────────────

const env = (process.env.PW_ENV || 'staging').toUpperCase();

const now = new Date();
const dd   = String(now.getUTCDate()).padStart(2, '0');
const mm   = String(now.getUTCMonth() + 1).padStart(2, '0');
const yyyy = now.getUTCFullYear();
const hh   = String(now.getUTCHours()).padStart(2, '0');
const min  = String(now.getUTCMinutes()).padStart(2, '0');
const dateStr = `${dd}.${mm}.${yyyy}, ${hh}:${min} (UTC)`;

const statusEmoji = failed > 0 ? '🔴' : flaky > 0 ? '🟡' : '🟢';

let message =
  `${statusEmoji} *Overnght E2E — ${env}*\n` +
  `🗓 ${dateStr}\n\n` +
  `✅ Passed:  ${passed}\n` +
  `❌ Failed:  ${failed}\n` +
  `⏭ Skipped: ${skipped}\n`;

if (flaky > 0) {
  message += `⚠️ Flaky:   ${flaky}\n`;
}

message += `📊 Total:   ${total}`;

if (failures.length > 0) {
  message += '\n\n*Failed:*\n';
  message += failures
    .slice(0, 10)
    .map((f, i) => {
      // Extract TC-ID from title (e.g. "TC-PLAYER-007", "TC-EVENT-HL-001")
      const tcMatch = f.title.match(/TC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+/);
      const tcId = tcMatch ? tcMatch[0] : '';
      // Short description: last segment of title
      const parts = f.title.split(' › ');
      const shortTitle = parts[parts.length - 1].replace(/^TC-[A-Z0-9-]+[: ]*/, '').trim().slice(0, 50);
      // Short error: first meaningful line, strip ANSI codes
      const shortErr = f.error.replace(/\[\d+m/g, '').replace(/Error: expect\(.*?\)\./, '').trim().slice(0, 80);
      const label = tcId ? `${tcId}` : shortTitle;
      return `${i + 1}. *${label}* — ${shortErr}`;
    })
    .join('\n');
  if (failures.length > 10) {
    message += `\n…and ${failures.length - 10} more.`;
  }
}

const reportUrl =
  process.env.ALLURE_REPORT_PUBLIC_URL?.trim() ||
  process.env.ALLURE_REPORT_URL?.trim() ||
  '';
if (reportUrl) {
  message += `\n\n📎 [Allure report](${reportUrl})`;
}

// ─── Send to Telegram ─────────────────────────────────────────────────────────

function sendMessage(text) {
  const body = JSON.stringify({
    chat_id: CHAT_ID,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', d => (data += d));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (!json.ok) reject(new Error(`Telegram error: ${json.description}`));
            else resolve(json);
          } catch (e) {
            reject(new Error(`Invalid JSON from Telegram: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

sendMessage(message)
  .then(() => {
    console.log('✅  Telegram notification sent successfully.');
    console.log('Preview:\n' + message);
  })
  .catch(err => {
    console.error('❌  Telegram send failed:', err.message);
    process.exit(1);
  });
