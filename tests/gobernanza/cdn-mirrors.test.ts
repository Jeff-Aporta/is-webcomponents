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
// GH_REPO: el repo desde el que corre el módulo, o Jeff-Aporta/iswc-root por
// defecto). Se afirma sobre lo que devuelven las funciones exportadas.
test('cdn-ref declara jsDelivr + GitHub Pages', async () => {
  const ref = await import('../../src/core/cdn-ref.ts');
  const ids = ref.MIRRORS.map((m) => m.id);
  assert.ok(ids.includes('jsdelivr') && ids.includes('pages'), `MIRRORS: ${ids}`);
  assert.equal(ref.pagesBase(), 'https://jeff-aporta.github.io/iswc-root/dist/cdn');
  const bases = ref.fallbackBases('abc123');
  assert.equal(bases[0], 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@abc123/dist/cdn');
  assert.equal(bases.at(-1), 'https://jeff-aporta.github.io/iswc-root/dist/cdn');
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
  assert.match(src, /loader\.min\.js/);
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
