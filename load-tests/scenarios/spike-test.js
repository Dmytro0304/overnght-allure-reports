/**
 * Scenario 3 — Spike traffic (use TARGET_PEAK_VUS=100000 with distributed runners)
 */
import { sleep, group, check } from 'k6';
import http from 'k6/http';
import {
  spikeStages,
  commonThresholds,
  resolveBaseUrl,
  resolveApiBaseUrl,
} from '../config.js';
import {
  getHtml,
  batchStaticAssets,
  randomSleepSeconds,
  fetchLiveEventId,
  fetchBrowseEventId,
} from '../utils/data.js';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: spikeStages(),
      gracefulRampDown: '3m',
    },
  },
  thresholds:
    __ENV.STRICT === '1'
      ? commonThresholds()
      : {
          http_req_failed: ['rate<0.05'],
          http_req_duration: ['p(95)<4000', 'p(99)<8000'],
        },
};

export function setup() {
  const api = resolveApiBaseUrl();
  const base = resolveBaseUrl();
  const envId = __ENV.EVENT_ID || '';
  const eventId =
    envId || fetchLiveEventId(api) || fetchBrowseEventId(api) || '';
  return { eventId, api, base };
}

export default function (data) {
  const base = data.base;
  const api = data.api;
  const eventId = __ENV.EVENT_ID || data.eventId;

  group('homepage', () => {
    const home = getHtml(`${base}/`, { name: 'Home' });
    check(home, { 'home 2xx': (r) => r.status >= 200 && r.status < 300 });
    batchStaticAssets(base, ['/logo.webp']);
  });

  group('browse', () => {
    const search = getHtml(`${base}/search`, { name: 'BrowseSearch' });
    check(search, { 'search 2xx': (r) => r.status >= 200 && r.status < 300 });
    http.batch([
      [
        'GET',
        `${api}/platform/events?limit=20&page=1`,
        null,
        {
          tags: { name: 'PlatformEvents' },
          headers: { Accept: 'application/json' },
        },
      ],
      [
        'GET',
        `${api}/events/public/ongoing?limit=20`,
        null,
        {
          tags: { name: 'PublicOngoing' },
          headers: { Accept: 'application/json' },
        },
      ],
    ]);
  });

  if (eventId) {
    group('event', () => {
      const ev = getHtml(`${base}/event/${eventId}`, { name: 'EventPage' });
      check(ev, { 'event 2xx': (r) => r.status >= 200 && r.status < 300 });
    });
  }

  sleep(randomSleepSeconds(20, 90));
}

export function handleSummary(data) {
  const path = __ENV.SUMMARY_PATH || 'summary-spike.json';
  return __ENV.SUMMARY_JSON === '0'
    ? {}
    : { [path]: JSON.stringify(data, null, 2) };
}
