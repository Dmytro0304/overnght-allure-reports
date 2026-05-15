/**
 * Serves ./allure-report over HTTP so the UI can load widgets/*.json (file:// triggers CORS-like blocks).
 * Usage: npm run report:allure:http
 * Set NO_OPEN=1 to skip opening a browser tab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const testsRoot = path.join(__dirname, '..', '..');
const root = path.join(testsRoot, 'allure-report');
const PORT = parseInt(process.env.ALLURE_HTTP_PORT || '5050', 10) || 5050;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
};

function resolveUnderRoot(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  let rel = decoded.replace(/^\/+/, '') || 'index.html';
  const abs = path.resolve(root, rel);
  const rootWithSep = path.resolve(root) + path.sep;
  if (abs !== path.resolve(root) && !abs.startsWith(rootWithSep)) {
    return null;
  }
  return abs;
}

function openBrowser(u) {
  if (process.env.NO_OPEN === '1') return;
  const platform = process.platform;
  if (platform === 'darwin') execFile('open', [u], () => {});
  else if (platform === 'win32') execFile('cmd', ['/c', 'start', '', u], () => {});
  else execFile('xdg-open', [u], () => {});
}

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`No Allure report at ${root}. Run: npm run report:allure`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const abs = resolveUnderRoot(req.url || '/');
  if (!abs) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(abs);
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    fs.createReadStream(abs).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log(`Allure report: ${url}`);
  console.log('Press Ctrl+C to stop.');
  openBrowser(url);
});
