// tests/smoke-page-load.stagehand.test.mjs — Regresión: la página home debe
// cargar sin errores de red y registrar `<iswc-doc-demo>`.
//
// Por qué este test existe: en W54/W55/W56 hubo reportes de "carga eterna"
// en `http://127.0.0.1:5505/apps/iswc-root/index.html`. El network
// tab mostraba `doc-demo.min.js?h=...` fallando con `net::ERR_*` y el
// custom element nunca se registraba → la página quedaba en blanco.
//
// Este test:
//   1. Levanta el dev server (`serve.mjs`) con `SERVE_ROOT=Personal` en un
//      puerto efímero (modo Live Server, igual a lo que el usuario usa).
//   2. Navega con Playwright.
//   3. Verifica que NINGÚN request de red falló (filtra los críticos).
//   4. Verifica que `<iswc-doc-demo>` quedó definido (`customElements.get`
//      devuelve truthy) y su atributo `data-ready="1"`.
//
// Si esto falla en CI o en local, el build de dist/ está roto o el loader
// no logra registrar los módulos críticos.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const SERVE_ROOT = process.env.SERVE_ROOT || 'C:\\ContaPyme\\Personal';
const REPO = 'C:\\ContaPyme\\Personal\\apps\\iswc-root';

// Arranca `serve.mjs` en un puerto libre. Devuelve {proc, port} o lanza.
async function startDevServer() {
  // Puerto 0 → el SO elige uno libre. `serve.mjs` no soporta 0, así que
  // probamos 5505 primero, 5506, etc.
  const candidates = [5505, 5506, 5507, 5508, 5509, 5510];
  for (const port of candidates) {
    if (await isPortFree(port)) {
      const proc = spawn(
        'deno',
        ['run', '-A', '--no-check', 'scripts/serve.mjs', String(port)],
        {
          cwd: REPO,
          env: { ...process.env, SERVE_ROOT },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      // Espera a que diga "ISWC en http://..."
      const ready = await new Promise((resolve) => {
        const t = setTimeout(() => resolve(false), 8000);
        proc.stdout.on('data', (chunk) => {
          const s = chunk.toString();
          if (s.includes('ISWC en http://')) {
            clearTimeout(t);
            resolve(true);
          }
        });
        proc.on('exit', () => resolve(false));
      });
      if (ready) return { proc, port };
      proc.kill();
    }
  }
  throw new Error('No free port for dev server (5505-5510)');
}

async function isPortFree(port) {
  const { default: net } = await import('node:net');
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

let server;
let browser;

test.before(async () => {
  server = await startDevServer();
  browser = await chromium.launch();
});

test.after(async () => {
  await browser?.close();
  server?.proc?.kill();
  await sleep(200);
});

test('smoke: la página home carga sin errores de red', async () => {
  const url = `http://127.0.0.1:${server.port}/apps/iswc-root/index.html`;
  const page = await browser.newPage();
  const failed = [];
  const errors = [];
  page.on('response', (resp) => {
    if (resp.status() >= 400) failed.push({ status: resp.status(), url: resp.url() });
  });
  page.on('requestfailed', (req) => {
    failed.push({ status: 0, url: req.url(), reason: req.failure()?.errorText });
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  // Espera el atributo data-ready que el `<iswc-doc-demo>` setea en su
  // `T()` (private method equivalente a `markReady`).
  await page.waitForSelector('iswc-doc-demo[data-ready="1"]', { timeout: 15000 });

  const state = await page.evaluate(() => ({
    iswcDocDemoDefined: Boolean(customElements.get('iswc-doc-demo')),
    docReady: document.querySelector('iswc-doc-demo')?.dataset?.ready === '1',
    hasShellBar: Boolean(document.querySelector('.shell-bar')),
    hasNav: Boolean(document.querySelector('.shell-nav, [id="shellNav"]')),
    hasLoader: Boolean(globalThis.ISWebComponentsLoader),
  }));

  await page.close();

  assert.equal(state.iswcDocDemoDefined, true, 'iswc-doc-demo debe estar definido');
  assert.equal(state.docReady, true, 'iswc-doc-demo debe tener data-ready="1"');
  assert.equal(state.hasShellBar, true, 'debe existir el chrome .shell-bar');
  assert.equal(state.hasNav, true, 'debe existir el nav del shell');
  assert.equal(state.hasLoader, true, 'ISWebComponentsLoader debe estar en globalThis');

  // Filtra requests a `api.github.com` (red externa, fuera de scope).
  const localFailures = failed.filter((f) => !f.url.includes('api.github.com'));
  if (localFailures.length > 0) {
    assert.fail(`Requests fallidos:\n${localFailures.map((f) => `  ${f.status} ${f.url}`).join('\n')}`);
  }
  if (errors.length > 0) {
    assert.fail(`Errores de página:\n${errors.map((e) => `  ${e}`).join('\n')}`);
  }
});

test('smoke: doc-demo.min.js existe y es servible', async () => {
  const url = `http://127.0.0.1:${server.port}/apps/iswc-root/dist/cdn/preview/doc-demo.min.js`;
  const resp = await fetch(url);
  assert.ok(resp.ok, `doc-demo.min.js no responde: ${resp.status}`);
  const text = await resp.text();
  assert.ok(text.length > 1000, `doc-demo.min.js demasiado pequeño: ${text.length} B`);
  // Esbuild inline-a `defineElement('iswc-doc-demo', ...)` como una llamada
  // a un minified helper (`C("iswc-doc-demo", w, ...)`), pero la string
  // "iswc-doc-demo" debe aparecer como argumento de una llamada a
  // customElements.define en algún lugar del bundle.
  assert.match(
    text,
    /["']iswc-doc-demo["']/,
    'doc-demo.min.js debe contener el string "iswc-doc-demo"',
  );
  assert.match(
    text,
    /customElements\.define\s*\(/,
    'doc-demo.min.js debe contener una llamada a customElements.define',
  );
});
