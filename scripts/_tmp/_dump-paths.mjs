import { readFileSync } from 'node:fs';
import { pathIllegal, pathPoints } from '../../src/components/diagrams/component-pack.ts';
import {
  computeComponentLayout,
  resolveComponentSpec,
} from '../../src/components/diagrams/component-spec.ts';

const p = JSON.parse(readFileSync('labs/iss-ayudascpia-componentes/payload.json', 'utf8'));
const spec = computeComponentLayout(resolveComponentSpec(structuredClone(p)));
const svg = readFileSync('labs/iss-ayudascpia-componentes/out/componentes.svg', 'utf8');

for (const e of spec.edges) {
  console.log(`${e.from} → ${e.to}: ${e.path}`);
}

// Anillo provided mensaje
const msg = spec.interfaces.find((i) => i.id === 'if-grp-mensaje-tiquete-prv');
const comp = spec.components.find((c) => c.id === msg.component);
const ring = {
  id: 'ring-msg',
  x: msg.cx - 320,
  y: msg.cy - 32,
  w: (comp.x + 4) - (msg.cx - 320),
  h: 64,
};
console.log('msg ring', ring, 'comp.x', comp.x, 'cx', msg.cx);

for (const e of spec.edges.filter((x) => x.from.startsWith('app-'))) {
  const pts = pathPoints(e.path);
  console.log(
    e.from,
    '→',
    e.to,
    'vs msg',
    pathIllegal(pts, [ring], e.from, e.to, 22),
  );
}

// Verticales x en SVG
const ds = [...svg.matchAll(/d="(M[^"]+)"/g)].map((m) => m[1]).filter((d) => d.includes(' L') && !d.includes('Z'));
console.log('svg paths:');
for (const d of ds) console.log(' ', d);
