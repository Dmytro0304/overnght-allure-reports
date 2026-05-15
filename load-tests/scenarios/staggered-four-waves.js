/**
 * Last-year-shaped traffic: four events ramp in a staggered window (default ~10m).
 * STAGGER_STEP_SEC between wave startTimes (default 150). Same workload as concurrent-four-events.
 */
import http from 'k6/http';
import {
  weekendThresholds,
  resolveBaseUrl,
  resolveApiBaseUrl,
  peakPerWave,
  compactWaveStages,
  staggerStartForWave,
} from '../config.js';
import { fetchEventThumbnailUrl } from '../utils/data.js';
import { coreBrowseAndEvent, dwell } from '../utils/flows.js';
import { group } from 'k6';

function parseIds() {
  const raw = __ENV.EVENT_IDS || __ENV.EVENT_ID || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const waveIds = parseIds();
const totalPeak = Math.max(
  1,
  parseInt(__ENV.TARGET_PEAK_VUS || '400', 10) || 400,
);
const perWave = peakPerWave(totalPeak, 4);
const stages = compactWaveStages(perWave);

function scen(execName, waveIndex) {
  return {
    executor: 'ramping-vus',
    startTime: staggerStartForWave(waveIndex),
    startVUs: 0,
    stages,
    exec: execName,
  };
}

export const options = {
  scenarios: {
    e0: scen('wave0', 0),
    e1: scen('wave1', 1),
    e2: scen('wave2', 2),
    e3: scen('wave3', 3),
  },
  thresholds: __ENV.SMOKE === '1' ? {} : weekendThresholds(),
};

export function setup() {
  const api = resolveApiBaseUrl();
  const base = resolveBaseUrl();
  const ids = waveIds.length ? waveIds : [''];
  const thumbs = ids.map((id) => (id ? fetchEventThumbnailUrl(api, id) : null));
  return { api, base, waveIds: ids, thumbs };
}

function runOne(data, index) {
  const id = data.waveIds[index] || data.waveIds[0];
  const thumb =
    data.thumbs[index] || __ENV.REMOTE_IMAGE_URL || null;
  coreBrowseAndEvent(data.base, data.api, id, {
    thumbnailUrl: thumb,
  });

  const hls = __ENV.HLS_URL;
  if (hls && index === 0) {
    http.get(hls, {
      headers: { Range: 'bytes=0-8192' },
      tags: { name: 'HLSProbe' },
      timeout: '30s',
    });
  }

  group('stream_meta', () => {
    if (!id) return;
    http.get(`${data.api}/platform/events/${id}/metadata`, {
      tags: { name: 'StreamMeta' },
      headers: { Accept: 'application/json' },
      timeout: '15s',
    });
  });

  dwell(25, 95);
}

export function wave0(data) {
  runOne(data, 0);
}
export function wave1(data) {
  runOne(data, 1);
}
export function wave2(data) {
  runOne(data, 2);
}
export function wave3(data) {
  runOne(data, 3);
}

export function handleSummary(data) {
  const path = __ENV.SUMMARY_PATH || 'summary-staggered-four.json';
  return __ENV.SUMMARY_JSON === '0'
    ? {}
    : { [path]: JSON.stringify(data, null, 2) };
}
