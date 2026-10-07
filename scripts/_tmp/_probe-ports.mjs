import { readFileSync } from 'node:fs';
import {
  computeComponentLayout,
  resolveComponentSpec,
} from '../../src/components/diagrams/component-spec.ts';

const p = JSON.parse(readFileSync('labs/iss-ayudascpia-componentes/payload.json', 'utf8'));
const spec = computeComponentLayout(resolveComponentSpec(structuredClone(p)));
const by = new Map(spec.components.map((c) => [c.id, c]));

for (const id of [
  'if-grp-mensaje-tiquete-prv',
  'if-grp-conversacion-prv',
  'if-e-1-req',
  'if-e-7-req',
]) {
  const i = spec.interfaces.find((x) => x.id === id);
  if (!i) { console.log(id, 'MISSING'); continue; }
  const c = by.get(i.component);
  console.log(id, {
    kind: i.kind,
    docked: i.docked,
    side: i.side,
    cx: i.cx,
    cy: i.cy,
    comp: c && { id: c.id, x: c.x, w: c.w, right: c.x + c.w },
    dLeft: c ? Math.abs((i.cx ?? 0) - c.x) : null,
    dRight: c ? Math.abs((i.cx ?? 0) - (c.x + c.w)) : null,
  });
}

const e = spec.edges.find((x) => x.from === 'app-soporte' && x.to === 'grp-conversacion');
console.log('edge', { path: e?.path, fromIf: e?.fromInterface, toIf: e?.toInterface });
