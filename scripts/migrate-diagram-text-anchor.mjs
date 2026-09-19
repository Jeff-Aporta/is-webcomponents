// scripts/migrate-diagram-text-anchor.mjs
// Migra los callsites de buildTspans para que el <text> element reciba
// text-anchor correcto via buildTextWithTspans.
//
// Patron actual:
//   const t = svgEl('text', { ...baseAttrs });
//   const tspans = buildTspans(lines, boxX, boxY, boxW, _boxH, anchor, fs, lh);
//   for (const span of tspans) { ... t.appendChild(ts); }
//   g.appendChild(t);
//
// Patron nuevo:
//   const built = buildTextWithTspans({ lines, boxX, boxY, boxW, _boxH,
//     textAnchor: anchor, fontSize: fs, lineHeight: lh, baseAttrs });
//   for (const span of built.tspans) { ... built.text.appendChild(ts); }
//   g.appendChild(built.text);
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'src/components/diagrams';
const files = [
  'er-diagram.ts',
  'block-diagram.ts',
  'class-diagram.ts',
  'gantt.ts',
  'journey-map.ts',
  'flowchart.ts',
  'mindmap.ts',
  'sankey-diagram.ts',
  'state-diagram.ts',
  'sequence-diagram.ts',
  'use-case-diagram.ts',
  'venn-diagram.ts',
];

let totalChanged = 0;
for (const f of files) {
  const path = `${ROOT}/${f}`;
  let src = readFileSync(path, 'utf8');
  const original = src;
  if (!src.includes('buildTspans')) continue;

  // Add buildTextWithTspans to import if not present.
  if (src.includes('import { wrapText, buildTspans }')) {
    src = src.replace(/import \{ wrapText, buildTspans \}/, 'import { wrapText, buildTspans, buildTextWithTspans }');
  } else if (src.includes('import { wrapText, buildTspans as ')) {
    // aliased import -- leave it
  } else if (src.includes('buildTspans, buildTextWithTspans')) {
    // already imported
  } else if (/import.*buildTspans/.test(src)) {
    // generic — add buildTextWithTspans to the same import
    src = src.replace(/(import\s*\{[^}]*\bbuildTspans\b[^}]*\}\s*from\s*['"][^'"]+['"])/, (m) => {
      if (m.includes('buildTextWithTspans')) return m;
      return m.replace('buildTspans', 'buildTspans, buildTextWithTspans');
    });
  }

  // Apply transformation only where buildTspans is followed by a tspan-building loop.
  // Heuristic: replace `buildTspans(<args>)` with `buildTextWithTspans({ ... })` shape.
  // We rely on each callsite being unique. We do a single regex pass per file.
  // Pattern: buildTspans(\n            ARG,\n            ARG,\n            ARG,\n            ARG,\n            'ANCHOR',\n            ARG,\n            ARG,\n          )
  const re = /buildTspans\(\s*([\s\S]+?)\)/g;
  src = src.replace(re, (_m, body) => {
    // body looks like: lines,\n  boxX, boxY, boxW, _boxH,\n  'middle', 10.5, 1.2,
    const parts = body.split(',').map(s => s.trim());
    if (parts.length < 8) return `buildTspans(${body})`; // shape unknown; skip
    const [lines, boxX, boxY, boxW, _boxH, anchor, fontSize, lineHeight] = parts;
    return `buildTextWithTspans({\n            lines: ${lines},\n            boxX: ${boxX}, boxY: ${boxY}, boxW: ${boxW}, _boxH: ${_boxH},\n            textAnchor: ${anchor},\n            fontSize: ${fontSize}, lineHeight: ${lineHeight},\n          })`;
  });

  // Now the variable that held the buildTspans return (e.g. `swtspans`) is now
  // `built.tspans`. We need to rename the iterator variable.
  // Most callers do: `for (const span of XXX) { ... }` where XXX was `buildTspans(...)`.
  // After our change, XXX is `buildTextWithTspans({...})` and accessing `.tspans` is required.
  // Find `for (const span of XXX)` where XXX was previously `buildTspans(...)`.
  // Simpler: rename any `const XYZ = buildTspans(` to `const built = buildTspans(` ONLY
  // in legacy callers (which we want to migrate to buildTextWithTspans).
  // Since we changed the function calls, those variables are now bound to `buildTextWithTspans({...})`,
  // and the iteration variable access is `built.tspans`. We need to update each callsite's
  // `for (const span of XYZ)` and `XYZ.appendChild(...)` patterns.
  // Find callsites where we now have `const XXX = buildTextWithTspans({` and update.
  src = src.replace(/const (\w+) = buildTextWithTspans\(\{/g, (m, name) => {
    if (name === 'built') return m;
    return `const built = buildTextWithTspans({ /* ${name} */`;
  });

  // Also need to keep the variable references in tspan iteration and t.appendChild.
  // Existing pattern: `for (const span of ${name}) { ... ${name}.appendChild(ts) ... }`.
  // After migration, we need `for (const span of built.tspans) { ... built.text.appendChild(ts) ... }`.
  src = src.replace(/for \(const span of (\w+)\) \{[\s\S]*?\1\.appendChild\(([^)]+)\);[\s\S]*?\}/g, (m, varName, arg) => {
    if (varName !== 'built') return m; // already correctly using built
    return `for (const span of built.tspans) { ${arg}; built.text.appendChild(ts); }`;
  });

  // Sometimes the pattern uses `XYZ` inside a tspan build:
  //   const ts = svgEl('tspan', { x: span.x, y: span.y, ... });
  //   ts.textContent = span.text;
  //   XYZ.appendChild(ts);
  // We handle the simpler case (above regex catches the canonical pattern).
  // For edge cases with named intermediate vars, we leave manual fix.

  if (src !== original) {
    writeFileSync(path, src);
    console.log(`OK ${f}`);
    totalChanged++;
  } else {
    console.log(`-- ${f} (sin cambios)`);
  }
}
console.log(`\nTotal: ${totalChanged}/${files.length} archivos migrados`);
