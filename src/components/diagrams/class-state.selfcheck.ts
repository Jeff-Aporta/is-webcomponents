// @ts-nocheck
import assert from 'node:assert';
import { resolveClassSpec, computeClassLayout } from './class-spec.js';
import { resolveStateSpec, computeStateLayout } from './state-spec.js';

/* ───────────────────────── class diagram ───────────────────────── */

const classPayload = {
  classDiagram: {
    title: 'Dominio de facturación',
    direction: 'TB',
    groups: [{ id: 'g1', name: 'Dominio', hue: 239 }],
    classes: [
      {
        id: 'Factura', name: 'Factura', stereotype: '<<entity>>', group: 'g1',
        attributes: ['+numero: string', '-total: number', '-fecha: date', '-cufe: string'],
        methods: ['+anular(): void'],
      },
      { id: 'Cliente', name: 'Cliente', group: 'g1', attributes: ['+nit: string'], methods: [] },
      { id: 'Item', name: 'Item', group: 'g1', attributes: ['+cantidad: number'], methods: ['+subtotal(): number'] },
      { id: 'Pago', name: 'Pago', group: 'g1', attributes: [], methods: ['+registrar(): void'] },
      { id: 'Vacia', name: 'Vacia', group: 'g1', attributes: [], methods: [] },
    ],
    relations: [
      { from: 'Factura', to: 'Cliente', kind: 'association', label: '1..*' },
      { from: 'Factura', to: 'Item', kind: 'composition' },
      { from: 'Factura', to: 'Pago', kind: 'dependency' },
      { from: 'Pago', to: 'Factura', kind: 'association' }, // cierra el ciclo
      { from: 'Item', to: 'Vacia', kind: 'inheritance' },
      { from: 'Factura', to: 'Factura', kind: 'association', label: 'self' }, // auto-relación
      { from: 'Factura', to: 'Fantasma', kind: 'association' }, // colgante: se descarta
    ],
  },
};

const classSpec = resolveClassSpec(classPayload);
assert.ok(classSpec, 'class spec debe resolver');
assert.strictEqual(classSpec.classes.length, 5);
assert.strictEqual(classSpec.relations.length, 6, 'la relación colgante se descarta');

const classLayout = computeClassLayout(classSpec);
for (const n of classLayout.nodes) {
  assert.ok(n.x >= 0 && n.x + n.w <= classLayout.width, `nodo ${n.id} dentro del ancho`);
  assert.ok(n.y >= 0 && n.y + n.h <= classLayout.height, `nodo ${n.id} dentro del alto`);
}
for (const e of classLayout.edges) {
  assert.ok(typeof e.path === 'string' && e.path.startsWith('M'), `arista ${e.id} tiene path SVG`);
}

const facturaBox = classLayout.nodes.find((n) => n.id === 'Factura');
const vaciaBox = classLayout.nodes.find((n) => n.id === 'Vacia');
assert.ok(facturaBox.h > vaciaBox.h, 'una caja con 4 atributos + 1 método debe ser más alta que una vacía');

/* ───────────────────────── state diagram ───────────────────────── */

const statePayload = {
  stateDiagram: {
    title: 'Ciclo de vida de la factura',
    direction: 'TB',
    groups: [{ id: 'g1', name: 'Flujo', hue: 199 }],
    states: [
      { id: 'inicio', kind: 'start', group: 'g1' },
      { id: 'borrador', label: 'Borrador', group: 'g1', desc: 'Editable por el usuario.' },
      { id: 'decision', label: '¿Válida?', kind: 'choice', group: 'g1' },
      { id: 'emitida', label: 'Emitida', group: 'g1' },
      { id: 'anulada', label: 'Anulada', group: 'g1' },
      { id: 'fin', kind: 'end', group: 'g1' },
    ],
    transitions: [
      { from: 'inicio', to: 'borrador' },
      { from: 'borrador', to: 'decision', label: 'validar' },
      { from: 'decision', to: 'emitida', label: 'sí' },
      { from: 'decision', to: 'borrador', label: 'no' }, // vuelve atrás (ciclo)
      { from: 'emitida', to: 'anulada', label: 'anular' },
      { from: 'emitida', to: 'emitida', label: 'reintento' }, // auto-transición
      { from: 'anulada', to: 'fin' },
      { from: 'emitida', to: 'fin' },
      { from: 'emitida', to: 'fantasma' }, // colgante: se descarta
    ],
  },
};

const stateSpec = resolveStateSpec(statePayload);
assert.ok(stateSpec, 'state spec debe resolver');
assert.strictEqual(stateSpec.states.length, 6);
assert.strictEqual(stateSpec.transitions.length, 8, 'la transición colgante se descarta');

const stateLayout = computeStateLayout(stateSpec);
for (const n of stateLayout.nodes) {
  assert.ok(n.x >= 0 && n.x + n.w <= stateLayout.width, `estado ${n.id} dentro del ancho`);
  assert.ok(n.y >= 0 && n.y + n.h <= stateLayout.height, `estado ${n.id} dentro del alto`);
}
for (const e of stateLayout.edges) {
  assert.ok(typeof e.path === 'string' && e.path.startsWith('M'), `transición ${e.id} tiene path SVG`);
}

/* ───────────────────────── sin diagonales (regresión) ───────────────────────── */
// Mismo motor de ruteo que flowchart-spec — ver flowchart-spec.selfcheck.mjs
// para el historial completo del bug (applyRectCost, buildOrthogonalPath,
// stepOut insuficiente frente a la cuantización de 8px).
function parsePathPoints(d) {
  const tokens = d.match(/[ML]\s*-?\d+(?:\.\d+)?[\s,]+-?\d+(?:\.\d+)?/g) || [];
  return tokens.map((t) => {
    const n = t.match(/-?\d+(?:\.\d+)?/g).map(Number);
    return { x: n[0], y: n[1] };
  });
}
function assertNoDiagonals(path, label) {
  const pts = parsePathPoints(path);
  const distinct = pts.filter((p, i: number) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
  for (let i = 1; i < distinct.length; i++) {
    const a = distinct[i - 1];
    const b = distinct[i];
    assert.ok(a.x === b.x || a.y === b.y, `${label}: segmento diagonal (${a.x},${a.y}) → (${b.x},${b.y})`);
  }
}
for (const e of classLayout.edges) assertNoDiagonals(e.path, `class ${e.from}->${e.to}`);
for (const e of stateLayout.edges) assertNoDiagonals(e.path, `state ${e.from}->${e.to}`);

console.log('class/state self-check: PASS');
