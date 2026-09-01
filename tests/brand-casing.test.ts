// tests/brand-casing.test.ts
//
// La marca se escribe **InSoft**: la S va en MAYUSCULA (el logo la pinta en el
// color de marca — "in" + "Soft"). Se escribia "Insoft" en 83 sitios y, peor,
// <is-palette-selector> componia el wordmark con `accentLabel: 'soft'`, asi que
// el trigger renderizaba "insoft" en minuscula mientras index.html renderizaba
// "inSoft". Dos grafias distintas para la misma marca en la misma pagina.
//
// OJO — lo que NO se toca:
//   - El identificador de paleta `insoft` (data-palette, value, claves de
//     objeto). Va en minuscula y es una API: renombrarlo rompe el theming.
//   - El dominio `insoft.com.co`.
//
// Uso:  node tests/brand-casing.test.ts

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const DIRS = ['previews', 'components', 'scripts', 'styles', 'tests'];
const FILES = ['index.html', 'AGENTS.md', 'README.md', 'LLM.md'];
const EXT = /\.(html|md|js|mjs|css)$/;

async function walk(dir, out = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      await walk(p, out);
    } else if (EXT.test(e.name)) out.push(p);
  }
  return out;
}

const files = [...FILES.map((f) => join(root, f))];
for (const d of DIRS) await walk(join(root, d), files);

const offenders = [];
const SELF = fileURLToPath(import.meta.url);
for (const p of files) {
  // Este propio test cita la grafía incorrecta para explicarla.
  if (p === SELF) continue;
  let src;
  try { src = await readFile(p, 'utf8'); } catch { continue; }
  // "Insoft" con S minuscula. El identificador `insoft` (todo minusculas) y el
  // dominio no casan con este patron.
  for (const m of src.matchAll(/Insoft/g)) {
    const line = src.slice(0, m.index).split('\n').length;
    offenders.push(`${relative(root, p)}:${line}`);
  }
}

assert.equal(
  offenders.length,
  0,
  'La marca es "InSoft" (S mayúscula), no "Insoft". Corregir en:\n  ' +
    offenders.slice(0, 25).join('\n  ') +
    (offenders.length > 25 ? `\n  ...y ${offenders.length - 25} más` : ''),
);

// El wordmark compuesto tiene que llevar la S mayúscula en las DOS
// implementaciones, que hasta ahora divergían.
const selector = await readFile(join(root, 'src/components/feedback/palette-selector.ts'), 'utf8');
assert.match(
  selector,
  /accentLabel:\s*'Soft'/,
  'is-palette-selector debe componer el wordmark con "Soft" (S mayúscula), no "soft"',
);
const indexHtml = await readFile(join(root, 'index.html'), 'utf8');
assert.match(
  indexHtml,
  /accent:\s*'Soft'/,
  'index.html debe componer el wordmark con "Soft" (S mayúscula)',
);

// El identificador de paleta sigue en minúsculas: es API, no texto.
assert.match(
  selector,
  /value:\s*'insoft'/,
  'el identificador de paleta `insoft` debe seguir en minúsculas (data-palette / theming)',
);

console.log(`OK brand-casing — ${files.length} archivos, marca "InSoft" consistente`);
