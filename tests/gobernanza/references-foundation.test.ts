// @contexto INDICE.md · tests/gobernanza/README.md
// references-foundation.test.ts — las referencias de foundation no nombran salidas que ya no
// existen.
//
// El loader y el registrador se publican como `.min.mjs` y no hay un bundle con todos los tags.
// Una referencia que los nombre como salida vigente manda a un consumidor a un archivo que no
// esta: el fallo aparece en su app, no en el kit.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(dirname(here));
const REFS = join(ROOT, 'skills', 'iswc-foundation', 'references');
const TEMPLATE = join(ROOT, 'skills', 'iswc-foundation', 'templates');

/** Los ficheros de una carpeta, y de sus subcarpetas. */
function ficherosDe(dir: string, exts: string[], out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) ficherosDe(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

/** Las menciones vetadas: el nombre del fichero y la linea. */
function menciones(dir: string, exts: string[]): string[] {
  const salida: string[] = [];
  for (const abs of ficherosDe(dir, exts)) {
    const rel = abs.slice(ROOT.length + 1).replaceAll('\\', '/');
    const texto = readFileSync(abs, 'utf8');
    texto.split('\n').forEach((linea, i) => {
      if (/Loader\.min\.js|all\.min\.js/.test(linea)) salida.push(rel + ':' + (i + 1) + '  ' + linea.trim());
    });
  }
  return salida;
}

test('gobernanza/references-foundation: R1 las referencias no nombran salidas que no existen', () => {
  const malos = menciones(REFS, ['.md']);
  assert.deepEqual(malos, [], 'el registrador es <prefijo>Loader.min.mjs y no hay bundle con todos los tags');
});

test('gobernanza/references-foundation: R2 la plantilla de la app tampoco', () => {
  const malos = menciones(TEMPLATE, ['.ts', '.md', '.html', '.json']);
  assert.deepEqual(malos, [], 'todo lo que genera el conversor sale como .min.mjs');
});

test('gobernanza/references-foundation: R3 el registrador que nombra el conversor es el .min.mjs', () => {
  const conversor = readFileSync(join(ROOT, 'src', 'cdn', 'build', 'construir-app.ts'), 'utf8');
  assert.match(conversor, /const registrador = `\$\{opts\.prefijo\}Loader\.min\$\{EXT_MODULO\}`;/);
});

export default lista();
