/**
 * deps-json.test.ts — el grafo del build único (F3, partido en F7): `dist/cdn/deps.json` (índice), `dist/cdn/deps/<cat>.json`
 * y `dist/cdn/exports.json`.
 *
 *   (a) todo tag del catálogo tiene cierre en su parte y cada ruta del cierre existe en dist/cdn;
 *   (b) ningún cierre trae `src/ai` (externo, diferido) y Zod solo entra como `lib/zod.min.mjs`, en el cierre de todo
 *       tag cuyo cierre lo importe (F7, 0.2: la precarga lo cubre);
 *   (c) el cierre del shell crítico de Avatar cabe en el presupuesto de módulos y bytes;
 *   (d) exports.json cubre todos los tags (el `exports` del package.json de F6);
 *   (e) F7 (0.1): `deps.json` es un índice mínimo (tag → categoría) y cada parte es pequeña: el loader baja solo la de
 *       la categoría que pide;
 *   (f) F7 (0.2): ningún `.mjs` de dist/cdn lleva `?v=` (ni chunks ni entradas), y el `v` de las partes no nombra
 *       ningún módulo que otro importe (tendría dos URLs).
 *
 * Presupuesto del shell (c): 4-nov-2026 con el build único, 68 módulos y 393 312 B sin comprimir (los 17 tags de
 * `SHELL_CRITICO`); F7 (cierres con `lib/zod.min.mjs` donde se importa, sin `?v=` dentro): 68 módulos, 367 661 B. El
 * tope es lo medido + 10 %.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { leerDeps } from '../_shared/deps.ts';
import { partesDeps } from '../_shared/deps.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const DIST = join(RAIZ, 'dist', 'cdn');

/** Copia de `SHELL_CRITICO` del arranque de frontend-avatar (`src/js/kit-tags.ts` de esa app, 4-nov-2026). */
const SHELL_CRITICO = ['iswc-app-shell', 'iswc-doc-layout', 'iswc-doc-index', 'iswc-theme-toggle', 'iswc-icon', 'iswc-button', 'iswc-heading', 'iswc-spinner', 'iswc-skeleton', 'iswc-toast', 'iswc-avatar', 'iswc-tag', 'iswc-badge', 'iswc-card', 'iswc-dropdown', 'iswc-dropdown-item', 'iswc-session-menu'];

/** F7 (5-nov-2026): 68 módulos, 367 661 B. Tope = medido + 10 %. */
const MAX_MODULOS_SHELL = 75;
const MAX_BYTES_SHELL = 405_000;
/** Índice: ~211 tags × «"iswc-x":"cat"». Parte: la más grande (diagrams) cabe holgada. */
const MAX_INDICE = 12_000;
const MAX_PARTE = 40_000;

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

/** Todos los `.mjs` de dist/cdn (rutas relativas), sin `skills/` (plantillas de consumidores, no módulos del kit). */
function mjsDelDist(dir = DIST, rel = ''): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (r !== 'skills' && r !== 'vendor-distributions') out.push(...mjsDelDist(join(dir, e.name), r));
    } else if (e.name.endsWith('.mjs')) out.push(r);
  }
  return out;
}

test('gobernanza/deps-json: todo tag del catálogo tiene cierre y cada ruta existe', async () => {
  const deps = leerDeps(DIST);
  if (!deps) return;
  assert.match(deps.sha, /^([0-9a-f]{40}|main)$/);
  for (const tag of await tagsDelCatalogo()) {
    const cierre = deps.tags[tag];
    assert.ok(Array.isArray(cierre) && cierre.length, `${tag}: sin cierre en deps/`);
    assert.deepEqual([...cierre].sort(), cierre, `${tag}: el cierre debe ir ordenado`);
    for (const ruta of cierre) assert.ok(existsSync(join(DIST, ruta)), `${tag}: ${ruta} no existe en dist/cdn`);
  }
  assert.ok(deps.core.loader?.includes('core/loader.min.mjs'), 'deps/core.json: core.loader incluye el loader');
  // El loader conserva su propio código (import.meta.url resuelve su carpeta): ningún otro módulo lo importa.
  assert.match(readFileSync(join(DIST, 'core', 'loader.min.mjs'), 'utf8'), /import\.meta\.url/, 'core/loader.min.mjs perdió su código a un chunk');
});

