// labs/iss-ayudascpia-der/audit.mjs
// Audita el DER sin navegador: layout + reglas duras del router + métricas.
// Uso: deno run -A --no-check labs/iss-ayudascpia-der/audit.mjs
// Exit 1 si alguna relación viola una regla dura o comparte riel con otra.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeErLayout, resolveErSpec } from '../../src/components/diagrams/er-spec.ts';
import { parsePathPoints } from '../../src/components/_shared/diagram-edge-actors.ts';

const LAB = dirname(fileURLToPath(import.meta.url));
const payload = JSON.parse(readFileSync(join(LAB, 'payload.json'), 'utf8'));
const t0 = performance.now();
const L = computeErLayout(resolveErSpec(structuredClone(payload)));
const ms = Math.round(performance.now() - t0);
const PITCH = 24;
const P = L.relations.map((r) => parsePathPoints(r.path));
let shared = 0;
let near = 0;
let crosses = 0;
const report = [];
for (let i = 0; i < P.length; i++) {
  for (let j = i + 1; j < P.length; j++) {
    for (let a = 1; a < P[i].length; a++) {
      for (let b = 1; b < P[j].length; b++) {
        const [a1, a2, b1, b2] = [P[i][a - 1], P[i][a], P[j][b - 1], P[j][b]];
        const av = Math.abs(a1.x - a2.x) < 0.5;
        const bv = Math.abs(b1.x - b2.x) < 0.5;
        if (av === bv) {
          const d = av ? Math.abs(a1.x - b1.x) : Math.abs(a1.y - b1.y);
          const [p, q, r, s] = av ? [a1.y, a2.y, b1.y, b2.y] : [a1.x, a2.x, b1.x, b2.x];
          const ov = Math.min(Math.max(p, q), Math.max(r, s)) - Math.max(Math.min(p, q), Math.min(r, s));
          if (ov <= 4 || d >= PITCH) continue;
          if (d < 1) { shared++; report.push(`RIEL COMPARTIDO ${L.relations[i].id} ~ ${L.relations[j].id} (${Math.round(ov)}px)`); }
          else { near++; report.push(`riel cercano ${L.relations[i].id} ~ ${L.relations[j].id} a ${d}px`); }
        } else {
          const [v1, v2, h1, h2] = av ? [a1, a2, b1, b2] : [b1, b2, a1, a2];
          if (v1.x > Math.min(h1.x, h2.x) && v1.x < Math.max(h1.x, h2.x)
            && h1.y > Math.min(v1.y, v2.y) && h1.y < Math.max(v1.y, v2.y)) crosses++;
        }
      }
    }
  }
}
const bad = L._routeViolations ?? [];
for (const v of bad) report.unshift(`ILEGAL ${v.id}: ${v.rules.join(', ')}`);
console.log(report.join('\n'));
const turns = (p) => Math.max(0, p.length - 2);
console.log(`\nder: ${P.length} relaciones · ${ms} ms · ${Math.round(L.width)}x${Math.round(L.height)} · ilegales ${bad.length} · rieles compartidos ${shared} · cercanos(<${PITCH}px) ${near} · cruces ${crosses} · giros máx ${Math.max(...P.map(turns))}`);
process.exit(bad.length || shared ? 1 : 0);
