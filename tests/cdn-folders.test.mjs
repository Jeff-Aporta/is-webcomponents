// tests/cdn-folders.test.mjs
//
// dist/cdn está folderizado por categoría. Verifica que:
//   - La raíz solo contiene all.min.js, is-base.min.css, palettes.min.css,
//     README.txt, assets/ y las carpetas de categoría (nada plano).
//   - Cada componente del manifest existe en <categoria>/<tag>.min.js.
//   - Cada carpeta con componentes trae su scrollbars.css (lo pide adoptCss).
//   - Cada categoría trae su category.<categoria>.min.js.
//   - all.min.js importa rutas folderizadas, no planas.
//
// Uso:  node tests/cdn-folders.test.mjs

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
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

const ROOT_ALLOWED = new Set(['all.min.js', 'is-base.min.css', 'palettes.min.css', 'README.txt', 'assets']);

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

console.log(`cdn-folders.test.mjs: PASS — dist/cdn folderizado en ${categories.length} categorías, sin artefactos planos`);
process.exit(0);
