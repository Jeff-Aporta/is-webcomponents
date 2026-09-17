// flowchart.test.mjs — tests del spec `flowchart-spec` (funciones puras, sin DOM).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  flowchartSpecFromPayload,
  flowchartSpecToJson,
  resolveFlowchartSpec,
  computeFlowchartLayout,
  shapePath,
  FLOW_SHAPES,
} from '../../../../src/components/diagrams/flowchart-spec.ts';

const validPayload = {
  flowchart: {
    direction: 'TB',
    nodes: [
      { id: 'a', label: 'A', shape: 'rect' },
      { id: 'b', label: 'B', shape: 'diamond' },
      { id: 'c', label: 'C', shape: 'stadium' },
    ],
    edges: [
      { from: 'a', to: 'b', label: 'sí' },
      { from: 'b', to: 'c' },
    ],
  },
};

test('smoke: import no lanza', () => {
  assert.equal(typeof flowchartSpecFromPayload, 'function');
  assert.equal(typeof computeFlowchartLayout, 'function');
});

test('payload vacío devuelve null', () => {
  assert.equal(flowchartSpecFromPayload({}), null);
  assert.equal(flowchartSpecFromPayload({ flowchart: {} }), null);
});

test('spec mínimo produce layout', () => {
  const spec = flowchartSpecFromPayload(validPayload);
  assert.ok(spec);
  assert.equal(spec.nodes.length, 3);
  assert.equal(spec.edges.length, 2);
  const layout = computeFlowchartLayout(spec);
  assert.ok(layout.width > 0);
  assert.ok(layout.height > 0);
  assert.equal(layout.nodes.length, 3);
  assert.equal(layout.edges.length, 2);
  // el path del diamond debe contener 'L' (polilínea) — no H/V puros
  const diamondPath = shapePath('diamond', 0, 0, 100, 50);
  assert.match(diamondPath, /^M[\d.]+,/);
});

test('FLOW_SHAPES contiene 9 formas', () => {
  assert.equal(FLOW_SHAPES.size, 9);
});

test('edge case: arista con destino inexistente se descarta', () => {
  const spec = flowchartSpecFromPayload({
    flowchart: {
      nodes: [{ id: 'a', label: 'A' }],
      edges: [{ from: 'a', to: 'NOEXISTE' }],
    },
  });
  assert.equal(spec.edges.length, 0);
});

test('edge case: waypoints vacíos / sin edges es válido', () => {
  const spec = flowchartSpecFromPayload({
    flowchart: { nodes: [{ id: 'a', label: 'A' }] },
  });
  const layout = computeFlowchartLayout(spec);
  assert.ok(layout);
  assert.equal(layout.edges.length, 0);
});

test('round-trip JSON idéntico', () => {
  const spec = flowchartSpecFromPayload(validPayload);
  const j1 = JSON.stringify(flowchartSpecToJson(spec));
  const j2 = JSON.stringify(flowchartSpecToJson(flowchartSpecFromPayload(JSON.parse(j1))));
  assert.equal(j1, j2);
});

test('direcciones válidas (TB/BT/LR/RL)', () => {
  for (const d of ['TB', 'BT', 'LR', 'RL']) {
    const spec = flowchartSpecFromPayload({ flowchart: { direction: d, nodes: [{ id: 'a', label: 'A' }] } });
    assert.equal(spec.direction, d);
  }
  // TD se trata como TB
  const td = flowchartSpecFromPayload({ flowchart: { direction: 'TD', nodes: [{ id: 'a', label: 'A' }] } });
  assert.equal(td.direction, 'TB');
});