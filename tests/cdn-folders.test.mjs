// tests/cdn-folders.test.mjs
//
// dist/cdn está folderizado por categoría. Verifica que:
//   - La raíz solo contiene all.min.js, is-base.min.css, palettes.min.css,
//     sizes.json, versions.json,
//     README.txt, assets/ y las carpetas de categoría (nada plano).
//   - Cada componente del manifest existe en <categoria>/<tag>.min.js.
//   - Cada carpeta con componentes trae su scrollbars.css (lo pide adoptCss).
//   - Cada categoría trae su category.<categoria>.min.js.
//   - all.min.js importa rutas folderizadas, no planas.
//
// Uso:  node tests/cdn-folders.test.mjs

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const dist = join(root, 'dist', 'cdn');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

if (!existsSync(dist)) {
  console.log('cdn-folders.test.mjs: SKIP — dist/cdn no existe (corre `node scripts/build.mjs`)');
  process.exit(0);
}

// sizes.json y versions.json son metadatos del bundle, no componentes: viven
// en la raíz a propósito porque describen TODO el árbol publicado.
const ROOT_ALLOWED = new Set([
  'all.min.js', 'is-base.min.css', 'palettes.min.css', 'README.txt', 'assets',
  'sizes.json', 'versions.json',
]);

const rootEntries = readdirSync(dist);
const categories = [];
for (const name of rootEntries) {
  const full = join(dist, name);
  if (statSync(full).isDirectory()) {
    if (name !== 'assets') categories.push(name);
    continue;
  }
  check(ROOT_ALLOWED.has(name),
    `dist/cdn/${name}: artefacto plano en la raíz — todo componente va en <categoria>/`);
}

check(categories.length > 0, 'dist/cdn no tiene carpetas de categoría');

// Cada tag del manifest es alcanzable desde su carpeta de categoría: o bien
// tiene su propio <tag>.min.js, o lo registra un módulo hermano (los hijos
// comparten archivo con su padre, p.ej. is-tab vive en tab-group.js).
const { default: manifest } = await import(new URL('../manifest.js', import.meta.url));
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

const manifestCategories = new Set();
for (const c of manifest) {
  manifestCategories.add(c.category);
  const tag = c.tag.replace(/^is-/, '');
  const own = existsSync(join(dist, `${c.category}/${tag}.min.js`));
  const registered = sourcesOf(c.category).includes(`"${c.tag}"`)
    || sourcesOf(c.category).includes(`'${c.tag}'`);
  check(own || registered,
    `${c.tag}: ni dist/cdn/${c.category}/${tag}.min.js ni ningún módulo de esa categoría lo registra`);
}

// Bundle de categoría (solo las del manifest) + scrollbars.css por carpeta.
for (const cat of categories) {
  const files = readdirSync(join(dist, cat));
  const hasComponents = files.some((f) => f.endsWith('.min.js') && !f.startsWith('category.'));
  if (!hasComponents) continue;
  if (manifestCategories.has(cat)) {
    check(files.includes(`category.${cat}.min.js`),
      `falta dist/cdn/${cat}/category.${cat}.min.js`);
  }
  check(files.includes('scrollbars.css'),
    `falta dist/cdn/${cat}/scrollbars.css — adoptCss lo busca junto al módulo`);
}


// Los bundles por componente NO deben inlinear otros componentes: esbuild
// duplicaria la clase y el `import.meta.url` del componente inlineado
// apuntaria al archivo anfitrion, asi que adoptCss cargaria el CSS
// equivocado (is-icon acabo cargando actions/button.min.css y perdio su
// tamano). Cada import entre componentes debe quedar como referencia.
const compRoot = join(root, 'components');
const walkSrc = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (name !== '_shared') walkSrc(full, out); }
    else if (name.endsWith('.js') && name !== 'index.js') out.push(full);
  }
  return out;
};
const catByTag = new Map(manifest.map((c) => [c.tag.replace(/^is-/, ''), c.category]));
let crossImportsChecked = 0;
for (const src of walkSrc(compRoot)) {
  const tag = basename(src).replace(/\.js$/, '');
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

// all.min.js referencia rutas folderizadas.
const all = readFileSync(join(dist, 'all.min.js'), 'utf8');
check(/import"\.\/[a-z-]+\/[a-z0-9-]+\.min\.js"/.test(all),
  'all.min.js debe importar rutas <categoria>/<tag>.min.js');
check(!/import"\.\/[a-z0-9-]+\.min\.js"/.test(all),
  'all.min.js no debe importar rutas planas ./<tag>.min.js');

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`cdn-folders.test.mjs: PASS — dist/cdn folderizado en ${categories.length} categorías, sin artefactos planos, ${crossImportsChecked} imports entre componentes verificados`);
process.exit(0);
