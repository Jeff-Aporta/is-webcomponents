// tests/css-imports.test.ts
//
// Los CSS de componente usan `@import url('../_shared/<x>.css')`. Ese import
// lo resuelve EL NAVEGADOR contra la ruta del .css publicado, no el bundler:
// si el archivo no se emite en dist, el import da 404 EN SILENCIO y el
// componente pierde todo lo que aportaba ese kit.
//
// Paso de verdad: `dist/cdn/_shared/diagram-kit.css` no se emitia, asi que
// chart y los 9 diagramas se quedaban sin `.dg-tooltip { position: absolute }`.
// El tooltip pasaba a ser un <div> en el flujo y al hacer hover empujaba y
// comprimia el grafico. En dev no se notaba porque ahi la ruta al fuente si
// existe: solo se rompia en el bundle publicado.
//
// Uso:  node tests/css-imports.test.ts

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const dist = join(root, 'dist', 'cdn');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

if (!existsSync(dist)) {
  console.log('css-imports.test.ts: SKIP — dist/cdn no existe (corre `node scripts/build.mjs`)');
  process.exit(0);
}

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (name !== 'assets') walk(full, out); }
    else if (name.endsWith('.css')) out.push(full);
  }
  return out;
};

const files = walk(dist);
let imports = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  // Formas minificadas: @import"x.css"; y @import url("x.css");
  const found = [
    ...src.matchAll(/@import\s+url\(\s*["']([^"')]+)["']\s*\)/g),
    ...src.matchAll(/@import\s*["']([^"']+)["']/g),
  ];
  for (const m of found) {
    const spec = m[1];
    if (/^(https?:)?\/\//.test(spec)) continue;   // remoto: fuera de alcance
    imports += 1;
    const target = resolve(dirname(file), spec);
    const rel = relative(root, file).split(sep).join('/');
    check(existsSync(target),
      `${rel}: @import "${spec}" no existe en dist (${relative(root, target).split(sep).join('/')}) `
      + '— el navegador lo pedira y dara 404 en silencio');
  }
}

// El kit compartido debe emitirse: es el que trae .dg-tooltip posicionado.
check(existsSync(join(dist, '_shared', 'diagram-kit.css')),
  'falta dist/cdn/_shared/diagram-kit.css — charts y diagramas pierden el kit compartido');

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`css-imports.test.ts: PASS — ${imports} @import locales del CSS publicado resuelven a un archivo real`);
process.exit(0);
