// tests/component-diagram-ifaces.test.mjs
//
// Guardian del bug de ifaceById en <is-component-diagram>.
//
// En la primera versión, `ifaceById` se construía sobre `spec.interfaces`
// ANTES de calcular `cx`/`cy` de cada interfaz. Las aristas buscaban
// `.cx` y encontraban `undefined` → todas caían a (0, 0) sin error
// visible y el PNG salía sin conexiones.
//
// Invariantes:
//
//   1. El layout devuelve interfaces con `cx` e `cy` numéricos
//      (no undefined, no NaN).
//   2. Las aristas resuelven fromX/toX desde las interfaces, no a (0, 0).
//
// Si alguien refactoriza `computeComponentLayout` y vuelve a poblar el
// mapa antes de calcular geometría, el test detecta el bug inmediato.

import { computeComponentLayout } from '../src/components/diagrams/component-spec.js';

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

// Spec mínima: 2 componentes, 2 interfaces, 1 arista entre ellas.
const spec = {
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
};

const layout = computeComponentLayout(spec.componentDiagram);

// Interfaces con cx/cy numéricos.
for (const iface of layout.interfaces) {
  check(
    typeof iface.cx === 'number' && Number.isFinite(iface.cx),
    `iface ${iface.id} cx debe ser número finito; salió ${iface.cx}`,
  );
  check(
    typeof iface.cy === 'number' && Number.isFinite(iface.cy),
    `iface ${iface.id} cy debe ser número finito; salió ${iface.cy}`,
  );
}

// Aristas con fromX/toX no en (0, 0).
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

if (failures.length) {
  console.error('component-diagram-ifaces.test.mjs: FAIL');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}

console.log(`component-diagram-ifaces.test.mjs: PASS — ${layout.interfaces.length} interfaces, ${layout.edges.length} aristas resueltas`);
process.exit(0);