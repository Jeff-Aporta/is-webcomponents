// @contexto INDICE.md · tests/gobernanza/README.md
// tests/cdn-folders.test.ts
//
// dist/cdn está folderizado por categoría y sale de UN build con splitting (F3). Verifica que:
//   - La raíz: lista cerrada (alias estables loader.min.mjs, is-base.min.css, palettes.min.css, deps.json,
//     exports.json, asset-hashes.json, importmap.json, reload-pin) — sin artefactos planos sueltos; `deps/` (grafo
//     partido por categoría, F7) no es una categoría.
//   - core/: loader (.min.mjs + la copia compat .min.js), CSS base, módulos src/core.
//   - _chunks/: el código compartido; el core (`IswcElement`) existe UNA vez en todo dist/cdn.
//   - Cada componente del manifest existe en <categoria>/<tag>.min.mjs (o lo registra un módulo de su categoría).
//   - Un componente que importa a otro lo trae por los mismos chunks (deps.json), no lo inlinea.
//   - No hay all.min.js ni category.<cat>.min.js; `actions/button.min.mjs` < 8 KB.
//
// Consolidación 2026-09-07: LLM.md (per-carpeta + raíz) eliminada; el catálogo vive
// en specs/componentes.md (consumido por el viewer) y specs/cdn.md (para apps que
// importan desde dist/cdn/).
//
// Uso:  deno task test -- --solo=gobernanza/cdn-folders

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { leerDeps } from '../_shared/deps.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

