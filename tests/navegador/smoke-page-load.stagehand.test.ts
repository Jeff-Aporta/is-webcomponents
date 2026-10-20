// tests/navegador/smoke-page-load.stagehand.test.ts — Regresión: la página home debe
// cargar sin errores de red y registrar `<iswc-doc-demo>`.
//
// Por qué este test existe: en W54/W55/W56 hubo reportes de "carga eterna"
// en `http://127.0.0.1:5505/apps/iswc-root/index.html`. El network
// tab mostraba `doc-demo.min.js?h=...` fallando con `net::ERR_*` y el
// custom element nunca se registraba → la página quedaba en blanco.
//
// Este test:
//   1. Levanta el dev server (`serve.mjs`) con SERVE_ROOT = carpeta padre del
//      repo en un puerto libre (modo Live Server: la app vive en /<repo>/).
//   2. Navega con Playwright.
//   3. Verifica que NINGÚN request de red falló (filtra los críticos).
//   4. Verifica que `<iswc-doc-demo>` quedó definido (`customElements.get`
//      devuelve truthy) y su atributo `data-ready="1"`.
//
// Si esto falla en CI o en local, el build de dist/ está roto o el loader
// no logra registrar los módulos críticos.

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista, before, after } = coleccionPruebas({ categoria: 'what' });


// Modo Live Server: la raíz servida es la carpeta padre del repo y la app vive
// en /<carpeta-del-repo>/ (antes <repo>).
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVE_ROOT = process.env.SERVE_ROOT || dirname(REPO);
const APP_PATH = `/${basename(REPO)}`;

/** Puerto libre que asigna el SO (listen(0)). `serve.mjs` no acepta 0 (cae a
 *  8391), así que se reserva uno libre y se le pasa; si otro proceso lo gana
 *  entre medias, `startDevServer` reintenta con otro. */
async function puertoLibre() {
  const { default: net } = await import('node:net');
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** Arranca `scripts/serve.mjs` (el dev server real) en un puerto libre.
 *  `env` extra (p. ej. SERVE_ROOT). Devuelve { proc, port } o lanza con la
 *  salida del servidor para diagnosticar. */
async function startDevServer(env = {}) {
  let salida = '';
  for (let intento = 0; intento < 4; intento++) {
    const port = await puertoLibre();
    const proc = spawn(
      Deno.execPath(),
      ['run', '-A', '--no-check', 'scripts/serve.mjs', String(port)],
      { cwd: REPO, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const ready = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(false), 30000);
      const leer = (chunk) => {
        const s = chunk.toString();
        salida += s;
        if (s.includes('ISWC en http://')) { clearTimeout(t); resolve(true); }
      };
      proc.stdout.on('data', leer);
      proc.stderr.on('data', (c) => { salida += c.toString(); });
      proc.once('error', (e) => { salida += String(e); clearTimeout(t); resolve(false); });
      proc.once('exit', () => { clearTimeout(t); resolve(false); });
    });
    if (ready) return { proc, port };
    proc.kill();
  }
  throw new Error(`scripts/serve.mjs no arrancó tras 4 intentos:\n${salida.slice(-2000)}`);
}

/** Chromium de Playwright; si no está descargado, el Chrome o Edge del sistema. */
async function lanzar() {
  let ultimo;
  for (const channel of [undefined, 'chrome', 'msedge']) {
    try { return await chromium.launch({ headless: true, ...(channel ? { channel } : {}) }); } catch (e) { ultimo = e; }
  }
  throw ultimo;
}

let server;
let browser;

before(async () => {
  server = await startDevServer({ SERVE_ROOT });
  browser = await lanzar();
});

after(async () => {
  await browser?.close();
  server?.proc?.kill();
  await sleep(200);
});

test('smoke: la página home carga sin errores de red', async () => {
  const url = `http://127.0.0.1:${server.port}${APP_PATH}/index.html`;
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
    hasLoader: Boolean(globalThis.iswcLoader),
  }));

  await page.close();

  assert.equal(state.iswcDocDemoDefined, true, 'iswc-doc-demo debe estar definido');
  assert.equal(state.docReady, true, 'iswc-doc-demo debe tener data-ready="1"');
  assert.equal(state.hasShellBar, true, 'debe existir el chrome .shell-bar');
  assert.equal(state.hasNav, true, 'debe existir el nav del shell');
  assert.equal(state.hasLoader, true, 'iswcLoader debe estar en globalThis');

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
  const url = `http://127.0.0.1:${server.port}${APP_PATH}/dist/cdn/preview/doc-demo.min.js`;
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

export default lista();
