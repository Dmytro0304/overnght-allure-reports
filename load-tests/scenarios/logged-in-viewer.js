/**
 * Scenario 2 — Logged-in viewer (API login + 2× /me on event page + stream endpoint)
 * Requires LOADTEST_EMAIL, LOADTEST_PASSWORD; EVENT_ID optional (discovered if possible)
 */
import { group, check } from 'k6';
import http from 'k6/http';
import {
  defaultRampStages,
  commonThresholds,
  weekendThresholds,
  resolveBaseUrl,
  resolveApiBaseUrl,
} from '../config.js';
import {
  fetchLiveEventId,
  fetchBrowseEventId,
  fetchEventThumbnailUrl,
} from '../utils/data.js';
import { login } from '../utils/auth.js';
import { coreBrowseAndEvent, dwell } from '../utils/flows.js';

export const options = {
  scenarios: {
    logged_in_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: defaultRampStages(),
      gracefulRampDown: '3m',
    },
  },
  thresholds:
    __ENV.SMOKE === '1'
      ? {}
      : __ENV.WEEKEND_THRESHOLDS === '0'
        ? commonThresholds()
        : weekendThresholds(),
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

export default function (data) {
  const api = data.api;
  const base = data.base;
  const eventId = __ENV.EVENT_ID || data.eventId;

  const email = __ENV.LOADTEST_EMAIL;
  const password = __ENV.LOADTEST_PASSWORD;
  if (!email || !password) {
    console.error(
      'Set LOADTEST_EMAIL and LOADTEST_PASSWORD for logged-in scenario',
    );
    return;
  }

  let token = null;
  group('auth', () => {
    token = login(api, email, password);
    check(token, { 'token received': (t) => !!t });
  });
  if (!token) return;

  const thumb =
    data.thumb || __ENV.REMOTE_IMAGE_URL || null;

  coreBrowseAndEvent(base, api, eventId, {
    token,
    thumbnailUrl: thumb,
  });

  group('stream_api', () => {
    if (!eventId) return;
    const stream = http.get(`${api}/platform/events/${eventId}/stream`, {
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

  const hls = __ENV.HLS_URL;
  if (hls && eventId) {
    group('cdn_hls', () => {
      const seg = http.get(hls, {
        headers: { Range: 'bytes=0-16384' },
        tags: { name: 'HLSProbe' },
        timeout: '30s',
      });
      check(seg, {
        'hls partial 206 or 200': (r) =>
          r.status === 200 || r.status === 206,
      });
    });
  }

  dwell(60, 180);
}

export function handleSummary(data) {
  const path = __ENV.SUMMARY_PATH || 'summary-logged-in.json';
  return __ENV.SUMMARY_JSON === '0'
    ? {}
    : { [path]: JSON.stringify(data, null, 2) };
}
