/**
 * allure generate для каталога tests/; нужен Java в PATH (macOS: openjdk@17).
 * Из global-teardown ошибка не роняет код выхода прогона. Отключить: SKIP_ALLURE_GENERATE=1
 */
const { spawnSync } = require('child_process');
const path = require('path');

const testsRoot = path.join(__dirname, '..', '..');

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

function main() {
  if (process.env.SKIP_ALLURE_GENERATE === '1') {
    console.log('[reports] SKIP_ALLURE_GENERATE=1 — пропуск allure generate');
    process.exit(0);
  }

  const env = withJavaPath(process.env);
  const r = spawnSync('npm', ['run', 'report:allure'], {
    cwd: testsRoot,
    env,
    stdio: 'inherit',
    shell: true,
  });
  process.exit(r.status ?? 1);
}

main();
