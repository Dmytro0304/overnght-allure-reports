/**
 * Worst case: four events start together (same startTime).
 * EVENT_IDS=id1,id2,id3,id4. TARGET_PEAK_VUS splits across waves evenly.
 */
import http from 'k6/http';
import {
  weekendThresholds,
  resolveBaseUrl,
  resolveApiBaseUrl,
  peakPerWave,
  compactWaveStages,
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

function scen(name, execName) {
  return {
    executor: 'ramping-vus',
    startTime: '0s',
    startVUs: 0,
    stages,
    exec: execName,
  };
}

export const options = {
  scenarios: {
    e0: scen('e0', 'wave0'),
    e1: scen('e1', 'wave1'),
    e2: scen('e2', 'wave2'),
    e3: scen('e3', 'wave3'),
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
  const path = __ENV.SUMMARY_PATH || 'summary-concurrent-four.json';
  return __ENV.SUMMARY_JSON === '0'
    ? {}
    : { [path]: JSON.stringify(data, null, 2) };
}
