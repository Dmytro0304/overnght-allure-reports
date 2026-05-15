/**
 * Auth + session layer under mixed load:
 * - signed_browse: POST /login → browse + event page + 2× GET /me (same as overlay) + optional stream
 * - registration: 3-step signup chain when REGISTRATION_LOADTEST=1 (destructive — staging + isolated mail domain)
 *
 * Google / Apple OAuth: not realistically simulatable in k6 (browser redirects). Use Playwright or manual soak.
 */
import http from 'k6/http';
import { group, check } from 'k6';
import {
  weekendThresholds,
  resolveBaseUrl,
  resolveApiBaseUrl,
  compactWaveStages,
} from '../config.js';
import {
  fetchLiveEventId,
  fetchBrowseEventId,
  fetchEventThumbnailUrl,
} from '../utils/data.js';
import { coreBrowseAndEvent, dwell } from '../utils/flows.js';
import { login } from '../utils/auth.js';
import { registrationShapedTriple } from '../utils/registration.js';

function intEnv(name, fallback) {
  const v = __ENV[name];
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

const totalPeak = Math.max(1, intEnv('TARGET_PEAK_VUS', 200));
const regPeak =
  __ENV.REGISTRATION_LOADTEST === '1'
    ? Math.max(
        5,
        intEnv(
          'REGISTRATION_PEAK_VUS',
          Math.max(5, Math.floor(totalPeak * 0.25)),
        ),
      )
    : 0;
const signedPeak = Math.max(1, totalPeak - regPeak);

const scenarios = {
  signed_browse: {
    executor: 'ramping-vus',
    startVUs: 0,
    startTime: '0s',
    stages: compactWaveStages(signedPeak),
    exec: 'signedBrowse',
    gracefulRampDown: '90s',
  },
};
if (regPeak > 0) {
  scenarios.registration = {
    executor: 'ramping-vus',
    startVUs: 0,
    startTime: '0s',
    stages: compactWaveStages(regPeak),
    exec: 'registrationOnly',
    gracefulRampDown: '90s',
  };
}

export const options = {
  scenarios,
  thresholds: __ENV.SMOKE === '1' ? {} : weekendThresholds(),
};

export function setup() {
  const api = resolveApiBaseUrl();
  const base = resolveBaseUrl();
  const envId = __ENV.EVENT_ID || '';
  const eventId =
    envId || fetchLiveEventId(api) || fetchBrowseEventId(api) || '';
  const thumb = eventId ? fetchEventThumbnailUrl(api, eventId) : null;
  return { api, base, eventId, thumb };
}

export function signedBrowse(data) {
  const email = __ENV.LOADTEST_EMAIL;
  const password = __ENV.LOADTEST_PASSWORD;
  if (!email || !password) {
    console.error(
      'auth-weekend-pressure signed_browse requires LOADTEST_EMAIL and LOADTEST_PASSWORD',
    );
    return;
  }

  let token = null;
  group('auth', () => {
    token = login(data.api, email, password);
    check(token, { 'token received': (t) => !!t });
  });
  if (!token) return;

  const eventId = __ENV.EVENT_ID || data.eventId;
  const thumb =
    data.thumb || __ENV.REMOTE_IMAGE_URL || null;

  coreBrowseAndEvent(data.base, data.api, eventId, {
    token,
    thumbnailUrl: thumb,
  });

  group('stream_api', () => {
    if (!eventId) return;
    const stream = http.get(`${data.api}/platform/events/${eventId}/stream`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      tags: { name: 'StreamAPI' },
      timeout: '60s',
    });
    check(stream, {
      'stream 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  });

  dwell(40, 120);
}

export function registrationOnly(data) {
  registrationShapedTriple(data.api);
  dwell(8, 25);
}

export function handleSummary(data) {
  const path = __ENV.SUMMARY_PATH || 'summary-auth-weekend.json';
  return __ENV.SUMMARY_JSON === '0'
    ? {}
    : { [path]: JSON.stringify(data, null, 2) };
}
