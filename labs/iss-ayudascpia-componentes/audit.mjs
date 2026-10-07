// labs/iss-ayudascpia-componentes/audit.mjs
// Audita el ruteo de aristas SIN navegador: layout + reglas duras + métricas.
// Uso: deno run -A --no-check labs/iss-ayudascpia-componentes/audit.mjs [payload.json]
// Exit 1 si alguna arista viola una regla dura o comparte riel con otra.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeComponentLayout,
  resolveComponentSpec,
} from '../../src/components/diagrams/component-spec.ts';
import { parsePathPoints } from '../../src/components/_shared/diagram-edge-actors.ts';

const LAB = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || 'payload.json';
const payload = JSON.parse(readFileSync(join(LAB, file), 'utf8'));

const t0 = performance.now();
const spec = resolveComponentSpec(structuredClone(payload));
const layout = computeComponentLayout(spec);
const ms = Math.round(performance.now() - t0);

const PITCH = Number(payload.componentDiagram?.layout?.lanePitch) || 20;
const segs = (e) => {
  const p = parsePathPoints(e.path);
  const out = [];
  for (let i = 1; i < p.length; i++) out.push([p[i - 1], p[i]]);
  return out;
};
const target = (e) => `${Math.round(e.toX)},${Math.round(e.toY)}`;
const turns = (e) => Math.max(0, parsePathPoints(e.path).length - 2);

// Rieles: tramos paralelos de aristas con distinto destino a < PITCH con
// solape en su eje (overlap = distancia 0 = mismo riel).
let shared = 0;
let near = 0;
let crosses = 0;
const report = [];
const E = layout.edges;
for (let i = 0; i < E.length; i++) {
  for (let j = i + 1; j < E.length; j++) {
    if (target(E[i]) === target(E[j])) continue;
    for (const [a1, a2] of segs(E[i])) {
      for (const [b1, b2] of segs(E[j])) {
        const av = Math.abs(a1.x - a2.x) < 0.5;
        const bv = Math.abs(b1.x - b2.x) < 0.5;
        if (av === bv) {
          const [p, q, r, s, d] = av
            ? [a1.y, a2.y, b1.y, b2.y, Math.abs(a1.x - b1.x)]
            : [a1.x, a2.x, b1.x, b2.x, Math.abs(a1.y - b1.y)];
          const ov = Math.min(Math.max(p, q), Math.max(r, s)) - Math.max(Math.min(p, q), Math.min(r, s));
          if (ov <= 4 || d >= PITCH) continue;
          if (d < 1) { shared++; report.push(`RIEL COMPARTIDO ${E[i].id} ~ ${E[j].id} (${Math.round(ov)}px)`); }
          else { near++; report.push(`riel cercano ${E[i].id} ~ ${E[j].id} a ${d}px (${Math.round(ov)}px)`); }
        } else {
          const [v1, v2, h1, h2] = av ? [a1, a2, b1, b2] : [b1, b2, a1, a2];
          const x = v1.x;
          const y = h1.y;
          if (x > Math.min(h1.x, h2.x) && x < Math.max(h1.x, h2.x)
            && y > Math.min(v1.y, v2.y) && y < Math.max(v1.y, v2.y)) crosses++;
        }
      }
    }
  }
}

const bad = layout._routeViolations ?? [];
for (const v of bad) report.unshift(`ILEGAL ${v.id}: ${v.rules.join(', ')}`);
console.log(report.join('\n'));
console.log(`\n${file}: ${E.length} aristas · ${ms} ms · ilegales ${bad.length} · rieles compartidos ${shared} · cercanos(<${PITCH}px) ${near} · cruces ${crosses} · giros máx ${Math.max(...E.map(turns))}`);
process.exit(bad.length || shared ? 1 : 0);
