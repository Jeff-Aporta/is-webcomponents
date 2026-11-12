// @contexto INDICE.md · tests/gobernanza/README.md
// agentes-largo.test.ts — AGENTS.md es el indice corto, no el manual.
//
// El detalle vive en los documentos de dominio (specs/). Este guardian vigila que
// AGENTS.md se mantenga corto, que sus enlaces existan y que nadie cite secciones
// suyas que ya no esten (las secciones se movieron al spec de su dominio).

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const here = dirname(fileURLToPath(import.meta.url));
const RAIZ = dirname(dirname(here));
const LIMITE = 160;

/** Los .md de una carpeta, con su ruta relativa al repo. */
function mdsDe(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '.audit' || e.name === 'node_modules') continue;
      mdsDe(p, out);
    } else if (e.name.endsWith('.md')) {
      out.push(p.slice(RAIZ.length + 1).replaceAll('\\', '/'));
    }
  }
  return out;
}

test('gobernanza/agentes-largo: A1 AGENTS.md cabe en el limite de lineas', () => {
  const rel = join(RAIZ, 'AGENTS.md');
  assert.ok(existsSync(rel), 'falta AGENTS.md');
  const lineas = readFileSync(rel, 'utf8').split(/\r?\n/).length;
  assert.ok(lineas <= LIMITE, `AGENTS.md tiene ${lineas} lineas (limite ${LIMITE})`);
  assert.ok(lineas >= 40, `AGENTS.md tiene ${lineas} lineas: quedo vacio`);
});

test('gobernanza/agentes-largo: A2 los enlaces de AGENTS.md existen', () => {
  const texto = readFileSync(join(RAIZ, 'AGENTS.md'), 'utf8');
  const rotos: string[] = [];
  for (const m of texto.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const destino = m[1]!;
    if (/^(https?:|mailto:|#)/.test(destino)) continue;
    const limpio = destino.split('#')[0]!;
    if (!limpio) continue;
    if (!existsSync(resolve(RAIZ, limpio))) rotos.push(destino);
  }
  assert.deepEqual(rotos, [], `enlaces rotos:\n${rotos.join('\n')}`);
});

test('gobernanza/agentes-largo: A3 AGENTS.md lleva a los documentos clave', () => {
  const texto = readFileSync(join(RAIZ, 'AGENTS.md'), 'utf8');
  for (const doc of [
    'specs/constitution.md',
    'specs/constraints.md',
    'specs/lessons.md',
    'specs/testing.md',
    'specs/repo/spec.md',
  ]) {
    assert.ok(texto.includes(doc), `AGENTS.md no enlaza ${doc}`);
  }
});

test('gobernanza/agentes-largo: A4 el dominio repo esta en el mapa de specs', () => {
  const spec = join(RAIZ, 'specs', 'repo', 'spec.md');
  assert.ok(existsSync(spec), 'falta specs/repo/spec.md');
  const mapa = readFileSync(join(RAIZ, 'specs', 'README.md'), 'utf8');
  assert.ok(mapa.includes('repo/spec.md'), 'specs/README.md no lista el dominio repo');
});

test('gobernanza/agentes-largo: A5 nadie cita secciones de AGENTS.md', () => {
  const citas: string[] = [];
  for (const dir of ['skills', 'specs', 'src', 'tests']) {
    for (const rel of mdsDe(join(RAIZ, dir))) {
      const texto = readFileSync(join(RAIZ, rel), 'utf8');
      if (/AGENTS\.md\s*§/.test(texto)) citas.push(rel);
    }
  }
  assert.deepEqual(citas, [], `referencias a secciones de AGENTS.md:\n${citas.join('\n')}`);
});

test('gobernanza/agentes-largo: A6 el detalle vive en specs/', () => {
  // Lo que se movio fuera de AGENTS.md tiene que estar en un spec (no se pierde).
  const esperado: [string, string][] = [
    ['R2 Estructura', 'specs/repo/spec.md'],
    ['R3 Comandos', 'specs/repo/spec.md'],
    ['R5 Capas de composicion', 'specs/repo/spec.md'],
    ['S-I6', 'specs/iconos.md'],
    ['Entorno: PowerShell', 'specs/lessons.md'],
    ['S-T8', 'specs/testing.md'],
  ];
  const rotos: string[] = [];
  for (const [que, donde] of esperado) {
    const texto = readFileSync(join(RAIZ, donde), 'utf8').toLowerCase();
    if (!texto.includes(que.toLowerCase())) rotos.push(`${que} -> ${donde}`);
  }
  assert.deepEqual(rotos, [], `contenido movido que no aparece:\n${rotos.join('\n')}`);
});

export default lista();
