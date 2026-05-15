const { spawnSync } = require('child_process');
const path = require('path');

/**
 * После полного прогона: сводный HTML из last-run.json и свежий Allure из allure-results.
 */
module.exports = async function globalTeardown() {
  const testsRoot = path.join(__dirname, '..');

  const summaryScript = path.join(__dirname, 'scripts', 'generate-summary-html.cjs');
  spawnSync(process.execPath, [summaryScript], { stdio: 'inherit', cwd: testsRoot });

  const allureScript = path.join(__dirname, 'scripts', 'generate-allure-report.cjs');
  const env = withJavaPath(process.env);
  const ar = spawnSync(process.execPath, [allureScript], {
    stdio: 'inherit',
    cwd: testsRoot,
    env,
  });
  if (ar.status !== 0) {
    console.warn(
      '\n[reports] allure generate завершился с ошибкой (часто нет Java в PATH). Актуальные сырые данные: allure-results/. Повтор вручную: cd tests && npm run report:allure\n',
    );
  } else {
    console.log(
      '\n[reports] Allure: tests/allure-report/index.html — смотреть только через HTTP: npm run report:allure:http\n',
    );
  }
};

function withJavaPath(env) {
  const next = { ...env };
  const sep = path.delimiter;
  if (process.platform === 'darwin') {
    const prefix = ['/opt/homebrew/opt/openjdk@17/bin', '/usr/local/opt/openjdk@17/bin'].join(
      sep,
    );
    next.PATH = `${prefix}${sep}${next.PATH || ''}`;
  }
  return next;
}
