import { pathIllegal, pathPoints, rutaChoca } from '../../src/components/diagrams/component-pack.ts';

const ring = { id: 'ring-msg', x: 442, y: 641.5, w: 382, h: 64 };
const d = 'M360,652 L382,652 L382,616 L462,616 L462,436.5 L793,436.5';
const pts = pathPoints(d);
console.log('pts', pts);
console.log('pathIllegal', pathIllegal(pts, [ring], 'a', 'b', 22));
console.log('rutaChoca', rutaChoca(pts, [ring]));

// mid of vertical seg
const a = { x: 462, y: 616 };
const b = { x: 462, y: 436.5 };
const mx = (a.x + b.x) / 2;
const my = (a.y + b.y) / 2;
console.log('mid', mx, my, 'inside',
  mx > ring.x && mx < ring.x + ring.w && my > ring.y && my < ring.y + ring.h);

// sample points on vertical
for (const y of [650, 660, 673, 700]) {
  const inside = 462 > ring.x && 462 < ring.x + ring.w && y > ring.y && y < ring.y + ring.h;
  console.log('y', y, 'inside', inside);
}
