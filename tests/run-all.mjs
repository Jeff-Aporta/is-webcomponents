// tests/run-all.mjs
//
// Lanza todos los tests en secuencia y resume. Cada test se ejecuta como
// subproceso para que los fallos no contaminen al runner.
//
// Tests que NO requieren servidor:
//   - icon-references.test.mjs
//   - manifest-paths.test.mjs
//   - preview-paths.test.mjs
//   - theme-contract.test.mjs
//
// Tests que SI requieren servidor (PORT=8391 con node scripts/serve.mjs):
//   - cdn-icons.test.mjs
//
// Uso:
//   node tests/run-all.mjs              # solo los tests sin servidor
//   PORT=8391 node tests/run-all.mjs    # todos, requiere server arriba

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ALL = process.env.PORT != null;
const only = (f) => (ALL ? true : !f.includes('cdn-'));

const files = (await readdir(here)).filter((f) => f.endsWith('.test.mjs') && only(f)).sort();
console.log(`corriendo ${files.length} tests${ALL ? ' (con servidor)' : ' (sin servidor)'}\n`);

let pass = 0;
let fail = 0;
const failed = [];

for (const f of files) {
  const start = Date.now();
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, f)], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('close', (c) => resolve(c ?? 0));
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  if (code === 0) {
    pass++;
    console.log(`[ok]   ${f} (${elapsed}s)\n`);
  } else {
    fail++;
    failed.push(f);
    console.error(`[FAIL] ${f} (${elapsed}s, exit ${code})\n`);
  }
}

console.log('='.repeat(60));
console.log(`RESULTADO: ${pass}/${files.length} tests PASARON${fail ? `, ${fail} fallaron` : ''}`);
if (failed.length) {
  console.log('Fallos:');
  for (const f of failed) console.log(`  - ${f}`);
}
console.log('='.repeat(60));
process.exit(fail ? 1 : 0);