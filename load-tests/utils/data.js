/**
 * Helpers: resolve event id, random think time, HTML + API requests.
 */
import http from 'k6/http';
import { check } from 'k6';

export function pickEventId(setupData, envFallback) {
  if (setupData && setupData.eventId) return setupData.eventId;
  if (envFallback) return envFallback;
  throw new Error('No EVENT_ID and setup() did not return a live event');
}

/**
 * setup() helper: first LIVE event from platform API (optional Bearer for admin-only LIVE).
 */
export function fetchLiveEventId(apiBase, token) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = http.get(`${apiBase}/platform/events?status=LIVE&limit=5&page=1`, {
    headers,
    tags: { name: 'PlatformEventsLive' },
  });
  if (res.status !== 200) return null;
  try {
    const body = JSON.parse(res.body);
    const rows = body.data || [];
    const first = rows[0];
    return first ? first.id : null;
  } catch (e) {
    return null;
  }
}

/** Any visible event for browsing (LIVE or SCHEDULED) when no LIVE exists */
export function fetchBrowseEventId(apiBase) {
  const res = http.get(`${apiBase}/platform/events?limit=10&page=1`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'PlatformEventsBrowse' },
  });
  if (res.status !== 200) return null;
  try {
    const body = JSON.parse(res.body);
    const rows = body.data || [];
    return rows[0] ? rows[0].id : null;
  } catch (e) {
    return null;
  }
}

export function randomSleepSeconds(min, max) {
  const sec = min + Math.random() * (max - min);
  return sec;
}

/** Thumbnail URL for Next.js optimizer (public metadata) */
export function fetchEventThumbnailUrl(apiBase, eventId) {
  if (!eventId) return null;
  const res = http.get(
    `${apiBase}/platform/events/${eventId}/metadata`,
    {
      headers: { Accept: 'application/json' },
      tags: { name: 'EventMetadata' },
      timeout: '15s',
    },
  );
  if (res.status !== 200 || !res.body) return null;
  try {
    const b = JSON.parse(res.body);
    return b.thumbnail || b.thumbnailUrl || null;
  } catch (e) {
    return null;
  }
}

export function getHtml(url, tags) {
  return http.get(url, {
    tags: tags || { name: 'HTML' },
    timeout: '60s',
  });
}

export function batchStaticAssets(baseUrl, paths) {
  const reqs = paths.map((p) => ({
    method: 'GET',
    url: `${baseUrl}${p}`,
    params: { tags: { name: 'Asset' }, timeout: '30s' },
  }));
  return http.batch(reqs);
}
