import { computeComponentLayout, resolveComponentSpec } from '../src/components/diagrams/component-spec.js';
import { placeEdgeActors, pointAtFraction, parsePathPoints } from '../src/components/_shared/diagram-edge-actors.js';
import { spreadOrthogonalPaths } from '../src/components/_shared/diagram-edge-spread.js';

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const boxes = [
  { x: 20, y: 40, w: 160, h: 80 },
  { x: 360, y: 40, w: 200, h: 80 },
  { x: 360, y: 160, w: 200, h: 80 },
];
const edges = [
  {
    label: 'portal-login',
    path: 'M180,80 L360,80',
    fromX: 180, fromY: 80, toX: 360, toY: 80,
  },
  {
    label: 'CRUD, logs, mcp-session',
    path: 'M180,80 L270,80 L270,200 L360,200',
    fromX: 180, fromY: 80, toX: 360, toY: 200,
  },
  {
    label: 'insertar',
    path: 'M180,80 L250,80 L250,200 L360,200',
    fromX: 180, fromY: 80, toX: 360, toY: 200,
  },
];
const placed = placeEdgeActors({
  edges,
  obstacles: boxes,
  canvas: { width: 640, height: 320 },
});
check(placed.actors.length === 3, `se esperaban 3 actores; salieron ${placed.actors.length}`);
for (let i = 0; i < placed.actors.length; i++) {
  const a = placed.actors[i];
  for (const b of boxes) {
    check(!overlap(a, b), `actor ${i} pisa una caja (${JSON.stringify(a)})`);
  }
  for (let j = i + 1; j < placed.actors.length; j++) {
    check(!overlap(a, placed.actors[j]), `actores ${i} y ${j} se pisan`);
  }
}

const spec = resolveComponentSpec({
  componentDiagram: {
    components: [
      {
        id: 'a', name: 'Portal', x: 20, y: 40, w: 160, h: 70,
        items: ['GET /api/is-swagger'],
      },
      {
        id: 'b', name: 'auth', x: 360, y: 40, w: 220, h: 90,
        items: ['POST /api/jwt', 'POST /api/auth/portal-login'],
      },
    ],
    edges: [{ from: 'a', to: 'b', label: 'portal-login', kind: 'dependency' }],
  },
});
const layout = computeComponentLayout(spec);
const auth = layout.components.find((c) => c.id === 'b');
check(auth.itemLines?.length >= 2, 'el cuerpo del componente debe listar los endpoints');
check(layout.edges[0].labelW > 0, 'la arista debe tener geometría de actor (labelW)');
const chip = {
  x: layout.edges[0].labelX - layout.edges[0].labelW / 2,
  y: layout.edges[0].labelY - layout.edges[0].labelH / 2,
  w: layout.edges[0].labelW,
  h: layout.edges[0].labelH,
};
for (const c of layout.components) {
  check(!overlap(chip, { x: c.x, y: c.y, w: c.w, h: c.h }),
    'la chip de arista no puede solapar un componente');
}

{
  const mid = pointAtFraction([{ x: 0, y: 0 }, { x: 100, y: 0 }], 0.5);
  check(Math.abs(mid.x - 50) < 0.5 && Math.abs(mid.y) < 0.5, `50% del path debe ser (50,0); salió (${mid.x},${mid.y})`);

  const libre = [
    { label: 'mitad', path: 'M40,40 L240,40', fromX: 40, fromY: 40, toX: 240, toY: 40 },
  ];
  placeEdgeActors({ edges: libre, obstacles: [], canvas: { width: 400, height: 120 } });
  check(Math.abs(libre[0].labelX - 140) < 24, `la chip debe nacer cerca del 50% (140); x=${libre[0].labelX}`);

  const a = { path: 'M20,20 L20,180 L120,180' };
  const b = { path: 'M20,20 L20,180 L120,180' };
  spreadOrthogonalPaths([a, b], 8);
  const pa = parsePathPoints(a.path);
  const pb = parsePathPoints(b.path);
  check(Math.abs(pa[1].x - pb[1].x) >= 7, `espinas verticales deben separarse; x=${pa[1].x} y ${pb[1].x}`);
}

if (failures.length) {
  console.error('diagram-edge-actors.test.mjs: FAIL');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}
console.log('diagram-edge-actors.test.mjs: PASS');
