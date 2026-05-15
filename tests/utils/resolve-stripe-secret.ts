import * as fs from 'fs';
import * as path from 'path';

export function isValidStripeSecretKey(key: string | undefined): boolean {
  return !!key && /^sk_(test|live)_/.test(key.trim());
}

function stripQuotes(v: string): string {
  const t = v.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function parseEnvFileForKey(filePath: string, keyName: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const text = fs.readFileSync(filePath, 'utf8');
  const re = new RegExp(`^${keyName}=(.*)$`, 'm');
  const m = text.match(re);
  if (!m) return undefined;
  return stripQuotes(m[1]);
}

/**
 * Order: STRIPE_SECRET_KEY (if sk_*) → E2E_STRIPE_ENV_FILE → server/.env → server/.env.local
 */
export function resolveStripeSecretKey(): string | undefined {
  const direct = process.env.STRIPE_SECRET_KEY?.trim();
  if (isValidStripeSecretKey(direct)) return direct;

  const extra = process.env.E2E_STRIPE_ENV_FILE;
  // tests/utils → tests → repo root → server
  const serverDir = path.join(__dirname, '..', '..', 'server');
  const candidates = [
    extra,
    path.join(serverDir, '.env'),
    path.join(serverDir, '.env.local'),
  ].filter(Boolean) as string[];

  for (const file of candidates) {
    const fromFile = parseEnvFileForKey(file, 'STRIPE_SECRET');
    if (isValidStripeSecretKey(fromFile)) return fromFile!.trim();
  }

  return undefined;
}
