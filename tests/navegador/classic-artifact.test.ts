// @contexto INDICE.md · tests/navegador/README.md
/**
 * classic-artifact.test.ts — el artefacto clásico opcional (F3, `deno task build:classic`).
 *
 * Genera `actions/button.classic.js` en una carpeta temporal y comprueba en Edge headless que un `<script src>` SIN
 * `type="module"` define `iswc-button` (IIFE autosuficiente: core, zod y estilos dentro) y que el botón se pinta.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { cerrarChromium } from '../_shared/navegador.ts';
import { construirClasico } from '../../scripts/build-classic.mjs';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

test('navegador/classic-artifact: <script src> sin módulos define iswc-button', { timeout: 120_000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'iswc-classic-'));
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const [archivo] = await construirClasico({ tags: ['iswc-button'], outdir: dir });
    assert.ok(archivo.replaceAll('\\', '/').endsWith('/actions/button.classic.js'), archivo);
    const codigo = await readFile(archivo, 'utf8');
    assert.doesNotMatch(codigo, /^\s*(import|export)\s/m, 'un script clásico no lleva import/export de nivel superior');

    const page = await browser.newPage();
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    const base = 'http://iswc-classic.test';
    await page.route(`${base}/**`, (r) => {
      const url = new URL(r.request().url());
      if (url.pathname === '/button.classic.js') return r.fulfill({ contentType: 'text/javascript', body: codigo });
      if (url.pathname === '/') return r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>clásico</title><script src="/button.classic.js"></script><iswc-button id="b">Hola</iswc-button>' });
      return r.fulfill({ status: 404, body: '' });
    });
    await page.goto(`${base}/`);
    const estado = await page.evaluate(() => {
      const b = document.getElementById('b') as HTMLElement & { shadowRoot: ShadowRoot | null };
      return {
        definido: !!customElements.get('iswc-button'),
        modulo: !!document.querySelector('script[type="module"]'),
        shadow: !!b.shadowRoot,
        ancho: b.getBoundingClientRect().width,
      };
    });
    assert.deepEqual(errores, [], `errores en la página: ${errores.join(' | ')}`);
    assert.equal(estado.modulo, false, 'la página no usa type="module"');
    assert.equal(estado.definido, true, 'iswc-button definido por el script clásico');
    assert.equal(estado.shadow, true, 'el botón monta su shadow');
    assert.ok(estado.ancho > 0, 'el botón se pinta');
  } finally {
    await cerrarChromium(browser);
    await rm(dir, { recursive: true, force: true });
  }
});

// F4 (D2): el loader infiere el tipo por extensión. `L.load('…/button.classic.js')` (fuera del catálogo, termina en
// `.js`) va por `<script src>` clásico, no por `import()` (que fallaría: el IIFE no es un módulo ES).
test('navegador/classic-artifact: L.load(…/button.classic.js) lo carga como script clásico', { timeout: 120_000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'iswc-classic-loader-'));
  const dist = join(import.meta.dirname ?? '.', '..', '..', 'dist', 'cdn');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const [archivo] = await construirClasico({ tags: ['iswc-button'], outdir: dir });
    const codigo = await readFile(archivo, 'utf8');
    const page = await browser.newPage();
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(String(e)));
    const base = 'http://iswc-classic.test';
    await page.route(`${base}/**`, async (r) => {
      const url = new URL(r.request().url());
      if (url.pathname === '/x/button.classic.js') return r.fulfill({ contentType: 'text/javascript', body: codigo });
      if (url.pathname === '/') return r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>clásico por loader</title><iswc-button id="b">Hola</iswc-button>' });
      if (url.pathname.startsWith('/dist/cdn/')) {
        const ruta = join(dist, ...url.pathname.slice('/dist/cdn/'.length).split('/'));
        try {
          const cuerpo = await readFile(ruta);
          return r.fulfill({ body: cuerpo, contentType: ruta.endsWith('.css') ? 'text/css' : ruta.endsWith('.json') ? 'application/json' : 'text/javascript' });
        } catch { /* 404 */ }
      }
      return r.fulfill({ status: 404, body: '' });
    });
    await page.goto(`${base}/`);
    const estado = await page.evaluate(async () => {
      const { iswcLoader: L } = await import('/dist/cdn/core/loader.min.mjs' as string);
      L.configure({ mirrors: [] });
      await L.load('/x/button.classic.js');
      const s = [...document.scripts].find((x) => x.src.endsWith('/x/button.classic.js'));
      return { definido: !!customElements.get('iswc-button'), script: !!s, tipo: s?.type ?? null };
    });
    assert.deepEqual(errores, [], `errores en la página: ${errores.join(' | ')}`);
    assert.equal(estado.script, true, 'el loader inyectó un <script src>');
    assert.equal(estado.tipo, '', 'sin type="module"');
    assert.equal(estado.definido, true, 'iswc-button definido por el script clásico');
  } finally {
    await cerrarChromium(browser);
    await rm(dir, { recursive: true, force: true });
  }
});

export default lista();
