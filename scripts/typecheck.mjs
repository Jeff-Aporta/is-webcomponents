// typecheck.mjs — tsc estricto sobre todo src/ con trinquete: falla si hay más errores que
// `iswc.typecheckBaseline` (deno.json) y baja la línea base cuando hay menos. Meta: 0.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const tsc = ['run', '-A', '--no-check', 'npm:typescript@5.9.3/lib/tsc.js', '-p', 'tsconfig.json', '--pretty', 'false'];
let salida = '';
try { salida = execFileSync('deno', tsc, { encoding: 'utf8', maxBuffer: 1 << 28 }); }
catch (e) { salida = String(e.stdout); }
const errores = salida.split('\n').filter(l => / error TS\d+/.test(l));
const deno = readFileSync('deno.json', 'utf8');
const base = Number(deno.match(/"typecheckBaseline":\s*(\d+)/)[1]);
const porGrupo = Object.entries(Object.groupBy(errores, l => l.split('/').slice(0, 3).join('/').replace(/\(.*/, '')))
  .map(([g, v]) => [g, v.length]).sort((a, b) => b[1] - a[1]);
for (const [g, n] of porGrupo.slice(0, 15)) console.log(String(n).padStart(6), g);
console.log(`typecheck: ${errores.length} errores (línea base ${base})`);
if (errores.length > base) {
  console.log(errores.slice(0, 40).join('\n'));
  console.error(`typecheck: FAIL — ${errores.length - base} errores nuevos sobre la línea base`);
  process.exit(1);
}
if (errores.length < base) writeFileSync('deno.json', deno.replace(/("typecheckBaseline":\s*)\d+/, `$1${errores.length}`));
console.log('typecheck: PASS');
