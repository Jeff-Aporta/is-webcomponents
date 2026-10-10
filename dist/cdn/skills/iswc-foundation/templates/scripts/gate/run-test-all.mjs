// run-test-all.mjs — bateria completa (`deno task test:all`; la usa tambien el gate del sync).
//
// Pasos, todos con el cooldown del kit (x600: un verde reciente no se repite, un rojo corre siempre):
//   1. build       - `deno task build`. Cooldown por tiempo Y huella de sus entradas: si cambio
//                    src/, view/, deno.json o el build de estilos, corre aunque este en cooldown.
//   2. check       - typecheck (`deno task check`). Mismo criterio de huella.
//   3. pin         - inventario de pines: un solo SHA de 40 hex, sin refs mutables.
//   4. test:health - tests/ sin e2e; el cooldown es por prueba (runner del kit).
//   5. test:e2e    - tests/e2e en navegador (Stagehand); cooldown por prueba.
//
// Por defecto corre TODO y sale con el peor exit (todos los rojos de una vez); `--halt` corta en el
// primer rojo. `TEST_COOLDOWN=0` o `--sin-cooldown` corren todo (diagnostico; el sync nunca los usa).
import process from 'node:process';
import { crearGate } from './gate-cooldown.mjs?v=7ff2kr';

const RAIZ = process.cwd();
const halt = process.argv.includes('--halt');
const banner = (s) => console.log(`\n${'='.repeat(72)}\n${s}\n${'='.repeat(72)}`);
const paso = crearGate({ raiz: RAIZ, log: (m) => console.log(`[test:all] ${m}`), err: (m) => console.error(`[test:all] ${m}`) });
const ENTRADAS = ['src', 'view', 'deno.json', 'scripts/build'];

const pasos = [
  { id: 'build', label: 'build', cmd: 'deno', args: ['task', 'build'], entradas: ENTRADAS },
  { id: 'check', label: 'check', cmd: 'deno', args: ['task', 'check'], entradas: [...ENTRADAS, 'tests'] },
  { id: 'pin', label: 'pin', cmd: 'deno', args: ['task', 'pin'], entradas: ['index.html', 'src', 'view', 'deno.json'] },
  { id: 'test:health', label: 'test:health', cmd: 'deno', args: ['run', '-A', 'scripts/gate/test-health.mjs'], cooldown: false },
  { id: 'test:e2e', label: 'test:e2e', cmd: 'deno', args: ['run', '-A', 'scripts/gate/e2e/run.ts'], cooldown: false },
];

const resumen = [];
let peor = 0;
for (const p of pasos) {
  banner(`[test:all] ${p.label}`);
  const t0 = Date.now();
  const code = paso(p);
  resumen.push({ name: p.label, code, ms: Date.now() - t0 });
  if (code !== 0) {
    peor = Math.max(peor, code);
    if (halt) break;
  }
}
banner('[test:all] RESUMEN');
for (const s of resumen) console.log(`  ${s.name.padEnd(14)} ${(s.code === 0 ? 'PASS' : `FAIL(${s.code})`).padEnd(10)} ${s.ms}ms`);
console.log(`\n[test:all] peor exit = ${peor}`);
process.exit(peor);
