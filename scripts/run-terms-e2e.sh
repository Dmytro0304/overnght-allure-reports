#!/bin/bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== 0. Installing Playwright browsers ==="
cd "$ROOT/web"
npx playwright install chromium

echo ""
echo "=== 1. Reset acceptedTermsVersion for test users ==="
cd "$ROOT/server"
if npx ts-node -r tsconfig-paths/register scripts/reset-terms-for-e2e.ts 2>/dev/null; then
  echo "Reset OK"
else
  echo "Reset skipped (DB may be unavailable - run manually if needed)"
fi

echo ""
echo "=== 2. Running E2E tests ==="
cd "$ROOT/web"
npx playwright test || true

echo ""
echo "=== 3. Generating Allure report ==="
npx allure generate ./allure-results -o ./allure-report --clean 2>/dev/null || true
if [ -d ./allure-report ]; then
  echo "Report generated at: $ROOT/web/allure-report"
  echo "Opening report..."
  npx allure open ./allure-report
else
  echo "No test results - run with backend and web servers started"
fi
