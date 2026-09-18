// state.test.mjs — tests del spec `state-spec` (funciones puras, sin DOM).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  resolveStateSpec,
  stateSpecToJson,
  computeStateLayout,
  STATE_KINDS,
} from '../../../../src/components/diagrams/state-spec.ts';

const validPayload = {
  stateDiagram: {
    direction: 'TB',
    states: [
      { id: 's0', kind: 'start' },
      { id: 's1', kind: 'normal', label: 'recibido' },
      { id: 's2', kind: 'choice', label: '¿OK?' },
      { id: 's3', kind: 'end' },
    ],
    transitions: [
      { from: 's0', to: 's1' },
      { from: 's1', to: 's2' },
      { from: 's2', to: 's3', label: 'sí' },
      { from: 's1', to: 's1', label: 'reintento' }, // self
    ],
  },
};

test('smoke: import no lanza', () => {
  assert.equal(typeof resolveStateSpec, 'function');
  assert.equal(typeof computeStateLayout, 'function');
});

test('payload vacío devuelve null', () => {
  assert.equal(resolveStateSpec({}), null);
});

test('STATE_KINDS incluye los 4 tipos', () => {
  for (const k of ['start', 'end', 'normal', 'choice']) {
    assert.ok(STATE_KINDS.has(k));
  }
});

test('spec mínimo produce layout con width/height > 0', () => {
  const spec = resolveStateSpec(validPayload);
  assert.ok(spec);
  assert.equal(spec.states.length, 4);
  assert.equal(spec.transitions.length, 4);
  const layout = computeStateLayout(spec);
  assert.ok(layout.width > 0);
  assert.ok(layout.height > 0);
  assert.equal(layout.nodes.length, 4);
  assert.equal(layout.edges.length, 4);
  // self-transition: should produce visible loop
  const self = layout.edges.find((e) => e.from === e.to);
  assert.ok(self, 'self-transition existe');
});

test('direcciones válidas (TB/BT/LR/RL)', () => {
  for (const d of ['TB', 'BT', 'LR', 'RL']) {
    const spec = resolveStateSpec({
      stateDiagram: { direction: d, states: [{ id: 'a', kind: 'normal', label: 'A' }] },
    });
    assert.equal(spec.direction, d);
  }
  // TD se trata como TB
  const td = resolveStateSpec({
    stateDiagram: { direction: 'TD', states: [{ id: 'a', kind: 'normal', label: 'A' }] },
  });
  assert.equal(td.direction, 'TB');
});

test('edge case: transición colgante se descarta', () => {
  const spec = resolveStateSpec({
    stateDiagram: {
      states: [{ id: 's1', kind: 'normal', label: 'A' }],
      transitions: [
        { from: 's1', to: 'NOEXISTE' },
        { from: 's1', to: 's1' },
      ],
    },
  });
  assert.equal(spec.transitions.length, 1);
});

test('round-trip JSON idéntico', () => {
  const spec = resolveStateSpec(validPayload);
  const j1 = JSON.stringify(stateSpecToJson(spec));
  const j2 = JSON.stringify(stateSpecToJson(resolveStateSpec(JSON.parse(j1))));
  assert.equal(j1, j2);
});