/** Firma del molde en el código minificado: la definición del método público `setBooleanAttr(name, value)`. */
const FIRMA_CORE = /setBooleanAttr\([\w$]+,[\w$]+\)\{/;

/** Carpetas de dist/cdn que no son categorías de componentes. */
// `deps/` (F7, 0.1): el grafo partido por categoría (`deps/<cat>.json` + `deps/core.json`); `deps.json` de la raíz es
// solo el índice tag → categoría. Así el loader baja 1–15 KB de lo que pide en vez de los 123 KB del grafo entero.
const NO_CATEGORIA = new Set(['llm', 'skills', 'core', 'build', 'lib', '_chunks', 'vendor-distributions', 'deps']);

test('gobernanza/cdn-folders', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = dirname(dirname(here));
  const dist = join(root, 'dist', 'cdn');
  const core = join(dist, 'core');

  const failures = [];
  const check = (cond, msg) => { if (!cond) failures.push(msg); };

  if (!existsSync(dist)) {
    console.log('cdn-folders.test.ts: SKIP — dist/cdn no existe (corre `deno run -A --no-check scripts/build.mjs`)');
    return;
  }

  // Alias estables en la raíz: apps que aún enlazan paths pre-folderizado
  // (is-base, palettes, loader) no deben 404. El canónico sigue siendo core/.
  const ROOT_ALLOWED = new Set([
    'versions.json',
    '_headers', 'llm',
    'is-base.min.css',
    'palettes.min.css',
    'loader.min.mjs',
    'asset-hashes.json',
    // Pin del dev-reload: build.mjs lo escribe (`build:<sha>`) y watch.mjs lo
    // sobreescribe; scripts/dev-reload.js lo sondea en dist/cdn/reload-pin.
    'reload-pin',
    // Entrada del alias `@jeff-aporta/iswc-base/` lista para el import map / deno.json del consumidor (specs/cdn.md §Alias).
    'importmap.json',
    // Grafo del build único (F3): tag → cierre de módulos (lo usa el loader en F4) y el `exports` de npm (F6).
    'deps.json',
    'exports.json',
  ]);

  // `loader.min.js` es la copia compat del loader (F5 la retira).
  const CORE_REQUIRED = [
    'loader.min.mjs', 'loader.min.js', 'loader.md', 'is-base.min.css', 'palettes.min.css',
  ];

  const rootEntries = readdirSync(dist);
  const categories = [];
  for (const name of rootEntries) {
    const full = join(dist, name);
    if (statSync(full).isDirectory()) {
      if (!NO_CATEGORIA.has(name)) categories.push(name);
      continue;
    }
    check(ROOT_ALLOWED.has(name),
      `dist/cdn/${name}: artefacto plano en la raíz — todo componente va en <categoria>/`);
  }

  check(existsSync(core), 'falta dist/cdn/core/');
  for (const f of CORE_REQUIRED) {
    check(existsSync(join(core, f)), `falta dist/cdn/core/${f}`);
  }
  check(existsSync(join(core, 'loader.min.js')) && Buffer.compare(readFileSync(join(core, 'loader.min.js')), readFileSync(join(core, 'loader.min.mjs'))) === 0,
    'dist/cdn/core/loader.min.js debe ser copia byte a byte de core/loader.min.mjs (compat)');
  for (const f of ['is-base.min.css', 'palettes.min.css']) {
    check(existsSync(join(dist, f)), `falta dist/cdn/${f} (alias estable para consumidores)`);
    const alias = readFileSync(join(dist, f));
    const canon = readFileSync(join(core, f));
    check(Buffer.compare(alias, canon) === 0, `dist/cdn/${f} debe ser copia de core/${f}`);
  }
  // El loader importa `../_chunks/…`: en la raíz no puede ser copia, re-exporta el canónico.
  check(existsSync(join(dist, 'loader.min.mjs')) && readFileSync(join(dist, 'loader.min.mjs'), 'utf8').includes('./core/loader.min.mjs'),
    'dist/cdn/loader.min.mjs debe re-exportar ./core/loader.min.mjs');

  check(categories.length > 0, 'dist/cdn no tiene carpetas de categoría');
  check(existsSync(join(dist, '_chunks')), 'falta dist/cdn/_chunks/ (código compartido del build único)');

  // Core sin duplicar: la firma del molde aparece en UN archivo de dist/cdn (su chunk).
  const modulos = readdirSync(dist, { recursive: true }).map(String).filter((f) => f.endsWith('.mjs') || f.endsWith('.js'))
    .filter((f) => !/^(skills|vendor-distributions|build)[\\/]/.test(f) && !f.endsWith('.ts'));
  const conFirma = modulos.filter((f) => !f.endsWith('loader.min.js') && FIRMA_CORE.test(readFileSync(join(dist, f), 'utf8')));
  check(conFirma.length === 1, `el molde IswcElement debe existir en UN archivo de dist/cdn; está en ${conFirma.length}: ${conFirma.slice(0, 5).join(', ')}`);
  const button = join(dist, 'actions', 'button.min.mjs');
  check(existsSync(button) && statSync(button).size < 8 * 1024, `actions/button.min.mjs debe pesar < 8 KB (${existsSync(button) ? statSync(button).size : 'no existe'} B)`);

  // Cada tag del manifest es alcanzable desde su carpeta de categoría: o bien
  // tiene su propio <tag>.min.mjs, o lo registra un módulo de la categoría o un chunk
  // (los hijos comparten archivo con su padre, p.ej. iswc-tab vive en tab-group.ts).
  const { default: manifest } = await import(new URL('../../src/manifest.ts', import.meta.url));
  const textosDe = (dir) => (existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.mjs')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n')
    : '');
  const chunks = textosDe(join(dist, '_chunks'));
  const bundleSourceByCat = new Map();
  const sourcesOf = (cat) => {
    if (!bundleSourceByCat.has(cat)) bundleSourceByCat.set(cat, `${textosDe(join(dist, cat))}\n${chunks}`);
    return bundleSourceByCat.get(cat);
  };

  // ¿Algún fuente de src/ define este tag como custom element?
  let srcTexts = null;
  const definesTag = (tagName) => {
    if (!srcTexts) {
      srcTexts = [];
      const walk = (dir) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else if (/\.(ts|js)$/.test(name)) srcTexts.push(readFileSync(full, 'utf8'));
        }
      };
      walk(join(root, 'src'));
    }
    const re = new RegExp(`(?:(?:defineElement|customElements\\.define)\\(\\s*|static\\s+(?:override\\s+)?tag\\s*=\\s*)['"\`]${tagName}['"\`]`);
    return srcTexts.some((t) => re.test(t));
  };
  const manifestCategories = new Set();
  for (const c of manifest) {
    manifestCategories.add(c.category);
    const tag = c.tag.replace(/^iswc-/, '');
    const own = existsSync(join(dist, `${c.category}/${tag}.min.mjs`));
    const registered = !own && (sourcesOf(c.category).includes(`"${c.tag}"`) || sourcesOf(c.category).includes(`'${c.tag}'`));
    // Meta-páginas del manifest (iswc-icon-explorer, iswc-diagram-*-app): no son
    // custom elements, solo un item del nav con su JSON y un módulo de
    // comportamiento. Para ellas basta con que ese módulo esté publicado y que
    // ningún fuente defina el tag (si alguien lo convierte en CE, vuelve a
    // exigirse el bundle propio o el registro en la categoría).
    let metaPage = false;
    if (!own && !registered) {
      const base = basename(c.script).replace(/\.(ts|js)$/, '');
      // Los previews son de la galería y conservan `.min.js` (dist/previews).
      const moduleOut = c.script.endsWith('.preview.ts')
        ? join(root, 'dist', 'previews', c.category, `${base}.min.js`)
        : join(dist, c.category, `${base}.min.mjs`);
      metaPage = existsSync(moduleOut) && !definesTag(c.tag);
    }
    check(own || registered || metaPage,
      `${c.tag}: ni dist/cdn/${c.category}/${tag}.min.mjs ni ningún módulo de esa categoría lo registra`);
  }

  for (const cat of categories) {
    if (!manifestCategories.has(cat)) continue;
    const files = readdirSync(join(dist, cat));
    check(!files.some((f) => f.startsWith('category.')),
      `no debe existir dist/cdn/${cat}/category.${cat}.* — usar loader + tags`);
  }

  const compRoot = join(root, 'src', 'components');
  const walkSrc = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { if (name !== '_shared') walkSrc(full, out); }
      else if (name.endsWith('.ts') && !name.endsWith('.d.ts') && name !== 'index.ts') out.push(full);
    }
    return out;
  };
  const catByTag = new Map(manifest.map((c) => [c.tag.replace(/^iswc-/, ''), c.category]));
  // build.mjs publica cada fuente como <carpeta>/<basename>.min.mjs: dos fuentes
  // con el mismo nombre (aunque una viva en utils/) se pisan en dist y el tag
  // pierde su bundle (pasó con isp/utils/tree-view/flex-options.ts, que tapaba
  // a <iswc-flex-options>).
  const byBase = new Map();
  const walkAll = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walkAll(full);
      else if (/\.(ts|js)$/.test(name) && !/^index\.(ts|js)$/.test(name) && !name.endsWith('.d.ts')
        && !name.includes('.selfcheck.') && !name.includes('.preview.') && !name.endsWith('.schemas.ts')
        && !/^doc-demo-(boot|host|galeria|estado)\.(ts|js)$/.test(name)) {
        const base = name.replace(/\.(ts|js)$/, '');
        byBase.set(base, [...(byBase.get(base) || []), full.slice(root.length + 1)]);
      }
    }
  };
  walkAll(compRoot);
  for (const [base, files] of byBase) {
    if (files.length > 1) failures.push(`${base}.min.mjs: ${files.length} fuentes con el mismo nombre se pisan en dist (${files.join(', ')})`);
  }

  // Un componente que importa a otro no lo inlinea: lo trae por los MISMOS chunks. Con splitting todo el código de B
  // alcanzable desde A sale a chunks compartidos, así que el cierre de B (menos su propia entrada) está dentro del de A.
  const deps = leerDeps(dist)?.tags ?? {};
  let crossImportsChecked = 0;
  for (const src of walkSrc(compRoot)) {
    const tag = basename(src).replace(/\.ts$/, '');
    const cierreA = deps[`iswc-${tag}`];
    if (!catByTag.has(tag) || !cierreA) continue;
    const code = readFileSync(src, 'utf8');
    // Entre componentes se importa por alias (`@jeff-aporta/iswc-base/components/<cat>/<tag>.js`, S-TS2b).
    const imports = [...code.matchAll(/from\s+['"](?:\.\.\/|@jeff-aporta\/iswc-base\/components\/)([a-z-]+)\/([a-z0-9-]+)\.js['"]|import\s+['"](?:\.\.\/|@jeff-aporta\/iswc-base\/components\/)([a-z-]+)\/([a-z0-9-]+)\.js['"]/g)];
    for (const m of imports) {
      const depTag = m[2] || m[4];
      const cierreB = deps[`iswc-${depTag}`];
      if (!depTag || !cierreB || depTag === tag) continue;
      crossImportsChecked += 1;
      const propia = `${catByTag.get(depTag)}/${depTag}.min.mjs`;
      const fuera = cierreB.filter((p) => p !== propia && !cierreA.includes(p));
      if (fuera.length) failures.push(`${catByTag.get(tag)}/${tag}.min.mjs: no comparte con ${depTag} ${fuera.length} módulo(s) (${fuera[0]}): ¿lo inlinea?`);
    }
  }

  check(!existsSync(join(dist, 'all.min.js')) && !existsSync(join(dist, 'all.min.mjs')),
    'no debe existir dist/cdn/all.min.* — usar core/loader.min.mjs');

  if (failures.length) {
    console.log('FAIL:');
    for (const f of failures) console.log(`  - ${f}`);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }

  console.log(`cdn-folders.test.ts: PASS — dist/cdn folderizado en ${categories.length} categorías + core/ + _chunks/, core en 1 archivo, ${crossImportsChecked} imports entre componentes por chunks compartidos`);
  return;
});

export default lista();
