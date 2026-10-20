// tests/dist-cdn-layout.test.ts
//
// Congela el error del `dist/ag-grid.ts` huérfano: el build publica SOLO bajo
// dist/cdn/. Cualquier .js/.css/.map suelto en dist/ raíz confunde (parece CDN
// y no lo es) y el build actual no lo limpia.
//
// Uso: node tests/dist-cdn-layout.test.ts

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

test('gobernanza/dist-cdn-layout', async () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const dist = join(root, 'dist');
  const failures = [];
  
  if (!existsSync(join(dist, 'cdn'))) {
    failures.push('falta dist/cdn/ — el build debe emitir ahí');
  }
  
  const allowedRootFiles = new Set(['.gitignore', 'gallery-app.min.js']);
  // cdn/ (build.mjs) + assets/ (iconos) + lo que emite `deno task bundle`
  // (scripts/bundle-scripts.mjs): previews/ (catalog.ts los carga de
  // ../../dist/previews/), pages/, scripts/ y skills/ (hermanos de cdn-panel).
  // Cualquier otra carpeta (p. ej. temporales de render como .render-tmp/)
  // sigue siendo un huérfano.
  const allowedRootDirs = new Set(['cdn', 'assets', 'previews', 'pages', 'scripts', 'skills']);
  
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
          `dist/${name} suelto — artefactos van en dist/cdn/ (error histórico: dist/ag-grid.ts)`,
        );
      }
    }
  }
  
  // Smoke: ag-grid vive en CDN, no en raíz
  if (existsSync(join(dist, 'ag-grid.ts'))) {
    failures.push('dist/ag-grid.ts huérfano — usar dist/cdn/data/ag-grid.min.js');
  }
  if (!existsSync(join(dist, 'cdn', 'data', 'ag-grid.min.js'))) {
    failures.push('falta dist/cdn/data/ag-grid.min.js (rebuild si acabas de clonar)');
  }
  
  if (failures.length) {
    console.error(`dist-cdn-layout.test.ts: FAIL — ${failures.length}\n`);
    for (const f of failures) console.error(`  - ${f}`);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  console.log('dist-cdn-layout.test.ts: PASS — dist/ solo cdn/ + assets/ + salidas de bundle (+ .gitignore)');
});

export default lista();
