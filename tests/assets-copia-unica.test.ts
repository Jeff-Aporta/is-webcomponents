/**
 * assets-copia-unica.test.ts — `dist/assets/` es la ÚNICA copia del material.
 *
 * POR QUÉ EXISTE ESTE GUARDIÁN. Hasta el 31-ago-2026 los iconos vivían dos
 * veces: `src/assets/icons/` (fuente, gitignoreada salvo mdi y tabler) y
 * `dist/cdn/assets/` (publicada, versionada entera). Se consolidó en
 * `dist/assets/` (sep-2026: fuera de dist/cdn/) y se borró la primera.
 *
 * Eso cambia la naturaleza de la carpeta: **deja de ser un artefacto
 * regenerable por copia y pasa a ser fuente**. Si alguien la borra —un `rm -rf
 * dist/`, un build que limpie de más— no hay de dónde recuperarla salvo un
 * `npm run icons:download` de horas contra un servicio externo.
 *
 * El build ya aborta por debajo de `MIN_ICONOS`, pero eso solo protege a quien
 * construye. Este test protege también a quien solo corre la suite, y falla
 * ruidosamente en CI antes de que un borrado llegue a `main`.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'dist', 'assets');

/**
 * Canario, no cifra exacta: el set solo crece al bajar colecciones nuevas.
 * Quedar por debajo significa que alguien borró material publicado. Subirlo
 * solo tras un `icons:download` que añada colecciones de verdad.
 *
 * Debe coincidir con `MIN_ICONOS` de `scripts/build.mjs`.
 */
const MIN_ICONOS = 317_000;

function contar(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.state') continue; // estado de descarga, no material
    const p = join(dir, e.name);
    n += e.isDirectory() ? contar(p) : 1;
  }
  return n;
}

test('dist/assets/ existe y es la copia publicada', () => {
  assert.ok(existsSync(assets), 'falta dist/assets/ — es fuente, no se regenera por copia');
  assert.ok(statSync(assets).isDirectory());
  assert.ok(existsSync(join(assets, 'icons')), 'falta dist/assets/icons/');
});

test(`el set de iconos sigue entero (>= ${MIN_ICONOS})`, () => {
  const n = contar(join(assets, 'icons'));
  assert.ok(
    n >= MIN_ICONOS,
    `dist/assets/icons/ tiene ${n} ficheros, por debajo del mínimo ${MIN_ICONOS}. ` +
    'Alguien borró material publicado: recupéralo de git antes de commitear.',
  );
});

test('no reaparece src/assets/ como segunda copia', () => {
  assert.equal(
    existsSync(join(root, 'src', 'assets')),
    false,
    'src/assets/ volvió a existir: el material tiene una sola copia, dist/assets/',
  );
});

test('assets no viven bajo dist/cdn/', () => {
  assert.equal(
    existsSync(join(root, 'dist', 'cdn', 'assets')),
    false,
    'dist/cdn/assets/ es layout viejo — los assets van en dist/assets/',
  );
});

test('el mínimo del test y el del build no divergen', () => {
  const build = readFileSync(join(root, 'scripts', 'build.mjs'), 'utf8');
  const m = build.match(/const MIN_ICONOS\s*=\s*([\d_]+)/);
  assert.ok(m, 'scripts/build.mjs debe declarar MIN_ICONOS');
  assert.equal(
    Number(m[1].replace(/_/g, '')), MIN_ICONOS,
    'MIN_ICONOS difiere entre build.mjs y este test: subir uno sin el otro deja un guardián ciego',
  );
});
