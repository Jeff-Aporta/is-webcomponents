// er-static-server.test.mjs — regresión para el bug del MIME type.
//
// Bug original: VS Code Live Server (puerto típico 5505) sirve `.ts` con
// `video/mp2t`, lo que rompe la directiva strict MIME check del navegador
// para módulos ES. Resultado: el demo se queda en blanco sin error visible
// para el usuario.
//
// Estos tests garantizan que los demos funcionan con CUALQUIER servidor
// estático (Live Server, nginx, http-server, python -m http.server, etc.) sin
// requerir transpilación de TypeScript. Para ello:
//   1. Levantamos un servidor HTTP plano (Node `http` built-in) que sirve
//      los archivos tal cual, sin tocar .ts → .js.
//   2. Cargamos cada demo en Chromium (que SÍ hace strict MIME check).
//   3. Verificamos que no hay `pageerror`, `requestfailed` ni errores de
//      consola.
//   4. Verificamos que los custom elements se registran y renderizan.
//
// Si alguien vuelve a poner `await import('../../../src/.../*.ts')` en los
// HTML, este test falla con un mensaje claro.

import assert from 'node:assert/strict';
import http from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..');

const TESTS = [
  { name: 'er-editor.html',  url: '/demos/diagramas/ER/er-editor.html',  ready: 'data-er-editor-ready',  expectSelector: 'is-er-editor' },
  { name: 'er-static.html',  url: '/demos/diagramas/ER/er-static.html',  ready: 'data-er-static-ready',  expectSelector: 'is-er-diagram' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.ts':   'video/mp2t', // ← el bug original: VS Code Live Server usa este MIME
};

/** Servidor HTTP plano que NO transpila TS. Sirve los archivos tal cual. */
function startPlainServer(rootDir, port) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://x');
      const rel = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
      if (rel.split(sep).includes('..')) {
        res.writeHead(403); res.end('forbidden'); return;
      }
      const target = join(rootDir, rel);
      const info = await stat(target).catch(() => null);
      if (!info?.isFile()) {
        res.writeHead(404); res.end('404'); return;
      }
      const ext = extname(target).toLowerCase();
      const ctype = MIME[ext] || 'application/octet-stream';
      // CRÍTICO: replicamos EXACTAMENTE la semántica de VS Code Live Server,
      // que sirve `.ts` con `video/mp2t` (no transpila). Si el navegador lo
      // rechaza, los demos no funcionan en Live Server.
      res.writeHead(200, { 'content-type': ctype, 'cache-control': 'no-store' });
      res.end(await readFile(target));
    } catch (e) {
      res.writeHead(500); res.end('500 ' + e?.message);
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

const PORT = Number(process.env.STATIC_TEST_PORT) || 8694;
const HOST = '127.0.0.1';

let server;
try {
  server = await startPlainServer(repoRoot, PORT);
  const BASE = `http://${HOST}:${PORT}`;
  console.log(`[static-server] plain HTTP server up at ${BASE} (raíz ${repoRoot})`);

  for (const t of TESTS) {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      const failedRequests = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('requestfailed', (req) => {
        failedRequests.push(`${req.url()} — ${req.failure()?.errorText}`);
      });

      await page.goto(`${BASE}${t.url}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        (a) => document.documentElement.hasAttribute(a),
        t.ready,
        { timeout: 8000 },
      ).catch((e) => { throw new Error(`demo no quedó ready: ${e.message}`); });

      const ready = await page.evaluate((attr) => document.documentElement.hasAttribute(attr), t.ready);
      const hasElement = await page.evaluate((sel) => !!customElements.get(sel), t.expectSelector);

      // Mensajes claros para diagnosticar si vuelve a romper.
      assert.equal(ready, true, `${t.name}: el atributo ${t.ready} debe estar presente`);
      assert.equal(hasElement, true, `${t.name}: <${t.expectSelector}> debe estar registrado`);
      assert.equal(pageErrors.length, 0,
        `${t.name}: no debe haber pageerror. Visto: ${JSON.stringify(pageErrors)}`);
      assert.equal(failedRequests.length, 0,
        `${t.name}: no debe haber requestfailed. Visto: ${JSON.stringify(failedRequests)}`);
      assert.equal(consoleErrors.length, 0,
        `${t.name}: no debe haber console.error. Visto: ${JSON.stringify(consoleErrors)}`);

      console.log(`  ✓ ${t.name} carga limpia con servidor estático (sin transpilación)`);
    } finally {
      await browser.close().catch(() => {});
    }
  }
} finally {
  if (server) await new Promise((r) => server.close(r));
}

console.log(`\n[static-server] OK — los demos son portables a cualquier servidor estático`);