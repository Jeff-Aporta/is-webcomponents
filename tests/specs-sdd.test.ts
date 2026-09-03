// tests/specs-sdd.test.ts
//
// Meta-guardián: estructura de specs/ SDD (mapa, enlaces, dominios citados).
// Layout-agnóstico: admite dominios como carpeta (`<dominio>/spec.md`) o como archivo
// plano en la raíz (`specs/<dominio>.md`, sin carpeta) — la regla es que NO hay
// carpetas de un solo archivo.
// Uso: node tests/specs-sdd.test.ts

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPECS = join(root, 'specs');
const TESTS = join(root, 'tests');
const failures = [];

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

// Carpeta de un solo archivo = violación de la convención.
for (const n of readdirSync(SPECS)) {
  const p = join(SPECS, n);
  if (!statSync(p).isDirectory()) continue;
  const mds = readdirSync(p).filter((f) => f.endsWith('.md'));
  const sub = readdirSync(p).filter((f) => statSync(join(p, f)).isDirectory());
  if (sub.length === 0 && mds.length === 1) failures.push(`carpeta de un solo archivo: ${n}`);
}

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
const dominios = [];
for (const n of readdirSync(SPECS)) {
  const p = join(SPECS, n);
  if (statSync(p).isDirectory() && existsSync(join(p, 'spec.md'))) dominios.push(`${n}/spec.md`);
  else if (n.endsWith('.md') && !ESTRUCTURALES.has(n)) dominios.push(n);
}

if (dominios.length === 0) failures.push('ningún dominio de spec bajo specs/');

const readme = readFileSync(join(SPECS, 'README.md'), 'utf8');
for (const d of dominios) {
  if (!readme.includes(d)) failures.push(`README no enlaza ${d}`);
  const spec = readFileSync(join(SPECS, ...d.split('/')), 'utf8');
  const citados = [...spec.matchAll(/`tests\/([a-z0-9-]+\.test\.ts)`/gi)].map((m) => m[1]);
  if (citados.length === 0) {
    failures.push(`${d} no cita ningún tests/*.test.ts`);
    continue;
  }
  for (const file of citados) {
    if (!existsSync(join(TESTS, file))) failures.push(`${d} cita tests/${file} inexistente`);
  }
}

if (failures.length) {
  console.error(`specs-sdd.test.ts: FAIL — ${failures.length}\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `specs-sdd.test.ts: PASS — ${OBLIGATORIOS.length} obligatorios, ${dominios.length} dominios, enlaces OK`,
);
process.exit(0);
