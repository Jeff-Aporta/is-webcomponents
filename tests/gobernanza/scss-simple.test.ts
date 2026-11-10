// @contexto INDICE.md · tests/gobernanza/README.md
// scss-simple.test.ts — el SCSS del kit se mantiene simple: un modulo, sin @import y sin
// copias del bloque que ya vive en el modulo.
//
// Tres cosas:
//
//   1. `src/styles/_kit.scss` es el modulo de los estilos que el kit repite, y `_index.scss` lo
//      reexporta. Un mixin por familia, con el contrato de specs/estilos.md: el CSS que emite
//      es el mismo que sustituye, y el mixin no elige la especificidad por su cuenta.
//   2. Sin `@import` de Sass: solo `@use` y `@forward`. El `@import url(...)` de CSS plano si se
//      permite (lo usan los charts para traer su CSS hermano).
//   3. Todo .scss compila con las mismas opciones que el build (Dart Sass, loadPaths del build).
//
// Uso:  node tests/gobernanza/scss-simple.test.ts

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(dirname(here));
const SRC = join(ROOT, 'src');

/** Todos los .scss de src/ (y sus subcarpetas). */
function scssDe(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) scssDe(p, out);
    else if (e.name.endsWith('.scss')) out.push(p);
  }
  return out;
}

test('gobernanza/scss-simple: el modulo de estilos del kit existe y se reexporta', () => {
  const kit = join(SRC, 'styles', '_kit.scss');
  assert.ok(existsSync(kit), 'src/styles/_kit.scss debe existir');
  const indice = readFileSync(join(SRC, 'styles', '_index.scss'), 'utf8');
  assert.match(indice, /@forward\s+'kit';/, "_index.scss debe reexportar 'kit'");
  const texto = readFileSync(kit, 'utf8');
  const mixins = [...texto.matchAll(/@mixin\s+([a-z0-9-]+)/g)].map((m) => m[1]);
  assert.ok(mixins.length > 0, 'el modulo debe traer al menos un mixin');
});

test('gobernanza/scss-simple: ningun .scss usa @import de Sass', () => {
  const ofensores: string[] = [];
  for (const abs of scssDe(SRC)) {
    const rel = relative(ROOT, abs).replaceAll('\\', '/');
    const texto = readFileSync(abs, 'utf8');
    texto.split('\n').forEach((linea, i) => {
      const m = linea.match(/^\s*@import\s+(.*)$/);
      if (!m) return;
      // El `@import url(...)` y el `@import './x.css'` son CSS de runtime: se preservan.
      const destino = m[1].trim();
      if (/^url\(/i.test(destino) || /\.css\b/.test(destino)) return;
      ofensores.push(rel + ':' + (i + 1) + '  ' + linea.trim());
    });
  }
  assert.deepEqual(ofensores, [], 'usa @use/@forward, no @import');
});

test('gobernanza/scss-simple: todo .scss compila con las opciones del build', async () => {
  // `sass` se importa dentro de la prueba: importado arriba rompe la carga del archivo en el
  // proceso del runner (el paquete npm no resuelve su ESM en ese contexto).
  const sass = await import('sass');
  const errores: string[] = [];
  for (const abs of scssDe(SRC)) {
    const rel = relative(ROOT, abs).replaceAll('\\', '/');
    try {
      sass.compile(abs, {
        style: 'expanded',
        sourceMap: false,
        loadPaths: [dirname(abs), join(SRC, 'styles')],
        importers: [],
        silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions'],
      });
    } catch (e) {
      errores.push(rel + ': ' + (e instanceof Error ? e.message.split('\n')[0] : String(e)));
    }
  }
  assert.deepEqual(errores, [], 'estos .scss no compilan');
});

test('gobernanza/scss-simple: el lienzo del diagrama no esta copiado a mano', () => {
  // El bloque que vive en el mixin `host-lienzo-diagrama` no puede volver a cada diagrama.
  const marca = [
    '  min-height: 0;',
    '  display: block;',
    '  position: relative;',
    '  box-sizing: border-box;',
    '  font-family: var(--iswc-sans);',
  ].join('\n');
  const ofensores: string[] = [];
  for (const abs of scssDe(join(SRC, 'components'))) {
    const texto = readFileSync(abs, 'utf8');
    if (texto.includes(marca)) ofensores.push(relative(ROOT, abs).replaceAll('\\', '/'));
  }
  assert.deepEqual(ofensores, [], 'usa @include host-lienzo-diagrama en vez de copiar el bloque');
});

test('gobernanza/scss-simple: los diagramas usan el modulo del kit', () => {
  const diagramas = readdirSync(join(SRC, 'components', 'diagrams')).filter((f) => f.endsWith('.scss'));
  const conKit = diagramas.filter((f) => readFileSync(join(SRC, 'components', 'diagrams', f), 'utf8').includes("@use 'kit' as *;"));
  assert.ok(conKit.length >= 13, 'los 13 diagramas comparten el lienzo: deben usar el modulo (' + conKit.length + ' de ' + diagramas.length + ')');
});

export default lista();
