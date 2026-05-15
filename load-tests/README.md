# Overnght load tests (k6)

This directory is **only** k6 load scenarios. Playwright E2E/API automation lives in **`../tests/`** — keep the two trees separate.

Production-style load tests for the **web** (`BASE_URL`) and **API** (`API_BASE_URL`). Designed so you can ramp toward **100k concurrent VUs** using **distributed** execution — do **not** expect one laptop to simulate 100k real browser sessions.

## Prerequisites

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) (`v0.47+` recommended).

## Layout

```
load-tests/
  main.js                 # Default: anonymous ramp (same as scenarios/anonymous-viewer.js)
  config.js               # Stages, thresholds, URL helpers
  WEEKEND_RUNBOOK.md      # Post-deploy order + checklist vs k6 vs manual
  scenarios/
    anonymous-viewer.js
    logged-in-viewer.js
    spike-test.js
    concurrent-four-events.js   # Four events, same startTime (worst case)
    staggered-four-waves.js     # Four waves, STAGGER_STEP_SEC apart (~last year shape)
    auth-weekend-pressure.js    # Login + 2× /me + stream; optional registration mix
  utils/
    data.js
    auth.js
    flows.js
    images.js
    registration.js
```

## User flows

| Scenario | Flow |
|----------|------|
| **Anonymous** | `GET /` → `GET /search` → batch platform/live APIs → `GET /event/{id}` → optional `/_next/image` (thumbnail from metadata or `REMOTE_IMAGE_URL`) → sleep 30–120s |
| **Logged-in** | `POST /login` → same browse + event path with **2× `GET /me`** on the event page (models overlay + session resolve) → `GET /platform/events/{id}/stream` → sleep 60–180s |
| **Four concurrent / staggered** | Four ramping VU waves bound to `EVENT_IDS` (comma-separated); each iteration hits browse + one event + optional HLS on wave0 + stream metadata. **Staggered** uses `staggerStartForWave()` for last-year-shaped goes-live windows. |
| **Auth weekend** | Parallel scenarios: signed traffic (login + browse + 2× `/me` + stream) and, when `REGISTRATION_LOADTEST=1`, a registration wave (`signup` → `verify-email` → `resend-otp`). **Google/Apple OAuth** are not covered — use browser automation or manual tests. |
| **Spike** | Same workload pattern as anonymous; **stage curve** goes baseline → sharp ramp → sustain (see `spikeStages()` in `config.js`) |

Optional: set `HLS_URL` to an **m3u8** or **segment** URL to issue a ranged `GET` (CDN probe), not a full WebSocket/IVS simulation.

## Environment variables

| Variable | Description |
|----------|-------------|
| `BASE_URL` | Web origin (default `https://stg.overnght.com`) |
| `API_BASE_URL` | API origin (default `https://api.stg.overnght.com` when staging web host) |
| `EVENT_ID` | Event UUID for `/event/...` and stream (recommended for stable runs) |
| `TARGET_PEAK_VUS` | Peak VUs in staged profile (default `500` for local smoke; use `100000` only with distribution) |
| `SUSTAIN` | Hold duration at peak in ramp profile (default `12m`) |
| `RAMP_DOWN` | Ramp-down duration (default `3m`) |
| `SPIKE_DURATION` / `SPIKE_SUSTAIN` | Spike curve tuning |
| `LOADTEST_EMAIL` / `LOADTEST_PASSWORD` | Required for `logged-in-viewer.js` |
| `HLS_URL` | Optional CDN/HLS probe URL |
| `EVENT_IDS` | Comma-separated event UUIDs for `concurrent-four-events.js` / `staggered-four-waves.js` (falls back to `EVENT_ID`) |
| `STAGGER_STEP_SEC` | Seconds between staggered wave `startTime`s (default `150`; four waves ≈ 7.5 min spread) |
| `REMOTE_IMAGE_URL` / `SPONSOR_REMOTE_IMAGE_URL` | Optional remote image URLs for `/_next/image` when metadata is missing |
| `WEEKEND_THRESHOLDS=0` | On anonymous/logged-in, use `commonThresholds()` only (no Next/auth signup sub-metrics) |
| `REGISTRATION_LOADTEST=1` | Enable destructive 3-step signup in `registration.js` / `auth-weekend-pressure` (staging + isolated mail domain only) |
| `LOADTEST_EMAIL_DOMAIN` | Domain for generated signup emails (default `invalid.local`) |
| `LOADTEST_OTP` | OTP sent to `verify-email` (default `000000`) |
| `REGISTRATION_PEAK_VUS` | Peak VUs for registration scenario in `auth-weekend-pressure` (default ~25% of `TARGET_PEAK_VUS`, min 5) |
| `SIGNUP_PASSWORD` | Password for signup load (default `LoadTestPass!1`) |
| `IMAGE_W` / `IMAGE_Q` | `/_next/image` width and quality query params |
| `SMOKE=1` | Relax/disable some thresholds for quick validation |
| `STRICT=1` | Use full thresholds on spike scenario |
| `SUMMARY_PATH` | JSON summary output path (default `summary*.json`) |
| `SUMMARY_JSON=0` | Disable JSON file output |

