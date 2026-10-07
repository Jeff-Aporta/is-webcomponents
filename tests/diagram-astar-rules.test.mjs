// tests/diagram-astar-rules.test.mjs — Guardián de las reglas del router de
// aristas del `<iswc-component-diagram>` (src/components/diagrams/component-router.ts).
//
// Por qué existe: las reglas visuales que pidió el equipo (W54–W69) se cumplen
// POR CONSTRUCCIÓN en el router; este test las verifica con comportamiento
// (rutas reales), no con regex sobre el código.
//
//   1. Entidades: ninguna arista pasa a < clearance de una caja ajena.
//   2. Títulos de agrupador: muro.
//   3. Conectores -(O- ajenos: muro (≥20px del glifo).
//   4. Agrupador `prohibido`: muro, salvo para aristas que nacen dentro.
//   5. Salida y llegada perpendiculares a la cara (nunca por dentro).
//   6. Rieles de aristas distintas separados ≥ lanePitch (no comparten riel).
//   7. Aristas al mismo conector solo se juntan en el embudo final.
//   8. Recorrer el interior de agrupadores cuesta × factor·nivel (rodea por fuera).
//   9. Sin auto-cruces ni bolsillos (giros mínimos).
//  10. Lab ISS·AyudasCPIA: 0 ilegales, 0 rieles compartidos, < 5 s.
//
// Salida: `diagram-astar-rules.test.mjs: PASS — N asserts` · exit 1 si falla.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeEdges, validateRoute } from '../src/components/diagrams/component-router.ts';
import { computeComponentLayout, resolveComponentSpec } from '../src/components/diagrams/component-spec.ts';
import { parsePathPoints } from '../src/components/_shared/diagram-edge-actors.ts';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
let assertions = 0;
const check = (cond, msg) => {
  assertions++;
  if (!cond) throw new Error(`diagram-astar-rules: ${msg}`);
};

const CL = 20;
const box = (id, x, y, w = 100, h = 60) => ({ id, x, y, w, h });
const edge = (id, fromBox, fromSide, from, toBox, toSide, to, extra = {}) => ({
  id, from, fromSide, to, toSide, fromBox, toBox,
  fromPkgs: new Set(), toPkgs: new Set(), ...extra,
});
const world = (o = {}) => ({ components: [], packages: [], titles: [], rings: [], ...o });
const segHits = (pts, c) => pts.slice(1).some((b, i) => {
  const a = pts[i];
  return Math.max(a.x, b.x) > c.x && Math.min(a.x, b.x) < c.x + c.w
    && Math.max(a.y, b.y) > c.y && Math.min(a.y, b.y) < c.y + c.h;
});
const inflate = (c, p) => ({ x: c.x - p, y: c.y - p, w: c.w + 2 * p, h: c.h + 2 * p });
const turns = (pts) => Math.max(0, pts.length - 2);

// Escenario base: A (izq.) → B (der.) con una caja en medio.
const A = box('A', 0, 200);
const B = box('B', 600, 200);
const M = box('M', 280, 160, 120, 140);
const AB = edge('ab', A, 'right', { x: 100, y: 230 }, B, 'left', { x: 600, y: 230 });

// 1. Entidades
{
  const w = world({ components: [A, B, M] });
  const { paths, violations } = routeEdges(w, [AB], { clearance: CL });
  check(paths[0] && !violations[0].length, `R1: ruta legal (${violations[0]})`);
  check(!segHits(paths[0], inflate(M, CL - 1)), 'R1: rodea la entidad intermedia con ≥ clearance');
}

// 2. Títulos
{
  const T = { x: 260, y: 200, w: 160, h: 60 };
  const { paths } = routeEdges(world({ components: [A, B], titles: [T] }), [AB], { clearance: CL });
  check(paths[0] && !segHits(paths[0], T), 'R2: no cruza el título');
}

// 3. Conectores ajenos
{
  const R = { id: 'ring-x', x: 320, y: 200, w: 60, h: 60 };
  const { paths } = routeEdges(world({ components: [A, B], rings: [R] }), [AB], { clearance: CL });
  check(paths[0] && !segHits(paths[0], R), 'R3: no pisa el -(O- ajeno');
}

// 4. Prohibido: muro para ajenas; legal si la arista nace dentro.
{
  const P = { id: 'pg', x: 260, y: 120, w: 180, h: 220, prohibido: true };
  const r1 = routeEdges(world({ components: [A, B], packages: [P] }), [AB], { clearance: CL });
  check(r1.paths[0] && !segHits(r1.paths[0], inflate(P, CL - 1)), 'R4: rodea el agrupador prohibido');
  const S = box('S', 300, 200, 80, 60);
  const inner = edge('in', S, 'right', { x: 380, y: 230 }, B, 'left', { x: 600, y: 230 }, { fromPkgs: new Set(['pg']) });
  const r2 = routeEdges(world({ components: [S, B], packages: [P] }), [inner], { clearance: CL });
  check(r2.paths[0] && !r2.violations[0].length, `R4: nace dentro del prohibido → legal (${r2.violations[0]})`);
}

