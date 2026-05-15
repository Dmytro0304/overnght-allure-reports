/**
 * Shared k6 configuration: env defaults, stage builders, thresholds.
 *
 * Env (all optional unless noted):
 *   BASE_URL          Web origin (default https://stg.overnght.com)
 *   API_BASE_URL      API origin (default derived from BASE_URL on staging)
 *   EVENT_ID          Fallback event UUID when setup() cannot discover LIVE
 *   TARGET_PEAK_VUS   Peak VUs for ramp profiles (default 500 — safe local smoke)
 *   SUSTAIN           Hold at peak (default 12m)
 *   RAMP_DOWN         Ramp-down duration (default 2m)
 *
 * For 100k peak use TARGET_PEAK_VUS=100000 with distributed execution (see README).
 */

export function resolveApiBaseUrl() {
  const explicit = __ENV.API_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const base = __ENV.BASE_URL || 'https://stg.overnght.com';
  try {
    const u = new URL(base);
    if (u.hostname === 'stg.overnght.com' || u.hostname.endsWith('.stg.overnght.com')) {
      return 'https://api.stg.overnght.com';
    }
  } catch (e) {
    /* ignore */
  }
  return 'http://localhost:4000';
}

export function resolveBaseUrl() {
  return (__ENV.BASE_URL || 'https://stg.overnght.com').replace(/\/$/, '');
}

function intEnv(name, fallback) {
  const v = __ENV[name];
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Production-like ramp: 0→10k (2m), 10k→50k (5m), 50k→peak (8m), sustain, ramp-down.
 * Targets are capped by TARGET_PEAK_VUS (full shape when peak ≥ 100k).
 */
export function defaultRampStages() {
  const peak = Math.max(1, intEnv('TARGET_PEAK_VUS', 500));
  const sustain = __ENV.SUSTAIN || '12m';
  const rampDown = __ENV.RAMP_DOWN || '3m';
  const a = Math.min(10000, peak);
  const b = Math.min(50000, peak);

  return [
    { duration: '2m', target: a },
    { duration: '5m', target: b },
    { duration: '8m', target: peak },
    { duration: sustain, target: peak },
    { duration: rampDown, target: 0 },
  ];
}

/** Burst: ~10k plateau then jump to peak in SPIKE_DURATION (documented for 100k target). */
export function spikeStages() {
  const peak = Math.max(1, intEnv('TARGET_PEAK_VUS', 500));
  const spikeDur = __ENV.SPIKE_DURATION || '1m';
  const sustain = __ENV.SPIKE_SUSTAIN || '5m';
  const rampDown = __ENV.RAMP_DOWN || '3m';
  const baseline = Math.min(10000, Math.max(1, Math.round(peak * 0.1)));

  return [
    { duration: '2m', target: baseline },
    { duration: spikeDur, target: peak },
    { duration: sustain, target: peak },
    { duration: rampDown, target: 0 },
  ];
}

export function commonThresholds() {
  return {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    'http_req_duration{name:StreamAPI}': ['p(95)<3000', 'p(99)<8000'],
    'http_req_duration{name:AuthLogin}': ['p(95)<2500'],
    checks: ['rate>0.80'],
  };
}

export function compactWaveStages(peak) {
  return [
    { duration: '90s', target: Math.max(1, Math.round(peak * 0.25)) },
    { duration: '2m', target: peak },
    { duration: '6m', target: peak },
    { duration: '90s', target: 0 },
  ];
}

/** Seconds between wave starts (simulates staggered event goes-live in ~10m). */
export function staggerStartForWave(index) {
  const step = intEnv('STAGGER_STEP_SEC', 150);
  const sec = index * step;
  return sec <= 0 ? '0s' : `${sec}s`;
}

export function peakPerWave(totalPeak, waveCount) {
  const n = waveCount || 4;
  return Math.max(1, Math.floor(totalPeak / n));
}

export function weekendThresholds() {
  const base = commonThresholds();
  return Object.assign({}, base, {
    'http_req_duration{name:NextImageThumb}': ['p(95)<4000', 'p(99)<8000'],
    'http_req_duration{name:NextImageSponsor}': ['p(95)<4000', 'p(99)<8000'],
    'http_req_duration{name:AuthMe1}': ['p(95)<1500'],
    'http_req_duration{name:AuthMe2}': ['p(95)<1500'],
    'http_req_duration{name:AuthSignup}': ['p(95)<3000'],
    'http_req_duration{name:AuthVerifyEmail}': ['p(95)<3000'],
    'http_req_duration{name:AuthResendOtp}': ['p(95)<3000'],
  });
}
