#!/usr/bin/env bash
# Один вход для всех Playwright-тестов из корня репозитория.
# Примеры:
#   ./scripts/playwright-test.sh
#   ./scripts/playwright-test.sh --project=api
#   PW_ENV=dev ./scripts/playwright-test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TESTS_DIR="$ROOT/tests"
cd "$TESTS_DIR"

export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$TESTS_DIR/.pw-browsers}"

exec npx playwright test -c config/playwright.config.ts "$@"
