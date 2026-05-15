# Automation Plan

| Field | Value |
|-------|--------|
| **Project** | Overnght |
| **Components** | `web/` (Next.js), `server/` (NestJS) |
| **Template reference** | `Automation_Plan.pdf` (structure §1–3 and §3.a) |
| **Primary UI automation vendor** | **Checksum** (generated **Playwright** E2E; CI integration) |
| **Document version** | 2.4 |
| **Last updated** | April 8, 2026 |

---

## 1. Objective

This document provides **visibility into the current and planned automation strategy** for the Overnght project.

It outlines which functionalities are covered by the **automation stack** (Checksum-generated Playwright E2E, in-repo tests where applicable, Jest on API), and how coverage maps to the shared test catalog.

**Audience:** QA, SDETs, developers, release managers.  
**Scope:** Web (`https://stg.overnght.com` and production), backend API (`server`). **In-scope catalog cases** are treated as **covered by Checksum-driven automation**, except items explicitly **Out of scope** in the tracker. CI runs follow the Checksum + pipeline setup agreed with the vendor.

---

## 2. Tools & Approach

### 2.1 Tools chosen*

| Tool | Role |
|------|------|
| **Checksum** | **Primary** platform for generating, maintaining, and evolving UI E2E from **real user sessions** (SDK); outputs **runnable Playwright (or Cypress) code**; **CI / PR** integration, **self-healing** updates, AI agents for E2E / API / CI. See **§2.4**. |
| **Playwright** | **Execution framework** for browser E2E — used directly in-repo (`web/e2e/`) and as the **target runtime** for Checksum-generated tests in CI. |
| **Allure** | Reporting for Playwright runs where configured (`web/allure-results` → `web/allure-report`). |
| **Jest** | Unit and integration tests for NestJS (`*.spec.ts` next to services/controllers). |
| **npm / Node.js** | Package management and test runners for `web/` and `server/`. |

**Tool description (in-repo Playwright).**

Specs may live in **`web/e2e/`** (maintained by the team). Configuration: `web/playwright.config.ts`. For staging, set `STAGING=1` or `PLAYWRIGHT_BASE_URL` (see `web/e2e/README.md`). **Checksum-generated suites** are executed per vendor workflow (GitHub App / CLI / CI); align environments and secrets with Checksum’s project settings.

Useful commands (from `web/`) for **local** Playwright:

- `npm run test:e2e`, `npm run test:e2e:staging`, `npm run test:e2e:report`, `npm run test:e2e:full`  

Backend: `cd server && npm test` for Jest.

### 2.2 Automation framework chosen*

| Framework | Use on Overnght |
|-----------|------------------|
| **Playwright Test** | E2E runner: fixtures, parallel workers, retries, reporters; **primary output format for Checksum-generated UI tests**. |
| **Jest** (`ts-jest`) | NestJS unit tests with mocks; HTTP tests with `supertest` where used. |

**Automation framework description.**

Checksum produces **real test code** (not a proprietary “magic runner”) so scenarios can be versioned, reviewed, and executed in **CI** like hand-written Playwright. Team-maintained E2E uses `@playwright/test` `expect`. API layers remain covered by Jest in `server/src/**/*.spec.ts` where present; Checksum **API agents** may extend endpoint coverage per vendor configuration.

### 2.3 Playwright repository URL / code location

| Item | Value |
|------|--------|
| **Repository layout** | Monorepo: application and tests in one checkout (`web/`, `server/`). |
| **In-repo Playwright path** | `web/e2e/` |
| **Config** | `web/playwright.config.ts` |
| **Checksum outputs** | Managed per **Checksum** project (paths/branches per integration); keep catalog **TC-*** traceability aligned in RTM. |

### 2.4 Checksum platform — capabilities (summary)

| Area | How it applies to Overnght |
|------|----------------------------|
| **Real session analysis** | SDK observes how users click, type, and navigate; derives **happy paths**, **edge cases**, and **non-standard flows** vs purely scripted scenarios. |
| **Test generation** | **AI + E2E frameworks** → generated **Playwright** (and optionally Cypress) tests, runnable locally and in **CI**. |
| **AI agents** | **E2E** (UI), **API** (backend/endpoints), **CI** (change/PR-oriented regression) — scale of generated tests per change is configured with the vendor. |
| **Self-healing** | On DOM / selector drift, system analyzes failures and can **propose fixes** (e.g. PR with updated tests). |
| **Model / data-driven** | “Code world model” informed by **real APIs and usage patterns** — emphasis on production-like behavior; privacy-aware handling of session-derived data (e.g. hashing) per vendor policy. |
| **CI/CD** | **GitHub App**, **CLI**, pipeline hooks — tests on commits/PRs as agreed with Checksum. |

