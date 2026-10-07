// Probe: which edge paths pierce component interiors
import { readFile } from 'node:fs/promises';
import { pathIllegal, pathHugsBoxes, pathPoints } from '../../src/components/diagrams/component-pack.ts';

const svg = await readFile('labs/iss-ayudascpia-componentes/out/componentes.svg', 'utf8');
const comps = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)]
  .map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }))
  .filter((c) => c.w >= 180 && c.h >= 50);

// Heuristic ids by stack order in API column (x~820)
const api = comps.filter((c) => c.x >= 800 && c.x <= 900).sort((a, b) => a.y - b.y);
const apps = comps.filter((c) => c.x < 400).sort((a, b) => a.y - b.y);
const db = comps.find((c) => c.w === 180 || (c.x > 1300 && c.x < 1600));
const named = [];
const labels = ['grp-auth', 'grp-conversacion', 'grp-mensaje', 'grp-archivo', 'grp-config', 'grp-ops'];
api.forEach((c, i) => named.push({ ...c, id: labels[i] || `api-${i}` }));
apps.forEach((c, i) => named.push({ ...c, id: i === 0 ? 'app-testpatyia' : 'app-soporte' }));
if (db) named.push({ ...db, id: 'db-pg' });

console.log('named', named.map((c) => `${c.id}@${c.x},${c.y} ${c.w}x${c.h}`).join(' | '));

const paths = [...svg.matchAll(/d="(M[\d., L-]+)"/g)]
  .map((m) => m[1])
  .filter((d) => d.includes(' L') && !d.includes('Z') && !d.includes('A'));

let throughCount = 0;
for (const d of paths) {
  const pts = pathPoints(d);
  if (pts.length < 2) continue;
  const through = [];
  for (const c of named) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (mx > c.x + 1 && mx < c.x + c.w - 1 && my > c.y + 1 && my < c.y + c.h - 1) {
        through.push(`${c.id}@seg${i} mid=(${mx.toFixed(0)},${my.toFixed(0)})`);
        break;
      }
    }
  }
  if (through.length) {
    throughCount++;
    console.log('THROUGH', d.slice(0, 120));
    console.log(' ', through.join(', '));
  }
}
console.log('total through', throughCount);

// ops→db and test→ops checks
const ops = named.find((c) => c.id === 'grp-ops');
const test = named.find((c) => c.id === 'app-testpatyia');
if (ops && test) {
  const toOps = paths.find((d) => d.includes(String(ops.y + ops.h / 2)) || /1285|12\d\d\.5/.test(d) && d.startsWith('M360'));
  const fromOps = paths.find((d) => d.startsWith(`M${ops.x + ops.w},`) || d.startsWith('M1200,'));
  for (const [label, d, fr, to] of [
    ['test→ops?', toOps, 'app-testpatyia', 'grp-ops'],
    ['right-exits sample', paths.find((p) => p.startsWith('M1200,1285') || p.includes('1285.5') && p.startsWith('M1200')), 'grp-ops', 'db-pg'],
  ]) {
    if (!d) { console.log(label, 'missing'); continue; }
    const pts = pathPoints(d);
    console.log(label, d.slice(0, 100));
    console.log('  illegal', pathIllegal(pts, named, fr, to, 20));
    console.log('  hugs', pathHugsBoxes(pts, named, fr, to, 20));
  }
}
