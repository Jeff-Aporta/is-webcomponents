import { pathIllegal, pathPoints } from '../../src/components/diagrams/component-pack.ts';

const ring = { id: 'ring-mensaje', x: 1147 - 320, y: 673.5 - 32, w: 320 + 100, h: 64 };
const d = 'M664,892 L944,892 L944,436.5 L1147,436.5';
const pts = pathPoints(d);
console.log('ring', ring);
console.log('illegal', pathIllegal(pts, [ring], 'app-soporte', 'grp-conversacion', 22));
for (let i = 0; i < pts.length - 1; i++) {
  const a = pts[i];
  const b = pts[i + 1];
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const inside = mx > ring.x && mx < ring.x + ring.w && my > ring.y && my < ring.y + ring.h;
  console.log('seg', i, JSON.stringify(a), '->', JSON.stringify(b), 'mid', mx, my, 'inside', inside);
}
