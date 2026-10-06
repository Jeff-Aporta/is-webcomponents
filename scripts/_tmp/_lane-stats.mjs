import { readFileSync } from 'fs';
const s = readFileSync('labs/iss-ayudascpia-componentes/out/componentes.svg', 'utf8');
const paths = [];
for (const m of s.matchAll(/<path\b([^>]*)>/g)) {
  const attrs = m[1];
  if (!attrs.includes('cd-edge__path')) continue;
  const dm = attrs.match(/\bd="([^"]+)"/);
  if (dm) paths.push(dm[1]);
}
console.log('edges', paths.length);
const verts = new Map();
for (const d of paths) {
  const pts = [];
  for (const pm of d.matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g)) {
    pts.push({ x: Number(pm[1]), y: Number(pm[2]) });
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (Math.abs(a.x - b.x) < 0.6 && Math.abs(a.y - b.y) > 20) {
      const x = Math.round(a.x);
      verts.set(x, (verts.get(x) || 0) + 1);
    }
  }
}
const ranked = [...verts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
console.log('vertical lanes (x -> count):', ranked);
console.log('unique vertical xs:', ranked.length);
console.log('max share on one x:', ranked[0]?.[1] ?? 0);
console.log('sample:', paths.slice(0, 8));
