import { readFileSync } from 'node:fs';
import {
  computeComponentLayout,
  resolveComponentSpec,
} from '../../src/components/diagrams/component-spec.ts';
import { RECEIVER_COLOR } from '../../src/components/_shared/diagram-edge-style.ts';

const p = JSON.parse(readFileSync('labs/iss-ayudascpia-componentes/payload.json', 'utf8'));
const spec = computeComponentLayout(resolveComponentSpec(structuredClone(p)));
const deg = new Map(spec.components.map((c) => [c.id, 0]));
for (const e of spec.edges) {
  deg.set(e.from, (deg.get(e.from) ?? 0) + 1);
  deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
}
console.log('RECEIVER_COLOR', RECEIVER_COLOR);
for (const c of spec.components) {
  console.log(c.id, 'deg', deg.get(c.id), 'color', (c).color);
}
