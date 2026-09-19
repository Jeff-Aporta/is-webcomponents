#!/usr/bin/env node
// scripts/fix-text-anchor-bulk.mjs
// Para cada callsite de buildTspans sin text-anchor, agrega el atributo
// al <text> element correspondiente.
//
// Patron a buscar:
//   const X = svgEl('text', { fill: ..., 'font-size': ..., ... });
//   ...
//   const Y = buildTspans(...)
//   for (const span of Y) { ... X.appendChild(ts); }
//
// Si X es creado sin text-anchor y el anchor del buildTspans es 'middle',
// se agrega 'text-anchor': 'middle' al X.

import { readFileSync, writeFileSync } from 'node:fs';

const FILES = [
  'src/components/diagrams/block-diagram.ts',
  'src/components/diagrams/class-diagram.ts',
  'src/components/diagrams/gantt.ts',
  'src/components/diagrams/mindmap.ts',
  'src/components/diagrams/sankey-diagram.ts',
  'src/components/diagrams/state-diagram.ts',
  'src/components/diagrams/sequence-diagram.ts',
  'src/components/diagrams/use-case-diagram.ts',
  'src/components/diagrams/venn-diagram.ts',
];

let changedCount = 0;
for (const path of FILES) {
  let src = readFileSync(path, 'utf8');
  const original = src;

  // Para cada <text> element creado con svgEl, verificar si:
  //   1) NO tiene text-anchor.
  //   2) Hay un buildTspans cerca (en el mismo scope) que use anchor 'middle'.
  //   3) El tspan del nombre del text se usa (la variable asignada).
  // Si se cumplen, agregar 'text-anchor': 'middle' al text.

  // Encuentra cada svgEl('text', {...}) en el archivo.
  const textDeclRe = /(const\s+(\w+)\s*=\s*svgEl\(\s*['"]text['"]\s*,\s*\{)([\s\S]*?)(\}\s*\)\s*;)/g;
  let m;
  while ((m = textDeclRe.exec(src)) !== null) {
    const fullMatch = m[0];
    const varName = m[2];
    const attrBody = m[3];
    // Si ya tiene text-anchor, saltar.
    if (/'text-anchor'|"text-anchor"|text-anchor\s*:/.test(attrBody)) continue;
    // Buscar si hay buildTspans(...'middle'...) que use este varName como target.
    const buildRe = new RegExp(`buildTspans\\([\\s\\S]{0,500}'middle'[\\s\\S]{0,100}\\)`, 'g');
    let anyMiddleFound = false;
    let bm;
    while ((bm = buildRe.exec(src)) !== null) {
      // Verificar que la asignación target use varName.
      const assignRe = new RegExp(`=\\s*buildTspans\\(`);
      const before = src.slice(Math.max(0, bm.index - 200), bm.index);
      if (before.includes(` ${varName}`) || before.includes(` ${varName}tspans`) || before.includes(` ${varName}etspans`) || before.includes(` ${varName}result`)) {
        anyMiddleFound = true;
        break;
      }
    }
    if (!anyMiddleFound) continue;
    // Agregar 'text-anchor': 'middle' al final del attrBody.
    // Insertar antes del cierre del objeto { ... }.
    const newAttrBody = attrBody.trimEnd().replace(/,?\s*$/, '') + ",\n          'text-anchor': 'middle',\n        ";
    const newDecl = `${m[1]}${newAttrBody}${m[4]}`;
    src = src.slice(0, m.index) + newDecl + src.slice(m.index + fullMatch.length);
    console.log(`  + ${path}: ${varName}`);
    changedCount++;
    // Re-search desde el inicio (los indices cambiaron).
    textDeclRe.lastIndex = 0;
    break; // procesa solo el primer match por iteración, luego vuelve a escanear
  }

  if (src !== original) {
    writeFileSync(path, src);
  }
}
console.log(`\nTotal: ${changedCount} cambios`);