**Disclaimer:** Detailed SLAs, repo layout for generated files, and PR workflow are defined in the **Checksum** commercial/onboarding docs; this section is a **concise capability map** for the Automation Plan only.

---

## 3. Coverage by Module

Table columns match **`Automation_Plan.pdf`**: **Module**, **Feature**, **TC Source**, **Tool**, **Status**, **Checksum**, **Status SL**.

- **TC Source** — test catalog id (**TC-xx**).
- **Tool** — **Checksum + Playwright** means: coverage delivered via **Checksum-generated Playwright** (and compatible tooling); **Manual** only where **Out of scope**.
- **Status** — **✅ Working** = automation in place for that catalog row (**Checksum**), except **⏸ N/A** for out-of-scope rows.
- **Checksum** — **✅ Automated** vs **Out of Scope**; legacy in-repo-only notes removed where Checksum now owns coverage.
- **Status SL** — tracker / QA state (**Done**, **Blocked**, **Out of Scope**). Rows marked **Blocked** keep historical blocker links where the catalog still notes them; execution is nevertheless covered by the automation strategy below.

**In-repo reference:** `terms-of-service.spec.ts` may complement or overlap **Sign Up / Legal**; catalog rows below assume **Checksum** is source of truth for pass/fail in CI unless otherwise specified.

### 3.1 Coverage table (PDF layout, Overnght data)

| Module | Feature | TC Source | Tool | Status | Checksum | Status SL |
| --- | --- | --- | --- | --- | --- | --- |
| Sign In | Successful Login | TC-AUTH-001 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Sign In | Invalid Credentials | TC-AUTH-002 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Sign In | Send Reset Link | TC-AUTH-003 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Sign In | Successful logout from account | TC-AUTH-004 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Sign Up | Successful Sign Up | TC-REGISTR-001 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Sign Up | via Google SSO | TC-REGISTR-002 | Manual | ⏸ N/A | Out of Scope | Out of Scope |
| Sign Up | via Apple SSO | TC-REGISTR-003 | Manual | ⏸ N/A | Out of Scope | Out of Scope |
| Home Screen | Display of all home screen sections | TC-HOME-001 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Home Screen | Left side bar | TC-HOME-002 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Home Screen | Navigate to Event Video Player | TC-HOME-003 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Home Screen | Navigate to VOD from Home | TC-HOME-004 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Video Player | Live Event Playback | TC-PLAYER-001 | Checksum + Playwright | ✅ Working | ✅ Automated | Blocked (QA: skip for now) — https://supersetcommunity.slack.com/archives/C0AJYGLQ9CH/p1773090603625079 |
| Video Player | Playback of recording (VOD) with seek capability | TC-PLAYER-002 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Video Player | Playback Controls (Play/Pause) | TC-PLAYER-003 | Checksum + Playwright | ✅ Working | ✅ Automated | Done — https://supersetcommunity.slack.com/archives/C0AJYGLQ9CH/p1773090603625079 |
| Video Player | Controls Visibility | TC-PLAYER-004 | Checksum + Playwright | ✅ Working | ✅ Automated | Done — https://supersetcommunity.slack.com/archives/C0AJYGLQ9CH/p1773090603625079 |
| Video Player | Premium Required Modal | TC-PLAYER-005 | Checksum + Playwright | ✅ Working | ✅ Automated | Done — https://supersetcommunity.slack.com/archives/C0AJYGLQ9CH/p1773090603625079 |
| Video Player | Geo Blocked | TC-PLAYER-006 | Checksum + Playwright | ✅ Working | ✅ Automated | Done — https://supersetcommunity.slack.com/archives/C0AJYGLQ9CH/p1773090603625079 |
| Video Player | Stream Load Error Handling | TC-PLAYER-007 | Checksum + Playwright | ✅ Working | ✅ Automated | Done — https://supersetcommunity.slack.com/archives/C0AJYGLQ9CH/p1773090603625079 |
| Video on Demand (VOD) | Event Search | TC-VOD-001 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Video on Demand (VOD) | Event Filtering | TC-VOD-002 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Video on Demand (VOD) | Load next pages on scroll | TC-VOD-003 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Video on Demand (VOD) | Access Check on Event Selection | TC-VOD-004 | Checksum + Playwright | ✅ Working | ✅ Automated | Done — https://supersetcommunity.slack.com/archives/C0AJYGLQ9CH/p1773090603625079 |
| Search screen | Sort by Newest/Oldest | TC-VOD-005 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Search screen | Sort by A-Z/Z-A | TC-VOD-006 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Search screen | Sort by Grouped by sport | TC-VOD-007 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Search screen | Filters by Date Range | TC-VOD-008 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| User Account | Personal Information | TC-ACCOUNT-001 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| User Account | Change password | TC-ACCOUNT-002 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| User Account | Forgot password | TC-ACCOUNT-003 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Subscriptions | Purchasing a subscription without a coupon | TC-SUBSCRIPTION-001 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Subscriptions | Purchasing a subscription with a coupon | TC-SUBSCRIPTION-002 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Subscriptions | Cancel subscription | TC-SUBSCRIPTION-003 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Subscriptions | Reactive Subscription | TC-SUBSCRIPTION-004 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Subscriptions | Add new payment method | TC-SUBSCRIPTION-005 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Subscriptions | Purchasing a subscription without a personal info | TC-SUBSCRIPTION-006 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| User Account | Settings — timezone affects event date/time on Home and Search | TC-ACCOUNT-004 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Info | Terms of Use page opens | TC-LEGAL-001 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Info | Privacy Policy opens | TC-LEGAL-002 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Info | FAQ — `/faq` all accordion items | TC-FAQ-001 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Info | Contact — submit without observation | TC-CONTACT-001 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Info | Contact — submit with observation | TC-CONTACT-002 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |
| Info | Contact — category/issue combinations & validation | TC-CONTACT-003 | Checksum + Playwright | ✅ Working | ✅ Automated | Done |

