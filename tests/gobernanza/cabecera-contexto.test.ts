// @contexto INDICE.md · tests/gobernanza/README.md
// cabecera-contexto.test.ts — guardián de la cabecera @contexto.
//
// La cabecera dice las DOS rutas que hay que leer antes de tocar una fuente:
//
//   // @contexto INDICE.md · src/components/forms/input.md
//
// El indice (INDICE.md) es el mapa de los documentos; el md del dominio es el detalle. Sin la
// cabecera, un agente edita un archivo sin saber que reglas tiene.
//
//   K1 toda fuente del kit lleva la cabecera;
//   K2 la cabecera apunta a un md que existe y es el que le toca;
//   K3 la cabecera va detras del shebang, del @vendor y del @doc;
//   K4 el build no duplica la cabecera en dist/;
//   K5 el codemod es idempotente (con --check no encuentra nada que corregir).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(dirname(here));

/** Las fuentes del kit: las mismas que cubre el codemod. */
function fuentes(): string[] {
  return execFileSync('git', ['ls-files', '*.ts', '*.mjs', '*.js'], { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean)
    .filter((r) => !r.startsWith('dist/') && !r.startsWith('.tmp') && !r.includes('node_modules/'))
    .filter((r) => !r.startsWith('assets/') && !r.startsWith('demos/') && !r.startsWith('labs/'));
}

const cabeceraDe = (ruta: string): string | null => {
  const lineas = readFileSync(join(ROOT, ruta), 'utf8').split(/\r\n|\r|\n/);
  const i = lineas.findIndex((l) => /^\/\/ @contexto\b/.test(l));
  return i < 0 ? null : lineas[i].trim();
};

test('gobernanza/cabecera-contexto: K1 toda fuente del kit lleva la cabecera', async () => {
  // El alcance y el md de cada fuente los decide el codemod (una sola fuente de verdad).
  const mod = await import('../../scripts/codemods/cabecera-contexto.mjs');
  const sin: string[] = [];
  for (const r of fuentes()) {
    if (!mod.mdDeContexto(r)) continue;
    const texto = readFileSync(join(ROOT, r), 'utf8');
    if (!/^\/\/ @contexto\b/m.test(texto)) sin.push(r);
  }
  assert.deepEqual(sin, [], 'estas fuentes no llevan la cabecera @contexto');
});

test('gobernanza/cabecera-contexto: K2 la cabecera apunta a un md que existe', () => {
  const malos: string[] = [];
  for (const r of fuentes()) {
    const c = cabeceraDe(r);
    if (!c) continue;
    const m = c.match(/@contexto\s+(?:\S+\s+)?(\S+)\s+·\s+(\S+)$/);
    if (!m) { malos.push(r + ' (cabecera mal formada: ' + c + ')'); continue; }
    const md = m[2];
    const existe = md.startsWith('http') ? true : existsSync(join(ROOT, md));
    if (!existe) malos.push(r + ' (md que no existe: ' + md + ')');
  }
  assert.deepEqual(malos, [], 'cabeceras que apuntan a un md inexistente');
});

test('gobernanza/cabecera-contexto: K3 la cabecera va detras del shebang, @vendor y @doc', () => {
  const malos: string[] = [];
  for (const r of fuentes()) {
    const lineas = readFileSync(join(ROOT, r), 'utf8').split(/\r\n|\r|\n/);
    const i = lineas.findIndex((l) => /^\/\/ @contexto\b/.test(l));
    if (i < 0) continue;
    // Antes de la cabecera solo puede haber el shebang, @vendor y @doc.
    for (let k = 0; k < i; k++) {
      const l = lineas[k].trim();
      if (l === '') continue;
      if (l.startsWith('#!')) continue;
      if (l.startsWith('// @vendor') || l.startsWith('// @doc')) continue;
      if (l.startsWith('@vendor') || l.startsWith('@doc')) continue;
      malos.push(r + ' (linea ' + (k + 1) + ' antes de la cabecera: ' + l.slice(0, 40) + ')');
      break;
    }
  }
  assert.deepEqual(malos, [], 'la cabecera tiene que ir despues del shebang, @vendor y @doc');
});

test('gobernanza/cabecera-contexto: K4 el build no duplica la cabecera en dist', () => {
  // Las fuentes que el build publica (dist/cdn/build/*.ts) son copia de las de src/ y conservan la
  // cabecera: lo que no puede pasar es que quede DUPLICADA (el banner del build sumaria otra).
  const mod = execFileSync('git', ['ls-files', 'dist'], { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean)
    .filter((r) => /\.(ts|mjs|js)$/.test(r));
  const con: string[] = [];
  for (const r of mod) {
    const texto = readFileSync(join(ROOT, r), 'utf8');
    const n = (texto.match(/^\/\/ @contexto\b/gm) || []).length;
    if (n > 1) con.push(r + ' (' + n + ')');
  }
  assert.deepEqual(con, [], 'la cabecera quedo duplicada en dist/');
});

test('gobernanza/cabecera-contexto: K5 el codemod es idempotente', () => {
  const salida = execFileSync('deno', [
    'run', '-A', '--no-check', 'scripts/codemods/cabecera-contexto.mjs', '--check',
  ], { encoding: 'utf8', cwd: ROOT });
  assert.match(salida, /a corregir: 0/, 'el codemod no debe encontrar nada que corregir');
});

export default lista();
