import * as fs from 'fs';
import * as path from 'path';

const logDir = path.join(__dirname, '..', 'logs');

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

export function testLog(scope: string, message: string, data?: unknown) {
  ensureLogDir();
  const payload =
    data !== undefined
      ? `${message} ${typeof data === 'string' ? data : JSON.stringify(data)}`
      : message;
  const line = `[${new Date().toISOString()}] [${scope}] ${payload}\n`;
  fs.appendFileSync(path.join(logDir, 'e2e-run.log'), line);
  // eslint-disable-next-line no-console
  console.log(`[e2e:${scope}] ${payload}`);
}
