/**
 * Reemplaza function svgEl locales por import desde svg-chart-engine.js
 * Uso: node scripts/dedupe-svgel.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const engine = join(root, 'src/components/_shared/svg-chart-engine.js');

const FILES = [
  'src/components/diagrams/mindmap.js',
  'src/components/diagrams/gantt.js',
  'src/components/diagrams/flowchart.js',
  'src/components/diagrams/er-diagram.js',
  'src/components/diagrams/class-diagram.js',
  'src/components/diagrams/block-diagram.js',
  'src/components/diagrams/sequence-diagram.js',
  'src/components/diagrams/org-chart.js',
  'src/components/diagrams/timeline.js',
  'src/components/diagrams/state-diagram.js',
  'src/components/_shared/path-turtle.js',
  'src/components/media/barcode.js',
];

const LOCAL_FN = /function svgEl\s*\([^)]*\)\s*\{[\s\S]*?\n\}/;

function importPath(fromFile) {
  let rel = relative(dirname(join(root, fromFile)), engine).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

let n = 0;
for (const rel of FILES) {
  const path = join(root, rel);
  let src = readFileSync(path, 'utf8');
  if (!LOCAL_FN.test(src)) {
    console.log('skip (no local svgEl)', rel);
    continue;
  }
  if (src.includes("from '../_shared/svg-chart-engine.js'")
    || src.includes("from './svg-chart-engine.js'")
    || src.includes('svg-chart-engine.js')) {
    // may already import something else from engine
  }
  const imp = `import { svgEl } from '${importPath(rel)}';\n`;
  if (!/import\s*\{[^}]*\bsvgEl\b/.test(src)) {
    // insert after last import or at top
    const m = src.match(/^(?:import[\s\S]*?;\r?\n)+/);
    if (m) src = m[0] + imp + src.slice(m[0].length);
    else src = imp + src;
  }
  src = src.replace(LOCAL_FN, '/* svgEl → _shared/svg-chart-engine.js */');
  // clean double blank lines around comment
  src = src.replace(/\n\/\* svgEl → _shared\/svg-chart-engine\.js \*\/\n+/g, '\n');
  writeFileSync(path, src);
  console.log('ok', rel);
  n += 1;
}
console.log(`dedupe-svgel: ${n} files`);
