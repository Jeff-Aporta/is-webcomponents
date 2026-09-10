import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';

const cwd = process.cwd();
const outFile = '.audit/diagnose-failures.txt';

try {
  execSync(`node --import ./scripts/ts-resolve-hook.ts --test "src/utils/health/exhaustive/**/*.test.ts"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  writeFileSync(outFile, (e.stdout ?? '') + '\n' + (e.stderr ?? ''));
}

const output = readFileSync(outFile, 'utf8');

// Extraer cada "not ok" con su test y razón.
const lineas = output.split('\n');
const fallos = [];
let actual = null;
for (let i = 0; i < lineas.length; i++) {
  const m = lineas[i].match(/^not ok (\d+) - (.+)$/);
  if (m) {
    actual = { id: m[1], nombre: m[2], detalle: [] };
    fallos.push(actual);
  } else if (actual && (lineas[i].startsWith('  error:') || lineas[i].startsWith('  message:'))) {
    actual.detalle.push(lineas[i].trim());
  }
}

// Agrupar por patrón.
const grupos = new Map();
for (const f of fallos) {
  const nombre = f.nombre;
  let patron;
  if (nombre.includes('observado')) patron = 'OBSERVADOS';
  else if (nombre.includes('shadow DOM con svg')) patron = 'SVG SHADOW';
  else if (nombre.includes('JSON payload')) patron = 'JSON PAYLOAD';
  else if (nombre.includes('MutationObserver')) patron = 'MUTATION OBSERVER';
  else if (nombre.includes('shadow DOM parts')) patron = 'PARTS';
  else if (nombre.includes('emite')) patron = 'EVENTOS';
  else if (nombre.includes('CSS')) patron = 'CSS';
  else if (nombre.includes('atributo') && nombre.includes('reflected')) patron = 'REFLECTED';
  else if (nombre.includes('integra con')) patron = 'INTEGRACIÓN';
  else if (nombre.includes('slot')) patron = 'SLOTS';
  else patron = 'OTROS';
  if (!grupos.has(patron)) grupos.set(patron, []);
  grupos.get(patron).push(f);
}

console.log('═'.repeat(60));
console.log(`  DIAGNÓSTICO DE ${fallos.length} FALLOS EN TESTS EXHAUSTIVOS`);
console.log('═'.repeat(60));
console.log();
for (const [patron, lista] of grupos) {
  console.log(`\n📌 ${patron} (${lista.length} fallos)`);
  for (const f of lista.slice(0, 5)) {
    console.log(`   - ${f.nombre}`);
    console.log(`     ${f.detalle[0] ?? '(sin detalle)'}`);
  }
  if (lista.length > 5) {
    console.log(`   ... y ${lista.length - 5} más`);
  }
}
console.log();
console.log('═'.repeat(60));
console.log(`Total: ${fallos.length} fallos`);
console.log('═'.repeat(60));