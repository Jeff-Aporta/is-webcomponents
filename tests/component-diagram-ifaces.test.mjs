// tests/component-diagram-ifaces.test.mjs
//
// Guardian del bug de ifaceById en <is-component-diagram> y de la
// síntesis de lollipops: un payload con `links` y sin `interfaces`
// tiene que salir con O/C y path, o el PNG solo enseña cajas.

import { computeComponentLayout, resolveComponentSpec, LOLLI_R, LOLLI_STEM } from '../src/components/diagrams/component-spec.js';

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
check(LOLLI_STEM >= 18, `stem demasiado corto para PNG: ${LOLLI_STEM}`);

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

if (failures.length) {
  console.error('component-diagram-ifaces.test.mjs: FAIL');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}

console.log(`component-diagram-ifaces.test.mjs: PASS — ${layout.interfaces.length}+${synLayout.interfaces.length} interfaces, ${layout.edges.length}+${synLayout.edges.length} aristas`);
process.exit(0);
