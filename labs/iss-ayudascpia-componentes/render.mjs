// labs/iss-ayudascpia-componentes/render.mjs
// Exporta SVG desde el kit LOCAL (dist/cdn) con Playwright + http estático.
// Uso: deno run -A --no-check labs/iss-ayudascpia-componentes/render.mjs [v1|v2|all]

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const LAB = dirname(fileURLToPath(import.meta.url));
const ROOT = join(LAB, '..', '..');
const OUT = join(LAB, 'out');
await mkdir(OUT, { recursive: true });

const arg = (process.argv[2] || 'all').toLowerCase();
const jobs = [];
if (arg === 'all' || arg === 'v1') {
  jobs.push({ payload: 'payload-v1-legacy.json', out: 'v1-legacy.svg' });
}
if (arg === 'all' || arg === 'v2') {
  jobs.push({ payload: 'payload.json', out: 'componentes.svg' });
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (!rel || rel.endsWith('/')) rel += 'index.html';
      const abs = join(ROOT, rel);
      if (!abs.startsWith(ROOT) || !existsSync(abs)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[extname(abs)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      createReadStream(abs).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

function htmlFor(base, payloadJson) {
  const payload = JSON.stringify(payloadJson);
  return `<!doctype html>
<html lang="es" class="theme-light" data-theme="light">
<head><meta charset="utf-8"/>
<style>html,body{margin:0;padding:8px;background:#fff}iswc-component-diagram{display:block;width:100%;min-height:400px}</style>
</head>
<body>
<iswc-component-diagram id="d" theme="insoft" min-gap="72"></iswc-component-diagram>
<script type="module">
  try {
    await import(${JSON.stringify(base + 'dist/cdn/diagrams/component-diagram.min.js')});
    await customElements.whenDefined('iswc-component-diagram');
    const el = document.getElementById('d');
    el.payload = ${payload};
    await el.updateComplete();
    window.__LAB_ERR__ = null;
  } catch (e) {
    window.__LAB_ERR__ = String(e && e.stack || e);
  }
  window.__LAB_READY__ = true;
</script>
</body></html>`;
}

const PROBE = `(() => {
  const h = document.querySelector('iswc-component-diagram');
  const s = h?.shadowRoot?.querySelector('svg');
  if (!s) return null;
  const r = s.getBoundingClientRect();
  return r.width > 10 && r.height > 10 ? s.outerHTML : null;
})()`;

const { server, port } = await startServer();
const base = `http://127.0.0.1:${port}/`;
console.log('serve', base);

const browser = await chromium.launch({ headless: true });
try {
  for (const job of jobs) {
    const payload = JSON.parse(await readFile(join(LAB, job.payload), 'utf8'));
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('pageerror', e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') console.error('console', m.text());
    });
    // Misma origen: sirve HTML temporal desde el server lab
    const tmpHtml = join(LAB, 'out', `_render-${job.out}.html`);
    await writeFile(tmpHtml, htmlFor(base, payload), 'utf8');
    const pageUrl = `${base}labs/iss-ayudascpia-componentes/out/_render-${job.out}.html`;
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__LAB_READY__ === true, null, { timeout: 45000 });
    const err = await page.evaluate(() => window.__LAB_ERR__);
    if (err) throw new Error(`render fail ${job.payload}: ${err}`);
    await page.waitForTimeout(500);
    const svg = await page.evaluate(PROBE);
    if (!svg) throw new Error(`SVG vacío: ${job.payload}`);
    await writeFile(join(OUT, job.out), svg, 'utf8');
    console.log(`OK ${job.out} (${svg.length} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log('lab render done →', OUT);
