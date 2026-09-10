// src/utils/health/run-all.ts
//
// Lanza todos los tests en secuencia y resume. Cada test se ejecuta como
// subproceso para que los fallos no contaminen al runner.
//
// Los tests son *.test.ts e importan fuentes TS con extensión .js
// (ts-resolve-hook), así que cada subproceso arranca con
// `--import <abs>/scripts/ts-resolve-hook.ts`.
//
// Estructura:
//   src/utils/health/
//     ├── meta/      ← estructurales (layout, contratos, manifiestos)
//     ├── diagrams/  ← diagramas (sequence, er, flowchart, block, edge)
//     ├── domain/    ← componentes y features específicos
//     ├── e2e/       ← end-to-end (playwright)
//     └── run-all.ts ← este runner
//
// Tests que SI requieren servidor (PORT=8391 con node scripts/serve.mjs):
//   - meta/cdn-icons.test.ts

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const ALL = process.env.PORT != null;
const NEEDS_SERVER = new Set([join('meta', 'cdn-icons.test.ts')]);
const only = (rel) => (ALL ? true : !NEEDS_SERVER.has(rel));

async function collect(dir, acc = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collect(full, acc);
    else if (entry.name.endsWith('.test.ts')) acc.push(relative(here, full));
  }
  return acc;
}

const files = (await collect(here)).filter(only).sort();
console.log(`corriendo ${files.length} tests${ALL ? ' (con servidor)' : ' (sin servidor)'}\n`);

const hook = pathToFileURL(join(root, 'scripts', 'ts-resolve-hook.ts')).href;

let pass = 0;
let fail = 0;
const failed = [];

for (const f of files) {
  const start = Date.now();
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['--import', hook, join(here, f)], {
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