## Run locally (smoke)

```bash
cd load-tests

# Small safe run
k6 run -e TARGET_PEAK_VUS=20 -e SUSTAIN=30s -e EVENT_ID="<uuid>" main.js

# Logged-in (staging test account)
k6 run -e TARGET_PEAK_VUS=10 -e SUSTAIN=1m \
  -e LOADTEST_EMAIL="..." -e LOADTEST_PASSWORD="..." \
  -e EVENT_ID="<uuid>" \
  scenarios/logged-in-viewer.js

# After 3c2a: staggered four events (adjust IDs and peak)
k6 run -e TARGET_PEAK_VUS=400 -e EVENT_IDS="id1,id2,id3,id4" \
  -e STAGGER_STEP_SEC=150 \
  scenarios/staggered-four-waves.js

# Worst case: four simultaneous ramps
k6 run -e TARGET_PEAK_VUS=400 -e EVENT_IDS="id1,id2,id3,id4" \
  scenarios/concurrent-four-events.js

# Auth + optional registration mix (registration is destructive)
k6 run -e TARGET_PEAK_VUS=200 \
  -e LOADTEST_EMAIL="..." -e LOADTEST_PASSWORD="..." \
  -e EVENT_ID="<uuid>" \
  -e REGISTRATION_LOADTEST=1 -e LOADTEST_EMAIL_DOMAIN="example.test" \
  scenarios/auth-weekend-pressure.js
```

See **`WEEKEND_RUNBOOK.md`** for post-deploy order, OAuth caveats, and what still must be validated on the **load balancer** and **CDN** outside k6.

### npm scripts

`npm run k6:four-concurrent`, `k6:four-staggered`, `k6:auth-weekend` (same as `k6 run` on those scenario files).

## Run full staging profile (single machine — limited scale)

One machine is fine for **tens–low thousands** of VUs depending on CPU, bandwidth, and `open` file limits. For **100k**:

- Use **k6 Cloud** (`k6 cloud run`), or  
- **OSS distributed**: same script on N machines with **execution segments** so each instance runs a slice of VUs.

### Example: OSS sharding (bash)

On **machine i** of **N** (0-based index `i`):

```bash
export K6_EXECUTION_SEGMENT="${i}/${N}"
k6 run -e TARGET_PEAK_VUS=100000 -e EVENT_ID="<uuid>" main.js
```

Each segment runs a fraction of the global `options` scenario; combined, all shards approximate the full 100k target. Tune **N** and per‑host `ulimit -n` / network caps.

### k6 Cloud (Grafana Cloud k6)

```bash
k6 login cloud
k6 cloud run -e TARGET_PEAK_VUS=100000 -e EVENT_ID="<uuid>" main.js
```

## Metrics & thresholds

k6 reports **http_req_duration** (request time), **http_req_waiting** (TTFB-style server wait), **http_req_failed**, **iterations**, **RPS**, checks, and sub-metrics by `name` tag (e.g. `StreamAPI`, `AuthLogin`).

Default thresholds (see `config.js`):

- `http_req_failed` &lt; 2%
- `p(95)` &lt; 2s globally; stream & auth tagged routes slightly looser

Spike profile relaxes thresholds unless `STRICT=1`.

## JSON output

By default `handleSummary` writes JSON next to the run (`summary.json`, etc.). Override:

```bash
k6 run -e SUMMARY_PATH=results/run-20260215.json main.js
```

## Grafana / Prometheus

Point k6 to Prometheus remote write or InfluxDB using k6 outputs, e.g.:

```bash
k6 run -o experimental-prometheus-rw \
  --tag testid=overnght-stg-1 \
  main.js
```

(See current k6 docs for the exact `outputs` / extensions syntax for your version.)

## CI (manual dispatch, low VUs)

`.github/workflows/k6-load-test.yml` runs a **short smoke** load test (not 100k) on `workflow_dispatch`. Set repository secrets if you need login scenario later.

## Notes

- **100k “concurrent users”** in product terms often maps to fewer **RPS** than 100k if most time is spent in `sleep()` / playback; these scripts bias toward **HTML + API** realism, not full video bitrate.
- **IVS / WebSocket**: true playback load usually hits **CDN / IVS**, not only Nest. Use `HLS_URL` or extend scripts with `k6/ws` if you expose a WS endpoint suited to load testing.
- Staging **rate limits**, **WAF**, and **subscription rules** may return **403** on `/platform/events/{id}/stream` for real accounts; pick a **free** or entitled event for `EVENT_ID`, or treat stream check failures as a separate capacity test.
