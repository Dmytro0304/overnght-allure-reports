/**
 * Weekly reporting helper (manual template + draft from last JSON run).
 *   npm run report:weekly:new   — copy TEMPLATE to dated manual file
 *   npm run report:weekly:draft — append stats from reports/last-run.json
 */
const fs = require('fs');
const path = require('path');

const testsRoot = path.join(__dirname, '..', '..');
const weeklyDir = path.join(testsRoot, 'reports', 'weekly');
const templatePath = path.join(weeklyDir, 'TEMPLATE.md');
const jsonPath = path.join(testsRoot, 'reports', 'last-run.json');

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

function cmdInit() {
  fs.mkdirSync(weeklyDir, { recursive: true });
  if (!fs.existsSync(templatePath)) {
    console.error('[weekly] Missing', templatePath);
    process.exit(1);
  }
  const dest = path.join(weeklyDir, `manual-${isoDate()}.md`);
  if (fs.existsSync(dest) && !process.argv.includes('--force')) {
    console.error('[weekly] Exists:', dest, '(use --force)');
    process.exit(1);
  }
  fs.copyFileSync(templatePath, dest);
  console.log('[weekly] Created', dest);
}

function cmdDraft() {
  fs.mkdirSync(weeklyDir, { recursive: true });
  const dest = path.join(weeklyDir, `auto-draft-${isoDate()}.md`);
  let statsBlock =
    '_(Нет `reports/last-run.json` — выполните `npm test` в каталоге `tests/`.)_\n';

  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const st = data.stats || {};
      statsBlock = [
        '### Авто-черновик (из last-run.json)',
        '',
        '| Метрика | Значение |',
        '|--------|----------|',
        `| Ожидаемо (passed) | ${st.expected ?? '—'} |`,
        `| Упало | ${st.unexpected ?? '—'} |`,
        `| Flaky | ${st.flaky ?? '—'} |`,
        `| Пропуски | ${st.skipped ?? '—'} |`,
        `| Длительность (ms) | ${st.duration ?? '—'} |`,
        `| Старт | ${st.startTime ?? '—'} |`,
        '',
      ].join('\n');
    } catch (e) {
      statsBlock = `_Ошибка чтения JSON: ${e.message}_\n`;
    }
  }

  const body = [
    `# Weekly QA draft — ${isoDate()}`,
    '',
    statsBlock,
    '',
    '### Ручные заметки',
    '',
    '- ',
    '',
  ].join('\n');

  fs.writeFileSync(dest, body, 'utf8');
  console.log('[weekly] Wrote', dest);
}

const cmd = process.argv[2];
if (cmd === 'init') cmdInit();
else if (cmd === 'draft') cmdDraft();
else {
  console.log('Usage: weekly-summary.cjs init|draft');
  process.exit(1);
}
