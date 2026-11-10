// @contexto INDICE.md · tests/gobernanza/README.md
// tests/gobernanza/palettes-contrast.test.ts
//
// Contrato de las 25 paletas (src/styles/palettes.json):
//   1. palettes.scss es exactamente palettesScss() (lo escribe scripts/gen-palettes.mjs).
//   2. Contraste AA: 25 paletas × claro/oscuro (con panda la página usa el juego contrario, ya cubierto), texto/fondo ≥ 4.5,
//      on-brand/main ≥ 3 (UI y negrita). La matemática espeja las recetas CSS.
//   3. Los nombres viejos de paleta (marcas) no vuelven al CSS ni al catálogo.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { MARCA_VIEJA, traeMarcaEjemplo } from './_identidad.mjs';
import { PALETTES, DEFAULT_PALETTE, palettesScss, checkPaletteContrast, PALETTE_FAMILIES } from '../../src/styles/palette-build.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });
const root = join(import.meta.dirname ?? '.', '..', '..');

test('palettes: 25 paletas con valores únicos, familia válida y delfin por defecto', () => {
  assert.equal(PALETTES.length, 25);
  assert.equal(new Set(PALETTES.map((p) => p.value)).size, 25);
  const familias = new Set(PALETTE_FAMILIES.map((f) => f.value));
  for (const p of PALETTES) {
    assert.match(p.value, /^[a-z]+$/, `${p.value}: slug sin tildes`);
    assert.ok(familias.has(p.family), `${p.value}: familia ${p.family}`);
    assert.ok(p.origin && p.mood, `${p.value}: origen y ánimo`);
  }
  assert.equal(DEFAULT_PALETTE, 'delfin');
  assert.equal(PALETTES[0].value, 'delfin');
});

test('palettes: core/app-init conoce las mismas 25 paletas (sin importar styles/)', async () => {
  const { PALETAS } = await import('../../src/core/app-init.ts');
  assert.deepEqual([...PALETAS], PALETTES.map((p) => p.value));
});

test('palettes: palettes.scss generado desde palettes.json', () => {
  const actual = readFileSync(join(root, 'src', 'styles', 'palettes.scss'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(actual, palettesScss(), 'palettes.scss desactualizado: deno run -A --no-check scripts/gen-palettes.mjs');
});

test('palettes: contraste AA en 25 paletas × claro/oscuro × panda', () => {
  const { checked, failures } = checkPaletteContrast();
  assert.equal(checked, 25 * 2 * 14);
  assert.deepEqual(failures.map((f) => `${f.palette} ${f.theme}${f.panda ? '+panda' : ''} ${f.fg}/${f.bg} ${f.ratio}<${f.min}`), []);
});

test('palettes: sin nombres de marca en el catálogo de paletas', () => {
  // OJO: los archivos de estilos llevan los tokens `--iswc-*`, que son la marca viva del kit
  // (no un nombre de paleta). Lo que no puede aparecer es una PALETA que se llame como una
  // marca: lo que se mira es el catálogo (id y etiqueta de cada paleta).
  const catalogo = readFileSync(join(root, 'src', 'styles', 'palettes.json'), 'utf8');
  const paletas = JSON.parse(catalogo) as Array<{ value: string; label: string }>;
  assert.equal(paletas.length, 25);
  const conMarca = paletas.filter((p) => MARCA_VIEJA.test(p.value) || MARCA_VIEJA.test(p.label) || traeMarcaEjemplo(p.value) || traeMarcaEjemplo(p.label));
  assert.deepEqual(conMarca.map((p) => p.value), [], 'ninguna paleta se llama como una marca');
});

export default lista();
