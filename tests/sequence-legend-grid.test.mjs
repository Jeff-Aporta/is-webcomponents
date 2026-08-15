// tests/sequence-legend-grid.test.mjs
//
// Guardian del fix de leyenda de <is-sequence-diagram>.
//
// Antes la leyenda era una columna única apilada y solapaba el último
// actor del diagrama cuando había 5+ grupos. El fix la puso en grid de
// máximo 3 filas × N columnas y la arranca pasada la caja del último
// actor (`baseW + lastActorBoxHalf + 16`).
//
// Este test verifica los dos invariantes que NO deben romperse:
//
//   1. El layout expone `legendMaxRows: 3` y `legendColX` con N columnas
//      (no 1 columna única).
//   2. La primera columna de la leyenda (`legendX`) queda a la derecha
//      del borde derecho de la caja del último actor (no lo monta encima).
//
// Si alguien refactoriza la función y vuelve al comportamiento viejo,
// el test falla y señala exactamente qué invariante se rompió.

import { resolveSequenceSpec, computeSequenceLayout } from '../src/components/diagrams/sequence-spec.js';

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

// Spec mínima con 5 grupos y 3 actores — el caso que rompía la leyenda.
const spec5 = {
  title: 'test',
  groups: [
    { id: 'g1', name: 'Alpha' },
    { id: 'g2', name: 'Beta' },
    { id: 'g3', name: 'Gamma' },
    { id: 'g4', name: 'Delta' },
    { id: 'g5', name: 'Epsilon' },
  ],
  actors: [
    { id: 'A', label: 'Actor A' },
    { id: 'B', label: 'Actor B' },
    { id: 'C', label: 'Actor C' },
  ],
  messages: [
    { id: 'm1', from: 'A', to: 'B', label: 'hola' },
  ],
};

const layout = computeSequenceLayout(resolveSequenceSpec(spec5));

check(
  layout.legendMaxRows === 3,
  `legendMaxRows debe ser 3 (era undefined antes del fix); salió ${layout.legendMaxRows}`,
);
check(
  Array.isArray(layout.legendColX) && layout.legendColX.length >= 2,
  `legendColX debe tener >=2 columnas para 5 grupos con maxRows=3; salió ${JSON.stringify(layout.legendColX)}`,
);

// Calcular el borde derecho del último actor y compararlo con legendX.
// El invariante: legendX > (último actor x + boxW/2).
const lastActor = layout.actors[layout.actors.length - 1];
// boxW no se expone en layout.actors; usamos la heurística conservadora de
// `actorWidth` por si cambia la implementación: ancho = max(88, label.length*7 + 32).
const approxBoxW = Math.max(88, lastActor.label.length * 7 + 32);
const lastActorRightEdge = lastActor.x + approxBoxW / 2;

check(
  layout.legendX > lastActorRightEdge,
  `legendX=${layout.legendX} debe estar a la derecha del borde del último actor (${lastActorRightEdge.toFixed(1)}); la leyenda solaparía el actor si esto falla`,
);

if (failures.length) {
  console.error('sequence-legend-grid.test.mjs: FAIL');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}

console.log(`sequence-legend-grid.test.mjs: PASS — leyenda grid OK, ${layout.legendColX.length} columnas, legendX=${layout.legendX} > ${lastActorRightEdge.toFixed(1)}`);
process.exit(0);