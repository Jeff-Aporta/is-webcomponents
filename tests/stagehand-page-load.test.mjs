// tests/stagehand-page-load.test.mjs — Regresión Stagehand de la página home.
//
// Por qué este test existe:
//
//   W54/W55/W56 — el usuario reportó que al abrir
//   `http://127.0.0.1:5505/apps/is-webcomponents/index.html` la página se
//   quedaba en blanco. El network tab mostraba:
//
//     - loader.min.js                          304 (14 ms)
//     - doc-demo-boot.min.js?h=m7w5f1          304 (22.18 s)  <-- muy lento
//     - doc-demo.min.js?h=6u4hsa (fetch)      (failed) net::ERR_*
//     - doc-demo.min.js?h=6u4hsa (script)     (failed) net::ERR_*
//
//   El primer fetch de `doc-demo.min.js` se colgaba 3+ minutos y el
//   segundo intento (vía `<script type=module>`) fallaba rápido, así que
//   `<iswc-doc-demo>` nunca quedaba definido y la página quedaba en
//   loading eterno.
//
//   La causa raíz es **usar un servidor que no transpila TS ni mapea
//   specifiers `.js` → `.ts`** (p. ej. VS Code Live Server) sobre el
//   repositorio en modo `SERVE_ROOT=Personal`. Ver `AGENTS.md` §3.
//
//   Lo que este test verifica (con Stagehand + Chrome local, sin LLM):
//
//     1. Levanta `scripts/serve.mjs` con `SERVE_ROOT=Personal` en :5505.
//     2. Navega a la página.
//     3. Espera a `<iswc-doc-demo data-ready="1">` con timeout corto.
//        Si la página se cuelga, esto falla (NO se queda esperando
//        3+ minutos como en el bug original).
//     4. Captura todas las respuestas vía PerformanceObserver + listeners
//        de `<script>` y de `fetch()`.
//     5. Falla si:
//          - `<iswc-doc-demo>` no quedó definido.
//          - Algún request devolvió status >= 400 o `net::ERR_*`.
//          - El chrome shell (.shell-bar) no se pintó.
//          - Algún asset crítico (`doc-demo.min.js`, `loader.min.js`)
//            no se descargó.
//
//   Si quieres reproducir el bug original, lanza VS Code Live Server
//   sobre `C:\ContaPyme\Personal` apuntando a
//   `apps/is-webcomponents/index.html` y corre este test — el request a
//   `dist/cdn/preview/doc-demo.min.js` quedará 404 (Live Server no
//   transpila TS) y el test fallará con un mensaje claro.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localBrowser, Stagehand } from '@browserbasehq/stagehand';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..');
const SERVE_ROOT = process.env.SERVE_ROOT || 'C:\\ContaPyme\\Personal';
// Rango de puertos efímeros: igual que `smoke-page-load.stagehand.test.mjs`,
// probamos varios y nos quedamos con el primero libre. Si todos están
// ocupados, dejamos que `serve.mjs` falle con EADDRINUSE.
const PORT_CANDIDATES = [5505, 5506, 5507, 5508, 5509, 5510];

let server;
let serverPort;
let stagehand;
let page;

