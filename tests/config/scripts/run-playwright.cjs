const { spawnSync } = require('child_process');
const path = require('path');

const testsRoot = path.join(__dirname, '..', '..');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(testsRoot, '.pw-browsers');

require('dotenv').config({ path: path.join(testsRoot, '.env') });
require('dotenv').config({ path: path.join(testsRoot, '.env.local') });

const extraArgs = process.argv.slice(2);
const r = spawnSync(
  'npx',
  [
    'playwright',
    'test',
    '-c',
    path.join(testsRoot, 'config', 'playwright.config.ts'),
    ...extraArgs,
  ],
  {
    stdio: 'inherit',
    env: process.env,
    cwd: testsRoot,
    shell: true,
  },
);
process.exit(r.status ?? 1);
