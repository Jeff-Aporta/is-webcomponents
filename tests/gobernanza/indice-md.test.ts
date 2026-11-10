// indice-md.test.ts — guardián del INDICE.md: el indice de todos los md del repo.
//
// El indice es la bisagra de la jerarquia para agentes:
//   AGENTS.md -> INDICE.md -> specs/constitution.md -> skill principal -> md del dominio
//
// Si el indice queda viejo, el agente lee lo que ya no se escribe. Si el indice se regenera a mano,
// el build lo pisa. Estas reglas cierran las dos cosas:
//
//   I1 todo md versionado esta indexado;
//   I2 ningun enlace del indice esta roto;
//   I3 cada tag tiene su md;
//   I4 cada dominio tiene su md;
//   I5 regenerar el indice no cambia nada (es idempotente);
//   I6 README, AGENTS, SKILL y PROMPT enlazan al indice;
//   I7 no hay ninguna URL `blob/main` (la URL de un md es raw).

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(dirname(here));
const INDICE = join(ROOT, 'INDICE.md');

const mds = () =>
  execFileSync('git', ['ls-files', '*.md'], { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean)
    .filter((r) => !r.startsWith('dist/') && !r.startsWith('.tmp') && !r.includes('node_modules/'))
    .filter((r) => r !== 'INDICE.md');

const indice = () => readFileSync(INDICE, 'utf8');

test('gobernanza/indice-md: I1 todo md versionado esta indexado', () => {
  const texto = indice();
  const faltan = mds().filter((r) => !texto.includes('](' + r + ')') && !texto.includes('`' + r + '`'));
  assert.deepEqual(faltan, [], 'estos md no estan en INDICE.md');
});

test('gobernanza/indice-md: I2 ningun enlace del indice esta roto', () => {
  const rotos: string[] = [];
  for (const m of indice().matchAll(/\]\(([^)]+)\)/g)) {
    const destino = m[1];
    if (/^https?:/.test(destino)) continue;
    if (!existsSync(join(ROOT, destino))) rotos.push(destino);
  }
  assert.deepEqual(rotos, [], 'enlaces rotos en INDICE.md');
});

test('gobernanza/indice-md: I3 cada tag tiene su md', () => {
  const manifiesto = readFileSync(join(ROOT, 'src', 'manifest.ts'), 'utf8');
  // El `category` del manifiesto es la agrupacion de la galeria, no la carpeta: el sitio real del
  // componente lo dice su `script` (components/<carpeta>/<nombre>.js).
  const entradas = [...manifiesto.matchAll(/\{ tag: '(iswc-[a-z0-9-]+)', title: '([^']*)', category: '([a-z0-9-]+)', script: '([^']+)'/g)];
  assert.ok(entradas.length > 100, 'el manifiesto debe listar los tags');
  const sin = entradas
    .map(([, tag, , , script]) => ({ tag, md: 'src/' + script.replace(/\.js$/, '.md') }))
    .filter((c) => !existsSync(join(ROOT, c.md)));
  assert.deepEqual(sin.map((c) => c.tag + ' -> ' + c.md), [], 'estos tags no tienen md');
});

test('gobernanza/indice-md: I4 cada dominio tiene su md', () => {
  const dominios = [
    'src/core', 'src/cdn', 'src/cdn/build', 'src/app', 'src/pages', 'src/previews',
    'src/styles', 'src/utils', 'scripts', 'skills', 'assets',
  ];
  const faltan = dominios.filter((d) => !existsSync(join(ROOT, d, 'README.md')));
  assert.deepEqual(faltan, [], 'estos dominios no tienen README.md');
});

test('gobernanza/indice-md: I5 regenerar el indice no cambia nada', async () => {
  const mod = await import('../../scripts/indice-md.mjs');
  const antes = indice();
  mod.escribirIndice();
  assert.equal(indice(), antes, 'el indice debe ser idempotente');
});

test('gobernanza/indice-md: I6 README, AGENTS, SKILL y PROMPT enlazan al indice', () => {
  const quien = [
    ['README.md', 'INDICE.md'],
    ['AGENTS.md', 'INDICE.md'],
    ['skills/iswc-base/SKILL.md', 'INDICE.md'],
  ];
  const faltan: string[] = [];
  for (const [ruta, enlace] of quien) {
    const p = join(ROOT, ruta);
    if (!existsSync(p)) { faltan.push(ruta + ' (no existe)'); continue; }
    if (!readFileSync(p, 'utf8').includes(enlace)) faltan.push(ruta + ' (no enlaza ' + enlace + ')');
  }
  const prompt = join(ROOT, 'PROMPT.md');
  if (existsSync(prompt) && !readFileSync(prompt, 'utf8').includes('INDICE.md')) faltan.push('PROMPT.md (no enlaza INDICE.md)');
  assert.deepEqual(faltan, [], 'estos documentos no apuntan al indice');
});

test('gobernanza/indice-md: I7 no hay URLs blob/main', () => {
  const rotos: string[] = [];
  for (const r of mds()) {
    const texto = readFileSync(join(ROOT, r), 'utf8');
    // Solo las URL de ESTE repo: un enlace a otro repo (p. ej. el estándar del ecosistema) es legitimo.
    if (texto.includes('github.com/Jeff-Aporta/is-webcomponents/blob/main')) rotos.push(r);
  }
  assert.deepEqual(rotos, [], 'la URL de un md es raw, no blob');
});

export default lista();
