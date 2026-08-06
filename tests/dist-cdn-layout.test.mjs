// tests/dist-cdn-layout.test.mjs
//
// Congela el error del `dist/ag-grid.js` huérfano: el build publica SOLO bajo
// dist/cdn/. Cualquier .js/.css/.map suelto en dist/ raíz confunde (parece CDN
// y no lo es) y el build actual no lo limpia.
//
// Uso: node tests/dist-cdn-layout.test.mjs

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const failures = [];

if (!existsSync(join(dist, 'cdn'))) {
  failures.push('falta dist/cdn/ — el build debe emitir ahí');
}

const allowedRootFiles = new Set(['.gitignore']);
const allowedRootDirs = new Set(['cdn']);

if (existsSync(dist)) {
  for (const name of readdirSync(dist)) {
    const p = join(dist, name);
    const isDir = statSync(p).isDirectory();
    if (isDir) {
      if (!allowedRootDirs.has(name)) {
        failures.push(`dist/${name}/ no permitido — solo dist/cdn/`);
      }
    } else if (!allowedRootFiles.has(name)) {
      failures.push(
        `dist/${name} suelto — artefactos van en dist/cdn/ (error histórico: dist/ag-grid.js)`,
      );
    }
  }
}

// Smoke: ag-grid vive en CDN, no en raíz
if (existsSync(join(dist, 'ag-grid.js'))) {
  failures.push('dist/ag-grid.js huérfano — usar dist/cdn/data/ag-grid.min.js');
}
if (!existsSync(join(dist, 'cdn', 'data', 'ag-grid.min.js'))) {
  failures.push('falta dist/cdn/data/ag-grid.min.js (rebuild si acabas de clonar)');
}

if (failures.length) {
  console.error(`dist-cdn-layout.test.mjs: FAIL — ${failures.length}\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('dist-cdn-layout.test.mjs: PASS — dist/ solo cdn/ (+ .gitignore)');