async function isPortFree(port) {
  const { default: net } = await import('node:net');
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

// Arranca `scripts/serve.mjs` con SERVE_ROOT=<workspace>. Devuelve
// { proc, port } o lanza. Reusa un puerto que ya esté sirviendo la misma
// ruta si existe (útil cuando el dev server canónico ya corre).
async function startDevServer() {
  for (const port of PORT_CANDIDATES) {
    if (!(await isPortFree(port))) {
      // Asume que ya hay un serve.mjs corriendo en ese puerto. Verifica
      // que la página responde antes de reusarlo.
      try {
        const r = await fetch(
          `http://127.0.0.1:${port}/apps/is-webcomponents/index.html`,
          { signal: AbortSignal.timeout(2000) },
        );
        if (r.ok) return { proc: null, port };
      } catch { /* sigue probando */ }
      continue;
    }
    const proc = spawn(
      'deno',
      ['run', '-A', '--no-check', 'scripts/serve.mjs', String(port)],
      {
        cwd: REPO,
        env: { ...process.env, SERVE_ROOT },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
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
  throw new Error(`No free port in ${PORT_CANDIDATES.join(', ')}`);
}

test.before(async () => {
  const res = await startDevServer();
  server = res.proc;
  serverPort = res.port;
  // Stagehand con localBrowser.headless=true y SIN modelo LLM. Solo usamos
  // los métodos CDP del Page (goto / waitForSelector / evaluate /
  // screenshot) — no `act()` / `observe()` / `extract()`.
  const browser = await localBrowser.launch({
    headless: true,
    chromiumSandbox: false,
  });
  stagehand = await Stagehand.create({ browser });
  const ctx = stagehand.browser.context;
  page = await ctx.newPage();
  // Init script: captura errores de red antes de que la página los trague.
  await page.addInitScript(`
    (() => {
      window.__networkLog = [];
      // Recursos (PerformanceObserver): incluye status HTTP y tamaño.
      try {
        const obs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__networkLog.push({
              kind: 'resource',
              name: e.name,
              status: e.responseStatus | 0,
              duration: Math.round(e.duration),
              size: e.transferSize | 0,
              type: e.initiatorType,
            });
          }
        });
        obs.observe({ type: 'resource', buffered: true });
      } catch (e) { /* noop */ }

      // fetch(): captura excepciones de red que el PerformanceObserver
      // a veces no reporta (p. ej. CORS aborts).
      const origFetch = window.fetch;
      window.fetch = function (...args) {
        const url = String(args[0]);
        return origFetch.apply(this, args).catch((err) => {
          window.__networkLog.push({
            kind: 'fetch-error',
            name: url,
            error: String(err && err.message || err),
          });
          throw err;
        });
      };

      // <script>: captura load errors. El loader hace import() para
      // modulos y appendChild(<script>) para classic; ambos disparan
      // error events en el elemento si la red falla.
      const origAppend = HTMLHeadElement.prototype.appendChild;
      HTMLHeadElement.prototype.appendChild = function (node) {
        if (node && node.tagName === 'SCRIPT') {
          node.addEventListener('error', () => {
            window.__networkLog.push({
              kind: 'script-error',
              name: node.src || node.getAttribute('src') || '<inline>',
              error: 'load-failed',
            });
          });
        }
        return origAppend.call(this, node);
      };

      // window.onerror: captura unhandled errors (p. ej. import fail).
      window.addEventListener('error', (ev) => {
        window.__networkLog.push({
          kind: 'pageerror',
          name: ev.filename || '',
          error: ev.message || String(ev),
        });
      });
      window.addEventListener('unhandledrejection', (ev) => {
        window.__networkLog.push({
          kind: 'unhandledrejection',
          error: String(ev.reason && ev.reason.message || ev.reason),
        });
      });
    })();
  `);
});

test.after(async () => {
  try { await stagehand?.close(); } catch {}
  try { server?.kill(); } catch {}
  await sleep(200);
});

test('stagehand: la página home carga sin colgar y sin errores de red', async () => {
  // El bug original era la página *colgándose* 3+ minutos. `waitForSelector`
  // con timeout corto detecta el hang de inmediato en lugar de consumir
  // minutos del runner.
  const url = `http://127.0.0.1:${serverPort}/apps/is-webcomponents/index.html`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const ready = await page.waitForSelector(
    'iswc-doc-demo[data-ready="1"]',
    { timeout: 15000 },
  ).catch(() => null);
  assert.ok(ready, '<iswc-doc-demo> nunca llegó a data-ready="1" — la página está colgada');

  const state = await page.evaluate(() => ({
    iswcDocDemoDefined: Boolean(customElements.get('iswc-doc-demo')),
    docReady: document.querySelector('iswc-doc-demo')?.dataset?.ready === '1',
    hasShellBar: Boolean(document.querySelector('.shell-bar')),
    hasNav: Boolean(document.querySelector('.shell-nav, [id="shellNav"]')),
    hasLoader: Boolean(globalThis.ISWebComponentsLoader),
    log: window.__networkLog || [],
  }));

  // Screenshot para debug (no se commitea — está bajo .shots/ y .gitignore).
  try {
    const out = join(REPO, '.shots', 'stagehand-page-load.png');
    await mkdir(dirname(out), { recursive: true });
    const png = await page.screenshot({ path: out, fullPage: false });
    assert.ok(png && png.length > 0, 'screenshot vacío');
  } catch (e) {
    // El screenshot no es crítico para el PASS.
    console.warn('[stagehand] screenshot no generado:', e.message);
  }

  // ===== Aserciones de contrato =====
  assert.equal(state.iswcDocDemoDefined, true,
    'customElements.get("iswc-doc-demo") debe devolver truthy');
  assert.equal(state.docReady, true,
    'iswc-doc-demo debe tener data-ready="1"');
  assert.equal(state.hasShellBar, true,
    'debe existir el chrome .shell-bar (pintado por el shell)');
  assert.equal(state.hasNav, true,
    'debe existir el nav del shell');
  assert.equal(state.hasLoader, true,
    'ISWebComponentsLoader debe estar en globalThis');

  // ===== Aserciones de red (lo que el bug original rompía) =====
  // 1) Recursos con status >= 400. PerformanceObserver expone
  //    `responseStatus` para entradas buffered de tipo 'resource'.
  const httpFails = state.log.filter(
    (e) => e.kind === 'resource' && e.status >= 400,
  );
  // Filtra api.github.com (red externa, fuera de scope y lenta en CI).
  const localHttpFails = httpFails.filter((e) => !/api\.github\.com/.test(e.name));
  if (localHttpFails.length) {
    assert.fail(
      `Resources con status >= 400:\n${
        localHttpFails.map((e) => `  ${e.status} ${e.name}`).join('\n')
      }`,
    );
  }

  // 2) Errores capturados por los wrappers (fetch exceptions, script
  //    load errors, unhandledrejection). El bug original aparecía
  //    aquí con `net::ERR_*` para doc-demo.min.js.
  //
  //    Filtramos aborts intencionales: el iconify-loader usa
  //    AbortController para cancelar fetches obsoletos cuando un mismo
  //    icono se pide dos veces. Esos aborts no son fallos de red.
  const wrappedErrors = state.log.filter((e) => {
    if (e.kind !== 'fetch-error' && e.kind !== 'script-error') return false;
    if (/signal is aborted/i.test(e.error || '')) return false;
    if (/aborted without reason/i.test(e.error || '')) return false;
    if (/AbortError/i.test(e.error || '')) return false;
    return true;
  });
  if (wrappedErrors.length) {
    assert.fail(
      `Errores de red capturados en página:\n${
        wrappedErrors.map((e) => `  [${e.kind}] ${e.name}: ${e.error}`).join('\n')
      }`,
    );
  }

  // 3) Unhandled errors / rejections de la página. Si el import() del
  //    módulo falla, el loader loguea un warn pero también puede
  //    propagarse como rejection si el consumidor lo espera.
  const pageErrors = state.log.filter((e) =>
    e.kind === 'pageerror' || e.kind === 'unhandledrejection',
  );
  if (pageErrors.length) {
    assert.fail(
      `Errores de página:\n${
        pageErrors.map((e) => `  [${e.kind}] ${e.name}: ${e.error}`).join('\n')
      }`,
    );
  }

  // 4) Los assets críticos del bug deben estar en el log de recursos
  //    con status 200. Si falta alguno, la página tampoco está "lista
  //    de verdad" aunque el shell se haya pintado.
  const names = state.log
    .filter((e) => e.kind === 'resource')
    .map((e) => e.name);
  const criticals = [
    /\/dist\/cdn\/(?:core\/)?loader\.min\.js(\?|$)/,
    /\/dist\/cdn\/preview\/doc-demo-boot\.min\.js\?h=/,
    /\/dist\/cdn\/preview\/doc-demo\.min\.js\?h=/,
  ];
  for (const pat of criticals) {
    const hit = names.find((n) => pat.test(n));
    assert.ok(hit, `recurso crítico no descargado: ${pat}`);
  }
});
