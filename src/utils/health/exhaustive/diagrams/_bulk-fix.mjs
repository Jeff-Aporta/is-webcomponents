import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  'class-diagram',
  'er-diagram',
  'sequence-diagram',
  'state-diagram',
];

const IMPORT_LINE = `import {
  exists,
  leerConBase,
  tieneSvg,
  extraerObservados,
  extraerEventos,
  extraerParts,
  tieneShadow,
  leeJsonScript,
  parseaJson,
  usaMutationObserver,
  tieneEdgeCaseGuards,
  adoptaCss,
  estaRegistrado,
  cleanupCompleto,
  tieneJsDoc,
} from '../_helpers.js';`;

for (const name of files) {
  const path = `src/utils/health/exhaustive/diagrams/${name}.test.ts`;
  let src = readFileSync(path, 'utf8');
  // Quitar todas las líneas `import {...} from '../_helpers...';` (pueden estar duplicadas por el bulk-fix anterior).
  src = src.replace(/^import\s*\{[\s\S]*?\}\s*from\s*['"]\.\.\/_helpers\.\w+['"];?\s*$/gm, '');
  // Quitar líneas corruptas.
  src = src.replace(/^import \{[^}]*\} import \{.*$/gm, '');
  // Insertar el import correcto después del JSDoc.
  src = src.replace(
    /(import assert from 'node:assert\/strict';\s*\nimport test from 'node:test';\s*\n)/,
    `$1${IMPORT_LINE}\n`,
  );
  writeFileSync(path, src, 'utf8');
  console.log('Updated:', path);
}