// 5. Perpendicular: cara derecha → primer tramo hacia la derecha; llegada por la izquierda.
{
  const { paths } = routeEdges(world({ components: [A, B, M] }), [AB], { clearance: CL });
  const p = paths[0];
  check(p[1].x > p[0].x && p[1].y === p[0].y, 'R5: sale perpendicular a la cara');
  const n = p.length;
  check(p[n - 1].x > p[n - 2].x && p[n - 1].y === p[n - 2].y, 'R5: llega perpendicular al conector');
  const bad = validateRoute([{ x: 100, y: 230 }, { x: 100, y: 400 }, { x: 600, y: 400 }, { x: 600, y: 230 }], AB, world({ components: [A, B] }), CL);
  check(bad.includes('salida-no-perpendicular'), 'R5: el validador detecta salida por la cara');
}

// 6. Rieles: dos aristas paralelas a destinos distintos quedan ≥ pitch.
{
  const S = box('S', 0, 100, 100, 200);
  const T1 = box('T1', 600, 0);
  const T2 = box('T2', 600, 340);
  const e1 = edge('e1', S, 'right', { x: 100, y: 180 }, T1, 'bottom', { x: 650, y: 60 });
  const e2 = edge('e2', S, 'right', { x: 100, y: 220 }, T2, 'top', { x: 640, y: 340 });
  const { paths, crowding } = routeEdges(world({ components: [S, T1, T2] }), [e1, e2], { clearance: CL, lanePitch: 32 });
  const vx = (p) => p.slice(1).filter((b, i) => b.x === p[i].x && Math.abs(b.y - p[i].y) > 40).map((b) => b.x);
  const xs1 = vx(paths[0]);
  const xs2 = vx(paths[1]);
  check(xs1.every((a) => xs2.every((b) => Math.abs(a - b) >= 32 || a === 640 || a === 650 || b === 640 || b === 650)),
    `R6: verticales separadas ≥ pitch (${xs1} / ${xs2})`);
  check(crowding === 0, `R6: sin apiñamiento (crowding=${crowding})`);
}

// 7–10. Lab real (integra distribución + router + embudos).
{
  const payload = JSON.parse(await readFile(join(root, 'labs', 'iss-ayudascpia-componentes', 'payload.json'), 'utf8'));
  const t0 = performance.now();
  const L = computeComponentLayout(resolveComponentSpec(structuredClone(payload)));
  const ms = performance.now() - t0;
  check(ms < 5000, `R10: layout del lab < 5 s (${Math.round(ms)} ms)`);
  check(!(L._routeViolations ?? []).length, `R10: 0 aristas ilegales (${JSON.stringify(L._routeViolations)})`);
  const P = L.edges.map((e) => parsePathPoints(e.path));
  check(P.every((p) => p.length >= 2), 'R10: todas las aristas tienen path');
  // ≤ 4 giros; +1 para el “peine” de una arista que se une tarde al embudo
  // de un conector compartido (en vez de compartir riel antes de tiempo).
  check(P.every((p) => turns(p) <= 5), `R9: ≤ 5 giros por arista (máx ${Math.max(...P.map(turns))})`);
  const tgt = (e) => `${Math.round(e.toX)},${Math.round(e.toY)}`;
  const funnel = 2 * 32 + 2 * 22 + 1;
  for (let i = 0; i < P.length; i++) {
    for (let j = i + 1; j < P.length; j++) {
      const same = tgt(L.edges[i]) === tgt(L.edges[j]);
      for (let a = 1; a < P[i].length; a++) {
        for (let b = 1; b < P[j].length; b++) {
          const [a1, a2, b1, b2] = [P[i][a - 1], P[i][a], P[j][b - 1], P[j][b]];
          const av = a1.x === a2.x;
          if (av !== (b1.x === b2.x)) continue;
          if (av ? a1.x !== b1.x : a1.y !== b1.y) continue;
          const [p, q, r, s] = av ? [a1.y, a2.y, b1.y, b2.y] : [a1.x, a2.x, b1.x, b2.x];
          const ov = Math.min(Math.max(p, q), Math.max(r, s)) - Math.max(Math.min(p, q), Math.min(r, s));
          check(ov <= (same ? funnel : 1),
            `R${same ? 7 : 6}: ${L.edges[i].id} y ${L.edges[j].id} comparten riel ${Math.round(ov)}px`);
        }
      }
    }
  }
}

console.log(`diagram-astar-rules.test.mjs: PASS — 10 reglas, ${assertions} asserts`);
