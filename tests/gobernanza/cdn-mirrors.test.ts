// @contexto INDICE.md · tests/gobernanza/README.md
/**
 * cdn-mirrors.test.ts — espejos viven en cdn-ref; el panel CDN es loader copy-paste.
 *
 *   deno test -A --no-check tests/cdn-mirrors.test.ts
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });


const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// WHAT: la URL de Pages ya no está escrita literal en cdn-ref.ts (sale de
// GH_REPO: el repo desde el que corre el módulo, o Jeff-Aporta/is-webcomponents por
// defecto). Se afirma sobre lo que devuelven las funciones exportadas.
test('cdn-ref declara jsDelivr + GitHub Pages', async () => {
  const ref = await import('../../src/core/cdn-ref.ts');
  const ids = ref.MIRRORS.map((m) => m.id);
  assert.ok(ids.includes('jsdelivr') && ids.includes('pages'), `MIRRORS: ${ids}`);
  assert.equal(ref.pagesBase(), 'https://jeff-aporta.github.io/is-webcomponents/dist/cdn');
  const bases = ref.fallbackBases('abc123');
  assert.equal(bases[0], 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@abc123/dist/cdn');
  assert.equal(bases.at(-1), 'https://jeff-aporta.github.io/is-webcomponents/dist/cdn');
});

// WHAT (D8): el host de arranque solo es jsDelivr@sha si el loader vino de jsDelivr o githack.
// Desde Pages/local/file:/vendor copiado prefiere su carpeta (self): Pages no depende de que el
// SHA quemado exista en GitHub (pasó con `dd1bc805`, reescrito → galería muerta).
test('esOrigenCdn: jsDelivr y githack sí; Pages, localhost, file: y otros no', async () => {
  const { esOrigenCdn } = await import('../../src/core/cdn-ref.ts');
  assert.equal(esOrigenCdn('https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@abc1234/dist/cdn/core/loader.min.js'), true);
  assert.equal(esOrigenCdn('https://raw.githack.com/Jeff-Aporta/is-webcomponents/abc1234/dist/cdn/core/loader.min.js'), true);
  assert.equal(esOrigenCdn('https://jeff-aporta.github.io/is-webcomponents/dist/cdn/core/loader.min.mjs'), false);
  assert.equal(esOrigenCdn('http://localhost:4305/dist/cdn/core/loader.min.mjs'), false);
  assert.equal(esOrigenCdn('file:///D:/app/vendor/iswc/core/loader.min.mjs'), false);
  assert.equal(esOrigenCdn('https://mi-app.example/vendor/iswc/core/loader.min.mjs'), false);
  assert.equal(esOrigenCdn('no es url'), false);
});

test('loader: BOOT_HOST decide por esOrigenCdn(import.meta.url); fuera de CDN host=null y preferSelf', async () => {
  const code = await readFile(join(raiz, 'src/cdn/loader.ts'), 'utf8');
  assert.match(code, /const BOOT_HOST = \(esOrigenCdn\(import\.meta\.url\) && BOOT_PIN\)/);
  assert.doesNotMatch(code, /isLocalKitRoot/);
  const g = globalThis as Record<string, unknown>;
  g.__IS_LOADER_CATALOG__ ??= { tags: {}, categories: {}, aliases: {} };
  g.__IS_ASSET_HASHES__ ??= {};
  g.__IS_BUILD_SHA__ ??= 'test';
  // En los tests el loader corre desde file: → origen no CDN.
  const { iswcLoader: L } = await import('../../src/cdn/loader.ts');
  assert.equal(L.host, null, 'file: no fuerza jsDelivr');
  const bases = await L.listBases();
  const propia = /\/core\/$/.test(L.selfBase) ? new URL('../', L.selfBase).href : L.selfBase;
  assert.equal(bases[0], propia, 'primera base = su propia carpeta (self)');
  assert.ok(bases.slice(1).some((b) => /cdn\.jsdelivr\.net/.test(b)), 'espejos siguen como fallback');
});

test('cdn-snippet: loader copy-paste; L.load del tag (sin radio de alcance, sin mirrors ni all.min)', async () => {
  const src = await readFile(join(raiz, 'src/components/feedback/cdn-snippet.ts'), 'utf8');
  assert.doesNotMatch(src, /data-tab=["']mirrors["']/);
  assert.doesNotMatch(src, /all\.min\.js/);
  assert.doesNotMatch(src, /name="cdn-scope"/);
  assert.doesNotMatch(src, /Alcance de la carga/);
  assert.doesNotMatch(src, /#persistScopeToUrl|#restoreScopeFromUrl/);
  assert.match(src, /#loadArg\(\)/);
  assert.match(src, /#buildLoaderSnippet/);
  assert.match(src, /loader\.min\.mjs/);
  assert.match(src, /type="module" src=/);
  assert.match(src, /iswcLoader/);
  // W52: loadCSSBase se elimino; el loader auto-carga is-base.min.css.
  // Palettes: alias iswc-palettes-default vía loadPageStyles.
  assert.match(src, /iswc-palettes-default|loadPageStyles/);
  assert.doesNotMatch(src, /loadCSSPalettesDefault/);
  assert.match(src, /await L\.load\(/);
  assert.match(src, /data-copy=["']loader["']/);
});

test('listSources expone ambos espejos', async () => {
  const src = await readFile(join(raiz, 'src/utils/cdn-sources.ts'), 'utf8');
  assert.match(src, /MIRRORS/);
  assert.match(src, /listSources/);
});

export default lista();
