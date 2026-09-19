#!/usr/bin/env node
// scripts/migrate-text-anchor.mjs
//
// Migra los callsites de `buildTspans` para usar `buildTextWithTspans` que
// arma el <text> element con text-anchor correcto.
//
// Patron actual (ejemplo real de swimlane-diagram.ts):
//   const t = svgEl('text', {
//     fill: theme.text, 'font-size': '10.5', 'font-weight': '600',
//     'font-family': 'Tahoma,Arial,sans-serif',
//     // (NO TIENE text-anchor)
//   });
//   ...
//   const swresult = wrapText({ text: s.label, maxWidth: ..., ... });
//   const swtspans = buildTspans(swresult.lines, s.x, s.y, s.w, s.h, 'middle', 10.5, 1.2);
//   for (const span of swtspans) {
//     const ts = svgEl('tspan', { x: span.x, y: span.y, ...(span.dy != null ? { dy: span.dy } : {}) });
//     ts.textContent = span.text;
//     t.appendChild(ts);
//   }
//   g.appendChild(t);
//
// Patron nuevo:
//   const swresult = wrapText({ text: s.label, maxWidth: ..., ... });
//   const built = buildTextWithTspans({
//     lines: swresult.lines,
//     boxX: s.x, boxY: s.y, boxW: s.w, _boxH: s.h,
//     textAnchor: 'middle', fontSize: 10.5, lineHeight: 1.2,
//     baseAttrs: { fill: theme.text, 'font-size': '10.5', 'font-weight': '600', 'font-family': 'Tahoma,Arial,sans-serif' },
//   });
//   for (const span of built.tspans) {
//     const ts = svgEl('tspan', { x: span.x, y: span.y, ...(span.dy != null ? { dy: span.dy } : {}) });
//     ts.textContent = span.text;
//     built.text.appendChild(ts);
//   }
//   g.appendChild(built.text);
//
// Para mantener este script simple y confiable, NO intenta parsear cada
// callsite (seria fragil). En vez de eso, hace un regex surgical para los
// patrones mas comunes. Para llamadas que no matchean el patron, las deja
// para arreglo manual (se imprimiran con "skip").
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'src/components/diagrams';
const files = [
  'block-diagram.ts',
  'class-diagram.ts',
  'gantt.ts',
  'flowchart.ts',
  'mindmap.ts',
  'sankey-diagram.ts',
  'state-diagram.ts',
  'sequence-diagram.ts',
  'use-case-diagram.ts',
  'venn-diagram.ts',
];

