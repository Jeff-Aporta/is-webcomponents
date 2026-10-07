// Audita paths del SVG vs anillos -(O- del layout.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathIllegal, pathPoints } from '../../src/components/diagrams/component-pack.ts';
import {
  computeComponentLayout,
  resolveComponentSpec,
} from '../../src/components/diagrams/component-spec.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const LAB = join(ROOT, 'labs/iss-ayudascpia-componentes');
const payload = JSON.parse(readFileSync(join(LAB, 'payload.json'), 'utf8'));
const svg = readFileSync(join(LAB, 'out/componentes.svg'), 'utf8');

const resolved = resolveComponentSpec(structuredClone(payload));
if (!resolved) throw new Error('resolveComponentSpec null');
const spec = computeComponentLayout(resolved);
const comps = spec.components;
const ifaces = spec.interfaces.filter((i) => i.cx > 0);

// Replica ifaceAssemblyRing (mismo pad/shield que component-spec).
const PORT_CLEARANCE = 32;
const LOLLI_R = 5;
const LOLLI_GAP = 7;
const ASSEMBLY_APPROACH_SHIELD = 320;
const ASSEMBLY_RAIL_KEEP = 40;
function ifaceGlyphRing(iface) {
  const cx = iface.cx ?? 0;
  const cy = iface.cy ?? 0;
  const pad = Math.max(PORT_CLEARANCE, LOLLI_R + LOLLI_GAP + LOLLI_R + 10);
  return { id: `ring-${iface.id}`, x: cx - pad, y: cy - pad, w: pad * 2, h: pad * 2 };
}
function ifaceAssemblyRing(iface, comp) {
  const cx = iface.cx ?? 0;
  const cy = iface.cy ?? 0;
  const pad = Math.max(PORT_CLEARANCE, LOLLI_R + LOLLI_GAP + LOLLI_R + 10);
  const id = `ring-${iface.id}`;
  if (!comp) return ifaceGlyphRing(iface);
  const faceTol = 20; // LOLLI_STEM+2
  const onLeft = Math.abs(cx - comp.x) <= faceTol;
  const onRight = Math.abs(cx - (comp.x + comp.w)) <= faceTol;
  const onTop = Math.abs(cy - comp.y) <= faceTol;
  const onBot = Math.abs(cy - (comp.y + comp.h)) <= faceTol;
  if (onLeft) {
    const left = cx - ASSEMBLY_APPROACH_SHIELD - ASSEMBLY_RAIL_KEEP;
    const right = comp.x + 4;
    return { id, x: left, y: cy - pad, w: Math.max(pad, right - left), h: pad * 2 };
  }
  if (onRight) {
    const left = comp.x + comp.w - 4;
    const right = cx + ASSEMBLY_APPROACH_SHIELD + ASSEMBLY_RAIL_KEEP;
    return { id, x: left, y: cy - pad, w: Math.max(pad, right - left), h: pad * 2 };
  }
  if (onTop) {
    const top = cy - ASSEMBLY_APPROACH_SHIELD;
    const bot = comp.y + 4;
    return { id, x: cx - pad, y: top, w: pad * 2, h: Math.max(pad, bot - top) };
  }
  if (onBot) {
    const top = comp.y + comp.h - 4;
    const bot = cy + ASSEMBLY_APPROACH_SHIELD;
    return { id, x: cx - pad, y: top, w: pad * 2, h: Math.max(pad, bot - top) };
  }
  return ifaceGlyphRing(iface);
}
function ringsForEdge(e, list, byComp) {
  const walls = [];
  for (const i of list) {
    if (!(i.cx > 0) || i.id === e.fromInterface || i.id === e.toInterface) continue;
    if (i.docked) continue;
    const same = i.component === e.from || i.component === e.to;
    const shield = !same && i.kind === 'provided';
    walls.push(shield ? ifaceAssemblyRing(i, byComp.get(i.component)) : ifaceGlyphRing(i));
  }
  return walls;
}

const compById = new Map(comps.map((c) => [c.id, c]));

let bad = 0;
for (const e of spec.edges) {
  const pts = pathPoints(e.path);
  const foreign = ringsForEdge(e, ifaces, compById);
  const walls = [...comps, ...foreign];
  const ill = pathIllegal(pts, walls, e.from, e.to, 22);
  if (!ill) continue;
  bad++;
  const hit = foreign.find((r) => pathIllegal(pts, [r], e.from, e.to, 22));
  // foreign ya es array de walls
  console.log(
    'BAD',
    e.from,
    '→',
    e.to,
    'hit',
    hit?.id,
    'path',
    e.path,
  );
}
console.log('total bad', bad, '/', spec.edges.length);

// Paths en SVG (sin Z = aristas)
const edgeDs = [...svg.matchAll(/d="(M[^"]+)"/g)]
  .map((m) => m[1])
  .filter((d) => d.includes(' L') && !d.includes('Z'));
console.log('svg edge paths', edgeDs.length);
const still944 = edgeDs.filter((d) => /L944,/.test(d) || /M944,/.test(d));
console.log('paths with x=944', still944.length, still944.slice(0, 5));
