// @contexto INDICE.md · tests/gobernanza/README.md
/**
 * assets-copia-unica.test.ts — ninguna colección completa de íconos versionada; solo `assets/iconify/`
 * con los usados.
 *
 * POR QUÉ EXISTE ESTE GUARDIÁN. Hasta el 4-nov-2026 `dist/assets/icons/` versionaba las colecciones
 * completas `mdi` y `tabler` más su catálogo (`index.json`, `collections.json`, `manifest.json`,
 * `viewbox.snapshot.json`): 13 635 archivos solo para el explorador de íconos de la galería, que pesaban
 * ~15 MB del tarball que empaqueta jsDelivr (tope 50 MB). Decisión del usuario: fuera del repo. El
 * explorador lee catálogo, nombres y SVG (por lotes) de la API de Iconify vía `core/icon-loader`.
 *
 * Lo que queda versionado son los íconos que el kit, labs y apps usan DE VERDAD, en `assets/iconify/`
 * (los genera `deno task icons` = `assets/dl.js`, que barre el código y poda lo que nadie usa). Este
 * test falla si:
 *   - reaparece `dist/assets/icons/` (o cualquier otra copia del set completo);
 *   - `assets/iconify/` supera `MAX_ICONIFY` archivos: señal de que alguien bajó una colección entera.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const iconify = join(root, 'assets', 'iconify');

/** Tope de `assets/iconify/` (4-nov-2026: 534 SVG). Una colección completa (mdi: 7 447) lo rompe de sobra. */
const MAX_ICONIFY = 2_000;

function contar(dir: string): number {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    n += e.isDirectory() ? contar(p) : 1;
  }
  return n;
}

test('no reaparece dist/assets/icons/ (colecciones completas fuera del repo)', () => {
  assert.equal(
    existsSync(join(root, 'dist', 'assets', 'icons')),
    false,
    'dist/assets/icons/ volvió: las colecciones completas no se versionan; el explorador usa la API de Iconify',
  );
});

test(`assets/iconify/ existe y trae solo los usados (<= ${MAX_ICONIFY})`, () => {
  assert.ok(existsSync(iconify) && statSync(iconify).isDirectory(), 'falta assets/iconify/: corre `deno task icons`');
  const n = contar(iconify);
  assert.ok(n > 0, 'assets/iconify/ está vacío: corre `deno task icons`');
  assert.ok(
    n <= MAX_ICONIFY,
    `assets/iconify/ tiene ${n} archivos (> ${MAX_ICONIFY}): parece una colección completa. ` +
      'Solo van los íconos que el código usa (deno task icons los poda); el resto, la API.',
  );
});

test('no reaparece src/assets/ como segunda copia', () => {
  assert.equal(
    existsSync(join(root, 'src', 'assets')),
    false,
    'src/assets/ volvió a existir: el material del kit vive en dist/assets/ y los íconos en assets/iconify/',
  );
});

test('assets no viven bajo dist/cdn/', () => {
  assert.equal(
    existsSync(join(root, 'dist', 'cdn', 'assets')),
    false,
    'dist/cdn/assets/ es layout viejo — los assets van en dist/assets/',
  );
});

export default lista();
