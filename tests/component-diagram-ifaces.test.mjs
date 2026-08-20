// tests/component-diagram-ifaces.test.mjs
//
// Guardian del bug de ifaceById en <is-component-diagram> y de la
// síntesis de lollipops: un payload con `links` y sin `interfaces`
// tiene que salir con O/C y path, o el PNG solo enseña cajas.

import { computeComponentLayout, resolveComponentSpec, LOLLI_R, LOLLI_GAP, parseHttpEndpoint } from '../src/components/diagrams/component-spec.js';
import { parsePathPoints } from '../src/components/_shared/diagram-edge-actors.js';
import { COL_GUTTER, EDGE_CLEARANCE, orthoPolysOverlap, pathHasDiagonal, pathIllegal, pathShareLen, pointInOrtho, segsFromPath, segmentoCortaCaja } from '../src/components/diagrams/component-pack.js';

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

const declared = resolveComponentSpec({
  componentDiagram: {
    packages: [
      { id: 'p1', name: 'Pkg', x: 0, y: 0, w: 600, h: 400 },
    ],
    components: [
      { id: 'a', package: 'p1', name: 'A', stereotype: 'component', x: 50, y: 50, w: 200, h: 60 },
      { id: 'b', package: 'p1', name: 'B', stereotype: 'component', x: 350, y: 50, w: 200, h: 60 },
    ],
    interfaces: [
      { id: 'i1', component: 'a', side: 'right', offset: 30, kind: 'provided', name: 'IA' },
      { id: 'i2', component: 'b', side: 'left', offset: 30, kind: 'required', name: 'IB' },
    ],
    edges: [
      { from: 'a', fromInterface: 'i1', to: 'b', toInterface: 'i2', kind: 'dependency' },
    ],
  },
});

check(declared, 'spec declarada no debe ser null');
const layout = computeComponentLayout(declared);

for (const iface of layout.interfaces) {
  check(
    typeof iface.cx === 'number' && Number.isFinite(iface.cx),
    `iface ${iface.id} cx debe ser número finito; salió ${iface.cx}`,
  );
  check(
    typeof iface.cy === 'number' && Number.isFinite(iface.cy),
    `iface ${iface.id} cy debe ser número finito; salió ${iface.cy}`,
  );
  check(
    iface.cx + LOLLI_R <= layout.width,
    `iface ${iface.id} cx=${iface.cx} se sale del ancho ${layout.width}`,
  );
  check(
    iface.cy + LOLLI_R <= layout.height,
    `iface ${iface.id} cy=${iface.cy} se sale del alto ${layout.height}`,
  );
}

for (const e of layout.edges) {
  check(
    e.fromX !== 0 || e.fromY !== 0,
    `edge ${e.id} from cae en (0,0) — bug del ifaceById reintroducido`,
  );
  check(
    e.toX !== 0 || e.toY !== 0,
    `edge ${e.id} to cae en (0,0) — bug del ifaceById reintroducido`,
  );
  check(
    e.path && e.path.startsWith('M'),
    `edge ${e.id} path debe estar formado; salió "${e.path}"`,
  );
  const pts = parsePathPoints(e.path);
  for (const p of pts) {
    check(p.x >= -0.5 && p.y >= -0.5 && p.x <= layout.width + 0.5 && p.y <= layout.height + 0.5,
      `edge ${e.id} vértice (${p.x.toFixed(0)},${p.y.toFixed(0)}) fuera del lienzo ${layout.width}x${layout.height}`);
  }
}

const synthesized = resolveComponentSpec({
  componentDiagram: {
    components: [
      { id: 'gw', label: 'Gateway', x: 40, y: 80, w: 120, h: 54 },
      { id: 'sess', label: 'Sesion', x: 280, y: 80, w: 120, h: 54 },
    ],
    links: [{ from: 'gw', to: 'sess' }],
  },
});

check(synthesized, 'spec sintetizada no debe ser null');
check(synthesized.interfaces.length >= 2, `síntesis: esperaba ≥2 interfaces, salieron ${synthesized.interfaces.length}`);
check(synthesized.edges.length >= 1, `síntesis: esperaba ≥1 arista, salieron ${synthesized.edges.length}`);
const req = synthesized.interfaces.find((i) => i.kind === 'required');
const prv = synthesized.interfaces.find((i) => i.kind === 'provided');
check(req && req.component === 'gw', 'síntesis: el origen debe exponer socket required (C)');
check(prv && prv.component === 'sess', 'síntesis: el destino debe exponer lollipop provided (O)');
check(synthesized.edges[0].fromInterface && synthesized.edges[0].toInterface,
  'síntesis: la arista debe anclar en las interfaces, no en el borde crudo');

const synLayout = computeComponentLayout(synthesized);
check(synLayout.edges[0].path && synLayout.edges[0].path.startsWith('M'),
  `síntesis: path vacío ("${synLayout.edges[0]?.path}")`);
