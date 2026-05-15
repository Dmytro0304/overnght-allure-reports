/**
 * Builds a small HTML summary from Playwright JSON reporter (reports/last-run.json).
 * Run after tests: npm run report:summary
 */
const fs = require('fs');
const path = require('path');

const testsRoot = path.join(__dirname, '..', '..');
const jsonPath = path.join(testsRoot, 'reports', 'last-run.json');
const outPath = path.join(testsRoot, 'reports', 'summary.html');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function collectFailures(suites, prefix, acc) {
  if (!suites) return;
  for (const suite of suites) {
    const p = prefix ? `${prefix} › ${suite.title}` : suite.title || '';
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        if (test.status === 'unexpected' || test.status === 'flaky') {
          const err =
            test.results && test.results[0] && test.results[0].error
              ? test.results[0].error.message || String(test.results[0].error)
              : '';
          acc.push({
            title: [p, spec.title].filter(Boolean).join(' › '),
            project: test.projectName || '',
            status: test.status,
            file: spec.file || suite.file || '',
            error: err,
          });
        }
      }
    }
    if (suite.suites) collectFailures(suite.suites, p, acc);
  }
}

function main() {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  if (!fs.existsSync(jsonPath)) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Test summary</title></head>
<body><h1>Нет данных</h1><p>Сначала выполните тесты (появится <code>reports/last-run.json</code>).</p></body></html>`;
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`[summary] Wrote placeholder (no JSON): ${outPath}`);
    return;
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('[summary] Invalid JSON', jsonPath, e.message);
    process.exit(1);
  }

  const st = data.stats || {};
  const expected = st.expected ?? 0;
  const unexpected = st.unexpected ?? 0;
  const flaky = st.flaky ?? 0;
  const skipped = st.skipped ?? 0;
  const durationMs = st.duration ?? 0;
  const startTime = st.startTime || '';

  const failures = [];
  collectFailures(data.suites || [], '', failures);

  const rows = [
    ['Passed (expected)', expected],
    ['Failed', unexpected],
    ['Flaky', flaky],
    ['Skipped', skipped],
  ]
    .map(
      ([k, v]) =>
        `<tr><td>${escapeHtml(k)}</td><td><strong>${v}</strong></td></tr>`,
    )
    .join('');

  const failRows = failures.length
    ? failures
        .map(
          (f) => `<tr>
<td>${escapeHtml(f.project)}</td>
<td>${escapeHtml(f.title)}</td>
<td>${escapeHtml(f.status)}</td>
<td><pre>${escapeHtml(f.error.slice(0, 2000))}${f.error.length > 2000 ? '…' : ''}</pre></td>
</tr>`,
        )
        .join('')
    : '<tr><td colspan="4">—</td></tr>';

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Playwright summary</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #111; }
    h1 { font-size: 1.25rem; }
    table { border-collapse: collapse; width: 100%; max-width: 56rem; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
    th { background: #f4f4f5; }
    pre { white-space: pre-wrap; margin: 0; font-size: 12px; }
    .muted { color: #666; font-size: 14px; }
    code { background: #f4f4f5; padding: 2px 6px; }
  </style>
</head>
<body>
  <h1>Сводка прогона</h1>
  <p class="muted">Источник: <code>reports/last-run.json</code>${startTime ? ` · старт ${escapeHtml(startTime)}` : ''}${durationMs ? ` · ${(durationMs / 1000).toFixed(1)} s` : ''}</p>
  <table><thead><tr><th>Показатель</th><th>Значение</th></tr></thead><tbody>${rows}</tbody></table>
  <h2>Проблемные тесты</h2>
  <table>
    <thead><tr><th>Проект</th><th>Тест</th><th>Статус</th><th>Ошибка</th></tr></thead>
    <tbody>${failRows}</tbody>
  </table>
  <p class="muted">Allure: <code>npm run report:allure</code> · еженедельный отчёт: <code>npm run report:weekly:new</code></p>
</body>
</html>`;

  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`[summary] Wrote ${outPath}`);
}

main();
