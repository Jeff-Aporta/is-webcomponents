// @contexto INDICE.md · tests/gobernanza/README.md
// WHAT-first — ratchet de trazabilidad spec → guardián.
//
// Aplica specs/testing.md S-T6 (S-T6.1.3 "nombra el requisito").
// Regla: todo requisito `S-X#` de una spec de dominio debe estar citado por al menos un test.
// Los que hoy no lo están quedan CONGELADOS en BASELINE: la deuda puede bajar, nunca subir.
//
// Uso:  deno run -A tests/gobernanza/what-first.test.ts [--reporte]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SPECS = join(ROOT, 'specs');
const TESTS = join(ROOT, 'tests');

const BASELINE = {
  "specsSinIds": [
    "/specs/galeria/e2e.md",
    "/specs/galeria/preview-cdn.md",
    "/specs/typescript/tasks.md"
  ],
  "idsSinGuardian": [
    "/specs/cdn.md :: S-C2",
    "/specs/cdn.md :: S-C3",
    "/specs/cdn.md :: S-C4",
    "/specs/componentes.md :: S-K10",
    "/specs/componentes.md :: S-K11",
    "/specs/componentes.md :: S-K12",
    "/specs/componentes.md :: S-K13",
    "/specs/componentes.md :: S-K14",
    "/specs/componentes.md :: S-K15",
    "/specs/componentes.md :: S-K16",
    "/specs/componentes.md :: S-K17",
    "/specs/componentes.md :: S-K18",
    "/specs/componentes.md :: S-K19",
    "/specs/componentes.md :: S-K2",
    "/specs/componentes.md :: S-K3",
    "/specs/componentes.md :: S-K4",
    "/specs/componentes.md :: S-K5",
    "/specs/componentes.md :: S-K6",
    "/specs/componentes.md :: S-K7",
    "/specs/componentes.md :: S-K8",
    "/specs/componentes.md :: S-K9",
    "/specs/diagramas/spec.md :: S-D1",
    "/specs/diagramas/spec.md :: S-D2",
    "/specs/diagramas/spec.md :: S-D3",
    "/specs/diagramas/spec.md :: S-D4",
    "/specs/diagramas/spec.md :: S-D6",
    "/specs/documentacion.md :: S-D1",
    "/specs/documentacion.md :: S-D2",
    "/specs/documentacion.md :: S-D3",
    "/specs/galeria/spec.md :: S-G2",
    "/specs/galeria/spec.md :: S-G3",
    "/specs/galeria/spec.md :: S-G4",
    "/specs/herramientas/spec.md :: S-H3",
    "/specs/iconos.md :: S-I2",
    "/specs/iconos.md :: S-I4",
    "/specs/typescript/spec.md :: S-TS1",
    "/specs/typescript/spec.md :: S-TS3",
    "/specs/typescript/spec.md :: S-TS5",
    "/specs/typescript/spec.md :: S-TS6",
    "/specs/typescript/spec.md :: S-TS7",
    "/specs/typescript/spec.md :: S-TS8"
  ]
};

const PROCESO = /\/(README|constitution|constraints|flujo-sdd|lessons|adr|testing|iswc-refactor)/;
const IGNORAR_DIR = new Set(['wip-history', 'auditoria', 'plantillas']);

function mdFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!IGNORAR_DIR.has(e.name)) mdFiles(p, out);
    } else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function testFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) testFiles(p, out);
    else if (/\.(test|selfcheck)\.(ts|mjs|js)$/.test(e.name) && e.name !== 'what-first.test.ts') out.push(p);
  }
  return out;
}

/** { '/specs/x.md': ['S-X1', ...] } */
function leerSpecs() {
  const specs = {};
  for (const f of mdFiles(SPECS)) {
    const rel = f.slice(ROOT.length).replace(/\\/g, '/');
    if (PROCESO.test(rel)) continue;
    const t = readFileSync(f, 'utf8');
    specs[rel] = [...new Set([...t.matchAll(/^#{2,3}\s+(S-[A-Z0-9]+\.?\d*)\b/gm)].map((m) => m[1]))];
  }
  return specs;
}

const specs = leerSpecs();
const corpus = testFiles(TESTS).map((f) => readFileSync(f, 'utf8')).join('\n\n');

const sinIds = Object.entries(specs).filter(([, ids]) => ids.length === 0).map(([rel]) => rel).sort();
const sinGuardian = [];
for (const [rel, ids] of Object.entries(specs)) {
  for (const id of ids) if (!corpus.includes(id)) sinGuardian.push(rel + ' :: ' + id);
}
sinGuardian.sort();

const nuevosSinIds = sinIds.filter((r) => !BASELINE.specsSinIds.includes(r));
const nuevosSinGuardian = sinGuardian.filter((r) => !BASELINE.idsSinGuardian.includes(r));
const resueltos = BASELINE.idsSinGuardian.filter((r) => !sinGuardian.includes(r));

if (process.argv.includes('--reporte')) {
  console.log('specs de dominio:', Object.keys(specs).length);
  console.log('requisitos S-X#:', Object.values(specs).flat().length);
  console.log('sin ids:', sinIds.length, sinIds);
  console.log('sin guardián:', sinGuardian.length, '(baseline ' + BASELINE.idsSinGuardian.length + ')');
  console.log('resueltos desde el baseline:', resueltos.length);
  for (const r of sinGuardian) console.log('  pendiente:', r);
  process.exit(0);
}

const errores = [];
if (nuevosSinIds.length) {
  errores.push('specs de dominio SIN requisitos S-X# (nuevas):\n  ' + nuevosSinIds.join('\n  '));
}
if (nuevosSinGuardian.length) {
  errores.push('requisitos S-X# SIN guardián que los cite (nuevos):\n  ' + nuevosSinGuardian.join('\n  '));
}

if (errores.length) {
  console.error('what-first.test.ts: FAIL');
  for (const e of errores) console.error('\n' + e);
  console.error('\nArregla: cita el S-X# en la cabecera del test que lo cubre, o añade el requisito a la spec.');
  process.exit(1);
}

console.log(
  'what-first.test.ts: PASS — ' + Object.keys(specs).length + ' specs, ' +
  Object.values(specs).flat().length + ' requisitos, ' + resueltos.length +
  ' resueltos desde el baseline, ' + sinGuardian.length + ' pendientes congelados',
);
process.exit(0);
