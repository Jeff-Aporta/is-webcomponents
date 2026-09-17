// swimlane.test.mjs — tests del spec `swimlane-spec` (funciones puras, sin DOM).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  resolveSwimlaneSpec,
  swimlaneSpecToJson,
  computeSwimlaneLayout,
  findBackEdges,
  STEP_KINDS,
} from '../../../../src/components/diagrams/swimlane-spec.ts';

const validPayload = {
  swimlane: {
    lanes: [
      { id: 'cli', name: 'Cliente' },
      { id: 'ops', name: 'Operaciones' },
    ],
    steps: [
      { id: 's1', lane: 'cli', kind: 'start', label: 'inicio' },
      { id: 's2', lane: 'cli', kind: 'process', label: 'pide' },
      { id: 's3', lane: 'ops', kind: 'process', label: 'procesa' },
      { id: 's4', lane: 'ops', kind: 'end', label: 'fin' },
    ],
    links: [
      { from: 's1', to: 's2' },
      { from: 's2', to: 's3' },
      { from: 's3', to: 's4' },
    ],
  },
};

test('smoke: import no lanza', () => {
  assert.equal(typeof resolveSwimlaneSpec, 'function');
  assert.equal(typeof computeSwimlaneLayout, 'function');
});

test('payload vacío devuelve null', () => {
  assert.equal(resolveSwimlaneSpec({}), null);
});

test('spec mínimo produce layout con lanes y steps', () => {
  const spec = resolveSwimlaneSpec(validPayload);
  assert.ok(spec);
  assert.equal(spec.lanes.length, 2);
  assert.equal(spec.steps.length, 4);
  assert.equal(spec.links.length, 3);
  const layout = computeSwimlaneLayout(spec);
  assert.ok(layout.width > 0);
  assert.ok(layout.height > 0);
  assert.equal(layout.lanes.length, 2);
  assert.equal(layout.steps.length, 4);
  assert.equal(layout.links.length, 3);
});

test('STEP_KINDS contiene los 4 kinds soportados', () => {
  for (const k of ['start', 'end', 'process', 'decision']) {
    assert.ok(STEP_KINDS.has(k), `STEP_KINDS debe incluir ${k}`);
  }
});

test('findBackEdges detecta ciclo (reproceso)', () => {
  const spec = resolveSwimlaneSpec({
    swimlane: {
      lanes: [{ id: 'A' }],
      steps: [
        { id: 's1', lane: 'A', label: 'p1' },
        { id: 's2', lane: 'A', label: 'p2' },
        { id: 's3', lane: 'A', label: 'p3' },
      ],
      links: [
        { from: 's1', to: 's2' },
        { from: 's2', to: 's3' },
        { from: 's3', to: 's2', label: 'reproceso' },
      ],
    },
  });
  const back = findBackEdges(spec.steps, spec.links);
  assert.ok(back.size >= 1, 'debe detectar al menos un ciclo');
});

test('edge case: link colgante se descarta', () => {
  const spec = resolveSwimlaneSpec({
    swimlane: {
      lanes: [{ id: 'A' }],
      steps: [{ id: 's1', lane: 'A', label: 'p1' }],
      links: [
        { from: 's1', to: 'NOEXISTE' },
      ],
    },
  });
  assert.equal(spec.links.length, 0);
});

test('round-trip JSON idéntico', () => {
  const spec = resolveSwimlaneSpec(validPayload);
  const j1 = JSON.stringify(swimlaneSpecToJson(spec));
  const j2 = JSON.stringify(swimlaneSpecToJson(resolveSwimlaneSpec(JSON.parse(j1).swimlane ? JSON.parse(j1) : { swimlane: JSON.parse(j1) })));
  assert.equal(j1, j2);
});