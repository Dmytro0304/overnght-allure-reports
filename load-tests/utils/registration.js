/**
 * Registration-shaped **API pressure** (3 sequential auth calls).
 *
 * DESTRUCTIVE when REGISTRATION_LOADTEST=1 — staging + isolated mail domain only.
 */
import http from 'k6/http';
import { check } from 'k6';

export function registrationShapedTriple(apiBase) {
  if (__ENV.REGISTRATION_LOADTEST !== '1') return;

  const domain = __ENV.LOADTEST_EMAIL_DOMAIN || 'invalid.local';
  const email = `k6_${__VU}_${Date.now()}_${__ITER}@${domain}`;
  const payload = JSON.stringify({
    firstName: 'Load',
    lastName: 'Test',
    email,
    password: __ENV.SIGNUP_PASSWORD || 'LoadTestPass!1',
  });

  const signup = http.post(`${apiBase}/signup`, payload, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    tags: { name: 'AuthSignup' },
    timeout: '30s',
  });
  check(signup, {
    'signup accepts': (r) => r.status === 200 || r.status === 201 || r.status === 400,
  });

  let token = null;
  try {
    if (signup.body) token = JSON.parse(signup.body).token || null;
  } catch (e) {
    /* ignore */
  }
  if (!token) return;

  http.post(
    `${apiBase}/verify-email`,
    JSON.stringify({ otp: __ENV.LOADTEST_OTP || '000000' }),
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      tags: { name: 'AuthVerifyEmail' },
      timeout: '30s',
    },
  );

  http.get(`${apiBase}/resend-otp`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    tags: { name: 'AuthResendOtp' },
    timeout: '30s',
  });
}
