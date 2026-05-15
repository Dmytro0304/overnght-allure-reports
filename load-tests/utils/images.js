/**
 * Next.js image optimizer — same path as event thumbnails / sponsor art.
 */
import http from 'k6/http';
import { check } from 'k6';

export function requestNextImage(baseWeb, remoteUrl, tagSuffix) {
  if (!remoteUrl || !baseWeb) return null;
  const w = __ENV.IMAGE_W || '640';
  const q = __ENV.IMAGE_Q || '75';
  const url = `${baseWeb}/_next/image?url=${encodeURIComponent(remoteUrl)}&w=${w}&q=${q}`;
  const tag =
    tagSuffix === 'Thumb'
      ? 'NextImageThumb'
      : tagSuffix === 'Sponsor'
        ? 'NextImageSponsor'
        : 'NextImageOther';
  const res = http.get(url, {
    tags: { name: tag },
    timeout: '60s',
  });
  check(res, {
    [`next/image ${tag} 2xx`]: (r) => r.status >= 200 && r.status < 400,
  });
  return res;
}
