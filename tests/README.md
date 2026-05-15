# Overnght Web Tests

Playwright **API + UI** end-to-end tests for [Overnght](https://overnght.com). Default target is **staging**.

## Requirements

- **Node.js** 20+ (CI uses 22)
- **Java** 17+ — optional; needed only for `npm run report:allure` and Allure HTML. CI sets `SKIP_ALLURE_GENERATE=1` when the runner has no Java.

## Setup

```bash
cp .env.example .env
# Edit .env — see Secrets / env vars below

npm ci
npm run install:browsers
```

## Running tests

| Command | Description |
|--------|-------------|
| `npm run staging:run` | Full suite against staging (`PW_ENV=staging`) |
| `npm run test` | Same runner (reads URLs from `.env`) |
| `npm run test:api` | API project only |
| `npm run test:ui` | UI project only |
| `npm run report:allure:http` | Serve Allure over HTTP — **do not** open `allure-report/index.html` via `file://` |
| `npm run report:allure:publish` | Push `allure-report/` to the Allure GitHub Pages repo (needs token; run after `report:allure` or `report:pack`) |
| `npm run report:slack` | Short summary + Allure link via Slack Incoming Webhook |

Before each full run, **artifacts from the previous run are cleared** in `global-setup`, so Allure and JSON output reflect **only** the latest execution.

### Allure on GitHub Pages (shareable link)

1. In the Allure reports repository: **Settings → Pages** → **Deploy from a branch** → branch **`main`**, folder **`/` (root)**.
2. Create a PAT with **`repo`** scope for that repository (or use an appropriate CI token) and set **`ALLURE_REPORTS_GIT_TOKEN`**.
3. Locally or from CI: `npm run report:pack && npm run report:allure:publish`.
4. Set **`ALLURE_REPORT_PUBLIC_URL`** in `.env` (for example `https://<user>.github.io/<repo>/`). That URL is appended to Telegram (`report:notify`) and Slack (`report:slack`, requires **`SLACK_WEBHOOK_URL`**).

The publish script adds **`.nojekyll`** so GitHub Pages serves Allure static assets correctly.

Default publish URL may point to [overnght-allure-reports](https://github.com/Dmytro0304/overnght-allure-reports); override with **`ALLURE_REPORTS_GIT_URL`** if needed.

## Reports

- **Playwright HTML:** `playwright-report/` (after a run)
- **Allure:** `allure-results/` → `npm run report:allure` → `allure-report/`
- **Summary HTML:** `reports/summary.html` (from `reports/last-run.json`)

## CI

Workflow **`.github/workflows/e2e-staging.yml`** runs on **manual dispatch** (`workflow_dispatch`). Add repository **Secrets** as documented below; the workflow passes them through as environment variables for Playwright.

`SKIP_ALLURE_GENERATE=1` is set in the workflow when Java / Allure CLI are not required on the runner.

## Secrets / environment variables

Copy **`.env.example`** to `.env` for local runs. For **GitHub Actions**, create secrets under **Settings → Secrets and variables → Actions** using the **same variable names**.

### Required for a typical staging run

| Variable | Purpose |
|----------|---------|
| `BASE_URL` | Web origin, e.g. `https://stg.overnght.com` |
| `API_BASE_URL` | Optional; derived from `BASE_URL` for staging if omitted |
| `E2E_USER_EMAIL` | Wallet / subscription UI flows |
| `E2E_USER_PASSWORD` | |
| `TEST_USER_EMAIL` | Sign-in specs (may match `E2E_USER_EMAIL`) |
| `TEST_USER_PASSWORD` | |
| `REGULAR_TOKEN` | JWT for a user **without** an active subscription (player, search, banners) |
| `ADMIN_TOKEN` | Admin API checks and duplicate-subscription helpers |

### Optional (suites or tests skip when unset)

| Variable | Purpose |
|----------|---------|
| `PREMIUM_EVENT_ID`, `GEO_BLOCKED_EVENT_ID`, `LIVE_EVENT_ID`, `VOD_EVENT_ID`, `FREE_EVENT_ID` | Player / content scenarios |
| `HIGHLIGHTS_EVENT_ID`, `HIGHLIGHTS_SEARCH_TERM` | Event highlights |
| `E2E_COUPON_USER_EMAIL`, `E2E_COUPON_USER_PASSWORD` | Coupon subscription |
| `E2E_DUP_USER_EMAIL`, `E2E_DUP_USER_PASSWORD` | Duplicate subscription reproduction |
| `STRIPE_SECRET_KEY` / `E2E_STRIPE_ENV_FILE` | Stripe Test Clock renewal specs |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | `npm run report:notify` after `staging:full` |
| `ALLURE_REPORT_PUBLIC_URL` | Public report URL for Telegram / Slack messages |
| `ALLURE_REPORTS_GIT_TOKEN`, `ALLURE_REPORTS_GIT_URL`, `ALLURE_PUBLISH_BRANCH` | Publish Allure to Pages (`report:allure:publish`) |
| `SLACK_WEBHOOK_URL` | Incoming Webhook for `report:slack` |
| `PW_SKIP_ARTIFACT_CLEANUP`, `SKIP_ALLURE_GENERATE` | Advanced toggles |

**Never commit `.env` or live tokens.**

## Repository layout

```
api/           API specs
auth/          Auth UI specs
ui/            Other UI specs
config/        playwright.config.ts, global setup/teardown, scripts
utils/         Helpers, page objects
reports/       Generated JSON/HTML (mostly gitignored)
```
