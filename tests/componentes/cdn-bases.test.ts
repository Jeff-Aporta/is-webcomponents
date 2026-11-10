// @contexto INDICE.md · tests/componentes/README.md
/**
 * tests/componentes/cdn-bases.test.ts — toda base del loader termina en `/` y `core/` cuelga de `dist/cdn/`.
 *
 * WHAT: las bases de cdn-ref (`jsdelivrBase`, `githackBase`, `pagesBase`) no traen barra final.
 * Componer `new URL('core/', '…/dist/cdn')` pisaba el último segmento y pedía `…/dist/core/…`
 * (404 visto en Pages con `is-base.min.css`). `raizYCore` normaliza antes de componer.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIRRORS, conBarra, raizYCore } from '../../src/core/cdn-ref.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('conBarra añade la barra solo si falta', () => {
  assert.equal(conBarra('https://x.dev/dist/cdn'), 'https://x.dev/dist/cdn/');
  assert.equal(conBarra('https://x.dev/dist/cdn/'), 'https://x.dev/dist/cdn/');
});

test('raizYCore: cada espejo da raíz y core/ con barra, core/ bajo dist/cdn/', () => {
  for (const m of MIRRORS) {
    const base = m.base('abc1234');
    const [root, core] = raizYCore(base);
    assert.ok(root!.endsWith('/dist/cdn/'), `${m.id}: raíz ${root}`);
    assert.equal(core, `${root}core/`, `${m.id}: core/ cuelga de dist/cdn/`);
    assert.doesNotMatch(core!, /\/dist\/core\//, `${m.id}: nunca dist/core/`);
  }
});

test('raizYCore acepta una base que ya trae barra', () => {
  assert.deepEqual(raizYCore('https://x.dev/dist/cdn/'), ['https://x.dev/dist/cdn/', 'https://x.dev/dist/cdn/core/']);
});

test('loader.ts compone core/ solo vía raizYCore (sin new URL("core/", …) a pelo)', () => {
  const code = readFileSync(join(raiz, 'src', 'cdn', 'loader.ts'), 'utf8');
  assert.doesNotMatch(code, /new URL\(\s*['"]core\//);
  assert.match(code, /raizYCore\(/);
});

test('iswcLoader.listBases: todas las bases terminan en /', async () => {
  const g = globalThis as Record<string, unknown>;
  g.__IS_LOADER_CATALOG__ ??= { tags: {}, categories: {}, aliases: {} };
  g.__IS_ASSET_HASHES__ ??= {};
  g.__IS_BUILD_SHA__ ??= 'test';
  const { iswcLoader: L } = await import('../../src/cdn/loader.ts');
  L.pin('abc1234');
  try {
    const bases = await L.listBases();
    assert.ok(bases.length > 1, `bases: ${bases}`);
    for (const b of bases) assert.ok(b.endsWith('/'), `base sin barra: ${b}`);
    assert.ok(bases.some((b) => b.endsWith('@abc1234/dist/cdn/')), `jsDelivr con pin: ${bases}`);
  } finally {
    // Vuelve al pin de arranque (unpin consultaría la API de GitHub en la próxima resolución).
    L.pin(L.shaDefault);
  }
});

export default lista();
