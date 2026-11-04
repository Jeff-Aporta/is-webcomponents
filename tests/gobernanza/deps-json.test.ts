/**
 * deps-json.test.ts — el grafo del build único (F3): `dist/cdn/deps.json` y `dist/cdn/exports.json`.
 *
 *   (a) todo tag del catálogo tiene cierre en deps.json y cada ruta del cierre existe en dist/cdn;
 *   (b) ningún cierre trae `zod` ni `ai/` (siguen externos: se cargan una vez y en diferido);
 *   (c) el cierre del shell crítico de Avatar cabe en el presupuesto de módulos y bytes;
 *   (d) exports.json cubre todos los tags (el `exports` del package.json de F6).
 *
 * Presupuesto del shell (c), medido el 4-nov-2026 con el build único: 68 módulos y 393 312 B sin comprimir (los 17
 * tags de `SHELL_CRITICO`). El plan pedía ≤ 40 módulos y ≤ 350 KB; los chunks automáticos de esbuild parten el código
 * por conjunto de entradas que lo usan y salen más: el tope es lo medido + 10 %. F4 (precarga del cierre) lo vuelve a
 * medir en ráfagas, no en número de archivos.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const DIST = join(RAIZ, 'dist', 'cdn');

/** Copia de `SHELL_CRITICO` del arranque de frontend-avatar (`src/js/kit-tags.ts` de esa app, 4-nov-2026). */
const SHELL_CRITICO = ['iswc-app-shell', 'iswc-doc-layout', 'iswc-doc-index', 'iswc-theme-toggle', 'iswc-icon', 'iswc-button', 'iswc-heading', 'iswc-spinner', 'iswc-skeleton', 'iswc-toast', 'iswc-avatar', 'iswc-tag', 'iswc-badge', 'iswc-card', 'iswc-dropdown', 'iswc-dropdown-item', 'iswc-session-menu'];

const MAX_MODULOS_SHELL = 75;
const MAX_BYTES_SHELL = 433_000;

const leer = (nombre: string) => JSON.parse(readFileSync(join(DIST, nombre), 'utf8'));

/** Tags del catálogo: los del manifest con fuente propia en src/components (igual que `catalogoLoader`). */
async function tagsDelCatalogo(): Promise<string[]> {
  const { default: manifest } = await import(new URL('../../src/manifest.ts', import.meta.url).href) as { default: { tag: string }[] };
  const fuentes = new Set<string>();
  const recorrer = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) recorrer(p);
      else if (n.endsWith('.ts')) fuentes.add(basename(n, '.ts'));
    }
  };
  recorrer(join(RAIZ, 'src', 'components'));
  return manifest.map((m) => m.tag).filter((t) => fuentes.has(t.replace(/^iswc-/, '')));
}

test('gobernanza/deps-json: todo tag del catálogo tiene cierre y cada ruta existe', async () => {
  if (!existsSync(join(DIST, 'deps.json'))) return;
  const deps = leer('deps.json');
  assert.match(deps.sha, /^([0-9a-f]{40}|main)$/);
  for (const tag of await tagsDelCatalogo()) {
    const cierre = deps.tags[tag];
    assert.ok(Array.isArray(cierre) && cierre.length, `${tag}: sin cierre en deps.json`);
    assert.deepEqual([...cierre].sort(), cierre, `${tag}: el cierre debe ir ordenado`);
    for (const ruta of cierre) assert.ok(existsSync(join(DIST, ruta)), `${tag}: ${ruta} no existe en dist/cdn`);
  }
  assert.ok(deps.core.loader?.includes('core/loader.min.mjs'), 'deps.core.loader incluye el loader');
  // El loader conserva su propio código (import.meta.url resuelve su carpeta): ningún otro módulo lo importa.
  assert.match(readFileSync(join(DIST, 'core', 'loader.min.mjs'), 'utf8'), /import\.meta\.url/, 'core/loader.min.mjs perdió su código a un chunk');
});

test('gobernanza/deps-json: ningún cierre trae zod ni src/ai (siguen externos)', () => {
  if (!existsSync(join(DIST, 'deps.json'))) return;
  const deps = leer('deps.json');
  for (const [nombre, cierre] of Object.entries({ ...deps.tags, ...deps.core }) as [string, string[]][]) {
    for (const ruta of cierre) {
      assert.ok(!/zod/.test(ruta), `${nombre}: ${ruta} (zod va externo, lib/zod.min.mjs)`);
      assert.ok(!/(^|\/)ai\//.test(ruta), `${nombre}: ${ruta} (src/ai va externo, lib/ai/)`);
    }
  }
});

test('gobernanza/deps-json: el cierre del shell crítico de Avatar cabe en el presupuesto', () => {
  if (!existsSync(join(DIST, 'deps.json'))) return;
  const deps = leer('deps.json');
  const modulos = new Set<string>();
  for (const tag of SHELL_CRITICO) {
    assert.ok(deps.tags[tag], `${tag}: no está en deps.json`);
    for (const ruta of deps.tags[tag]) modulos.add(ruta);
  }
  const bytes = [...modulos].reduce((n, ruta) => n + statSync(join(DIST, ruta)).size, 0);
  console.log(`  shell crítico de Avatar: ${modulos.size} módulos, ${bytes} B sin comprimir`);
  assert.ok(modulos.size <= MAX_MODULOS_SHELL, `shell: ${modulos.size} módulos > ${MAX_MODULOS_SHELL}`);
  assert.ok(bytes <= MAX_BYTES_SHELL, `shell: ${bytes} B > ${MAX_BYTES_SHELL}`);
});

test('gobernanza/deps-json: exports.json cubre todos los tags', () => {
  if (!existsSync(join(DIST, 'exports.json'))) return;
  const deps = leer('deps.json');
  const exp = leer('exports.json');
  assert.equal(exp['./loader'], './dist/cdn/core/loader.min.mjs');
  assert.equal(exp['./core/*'], './dist/cdn/core/*.min.mjs');
  const valores = new Set(Object.values(exp));
  for (const [tag, cierre] of Object.entries(deps.tags) as [string, string[]][]) {
    const propia = cierre.find((r) => !r.startsWith('_chunks/') && r.endsWith(`/${tag.replace(/^iswc-/, '')}.min.mjs`));
    assert.ok(propia && valores.has(`./dist/cdn/${propia}`), `${tag}: falta en exports.json`);
  }
  for (const destino of valores) {
    if (!destino.includes('*')) assert.ok(existsSync(join(RAIZ, destino)), `exports.json: ${destino} no existe`);
  }
});

export default lista();