check(synLayout.interfaces.every((i) => i.cx > 0 && i.cy > 0),
  'síntesis: cx/cy de lollipops deben quedar dentro del lienzo (stem + bbox)');
const synReqL = synLayout.interfaces.find((i) => i.kind === 'required');
const synPrvL = synLayout.interfaces.find((i) => i.kind === 'provided');
const dockDist = Math.hypot(synReqL.cx - synPrvL.cx, synReqL.cy - synPrvL.cy);
check(synReqL.docked, 'síntesis: la C debe acoplarse al O del destino');
const plugGap = LOLLI_R + LOLLI_GAP;
check(Math.abs(dockDist - plugGap) <= 1.5,
  `síntesis: C y O juntos (dist=${dockDist.toFixed(1)}, esperado ${plugGap})`);
const synPts = parsePathPoints(synLayout.edges[0].path);
const tip = synPts[synPts.length - 1];
const pre = synPts[synPts.length - 2];
const aimX = synPrvL.cx - tip.x;
const aimY = synPrvL.cy - tip.y;
const lastX = tip.x - pre.x;
const lastY = tip.y - pre.y;
check(lastX * aimY - lastY * aimX < 40,
  'último tramo debe apuntar al centro del O');
check(lastX * aimX + lastY * aimY > 0,
  'último tramo avanza hacia el O, no 180° al revés');

const connects = resolveComponentSpec({
  componentDiagram: {
    components: [
      { id: 'svc', x: 20, y: 40, w: 100, h: 48, connects: ['tabla'] },
      { id: 'tabla', x: 260, y: 40, w: 100, h: 48 },
    ],
  },
});
check(connects.edges.length >= 1, 'connects[] en el componente debe generar arista');
check(connects.interfaces.length >= 2, 'connects[] debe sintetizar O y C');

check(parseHttpEndpoint('GET /api/is-swagger').method === 'GET', 'parse GET');
check(parseHttpEndpoint('POST /api/jwt').path === '/api/jwt', 'parse path');

const fan = computeComponentLayout(resolveComponentSpec({
  componentDiagram: {
    components: [
      { id: 'src', name: 'Portal', x: 40, y: 200, w: 160, h: 80 },
      { id: 'a', name: 'A', x: 400, y: 40, w: 120, h: 48 },
      { id: 'b', name: 'B', x: 400, y: 120, w: 120, h: 48 },
      { id: 'c', name: 'C', x: 400, y: 200, w: 120, h: 48 },
      { id: 'd', name: 'D', x: 400, y: 280, w: 120, h: 48 },
      { id: 'e', name: 'E', x: 400, y: 360, w: 120, h: 48 },
    ],
    edges: [
      { from: 'src', to: 'a', kind: 'dependency' },
      { from: 'src', to: 'b', kind: 'dependency' },
      { from: 'src', to: 'c', kind: 'dependency' },
      { from: 'src', to: 'd', kind: 'dependency' },
      { from: 'src', to: 'e', kind: 'dependency' },
    ],
  },
}));
const ladosSrc = new Set(fan.interfaces.filter((i) => i.component === 'src').map((i) => i.attachSide ?? i.side));
check(ladosSrc.size >= 3, `5 aristas deben usar ≥3 laterales del origen; usaron ${[...ladosSrc].join(',')}`);
const hues = new Set(fan.edges.map((e) => e.hue));
check(hues.size === fan.edges.length, `cada arista debe tener hue propio; únicos=${hues.size}`);

const tri = computeComponentLayout(resolveComponentSpec({
  componentDiagram: {
    layout: {
      mode: 'triptych',
      ungroup: ['front'],
      sources: ['src'],
      sourceSides: { src: 'left' },
    },
    packages: [
      { id: 'front', name: 'Front', x: 20, y: 40, w: 160, h: 200 },
      { id: 'back', name: 'Back', x: 400, y: 40, w: 500, h: 300 },
    ],
    components: [
      { id: 'src', name: 'Portal', package: 'front', x: 40, y: 80, w: 120, h: 48 },
      { id: 'left', name: 'auth', package: 'back', x: 420, y: 80, w: 180, h: 48 },
      { id: 'right', name: 'system', package: 'back', x: 680, y: 80, w: 180, h: 48 },
    ],
    edges: [{ from: 'src', to: 'right', label: 'config' }],
  },
}));
const triSrc = tri.components.find((c) => c.id === 'src');
const triApi = tri.components.find((c) => c.id === 'left');
check(!tri.packages.some((p) => p.id === 'front'), 'ungroup debe quitar el paquete de consumidores');
check(triSrc.x + triSrc.w < triApi.x, 'tríptico: el origen queda a la izquierda del clúster');
check(triSrc.package == null, 'el origen desagrupado no lleva package');

