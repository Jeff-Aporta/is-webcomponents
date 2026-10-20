// tests/gobernanza/specs-sdd-carpeta.test.ts
//
// Meta-guardián: estructura de specs/ SDD (mapa, enlaces, dominios citados).
// Layout-agnóstico: admite dominios como carpeta (`<dominio>/spec.md`) o como archivo
// plano en la raíz (`specs/<dominio>.md`).
//
// Alineado con el guardián canónico tests/gobernanza/specs-sdd.test.ts (E1–E4) y con
// specs/plantillas/ + specs/README.md («carpeta nueva bajo specs/ si el dominio no
// existe»): una carpeta `<dominio>/spec.md` con un único archivo ES válida
// (specs/app-shell/, diagramas/, herramientas/). Antes este archivo la prohibía y
// contradecía al canónico; esa regla se quitó. Lo que añade sobre el canónico: los
// MD planos de la raíz que el mapa del README marca como «Spec» también son dominios
// (enlazados y con guardián citado). Los «Plan»/«Reporte» (iswc-refactor-*.md) son
// documentos de proceso, no dominios: no se les exige guardián.
// Uso: node tests/specs-sdd.test.ts

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

test('gobernanza/specs-sdd-carpeta', async () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const SPECS = join(root, 'specs');
  const TESTS = join(root, 'tests');
  const failures = [];
  
  // Los guardianes viven en tests/<carpeta>/ (antes src/utils/health/<sub>/). Buscar por basename.
  function locateTest(name) {
    const buscar = (dir) => {
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) { const r = buscar(p); if (r) return r; }
        else if (e === name) return p;
      }
      return null;
    };
    return buscar(TESTS);
  }
  
  const OBLIGATORIOS = [
    'README.md',
    'flujo-sdd.md',
    'constitution.md',
    'constraints.md',
    'adr.md',
    'lessons.md',
    'plantillas/spec.template.md',
    'plantillas/tasks.template.md',
  ];
  
  const ENLACE_RE = /\[[^\]]*\]\(([^)\s]+)\)/g;
  
  function archivosMd(dir) {
    const salida = [];
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) salida.push(...archivosMd(ruta));
      else if (nombre.endsWith('.md')) salida.push(ruta);
    }
    return salida;
  }
  
  for (const rel of OBLIGATORIOS) {
    if (!existsSync(join(SPECS, rel))) failures.push(`falta specs/${rel}`);
  }
  
  const sueltos = readdirSync(SPECS).filter((n) => n.startsWith('spec-') && n.endsWith('.md'));
  if (sueltos.length) failures.push(`spec-*.md sueltos en specs/: ${sueltos.join(', ')}`);
  
  for (const archivo of archivosMd(SPECS)) {
    const rel = relative(SPECS, archivo);
    if (rel.split(/[\\/]/)[0] === 'plantillas') continue;
    const texto = readFileSync(archivo, 'utf8');
    for (const m of texto.matchAll(ENLACE_RE)) {
      const destino = m[1].split('#')[0];
      if (!destino || /^(https?:|mailto:)/.test(destino)) continue;
      const absoluto = resolve(dirname(archivo), destino);
      if (!existsSync(absoluto)) failures.push(`${rel} → enlace roto: ${destino}`);
    }
  }
  
  // Dominios: carpeta con spec.md, o MD plano de la raíz que no sea estructural.
  const ESTRUCTURALES = new Set([
    'README.md', 'flujo-sdd.md', 'constitution.md', 'constraints.md', 'adr.md', 'lessons.md', 'plantillas',
  ]);
  const readme = readFileSync(join(SPECS, 'README.md'), 'utf8');
  // Capa de cada MD plano según el mapa del README: `| Spec | [x.md](x.md) | … |`.
  const capaDe = new Map(
    [...readme.matchAll(/^\|\s*([^|]+?)\s*\|\s*\[[^\]]*\]\(([^)\s]+)\)/gm)].map((m) => [m[2], m[1]]),
  );
  const dominios = [];
  for (const n of readdirSync(SPECS)) {
    const p = join(SPECS, n);
    if (statSync(p).isDirectory() && existsSync(join(p, 'spec.md'))) dominios.push(`${n}/spec.md`);
    else if (n.endsWith('.md') && !ESTRUCTURALES.has(n)) {
      const capa = capaDe.get(n);
      if (!capa) failures.push(`README no enlaza ${n}`);
      else if (capa === 'Spec') dominios.push(n);
    }
  }
  
  if (dominios.length === 0) failures.push('ningún dominio de spec bajo specs/');
  
  for (const d of dominios) {
    if (!readme.includes(d)) failures.push(`README no enlaza ${d}`);
    const spec = readFileSync(join(SPECS, ...d.split('/')), 'utf8');
    const citados = [
      ...spec.matchAll(/`tests\/(?:[a-z0-9-]+\/)*([a-z0-9-]+\.test\.[a-z]+)`/gi),
      ...spec.matchAll(/`src\/utils\/health\/(?:meta|diagrams|domain|e2e)\/([a-z0-9-]+\.test\.[a-z]+)`/gi),
    ].map((m) => m[1]);
    if (citados.length === 0) {
      failures.push(`${d} no cita ningún tests/**/*.test.ts`);
      continue;
    }
    for (const file of citados) {
      if (!locateTest(file)) failures.push(`${d} cita ${file} inexistente en tests/`);
    }
  }
  
  if (failures.length) {
    console.error(`specs-sdd-carpeta.test.ts: FAIL — ${failures.length}\n`);
    for (const f of failures) console.error(`  - ${f}`);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  console.log(
    `specs-sdd-carpeta.test.ts: PASS — ${OBLIGATORIOS.length} obligatorios, ${dominios.length} dominios, enlaces OK`,
  );
  return;
});

export default lista();
