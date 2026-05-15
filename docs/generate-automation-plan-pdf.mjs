/**
 * Generate Overnght_Automation_Plan.pdf from Automation_Plan.md using Playwright.
 * Run from repo root: node docs/generate-automation-plan-pdf.mjs
 * Or from web: yarn automation-plan-pdf
 * Requires: web dependencies installed (Playwright lives in web/node_modules).
 * Optional env: PDF_OUT=/path/to/Overnght_Automation_Plan.pdf
 */
import { createRequire } from 'node:module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(__dirname, '..', 'web', 'node_modules', 'playwright'));

const mdPath = path.join(__dirname, 'Automation_Plan.md');
const repoRoot = path.dirname(__dirname);

const defaultOut = path.join(
  '/Users/dmytro/Documents/Overnght/Apple TV/tv/docs',
  'Overnght_Automation_Plan.pdf',
);
const pdfOut = process.env.PDF_OUT || defaultOut;

const esc = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function inline(s) {
  let t = esc(s);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  return t;
}

function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;

  const rowCells = (line) =>
    line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    const next = i + 1 < lines.length ? lines[i + 1].trim() : '';

    if (t.startsWith('|') && next.startsWith('|') && /^\|[\s\-:|]+\|$/.test(next)) {
      const headerCells = rowCells(line);
      out.push(
        '<table><thead><tr>' +
          headerCells.map((c) => `<th>${inline(c)}</th>`).join('') +
          '</tr></thead><tbody>',
      );
      i += 2;
      while (i < lines.length) {
        const row = lines[i].trim();
        if (!row.startsWith('|')) break;
        const cells = rowCells(lines[i]);
        out.push('<tr>' + cells.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
        i++;
      }
      out.push('</tbody></table>');
      continue;
    }

    if (t === '---') {
      out.push('<hr/>');
      i++;
      continue;
    }
    if (t.startsWith('### ')) {
      out.push(`<h3>${inline(t.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (t.startsWith('## ')) {
      out.push(`<h2>${inline(t.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (t.startsWith('# ')) {
      out.push(`<h1>${inline(t.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (t.startsWith('- ')) {
      out.push(`<p class="li">• ${inline(t.slice(2))}</p>`);
      i++;
      continue;
    }
    if (t.startsWith('1. ')) {
      out.push(`<p class="li">${inline(t)}</p>`);
      i++;
      continue;
    }
    if (t === '') {
      i++;
      continue;
    }
    out.push(`<p>${inline(t)}</p>`);
    i++;
  }

  return out.join('\n');
}

const css = `
  @page { margin: 18mm; size: A4; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; line-height: 1.45; color: #111; }
  h1 { font-size: 20pt; margin: 0 0 12px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 14pt; margin: 24px 0 10px; color: #222; }
  h3 { font-size: 12pt; margin: 16px 0 8px; color: #333; }
  p { margin: 6px 0; }
  p.li { margin-left: 8px; }
  hr { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9pt; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; font-weight: 600; }
  em { font-style: italic; }
`;

const md = fs.readFileSync(mdPath, 'utf8');
const bodyHtml = mdToHtml(md);
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${css}</style></head><body>${bodyHtml}</body></html>`;

const outDir = path.dirname(pdfOut);
if (fs.existsSync(outDir)) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.pdf({
    path: pdfOut,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
  });
  await browser.close();
  console.log('PDF written to:', pdfOut);
} else {
  const fallback = path.join(repoRoot, 'docs', 'Overnght_Automation_Plan.pdf');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.pdf({
    path: fallback,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
  });
  await browser.close();
  console.log('Target folder missing:', outDir);
  console.log('PDF written to (fallback):', fallback);
}