test('gobernanza/deps-json: src/ai fuera de los cierres; Zod solo como lib/zod.min.mjs y en todo cierre que lo importa', () => {
  const deps = leerDeps(DIST);
  if (!deps) return;
  const importaZod = new Map<string, boolean>();
  const usaZod = (ruta: string) => {
    if (!importaZod.has(ruta)) importaZod.set(ruta, /["']\.\.\/lib\/zod\.min\.mjs["']/.test(readFileSync(join(DIST, ruta), 'utf8')));
    return importaZod.get(ruta)!;
  };
  for (const [nombre, cierre] of Object.entries({ ...deps.tags, ...deps.core }) as [string, string[]][]) {
    for (const ruta of cierre) {
      if (/zod/.test(ruta)) assert.equal(ruta, 'lib/zod.min.mjs', `${nombre}: ${ruta} (Zod es uno: lib/zod.min.mjs)`);
      assert.ok(!/(^|\/)ai\//.test(ruta), `${nombre}: ${ruta} (src/ai va externo, lib/ai/)`);
    }
    if (cierre.some((r) => r !== 'lib/zod.min.mjs' && usaZod(r))) {
      assert.ok(cierre.includes('lib/zod.min.mjs'), `${nombre}: su cierre importa ../lib/zod.min.mjs y no lo lista (la precarga no lo cubre)`);
    }
  }
});

test('gobernanza/deps-json: el cierre del shell crítico de Avatar cabe en el presupuesto', () => {
  const deps = leerDeps(DIST);
  if (!deps) return;
  const modulos = new Set<string>();
  for (const tag of SHELL_CRITICO) {
    assert.ok(deps.tags[tag], `${tag}: no está en deps/`);
    for (const ruta of deps.tags[tag]) modulos.add(ruta);
  }
  const bytes = [...modulos].reduce((n, ruta) => n + statSync(join(DIST, ruta)).size, 0);
  console.log(`  shell crítico de Avatar: ${modulos.size} módulos, ${bytes} B sin comprimir (tope ${MAX_MODULOS_SHELL} / ${MAX_BYTES_SHELL})`);
  assert.ok(modulos.size <= MAX_MODULOS_SHELL, `shell: ${modulos.size} módulos > ${MAX_MODULOS_SHELL}`);
  assert.ok(bytes <= MAX_BYTES_SHELL, `shell: ${bytes} B > ${MAX_BYTES_SHELL}`);
});

test('gobernanza/deps-json: exports.json cubre todos los tags', () => {
  if (!existsSync(join(DIST, 'exports.json'))) return;
  const deps = leerDeps(DIST)!;
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

test('gobernanza/deps-json: deps.json es un índice mínimo y cada parte es pequeña (F7)', () => {
  if (!existsSync(join(DIST, 'deps.json'))) return;
  const indice = leer('deps.json');
  assert.deepEqual(Object.keys(indice).sort(), ['categorias', 'sha'], 'deps.json: solo sha + categorias (el cierre va en deps/<cat>.json)');
  const bytesIndice = statSync(join(DIST, 'deps.json')).size;
  const tamanos: string[] = [];
  for (const cat of partesDeps(indice)) {
    const ruta = join(DIST, 'deps', `${cat}.json`);
    assert.ok(existsSync(ruta), `falta deps/${cat}.json`);
    const n = statSync(ruta).size;
    tamanos.push(`${cat} ${n}`);
    assert.ok(n <= MAX_PARTE, `deps/${cat}.json pesa ${n} B > ${MAX_PARTE}`);
    const parte = JSON.parse(readFileSync(ruta, 'utf8'));
    for (const tag of Object.keys(parte.tags)) assert.equal(indice.categorias[tag], cat, `${tag} está en deps/${cat}.json pero el índice dice ${indice.categorias[tag]}`);
  }
  for (const [tag, cat] of Object.entries(indice.categorias) as [string, string][]) {
    assert.ok(JSON.parse(readFileSync(join(DIST, 'deps', `${cat}.json`), 'utf8')).tags[tag], `${tag}: el índice lo manda a deps/${cat}.json y no está`);
  }
  console.log(`  deps.json ${bytesIndice} B (tope ${MAX_INDICE}) · partes: ${tamanos.join(' · ')}`);
  assert.ok(bytesIndice <= MAX_INDICE, `deps.json pesa ${bytesIndice} B > ${MAX_INDICE}`);
});

test('gobernanza/deps-json: ningún .mjs de dist/cdn lleva ?v= y el v de deps no nombra módulos compartidos (F7)', () => {
  const deps = leerDeps(DIST);
  if (!deps) return;
  const conV: string[] = [];
  const importados = new Set<string>();
  for (const ruta of mjsDelDist()) {
    const texto = readFileSync(join(DIST, ruta), 'utf8');
    if (/\.m?js\?v=/.test(texto)) conV.push(ruta);
    for (const m of texto.matchAll(/["'](\.\.?\/[^"'?#]+\.mjs)["']/g)) {
      const base = ruta.includes('/') ? ruta.slice(0, ruta.lastIndexOf('/')) : '';
      importados.add(new URL(m[1], `file:///r/${base ? `${base}/` : ''}`).pathname.slice('/r/'.length));
    }
  }
  assert.deepEqual(conV, [], `.mjs con ?v= dentro (sin sello entre módulos del kit): ${conV.slice(0, 5).join(', ')}`);
  // El núcleo del loader es la excepción: solo lo re-exporta el alias de la raíz (`loader.min.mjs`) y se registra en
  // `globalThis` una vez (la primera instancia gana), así que su `?v=` en el HTML no duplica estado.
  const doble = Object.keys(deps.v ?? {}).filter((r) => importados.has(r) && r !== 'core/loader.min.mjs');
  assert.deepEqual(doble, [], `deps v sella módulos que otro importa sin ?v= (dos URLs, dos instancias): ${doble.slice(0, 5).join(', ')}`);
});

export default lista();
