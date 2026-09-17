// sankey.test.mjs — tests del spec `sankey-spec` (funciones puras, sin DOM).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  resolveSankeySpec,
  sankeySpecToJson,
  computeSankeyLayout,
} from '../../../../src/components/diagrams/sankey-spec.ts';

const validPayload = {
  sankey: {
    links: [
      { from: 'A', to: 'B', value: 30 },
      { from: 'B', to: 'C', value: 30 },
    ],
    nodes: [
      { id: 'A', label: 'Fuente A' },
      { id: 'B', label: 'Medio B' },
      { id: 'C', label: 'Destino C' },
    ],
  },
};

test('smoke: import no lanza', () => {
  assert.equal(typeof resolveSankeySpec, 'function');
  assert.equal(typeof computeSankeyLayout, 'function');
});

test('payload sin enlaces con valor positivo devuelve null', () => {
  assert.equal(resolveSankeySpec({}), null);
  assert.equal(resolveSankeySpec({ sankey: { links: [] } }), null);
  assert.equal(resolveSankeySpec({ sankey: { links: [{ from: 'A', to: 'B', value: 0 }] } }), null);
});

test('payload mínimo (solo links, sin nodes) genera nodos auto', () => {
  const spec = resolveSankeySpec({
    sankey: {
      links: [
        { from: 'A', to: 'B', value: 50 },
      ],
    },
  });
  assert.ok(spec);
  assert.equal(spec.nodes.length, 2, 'debe crear A y B al vuelo');
  assert.ok(spec.nodes.find((n) => n.id === 'A'));
  assert.ok(spec.nodes.find((n) => n.id === 'B'));
});

test('spec produce layout con width/height > 0', () => {
  const spec = resolveSankeySpec(validPayload);
  const layout = computeSankeyLayout(spec);
  assert.ok(layout.width > 0);
  assert.ok(layout.height > 0);
  assert.equal(layout.nodes.length, 3);
  assert.equal(layout.links.length, 2);
  // el ribbon path debe empieza con M
  assert.match(layout.links[0].path, /^M/);
});

test('edge case: link a sí mismo se descarta', () => {
  const spec = resolveSankeySpec({
    sankey: {
      links: [
        { from: 'A', to: 'A', value: 10 }, // self-link, debe descartarse
        { from: 'A', to: 'B', value: 5 },
      ],
    },
  });
  assert.equal(spec.links.length, 1);
});

test('opts.height + opts.width respetan el lienzo', () => {
  const spec = resolveSankeySpec(validPayload);
  const layout = computeSankeyLayout(spec, { width: 1200, height: 600 });
  assert.ok(layout.width >= 1200 || layout.height <= 600);
});

test('round-trip JSON idéntico', () => {
  const spec = resolveSankeySpec(validPayload);
  const j1 = JSON.stringify(sankeySpecToJson(spec));
  const j2 = JSON.stringify(sankeySpecToJson(resolveSankeySpec(JSON.parse(j1))));
  assert.equal(j1, j2);
});