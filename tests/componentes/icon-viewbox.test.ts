// tests/componentes/icon-viewbox.test.ts
//
// Protege contra el bug "el ícono sale vacío": un SVG de `assets/iconify/` sin viewBox (o con uno
// degenerado) dibuja el path fuera de la caja y se pinta VACÍO.
//
// Historia: una pasada de normalización reescribió todos los SVG del set completo
// (`dist/assets/icons/`, retirado el 4-nov-2026) con `viewBox="0 0 24 24"`; los sets de grid distinto
// (academicons 448x512, fa 1408x1792) quedaron en blanco. Ese set ya no viaja en el repo: hoy los
// únicos SVG versionados son los que el kit usa, en `assets/iconify/` (los baja `deno task icons` de la
// API, que conserva el viewBox nativo). Este guardián los recorre TODOS (son pocos):
//   - cada SVG tiene `viewBox` con ancho y alto positivos y `xmlns`;
//   - los sets de grid 24 conocidos (mdi, tabler, simple-icons) siguen en 24x24: si cambia, alguien
//     reescribió los headers a mano en vez de regenerar con `deno task icons`.
//
// Uso:  deno task test -- --solo=icon-viewbox

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

/** Sets con grid nativo 24x24 (como los sirve la API de Iconify). */
const GRID_24 = new Set(['mdi', 'tabler', 'simple-icons']);

test('componentes/icon-viewbox', async () => {
  const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  const carpeta = join(root, 'assets', 'iconify');

  const viewBoxOf = (svg: string) => {
    const m = svg.match(/viewBox="\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*"/);
    return m ? { w: +m[3], h: +m[4] } : null;
  };

  const offenders: string[] = [];
  let checked = 0;
  const sets = (await readdir(carpeta, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  assert.ok(sets.length > 0, 'assets/iconify/ no tiene sets: corre `deno task icons`');

  for (const prefix of sets) {
    const files = (await readdir(join(carpeta, prefix))).filter((f) => f.endsWith('.svg'));
    for (const f of files) {
      const svg = await readFile(join(carpeta, prefix, f), 'utf8');
      checked++;
      const box = viewBoxOf(svg);
      if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) offenders.push(`${prefix}/${f}: sin xmlns`);
      if (!box || !(box.w > 0) || !(box.h > 0)) { offenders.push(`${prefix}/${f}: viewBox ausente o degenerado`); continue; }
      if (GRID_24.has(prefix) && (box.w !== 24 || box.h !== 24)) {
        offenders.push(`${prefix}/${f}: viewBox ${box.w}x${box.h}, el set es de grid 24x24`);
      }
    }
  }

  assert.equal(
    offenders.length,
    0,
    'SVG de assets/iconify con viewBox inválido — regenera con `deno task icons`, no los edites a mano.\n  ' +
      offenders.slice(0, 20).join('\n  ') +
      (offenders.length > 20 ? `\n  ...y ${offenders.length - 20} mas` : ''),
  );

  console.log(`OK icon-viewbox — ${checked} svg revisados en ${sets.length} sets de assets/iconify`);
});

export default lista();
