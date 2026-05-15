#!/usr/bin/env node
/**
 * Публикует содержимое ./allure-report в отдельный Git-репозиторий (GitHub Pages / шаринг ссылкой в Slack).
 *
 * Перед вызовом: npm run report:allure
 *
 * Env:
 *   ALLURE_REPORTS_GIT_URL     — default https://github.com/Dmytro0304/overnght-allure-reports.git
 *   ALLURE_REPORTS_GIT_TOKEN   — PAT с правом push в этот репозиторий (или GITHUB_TOKEN при CI)
 *   ALLURE_PUBLISH_BRANCH      — default main
 *
 * После включения GitHub Pages (Deploy from branch main / root) ссылка вида:
 *   https://<user>.github.io/overnght-allure-reports/
 * её задайте в ALLURE_REPORT_PUBLIC_URL для Telegram / Slack.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const pkgRoot = path.join(__dirname, '..', '..');
const reportDir = path.join(pkgRoot, 'allure-report');

function run(cmd, cwd, inherit = true) {
  execSync(cmd, { cwd, stdio: inherit ? 'inherit' : 'pipe', encoding: 'utf8' });
}

function rmRf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function gitConfigured(dir) {
  try {
    run('git config user.email "github-actions[bot]@users.noreply.github.com"', dir);
    run('git config user.name "allure-publish"', dir);
  } catch {
    run('git config user.email "local@overnght.qa"', dir);
    run('git config user.name "overnght-qa"', dir);
  }
}

const repoUrl =
  process.env.ALLURE_REPORTS_GIT_URL?.trim() ||
  'https://github.com/Dmytro0304/overnght-allure-reports.git';
const branch = (process.env.ALLURE_PUBLISH_BRANCH || 'main').trim();
const token =
  process.env.ALLURE_REPORTS_GIT_TOKEN?.trim() ||
  process.env.GITHUB_TOKEN?.trim() ||
  '';

if (!fs.existsSync(path.join(reportDir, 'index.html'))) {
  console.error(`❌ Нет ${reportDir}/index.html — сначала: npm run report:allure`);
  process.exit(1);
}

if (!token) {
  console.error(
    '❌ Нужен ALLURE_REPORTS_GIT_TOKEN или GITHUB_TOKEN (PAT с доступом push в репозиторий отчётов).',
  );
  process.exit(1);
}

const authedUrl = repoUrl.replace(/^https:\/\//, `https://x-access-token:${token}@`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'allure-gh-'));
const cloneDir = path.join(tmp, 'repo');

try {
  try {
    run(`git clone --depth 1 --branch "${branch}" "${authedUrl}" "${cloneDir}"`, tmp);
  } catch {
    if (fs.existsSync(cloneDir)) rmRf(cloneDir);
    fs.mkdirSync(cloneDir, { recursive: true });
    run('git init', cloneDir);
    run(`git remote add origin "${authedUrl}"`, cloneDir);
    try {
      run(`git fetch origin "${branch}" --depth 1`, cloneDir);
      run(`git checkout -b "${branch}" FETCH_HEAD`, cloneDir);
    } catch {
      run(`git checkout -b "${branch}"`, cloneDir);
    }
  }

  gitConfigured(cloneDir);

  for (const name of fs.readdirSync(cloneDir)) {
    if (name === '.git') continue;
    rmRf(path.join(cloneDir, name));
  }

  copyDir(reportDir, cloneDir);
  fs.writeFileSync(path.join(cloneDir, '.nojekyll'), '');

  run('git add -A', cloneDir);
  try {
    run(`git commit -m "Allure ${new Date().toISOString()}${process.env.GITHUB_RUN_ID ? ` run ${process.env.GITHUB_RUN_ID}` : ''}"`, cloneDir);
  } catch {
    console.log('ℹ️  Нет изменений для коммита — отчёт совпадает с удалённым.');
    process.exit(0);
  }

  run(`git push origin HEAD:"${branch}"`, cloneDir);
  console.log('\n✅ Allure опубликован. Укажите ALLURE_REPORT_PUBLIC_URL на URL GitHub Pages и кидайте эту ссылку в Slack.');
} finally {
  rmRf(tmp);
}
