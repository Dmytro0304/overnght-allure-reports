/**
 * Scenario 1 — Anonymous viewer
 * Homepage → browse (search + platform events API) → event page (optional Next/image) → dwell
 */
import { group, check } from 'k6';
import http from 'k6/http';
import {
  defaultRampStages,
  weekendThresholds,
  commonThresholds,
  resolveBaseUrl,
  resolveApiBaseUrl,
} from '../config.js';
import {
  fetchLiveEventId,
  fetchBrowseEventId,
  fetchEventThumbnailUrl,
} from '../utils/data.js';
import { coreBrowseAndEvent, dwell } from '../utils/flows.js';

export const options = {
  scenarios: {
    anonymous_ramp: {
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
  if (!eventId) {
    console.warn(
      'WARNING: No EVENT_ID and could not discover an event via API — event_page may be skipped.',
    );
  }
  const thumb = eventId ? fetchEventThumbnailUrl(api, eventId) : null;
  return { eventId, api, base, thumb };
}

export default function (data) {
  const base = data.base;
  const api = data.api;
  const eventId = __ENV.EVENT_ID || data.eventId;
  const thumb =
    data.thumb || __ENV.REMOTE_IMAGE_URL || null;

  coreBrowseAndEvent(base, api, eventId, {
    thumbnailUrl: thumb,
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

  dwell(30, 120);
}

export function handleSummary(data) {
  const out = {};
  if (__ENV.SUMMARY_JSON !== '0') {
    const path = __ENV.SUMMARY_PATH || 'summary.json';
    out[path] = JSON.stringify(data, null, 2);
  }
  return out;
}