let totalChanged = 0;
let totalSkipped = 0;
for (const f of files) {
  const path = `${ROOT}/${f}`;
  let src = readFileSync(path, 'utf8');
  if (!src.includes('buildTspans')) continue;
  const original = src;

  // 1. Add buildTextWithTspans to the import.
  if (/import\s*\{[^}]*\bbuildTspans\b[^}]*\}\s*from\s*['"][^'"]+['"]/.test(src)) {
    src = src.replace(
      /(import\s*\{[^}]*\bbuildTspans\b[^}]*\}\s*from\s*['"][^'"]+['"])/,
      (m) => m.includes('buildTextWithTspans') ? m : m.replace('buildTspans', 'buildTspans, buildTextWithTspans'),
    );
  }

  // 2. Reemplaza cada llamada `buildTspans( ... )` que tenga la forma
  //    multilinea con 8 args. Aceptamos indentacion variable y saltos.
  //
  //    Ej: const X = buildTspans(
  //          result.lines,
  //          boxX, boxY, boxW, _boxH,
  //          'middle', 11.5, 1.2,
  //        );
  //
  //    → const built = buildTextWithTspans({
  //          lines: result.lines,
  //          boxX, boxY, boxW, _boxH,
  //          textAnchor: 'middle', fontSize: 11.5, lineHeight: 1.2,
  //          baseAttrs: <extraido del <text> element previo>,
  //        });
  //
  // Para extraer `baseAttrs`, buscamos el <text> element mas cercano antes
  // del buildTspans y tomamos sus atributos. Ese <text> element luego se
  // borra (su rol lo toma built.text).
  //
  // Para mantener esto manejable: solo soportamos el patron donde el
  // <text> element precede directamente el buildTspans en el mismo bloque
  // (sin funciones intermedias, sin statements raros).

  const textElementRe = /(const\s+(\w+)\s*=\s*svgEl\(['"]text['"]\s*,\s*\{([\s\S]*?)\}\s*\)\s*;)/g;
  const callsites = [];
  let m;
  while ((m = textElementRe.exec(src)) !== null) {
    callsites.push({
      varName: m[2],
      attrBody: m[3],
      end: m.index + m[0].length,
    });
  }

  // Buscar buildTspans(...) que use el mismo varName como target.
  // Procesar en orden inverso para no invalidar indices.
  for (let idx = callsites.length - 1; idx >= 0; idx--) {
    const cs = callsites[idx];
    // Buscar el buildTspans que use cs.varName.
    const usageRe = new RegExp(
      `(const\\s+${cs.varName}(?:tspans|result|etspans)?\\s*=\\s*buildTspans\\(\\s*)((?:[^()]|\\([^()]*\\))*?)(\\s*\\))`,
      'g',
    );
    const um = usageRe.exec(src);
    if (!um) {
      totalSkipped++;
      console.log(`  skip ${f}: no se encontro buildTspans usando ${cs.varName}`);
      continue;
    }
    const argsBody = um[2];
    // Parsear 8 args separados por comas top-level.
    const args = splitTopLevelCommas(argsBody);
    if (args.length !== 8) {
      totalSkipped++;
      console.log(`  skip ${f}: buildTspans tiene ${args.length} args (esperaba 8)`);
      continue;
    }
    const [linesArg, boxXArg, boxYArg, boxWArg, boxHArg, anchorArg, fontSizeArg, lineHeightArg] = args;
    // Construir baseAttrs desde el attrBody del <text>.
    // Parsear `clave: valor` o `clave: 'valor con comas'`. Mantener formato TS legible.
    const baseAttrsStr = parseAttrBody(cs.attrBody);

    const newCall = `const built = buildTextWithTspans({\n            lines: ${linesArg.trim()},\n            boxX: ${boxXArg.trim()}, boxY: ${boxYArg.trim()}, boxW: ${boxWArg.trim()}, _boxH: ${boxHArg.trim()},\n            textAnchor: ${anchorArg.trim()},\n            fontSize: ${fontSizeArg.trim()}, lineHeight: ${lineHeightArg.trim()},\n            baseAttrs: { ${baseAttrsStr} },\n          })`;

    // Reemplazar: del "const NAME = svgEl('text', { ... });" hasta el final del buildTspans(...).
    // Esto es un rango que cruza desde el text element hasta el cierre del buildTspans.
    const startText = src.lastIndexOf(cs.varName + ' = svgEl(', cs.end);
    if (startText < 0) continue;
    const textDeclEnd = findMatchingParen(src, src.indexOf('(', startText)) + 1;
    const buildStart = src.indexOf('buildTspans(', cs.end);
    const buildEnd = findMatchingParen(src, buildStart + 'buildTspans('.length - 1) + 1;
    // Quitar el textDecl (incluyendo el ;) y reemplazar buildTspans(...) por newCall.
    // Tambien reemplazar el nombre de la variable destino en el for() y appendChild() siguientes
    // hasta el final del bloque.
    src = src.slice(0, startText) + src.slice(textDeclEnd, buildStart) + newCall + src.slice(buildEnd);

    // Ahora ajustar las referencias posteriores a ${cs.varName}:
    //   for (const span of ${cs.varName}) { ... ${cs.varName}.appendChild(ts); }
    // → for (const span of built.tspans) { ... built.text.appendChild(ts); }
    // Tambien capturar el nombre variante (e.g. entityTspans, mtspans).
    const variantName = new RegExp(`\\b${cs.varName}(?:tspans|etspans|result)?\\b`, 'g');
    let scan = buildEnd;
    while (scan < src.length) {
      // Buscar el final del bloque actual (g.appendChild(t) o g.appendChild(built.text)).
      const nextRef = variantName.exec(src);
      if (!nextRef || nextRef.index >= src.length) break;
      const idx2 = nextRef.index;
      // Encontrar `for (const span of NAME)` y `NAME.appendChild(`.
      const afterIdx = idx2;
      // Si es dentro de un for-of, el nombre se reemplaza por built.tspans.
      // Si es dentro de un appendChild, se reemplaza por built.text.
      // Por simplicidad: reemplazar contexto-dependiente.
      const contextBefore = src.slice(Math.max(0, idx2 - 50), idx2);
      const isInAppend = /\.appendChild\s*\(\s*$/.test(contextBefore);
      const replacement = isInAppend ? 'built.text' : 'built.tspans';
      src = src.slice(0, idx2) + replacement + src.slice(idx2 + nextRef[0].length);
    }
  }

  if (src !== original) {
    writeFileSync(path, src);
    console.log(`OK ${f}`);
    totalChanged++;
  } else {
    console.log(`-- ${f} (sin cambios)`);
  }
}
console.log(`\nTotal: ${totalChanged} archivos migrados, ${totalSkipped} skipped`);

function splitTopLevelCommas(body) {
  const result = [];
  let depth = 0;
  let cur = '';
  let inStr = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      cur += c;
      if (c === inStr && body[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; cur += c; continue; }
    if (c === ')' || c === ']' || c === '}') { depth--; cur += c; continue; }
    if (c === ',' && depth === 0) { result.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) result.push(cur);
  return result;
}

function parseAttrBody(body) {
  // Quita saltos de linea redundantes, mantiene formato TS legible.
  // Quita atributos text-anchor que buildTextWithTspans setea automaticamente.
  const cleaned = body
    .replace(/\b'text-anchor'\s*:\s*['"][^'"]*['"]\s*,?\s*/g, '')
    .replace(/^\s*\/\/.*$/gm, '') // remove line comments
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/,\s*$/, ''); // trailing comma
  return cleaned;
}

function findMatchingParen(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === '(') depth++;
    if (s[i] === ')') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
