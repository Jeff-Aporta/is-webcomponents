#!/usr/bin/env -S deno run -A --no-check
// @contexto INDICE.md · scripts/README.md
/**
 * gen-palettes.mjs — escribe src/styles/palettes.scss desde src/styles/palettes.json.
 *
 *   deno run -A --no-check scripts/gen-palettes.mjs          # regenera
 *   deno run -A --no-check scripts/gen-palettes.mjs --check  # falla si está desactualizado
 *
 * La fuente es palettesScss() de src/styles/palette-build.ts; el guardian
 * tests/gobernanza/palettes-contrast.test.ts exige que el archivo coincida.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { palettesScss, checkPaletteContrast } from '@jeff-aporta/iswc-base/styles/palette-build.ts';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'src', 'styles', 'palettes.scss');
const css = palettesScss();
const { checked, failures } = checkPaletteContrast();
if (failures.length) {
  for (const f of failures) console.error(`contraste: ${f.palette} ${f.theme}${f.panda ? '+panda' : ''} ${f.fg}/${f.bg} ${f.ratio} < ${f.min}`);
  Deno.exit(1);
}
if (Deno.args.includes('--check')) {
  const actual = readFileSync(out, 'utf8').replace(/\r\n/g, '\n');
  if (actual !== css) { console.error('palettes.scss desactualizado: corre scripts/gen-palettes.mjs'); Deno.exit(1); }
  console.log(`palettes.scss al día · ${checked} pares de contraste OK`);
} else {
  writeFileSync(out, css);
  console.log(`palettes.scss escrito · ${checked} pares de contraste OK`);
}
