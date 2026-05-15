/**
 * Удаляет отчёты и сырьё прошлых прогонов, чтобы в каталогах остались только данные текущего запуска.
 * Вызывается из global-setup. Отключить: PW_SKIP_ARTIFACT_CLEANUP=1
 */
const fs = require('fs');
const path = require('path');

function rmDir(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

/**
 * @param {string} testsRoot absolute path to tests/ (package root)
 */
function cleanTestArtifacts(testsRoot) {
  if (process.env.PW_SKIP_ARTIFACT_CLEANUP === '1') {
    console.log('[setup] PW_SKIP_ARTIFACT_CLEANUP=1 — пропуск очистки артефактов');
    return;
  }

  rmDir(path.join(testsRoot, 'playwright-report'));
  rmDir(path.join(testsRoot, 'allure-report'));
  rmDir(path.join(testsRoot, 'allure-results'));
  rmDir(path.join(testsRoot, 'test-results'));

  const lastRun = path.join(testsRoot, 'reports', 'last-run.json');
  const summary = path.join(testsRoot, 'reports', 'summary.html');
  try {
    fs.unlinkSync(lastRun);
  } catch (_) {
    /* ignore */
  }
  try {
    fs.unlinkSync(summary);
  } catch (_) {
    /* ignore */
  }

  console.log(
    '[setup] Очищены артефакты прошлых прогонов (Allure, Playwright HTML, test-results, last-run/summary)',
  );
}

module.exports = cleanTestArtifacts;

if (require.main === module) {
  cleanTestArtifacts(path.join(__dirname, '..', '..'));
}
