/**
 * Shared viewer flows (weekend / multi-event simulations).
 */
import { sleep, group, check } from 'k6';
import http from 'k6/http';
import { getHtml, batchStaticAssets, randomSleepSeconds } from './data.js';
import { requestNextImage } from './images.js';
import { doubleMeCheck } from './auth.js';
import { registrationShapedTriple } from './registration.js';

export function coreBrowseAndEvent(base, api, eventId, opts) {
  const o = opts || {};
  const thumb = o.thumbnailUrl || null;
  const sponsor = o.sponsorImageUrl || __ENV.SPONSOR_REMOTE_IMAGE_URL || null;
  const token = o.token || null;

  group('homepage', () => {
    const home = getHtml(`${base}/`, { name: 'Home' });
    check(home, { 'home 2xx': (r) => r.status >= 200 && r.status < 300 });
    batchStaticAssets(base, ['/logo.webp']);
  });

  group('browse', () => {
    getHtml(`${base}/search`, { name: 'BrowseSearch' });
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
        `${api}/events/public/live?limit=20`,
        null,
        {
          tags: { name: 'PublicLive' },
          headers: { Accept: 'application/json' },
        },
      ],
    ]);
  });

  if (eventId) {
    group('event_page', () => {
      const ev = getHtml(`${base}/event/${eventId}`, { name: 'EventPage' });
      check(ev, { 'event 2xx': (r) => r.status >= 200 && r.status < 300 });

      if (thumb) {
        requestNextImage(base, thumb, 'Thumb');
      }
      if (sponsor) {
        requestNextImage(base, sponsor, 'Sponsor');
      }

      if (token) {
        doubleMeCheck(api, token);
      }
    });
  }
}

export function runDestructiveRegistrationIfEnabled(api) {
  registrationShapedTriple(api);
}

export function dwell(minSec, maxSec) {
  sleep(randomSleepSeconds(minSec, maxSec));
}
