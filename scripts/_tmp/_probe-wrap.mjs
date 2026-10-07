// Prueba si el carril gutter (approach-only) es legal para ContaPyme→conversacion.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathIllegal, pathHugsBoxes, pathPoints } from '../../src/components/diagrams/component-pack.ts';
import {
  computeComponentLayout,
  resolveComponentSpec,
} from '../../src/components/diagrams/component-spec.ts';

const LAB = join(dirname(fileURLToPath(import.meta.url)), '../../labs/iss-ayudascpia-componentes');
const payload = JSON.parse(readFileSync(join(LAB, 'payload.json'), 'utf8'));
const resolved = resolveComponentSpec(structuredClone(payload));
const spec = computeComponentLayout(resolved);

const e = spec.edges.find((x) => x.from === 'app-soporte' && x.to === 'grp-conversacion');
console.log('current', e?.path);
console.log('from/to', e?.fromX, e?.fromY, e?.toX, e?.toY);

// Simula rail en gutter
const fromPt = { x: e.fromX, y: e.fromY };
const toPt = { x: e.toX, y: e.toY };
const stem = { x: fromPt.x + 40, y: fromPt.y };
const railX = 800;
const cand = [fromPt, stem, { x: railX, y: stem.y }, { x: railX, y: toPt.y }, toPt];
const comps = spec.components;
const ifaces = spec.interfaces.filter((i) => i.cx > 0);
const PORT_CLEARANCE = 32;
const LOLLI_R = 5;
const LOLLI_GAP = 7;
const SHIELD = 320;
const pad = Math.max(PORT_CLEARANCE, LOLLI_R + LOLLI_GAP + LOLLI_R + 10);
function glyph(i) {
  return { id: `ring-${i.id}`, x: i.cx - pad, y: i.cy - pad, w: pad * 2, h: pad * 2 };
}
function assembly(i, c) {
  const id = `ring-${i.id}`;
  const onLeft = Math.abs(i.cx - c.x) <= 2;
  const onRight = Math.abs(i.cx - (c.x + c.w)) <= 2;
  if (onLeft) {
    const left = i.cx - SHIELD;
    const right = c.x + 4;
    return { id, x: left, y: i.cy - pad, w: Math.max(pad, right - left), h: pad * 2 };
  }
  if (onRight) {
    const left = c.x + c.w - 4;
    const right = i.cx + SHIELD;
    return { id, x: left, y: i.cy - pad, w: Math.max(pad, right - left), h: pad * 2 };
  }
  return glyph(i);
}
const by = new Map(comps.map((c) => [c.id, c]));
const walls = [];
const approach = [];
for (const i of ifaces) {
  if (i.id === e.fromInterface || i.id === e.toInterface) continue;
  if (i.docked) continue;
  const same = i.component === e.from || i.component === e.to;
  const shield = !same && i.kind === 'provided';
  if (!shield) { walls.push(glyph(i)); continue; }
  const r = assembly(i, by.get(i.component));
  walls.push(r);
  approach.push(r);
}
const allWalls = [...comps, ...walls];
console.log('approach minX', Math.min(...approach.map((r) => r.x)), 'count', approach.length);
for (const r of approach.sort((a, b) => a.x - b.x).slice(0, 8)) {
  console.log('  ', r.id, 'x', r.x, 'w', r.w, 'y', r.y);
}
// Qué ring hace ilegal el cand?
for (const r of walls) {
  if (pathIllegal(cand, [r, ...comps.filter((c) => c.id === e.from || c.id === e.to)], e.from, e.to, 22)) {
    console.log('hits', r.id, r);
    break;
  }
}
console.log('cand illegal', pathIllegal(cand, allWalls, e.from, e.to, 22));
console.log('cand hugs', pathHugsBoxes(cand, allWalls, e.from, e.to, 22));
console.log('kinds sample', ifaces.filter((i) => i.kind === 'required').length, 'req /', ifaces.length);
