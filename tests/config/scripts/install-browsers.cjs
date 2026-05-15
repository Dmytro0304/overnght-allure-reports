const { spawnSync } = require('child_process');
const path = require('path');

const testsRoot = path.join(__dirname, '..', '..');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(testsRoot, '.pw-browsers');

const r = spawnSync('npx playwright install chromium', {
  stdio: 'inherit',
  env: process.env,
  cwd: testsRoot,
  shell: true,
});
process.exit(r.status ?? 1);
