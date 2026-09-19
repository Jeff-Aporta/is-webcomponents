#!/usr/bin/env node
// scripts/check-diagram-text-anchor.mjs
// Detecta qué archivos de diagramas tienen el bug de text-anchor en buildTspans.
// Para cada callsite de buildTspans, busca el <text> element que precede
// (mismas N lineas antes) y verifica si tiene text-anchor seteado.

import { readFileSync } from 'node:fs';

const ROOT = 'src/components/diagrams';
const files = [
  'er-diagram.ts', 'block-diagram.ts', 'class-diagram.ts',
  'gantt.ts', 'journey-map.ts', 'flowchart.ts',
  'mindmap.ts', 'sankey-diagram.ts', 'state-diagram.ts',
  'swimlane-diagram.ts', 'sequence-diagram.ts',
  'use-case-diagram.ts', 'venn-diagram.ts',
];

for (const f of files) {
  const path = `${ROOT}/${f}`;
  const src = readFileSync(path, 'utf8');
  // Find every buildTspans call and inspect surrounding 15 lines for <text> with text-anchor.
  const lines = src.split('\n');
  const calls = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('buildTspans(') && !lines[i].includes('buildTextWithTspans(')) {
      // Look back up to 20 lines for the <text> element.
      let hasTextAnchor = false;
      let textLine = -1;
      for (let j = Math.max(0, i - 20); j < i; j++) {
        if (/\bsvgEl\(['"]text['"]/.test(lines[j])) {
          textLine = j + 1;
          // Check the text element block (typically 3-5 lines) for text-anchor.
          for (let k = j; k < Math.min(lines.length, j + 10); k++) {
            if (lines[k].includes("'text-anchor'") || lines[k].includes('text-anchor')) {
              hasTextAnchor = true;
              break;
            }
            if (lines[k].includes('appendChild(ts)') || lines[k].includes('})')) {
              if (k > j + 2) break; // end of text block
            }
          }
          break;
        }
      }
      calls.push({ line: i + 1, hasTextAnchor, textLine });
    }
  }
  if (calls.length === 0) continue;
  const buggy = calls.filter((c) => !c.hasTextAnchor);
  if (buggy.length > 0) {
    console.log(`BUG ${f}: ${buggy.length}/${calls.length} callsites sin text-anchor`);
    for (const b of buggy) console.log(`  line ${b.line}`);
  } else {
    console.log(`OK  ${f}: ${calls.length}/${calls.length} callsites con text-anchor`);
  }
}
