// tests/cdn-folders.test.ts
//
// dist/cdn está folderizado por categoría. Verifica que:
//   - La raíz: sizes, versions.json, _headers, llm/, alias estables (loader.min.js,
//     is-base.min.css, palettes.min.css) — sin artefactos planos sueltos.
//   - core/: loader, CSS base, módulos src/core.
//   - Cada componente del manifest existe en <categoria>/<tag>.min.js.
//   - Cada carpeta con componentes trae su scrollbars.css (lo pide adoptCss).
//   - No hay all.min.js ni category.<cat>.min.js.
//
// Consolidación 2026-09-07: LLM.md (per-carpeta + raíz) eliminada; el catálogo vive
// en specs/componentes.md (consumido por el viewer) y specs/cdn.md (para apps que
// importan desde dist/cdn/). dist/cdn/LLM.md raíz ya NO se genera (build.mjs rama
// defensiva eliminada en esta limpieza).
//
// Uso:  node tests/cdn-folders.test.ts

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

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
  // Consolidación 2026-09-07: 'LLM.md' se quitó de la whitelist raíz (no se copia
  // desde src/cdn/LLM.md — esa rama quedó eliminada en build.mjs).
  const ROOT_ALLOWED = new Set([
    'versions.json',
    '_headers', 'llm',
    'is-base.min.css',
    'palettes.min.css',
    'loader.min.js',
    'asset-hashes.json',
    // Pin del dev-reload: build.mjs lo escribe (`build:<sha>`) y watch.mjs lo
    // sobreescribe; scripts/dev-reload.js lo sondea en dist/cdn/reload-pin.
    'reload-pin',
  ]);
  
  const CORE_REQUIRED = [
    'loader.min.js', 'loader.md', 'is-base.min.css', 'palettes.min.css',
  ];
  
  const rootEntries = readdirSync(dist);
  const categories = [];
  for (const name of rootEntries) {
    const full = join(dist, name);
    if (statSync(full).isDirectory()) {
      // `lib/` guarda los bundles compartidos (zod, obj, ref-obj) que importan
      // los componentes como `../lib/zod.min.js`: infraestructura, no categoría.
      if (name !== 'llm' && name !== 'skills' && name !== 'core' && name !== 'build' && name !== 'lib') categories.push(name);
      continue;
    }
    check(ROOT_ALLOWED.has(name),
      `dist/cdn/${name}: artefacto plano en la raíz — todo componente va en <categoria>/`);
  }
  
  check(existsSync(core), 'falta dist/cdn/core/');
  for (const f of CORE_REQUIRED) {
    check(existsSync(join(core, f)), `falta dist/cdn/core/${f}`);
  }
  for (const f of ['is-base.min.css', 'palettes.min.css', 'loader.min.js']) {
    check(existsSync(join(dist, f)), `falta dist/cdn/${f} (alias estable para consumidores)`);
    const alias = readFileSync(join(dist, f));
    const canon = readFileSync(join(core, f));
    check(Buffer.compare(alias, canon) === 0, `dist/cdn/${f} debe ser copia de core/${f}`);
  }
  
  check(categories.length > 0, 'dist/cdn no tiene carpetas de categoría');
  
  // Cada tag del manifest es alcanzable desde su carpeta de categoría: o bien
  // tiene su propio <tag>.min.js, o lo registra un módulo hermano (los hijos
  // comparten archivo con su padre, p.ej. iswc-tab vive en tab-group.ts).
  const { default: manifest } = await import(new URL('../../src/manifest.ts', import.meta.url));
  const bundleSourceByCat = new Map();
  const sourcesOf = (cat) => {
    if (!bundleSourceByCat.has(cat)) {
      const dir = join(dist, cat);
      const src = existsSync(dir)
        ? readdirSync(dir)
            .filter((f) => f.endsWith('.min.js'))
            .map((f) => readFileSync(join(dir, f), 'utf8'))
            .join('\n')
        : '';
      bundleSourceByCat.set(cat, src);
    }
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
    const re = new RegExp(`(?:defineElement|customElements\\.define)\\(\\s*['"\`]${tagName}['"\`]`);
    return srcTexts.some((t) => re.test(t));
  };
  const manifestCategories = new Set();
  for (const c of manifest) {
    manifestCategories.add(c.category);
    const tag = c.tag.replace(/^iswc-/, '');
    const own = existsSync(join(dist, `${c.category}/${tag}.min.js`));
    const registered = sourcesOf(c.category).includes(`"${c.tag}"`)
      || sourcesOf(c.category).includes(`'${c.tag}'`);
    // Meta-páginas del manifest (iswc-icon-explorer, iswc-diagram-*-app): no son
    // custom elements, solo un item del nav con su JSON y un módulo de
    // comportamiento. Para ellas basta con que ese módulo esté publicado y que
    // ningún fuente defina el tag (si alguien lo convierte en CE, vuelve a
    // exigirse el bundle propio o el registro en la categoría).
    let metaPage = false;
    if (!own && !registered) {
      const base = basename(c.script).replace(/\.(ts|js)$/, '');
      const moduleOut = c.script.endsWith('.preview.ts')
        ? join(root, 'dist', 'previews', c.category, `${base}.min.js`)
        : join(dist, c.category, `${base}.min.js`);
      metaPage = existsSync(moduleOut) && !definesTag(c.tag);
    }
    check(own || registered || metaPage,
      `${c.tag}: ni dist/cdn/${c.category}/${tag}.min.js ni ningún módulo de esa categoría lo registra`);
  }
  
  // Bundle de categoría (solo las del manifest) + scrollbars.css por carpeta.
  for (const cat of categories) {
    // `_shared` no es una categoría: guarda infraestructura compartida, no
    // componentes. Desde que `base-sheets.min.js` vive ahí tiene un `.min.js`,
    // pero no define ningún tag y nadie le pide el CSS hermano, así que no le
    // corresponde llevar scrollbars.css.
    if (cat === '_shared') continue;
    const files = readdirSync(join(dist, cat));
    const hasComponents = files.some((f) => f.endsWith('.min.js') && !f.startsWith('category.'));
    if (!hasComponents) continue;
    if (manifestCategories.has(cat)) {
      check(!files.some((f) => f.startsWith('category.') && f.endsWith('.min.js')),
        `no debe existir dist/cdn/${cat}/category.${cat}.min.js — usar loader + tags`);
    }
    check(files.includes('scrollbars.css'),
      `falta dist/cdn/${cat}/scrollbars.css — adoptCss lo busca junto al módulo`);
  }
  
  
  // Los bundles por componente NO deben inlinear otros componentes: esbuild
  // duplicaria la clase y el `import.meta.url` del componente inlineado
  // apuntaria al archivo anfitrion, asi que adoptCss cargaria el CSS
  // equivocado (iswc-icon acabo cargando actions/button.min.css y perdio su
  // tamano). Cada import entre componentes debe quedar como referencia.
  const compRoot = join(root, 'src', 'components');
  const walkSrc = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { if (name !== '_shared') walkSrc(full, out); }
      // Los fuentes son .ts (importan con especificador .js); antes eran .js.
      else if (name.endsWith('.ts') && !name.endsWith('.d.ts') && name !== 'index.ts') out.push(full);
    }
    return out;
  };
  const catByTag = new Map(manifest.map((c) => [c.tag.replace(/^iswc-/, ''), c.category]));
  // build.mjs publica cada fuente como <carpeta>/<basename>.min.js: dos fuentes
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
        && !/^doc-demo-(boot|host)\.(ts|js)$/.test(name)) {
        const base = name.replace(/\.(ts|js)$/, '');
        byBase.set(base, [...(byBase.get(base) || []), full.slice(root.length + 1)]);
      }
    }
  };
  walkAll(compRoot);
  for (const [base, files] of byBase) {
    if (files.length > 1) failures.push(`${base}.min.js: ${files.length} fuentes con el mismo nombre se pisan en dist (${files.join(', ')})`);
  }
  let crossImportsChecked = 0;
  for (const src of walkSrc(compRoot)) {
    const tag = basename(src).replace(/\.ts$/, '');
    const cat = catByTag.get(tag);
    if (!cat) continue;
    const outFile = join(dist, cat, `${tag}.min.js`);
    if (!existsSync(outFile)) continue;
    const code = readFileSync(src, 'utf8');
    const built = readFileSync(outFile, 'utf8');
    const imports = [...code.matchAll(/from\s+['"]\.\.\/([a-z-]+)\/([a-z0-9-]+)\.js['"]|import\s+['"]\.\.\/([a-z-]+)\/([a-z0-9-]+)\.js['"]/g)];
    for (const m of imports) {
      const depTag = m[2] || m[4];
      if (!depTag || !catByTag.has(depTag) || depTag === tag) continue;
      const depCat = catByTag.get(depTag);
      crossImportsChecked += 1;
      if (!built.includes(`../${depCat}/${depTag}.min.js`)) {
        failures.push(`${cat}/${tag}.min.js: inlinea ${depTag} en vez de importarlo (rompe adoptCss del componente inlineado)`);
      }
    }
  }
  
  check(!existsSync(join(dist, 'all.min.js')),
    'no debe existir dist/cdn/all.min.js — usar core/loader.min.js');
  
  if (failures.length) {
    console.log('FAIL:');
    for (const f of failures) console.log(`  - ${f}`);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  console.log(`cdn-folders.test.ts: PASS — dist/cdn folderizado en ${categories.length} categorías + core/, sin artefactos planos, ${crossImportsChecked} imports entre componentes verificados`);
  return;
});

export default lista();
