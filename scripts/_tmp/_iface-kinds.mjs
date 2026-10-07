import { readFileSync } from 'node:fs';
import { resolveComponentSpec } from '../../src/components/diagrams/component-spec.ts';

const p = JSON.parse(readFileSync('labs/iss-ayudascpia-componentes/payload.json', 'utf8'));
const r = resolveComponentSpec(structuredClone(p));
const by = {};
for (const i of r.interfaces) {
  const k = `${i.component}:${i.kind}:${i.side}`;
  by[k] = (by[k] || 0) + 1;
}
console.log(by);
console.log(
  'apps',
  r.interfaces
    .filter((i) => String(i.component).startsWith('app-'))
    .map((i) => ({ id: i.id, kind: i.kind, side: i.side, cx: i.cx, cy: i.cy })),
);
console.log(
  'api-leftish',
  r.interfaces
    .filter((i) => String(i.component).startsWith('grp-') && i.kind === 'required')
    .map((i) => ({ id: i.id, side: i.side, cx: i.cx, cy: i.cy })),
);
