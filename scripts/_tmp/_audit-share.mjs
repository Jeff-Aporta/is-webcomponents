import { readFileSync } from 'node:fs';
import { pathPoints, pathShareLen, segsFromPath } from '../../src/components/diagrams/component-pack.ts';
import {
  computeComponentLayout,
  resolveComponentSpec,
} from '../../src/components/diagrams/component-spec.ts';

const p = JSON.parse(readFileSync('labs/iss-ayudascpia-componentes/payload.json', 'utf8'));
const spec = computeComponentLayout(resolveComponentSpec(structuredClone(p)));
const pitch = 32;
let pairs = 0;
for (let i = 0; i < spec.edges.length; i++) {
  const a = pathPoints(spec.edges[i].path);
  const segs = segsFromPath(a);
  for (let j = i + 1; j < spec.edges.length; j++) {
    const b = pathPoints(spec.edges[j].path);
    const share = pathShareLen(b, segs, pitch * 0.5);
    if (share > pitch) {
      pairs++;
      console.log(
        'SHARE',
        Math.round(share),
        spec.edges[i].from,
        '→',
        spec.edges[i].to,
        '|',
        spec.edges[j].from,
        '→',
        spec.edges[j].to,
      );
    }
  }
}
console.log('shared pairs', pairs);
for (const e of spec.edges) {
  if (e.from.startsWith('app-') || e.to === 'db-pg') {
    console.log(e.from, '→', e.to, e.path);
  }
}
