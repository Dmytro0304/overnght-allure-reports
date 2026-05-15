# Weekend / multi-event load test runbook

Use this after **3c2a** deploys to staging (or a safe mirror). k6 exercises **HTTP/HTML + API** and **`/_next/image`**; it does not replace CDN/stream origin drills or OAuth browser flows.

## Suggested order (tonight)

1. **Smoke** — `npm run k6:smoke` or low-VU anonymous on `BASE_URL` / `API_BASE_URL`.
2. **Staggered four waves** (last-year traffic shape) — `k6:four-staggered` with real `EVENT_IDS` for the weekend rowers.
3. **Concurrent four** (worst case same-minute goes-live) — `k6:four-concurrent`.
4. **Auth mix** — `k6:auth-weekend` with `LOADTEST_EMAIL` / `LOADTEST_PASSWORD`; enable `REGISTRATION_LOADTEST=1` only on staging with an isolated mail domain (destructive).

## Checklist vs. automation

| Area | k6 / repo | Manual / infra |
|------|-----------|----------------|
| LB: staggered multi-event ramp | `staggered-four-waves.js` (`STAGGER_STEP_SEC`) | Confirm LB algorithm (least connections vs round-robin), health check intervals, **connection queue depth** — metrics + alerts |
| LB: simultaneous peak | `concurrent-four-events.js` | Same + watch queue during overlap |
| Auth: login + 2× `/me` per event open | `logged-in-viewer`, `auth-weekend-pressure`, `coreBrowseAndEvent` | — |
| Auth: 3-step signup | `registration.js` when `REGISTRATION_LOADTEST=1` | — |
| Auth: Google / Apple | — | Playwright or controlled manual soak (k6 cannot complete OAuth redirects) |
| Next/image (thumb + sponsor) | `utils/images.js`, `SPONSOR_REMOTE_IMAGE_URL` | Dashboards: tag on `NextImageThumb` / `NextImageSponsor` |
| CDN offload (assets not from Node) | `HLS_URL` ranged probe | Verify cache hit ratio, origin request rate under load |
| Stream: multi-origin, failback, live vs VOD cache | — | CDN/provider runbooks; confirm live TTLs ≠ VOD |
| Graceful degradation | — | Per-event rate limits, error paths, kill-one-instance test behind LB |
| Monitoring | k6 → Prometheus/Grafana (`experimental-prometheus-rw`) | **Per-event** dashboards; **LB queue depth** alert; human watching first **15 min** of each Saturday event start |

## Environment quick reference

- `EVENT_IDS` — comma-separated UUIDs for four-wave scenarios.
- `STAGGER_STEP_SEC` — delay between wave `startTime`s (default `150` ≈ 7.5 min span for 4 waves).
- `TARGET_PEAK_VUS` — total peak (concurrent splits per wave evenly); auth-weekend splits signed vs registration when registration enabled.
- `REGISTRATION_LOADTEST` / `LOADTEST_EMAIL_DOMAIN` / `REGISTRATION_PEAK_VUS` — see `README.md`.
- `REMOTE_IMAGE_URL` / `SPONSOR_REMOTE_IMAGE_URL` — optional fallbacks if metadata has no URLs.

## Last year’s incident (context)

- Spike: **95 events**, **4 simultaneous rowing** events.
- Failure started at the **load balancer** — prioritize LB queue, connection distribution, and health checks in observability, not only app CPU.