const fit = computeComponentLayout(resolveComponentSpec({
  componentDiagram: {
    components: [{
      id: 'sys', name: 'system', stereotype: '9 endpoints', x: 20, y: 40, w: 280, h: 400,
      items: ['GET /a', 'PUT /a', 'GET /b', 'PUT /b', 'GET /c', 'PUT /c', 'GET /d', 'PUT /d', 'GET /e'],
    }],
  },
}));
check(fit.components[0].h < 280, `fit-h: system no puede quedar a ${fit.components[0].h}px con 9 burbujas`);
check((fit.components[0].itemBubbles ?? []).length === 9, 'cada endpoint es una burbuja');
check(fit.components[0].itemBubbles[0].method === 'GET', 'la burbuja conserva el verbo HTTP');

const packed = computeComponentLayout(resolveComponentSpec({
  componentDiagram: {
    packages: [
      { id: 'front', name: 'Front', x: 20, y: 40, w: 160, h: 200 },
      { id: 'back', name: 'Back', x: 400, y: 40, w: 500, h: 300 },
    ],
    components: [
      { id: 'src', name: 'Portal', package: 'front', x: 40, y: 80, w: 120, h: 48 },
      { id: 'left', name: 'auth', package: 'back', x: 420, y: 80, w: 180, h: 48 },
      { id: 'right', name: 'system', package: 'back', x: 680, y: 80, w: 180, h: 48 },
    ],
    edges: [
      { from: 'src', to: 'left', label: 'login' },
      { from: 'src', to: 'right', label: 'config' },
    ],
  },
}));
const leftBox = packed.components.find((c) => c.id === 'left');
const rightBox = packed.components.find((c) => c.id === 'right');
check(rightBox.x >= leftBox.x + leftBox.w + COL_GUTTER - 1,
  `columnas del paquete deben dejar gutter; gap=${rightBox.x - (leftBox.x + leftBox.w)}`);
const backPkg = packed.packages.find((p) => p.id === 'back');
check(pointInOrtho(backPkg.outline, leftBox.x + 8, leftBox.y + 8), 'región back debe envolver auth');
check(pointInOrtho(backPkg.outline, rightBox.x + 8, rightBox.y + 8), 'región back debe envolver system');
const frontPkg = packed.packages.find((p) => p.id === 'front');
check(frontPkg, 'paquete front no debe desaparecer');
check(!orthoPolysOverlap(frontPkg.outline, backPkg.outline), 'regiones front/back no se superponen');
const packedDestSides = new Set(
  packed.interfaces.filter((i) => i.kind === 'provided').map((i) => i.side),
);
check(packedDestSides.size >= 2,
  `llegadas left/right del clúster deben usar caras distintas; usaron ${[...packedDestSides].join(',')}`);
const cfg = packed.edges.find((e) => e.label === 'config') ?? packed.edges[0];
const pts = parsePathPoints(cfg.path);
check(pts.length >= 2, 'path de config debe tener vértices');
for (let i = 0; i < pts.length - 1; i++) {
  check(
    !segmentoCortaCaja(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, leftBox),
    `arista no puede atravesar auth (${Math.round(pts[i].x)},${Math.round(pts[i].y)}→${Math.round(pts[i + 1].x)},${Math.round(pts[i + 1].y)})`,
  );
}

const stacked = computeComponentLayout(resolveComponentSpec({
  componentDiagram: {
    packages: [{ id: 'col', name: 'Col', x: 40, y: 40, w: 200, h: 400 }],
    components: [
      { id: 'top', name: 'soporte', package: 'col', x: 60, y: 60, w: 160, h: 48 },
      { id: 'mid', name: 'auth', package: 'col', x: 60, y: 140, w: 160, h: 48 },
      { id: 'bot', name: 'chat', package: 'col', x: 60, y: 220, w: 160, h: 48 },
    ],
    edges: [{ from: 'top', to: 'bot', label: 'saltar' }],
  },
}));
const midBox = stacked.components.find((c) => c.id === 'mid');
const jump = stacked.edges.find((e) => e.label === 'saltar');
const jumpPts = parsePathPoints(jump.path);
for (let i = 0; i < jumpPts.length - 1; i++) {
  check(
    !segmentoCortaCaja(jumpPts[i].x, jumpPts[i].y, jumpPts[i + 1].x, jumpPts[i + 1].y, midBox),
    `arista que salta una fila no puede atravesar el cajón intermedio`,
  );
}

