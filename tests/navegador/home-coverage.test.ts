// tests/navegador/home-coverage.test.ts
//
// Cobertura del home doc de la galería: navega al home servido por el dev
// server real (`scripts/serve.mjs`) con Playwright, captura los tags del catálogo renderizado en
// `nav#shellNav` y los cruza con los `tag` declarados en `src/manifest.ts`.
//
// Por qué un test runtime y no solo `manifest-paths.test`:
//   - El guardián de paths valida archivos en disco; este test valida que la
//     SPA de la galería (`dist/gallery-app.min.js`) realmente pinta cada
//     componente del manifest como un item navegable del catálogo.
//   - Es el canario que detecta regressions en `src/app/app.ts` (p.ej. un
//     `navSkip` que filtra de más, o un `categoryMeta` sin el `id` de la
//     categoría de un componente recién añadido).
//
// Convenciones (AGENTS.md §7 / §8):
//   - Salida: `home-coverage.test.mjs: PASS — N/M componentes` (o FAIL con
//     lista de faltantes, y exit 1).
//   - Lee manifest desde disco (no re-evalúa TS). El regex acepta
//     `tag: 'iswc-...'` en cualquier indentación.
//   - Arranca su propio `scripts/serve.mjs` en un puerto libre: no depende
//     de que `deno task dev` esté corriendo en :8391 ni choca con él.
//
// Conteo histórico (brief 2026-10-03-zod-migration): 133. La cifra real
// actual del manifest es 194 (crecimiento posterior a la zod-migration).
// El test usa la cifra real y reporta N/M honestamente.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

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

test('navegador/home-coverage', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = dirname(dirname(here));
  const MANIFEST_PATH = join(root, 'src', 'manifest.ts');
  const dev = await startDevServer();
  const HOME_URL = `http://127.0.0.1:${dev.port}/`;
  try {

  // ─── 1. Extraer tags del manifest ──────────────────────────────────────────
  const manifestSrc = await readFile(MANIFEST_PATH, 'utf8');
  // `tag: 'iswc-...'` con cualquier indentación y separadores antes/después.
  const manifestTags = [...manifestSrc.matchAll(/tag:\s*['"](iswc-[a-z0-9-]+)['"]/g)]
    .map((m) => m[1]);
  assert.ok(manifestTags.length > 0, `no se encontraron tags en ${MANIFEST_PATH}`);
  const manifestSet = new Set(manifestTags);

  // ─── 2. Verificar dev server arriba ───────────────────────────────────────
  async function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      return res;
    } finally {
      clearTimeout(t);
    }
  }
  {
    const r = await fetchWithTimeout(HOME_URL, 3000);
    assert.equal(r.status, 200, `dev server no responde 200 en ${HOME_URL} (status=${r.status})`);
  }

  // ─── 3. Playwright: navegar y extraer tags del catálogo ───────────────────
  const browser = await lanzar();
  let exitCode = 0;
  let summary = '';
  try {
    const page = await browser.newPage();
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
    // La galería monta el nav de forma asíncrona tras el loader. Espera al
    // primer item antes de hacer el sweep completo.
    await page.waitForSelector('.shell-nav__item[data-tag]', { timeout: 20000 });
    // Margen extra: hay componentes `module: true` que se hidratan por chunks.
    await page.waitForTimeout(2000);

    const catalogTags = await page.evaluate(() => {
      const items = document.querySelectorAll('.shell-nav__item[data-tag]');
      const tags = [];
      for (const el of items) {
        const t = el.getAttribute('data-tag') || '';
        if (t.startsWith('iswc-')) tags.push(t);
      }
      return tags;
    });
    const catalogSet = new Set(catalogTags);

    const covered = [...manifestSet].filter((t) => catalogSet.has(t)).sort();
    const missing = [...manifestSet].filter((t) => !catalogSet.has(t)).sort();
    const extras = [...catalogSet].filter((t) => !manifestSet.has(t)).sort();

    const total = manifestSet.size;
    const n = covered.length;
    const m = total;

    if (missing.length === 0) {
      summary = `home-coverage.test.mjs: PASS — ${n}/${m} componentes`;
      console.log(summary);
      if (extras.length > 0) {
        console.log(`(nota: ${extras.length} tags en el home no están en el manifest: ${extras.join(', ')})`);
      }
      exitCode = 0;
    } else {
      console.log(`home-coverage.test.mjs: FAIL — ${n}/${m} componentes cubiertos, ${missing.length} faltantes:`);
      for (const t of missing) console.log(`  - ${t}`);
      if (extras.length > 0) {
        console.log(`(extras en home, no en manifest: ${extras.join(', ')})`);
      }
      exitCode = 1;
    }
  } catch (err) {
    console.error('home-coverage.test.mjs: FAIL — error durante la navegación Playwright');
    console.error(err?.stack || err);
    exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }

  { const salida = exitCode; if (salida) throw new Error(`salida ${salida}`); return; }
  } finally {
    dev.proc.kill();
  }
});

export default lista();
