import { readFileSync } from 'node:fs';
import {
  computeComponentLayout,
  resolveComponentSpec,
} from '../../src/components/diagrams/component-spec.ts';

const p = JSON.parse(readFileSync('labs/iss-ayudascpia-componentes/payload.json', 'utf8'));
const spec = computeComponentLayout(resolveComponentSpec(structuredClone(p)));
const i = spec.interfaces.find((x) => x.id === 'if-e-2-req');
const c = spec.components.find((x) => x.id === i?.component);
console.log({ iface: i, comp: c && { id: c.id, x: c.x, y: c.y, w: c.w, h: c.h } });
const provided = spec.interfaces.filter((x) => x.kind === 'provided' && x.cx > 0);
console.log('provided ids', provided.map((x) => x.id));
