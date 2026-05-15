/**
 * Login helper for load-tests (POST /login → JWT).
 */
import http from 'k6/http';
import { check } from 'k6';

export function login(apiBase, email, password) {
  const url = `${apiBase.replace(/\/$/, '')}/login`;
  const payload = JSON.stringify({ email, password });
  const res = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    tags: { name: 'AuthLogin' },
    timeout: '30s',
  });
  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
  });
  if (!ok || !res.body) return null;
  try {
    const body = JSON.parse(res.body);
    return body.token || null;
  } catch (e) {
    return null;
  }
}

/** Two GET /me per “event page” visit — models overlay + layout session resolution */
export function doubleMeCheck(apiBase, token) {
  const h = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  const r1 = http.get(`${apiBase.replace(/\/$/, '')}/me`, {
    headers: h,
    tags: { name: 'AuthMe1' },
    timeout: '15s',
  });
  check(r1, { 'me 1 ok': (r) => r.status === 200 });
  const r2 = http.get(`${apiBase.replace(/\/$/, '')}/me`, {
    headers: h,
    tags: { name: 'AuthMe2' },
    timeout: '15s',
  });
  check(r2, { 'me 2 ok': (r) => r.status === 200 });
}