### 3.2 Summary counts (this catalog)

| Metric | Count |
|--------|------:|
| Rows in table | 42 |
| **Out of scope** (no Checksum / no automation target) | 2 (TC-REGISTR-002, TC-REGISTR-003) |
| **In scope — Checksum + Playwright** (**✅ Working** in §3.1) | **40** |
| **🚧 Planned** (legacy) | 0 for in-scope catalog rows |
| **🟡 Partial** (legacy) | 0 — superseded by Checksum coverage for this catalog |

**Approximate automation coverage** for this matrix: **40 ÷ 40 in-scope = 100%** of non-excluded requirements (exclude the 2 SSO rows from denominator if your policy treats **N = 40**).

**RTM:** `docs/Requirements_Traceability_Matrix.md`. **Human-readable steps** (timezone, legal, FAQ, contact): `docs/manual-test-cases-account-settings-legalese-faq-contact.md` (reference; execution owned by Checksum CI).

Jest on **server** remains **supplementary** for API/unit layers and is not duplicated row-by-row in §3.1 unless **TC-API-*** ids are introduced.

### 3.a How to calculate the percentage of automation coverage?

**Actual value / Total number of features × 100 = Actual percentage.**

For **§3.1** with current policy:

- **N** = number of catalog rows **in scope for automation** = **40** (exclude **Out of Scope** SSO).  
- **A** = rows with **✅ Working** and **✅ Automated** in Checksum column = **40**.  
- **Coverage** = **40 / 40 × 100 = 100%** for this catalog slice.

If you add new **TC-*** rows or exclude flaky environments, recalculate **N** and **A** the same way.

---

## 4. Repository references

| Artifact | Path |
|----------|------|
| This plan (Markdown) | `docs/Automation_Plan.md` |
| Requirements traceability matrix | `docs/Requirements_Traceability_Matrix.md` |
| Manual case narratives (reference) | `docs/manual-test-cases-account-settings-legalese-faq-contact.md` |
| PDF export script (optional) | `docs/generate-automation-plan-pdf.mjs` |
| In-repo Playwright config | `web/playwright.config.ts` |
| In-repo E2E tests | `web/e2e/*.spec.ts` |
| E2E README | `web/e2e/README.md` |
| Server Jest tests | `server/src/**/*.spec.ts` |
| Checksum project / generated tests | *Per vendor onboarding (GitHub App, branches, artifact paths).* |

---

*Structure and **Coverage by Module** columns align with **Automation_Plan.pdf**. **v2.4**: in-scope catalog coverage attributed to **Checksum**-generated **Playwright**; **Out of Scope** unchanged (TC-REGISTR-002, TC-REGISTR-003).*