for (const e of [...fan.edges, ...stacked.edges, synLayout.edges[0]]) {
  const p = parsePathPoints(e.path);
  check(!pathHasDiagonal(p), `arista "${e.label ?? e.id}" no puede ser diagonal`);
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1];
    const b = p[i];
    const c = p[i + 1];
    const colV = Math.abs(a.x - b.x) < 0.6 && Math.abs(b.x - c.x) < 0.6;
    const colH = Math.abs(a.y - b.y) < 0.6 && Math.abs(b.y - c.y) < 0.6;
    check(!(colV && (b.y - a.y) * (c.y - b.y) < 0),
      `arista "${e.label ?? e.id}" retrocede en vertical (${a.y.toFixed(0)}→${b.y.toFixed(0)}→${c.y.toFixed(0)})`);
    check(!(colH && (b.x - a.x) * (c.x - b.x) < 0),
      `arista "${e.label ?? e.id}" retrocede en horizontal (${a.x.toFixed(0)}→${b.x.toFixed(0)}→${c.x.toFixed(0)})`);
  }
  const comps = e === synLayout.edges[0] ? synLayout.components
    : stacked.edges.includes(e) ? stacked.components : fan.components;
  check(!pathIllegal(p, comps, e.from, e.to, EDGE_CLEARANCE),
    `arista "${e.label ?? e.id}" ilegal vs cajas (holgura/origen)`);
}
let fanShare = 0;
const fanUsed = [];
for (const e of fan.edges) {
  const p = parsePathPoints(e.path);
  fanShare += pathShareLen(p, fanUsed);
  fanUsed.push(...segsFromPath(p));
}
check(fanShare < 80, `abanico no debe empilar tramos; share=${fanShare.toFixed(0)}`);

{
  const low = resolveComponentSpec({
    componentDiagram: {
      layout: { minGap: 40 },
      packages: [{ id: 'p', name: 'P', x: 0, y: 0, w: 200, h: 400 }],
      components: [
        { id: 'a', name: 'A', package: 'p', x: 20, y: 40, w: 120, h: 48 },
        { id: 'b', name: 'B', package: 'p', x: 20, y: 200, w: 120, h: 48 },
      ],
    },
  });
  const high = resolveComponentSpec({
    componentDiagram: {
      layout: { minGap: 120 },
      packages: [{ id: 'p', name: 'P', x: 0, y: 0, w: 200, h: 400 }],
      components: [
        { id: 'a', name: 'A', package: 'p', x: 20, y: 40, w: 120, h: 48 },
        { id: 'b', name: 'B', package: 'p', x: 20, y: 200, w: 120, h: 48 },
      ],
    },
  });
  const gapOf = (spec) => {
    const a = spec.components.find((c) => c.id === 'a');
    const b = spec.components.find((c) => c.id === 'b');
    return b.y - (a.y + a.h);
  };
  check(Math.abs(gapOf(low) - 40) < 1, `minGap 40 debe separar filas ~40; salió ${gapOf(low)}`);
  check(Math.abs(gapOf(high) - 120) < 1, `minGap 120 debe separar filas ~120; salió ${gapOf(high)}`);
  const viaHost = resolveComponentSpec({
    componentDiagram: {
      packages: [{ id: 'p', name: 'P', x: 0, y: 0, w: 200, h: 400 }],
      components: [
        { id: 'a', name: 'A', package: 'p', x: 20, y: 40, w: 120, h: 48 },
        { id: 'b', name: 'B', package: 'p', x: 20, y: 200, w: 120, h: 48 },
      ],
    },
  }, { minGap: 88 });
  check(Math.abs(gapOf(viaHost) - 88) < 1, `host minGap 88 debe separar filas ~88; salió ${gapOf(viaHost)}`);
}

{
  const named = computeComponentLayout(resolveComponentSpec({
    componentDiagram: {
      packages: [{
        id: 'api', name: 'ISS PatyIA API Azure Functions', stereotype: 'backend',
        x: 240, y: 40, w: 480, h: 220,
      }],
      components: [
        { id: 'src', name: 'Portal', x: 20, y: 100, w: 140, h: 48 },
        { id: 'dst', name: 'auth', package: 'api', x: 260, y: 100, w: 180, h: 48 },
      ],
      edges: [{ from: 'src', to: 'dst', label: 'login' }],
    },
  }));
  const tb = named.packages.find((p) => p.id === 'api')?.titleBox;
  check(tb && tb.w > 180, `título de grupo debe tener caja ancha; w=${tb?.w}`);
  const npts = parsePathPoints(named.edges[0].path);
  const tbHit = { ...tb, x: tb.x - 16, y: tb.y - 16, w: tb.w + 32, h: tb.h + 32 };
  check(!pathIllegal(npts, [tbHit], 'src', 'dst', EDGE_CLEARANCE),
    'arista no puede atravesar el título del paquete');
}

if (failures.length) {
  console.error('component-diagram-ifaces.test.mjs: FAIL');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}

console.log(`component-diagram-ifaces.test.mjs: PASS — ${layout.interfaces.length}+${synLayout.interfaces.length} interfaces, ${layout.edges.length}+${synLayout.edges.length} aristas`);
process.exit(0);
