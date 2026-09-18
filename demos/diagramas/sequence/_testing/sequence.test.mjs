// sequence.test.mjs — tests del spec `sequence-spec` (funciones puras, sin DOM).
// Cubre: smoke (import no rompe), round-trip JSON idéntico, edge cases
// (payload vacío, actor único, mensaje colgante).
//
// Ejecución: `node demos/diagramas/sequence/_testing/sequence.test.mjs`
// (no necesita servidor ni Playwright — corre con node puro).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  sequenceSpecFromPayload,
  sequenceSpecToJson,
  resolveSequenceSpec,
  computeSequenceLayout,
  tk1437191SequenceSpec,
  tk1431662SequenceSpec,
  sequenceMessageTooltipText,
  normalizeSequenceLog,
  normalizeSequenceDesc,
  sequenceLogVisibleLength,
  SEQUENCE_LOG_MAX_VISIBLE,
} from '../../../../src/components/diagrams/sequence-spec.ts';

const validPayload = {
  sequence: {
    actors: [
      { id: 'A', label: 'A' },
      { id: 'B', label: 'B' },
    ],
    messages: [
      { id: 'm1', from: 'A', to: 'B', label: 'hola', step: 1 },
      { id: 'm2', from: 'B', to: 'A', label: 'mundo', step: 2 },
    ],
  },
};

test('smoke: import no lanza', () => {
  assert.equal(typeof sequenceSpecFromPayload, 'function');
  assert.equal(typeof computeSequenceLayout, 'function');
});

test('payload vacío devuelve null', () => {
  assert.equal(sequenceSpecFromPayload({}), null);
  assert.equal(sequenceSpecFromPayload({ sequence: {} }), null);
});

test('spec mínimo produce layout con width/height > 0', () => {
  const spec = sequenceSpecFromPayload(validPayload);
  assert.ok(spec, 'spec no es null');
  assert.equal(spec.actors.length, 2);
  assert.equal(spec.messages.length, 2);
  const layout = computeSequenceLayout(spec);
  assert.ok(layout.width > 0, 'width > 0');
  assert.ok(layout.height > 0, 'height > 0');
  assert.ok(layout.actors.length === 2);
  assert.ok(layout.messages.length === 2);
  // self-loop inferido cuando from === to
  const selfLayout = computeSequenceLayout(sequenceSpecFromPayload({
    sequence: { actors: [{ id: 'A', label: 'A' }], messages: [{ from: 'A', to: 'A', label: 'loop' }] },
  }));
  assert.ok(selfLayout.messages[0].kind === 'self');
});

test('round-trip JSON idéntico', () => {
  const spec = sequenceSpecFromPayload(validPayload);
  const json1 = JSON.stringify(sequenceSpecToJson(spec));
  const json2 = JSON.stringify(sequenceSpecToJson(sequenceSpecFromPayload(JSON.parse(json1))));
  assert.equal(json1, json2);
});

test('edge case: mensaje con actor inexistente degrada sin crashear', () => {
  // El spec degrada el destino desconocido colapsándolo al origen (el
  // lifeline del origen), de modo que el render no rompe y avisa por
  // consola. El layout sigue siendo válido y conserva el mensaje.
  const payload = {
    sequence: {
      actors: [{ id: 'A', label: 'A' }],
      messages: [
        { id: 'm1', from: 'A', to: 'NOEXISTE', label: 'colgante' },
      ],
    },
  };
  const spec = sequenceSpecFromPayload(payload);
  assert.ok(spec, 'spec existe');
  const layout = computeSequenceLayout(spec);
  assert.equal(layout.messages.length, 1, 'mensaje sigue presente');
  // El origen sigue apuntando al actor 'A' (degradación silenciosa).
  assert.equal(layout.messages[0].fromX, layout.messages[0].toX);
});

test('helpers de normalización: log/desc', () => {
  assert.equal(normalizeSequenceLog('  hola  '), 'hola');
  assert.equal(normalizeSequenceLog(''), undefined);
  assert.equal(normalizeSequenceLog(null), undefined);
  assert.equal(normalizeSequenceDesc('**md**'), '**md**');
  assert.equal(sequenceLogVisibleLength('**hola**'), 4);
  assert.equal(SEQUENCE_LOG_MAX_VISIBLE, 70);
});

test('tooltip con desc gana sobre log', () => {
  const m = { description: 'detalle', log: 'corto' };
  assert.equal(sequenceMessageTooltipText(m), 'detalle');
});

test('presets: tk1437191 y tk1431662 producen specs válidos', () => {
  const a = tk1437191SequenceSpec();
  const b = tk1431662SequenceSpec();
  assert.ok(a.actors.length >= 3);
  assert.ok(a.messages.length >= 5);
  assert.ok(b.actors.length >= 3);
  assert.ok(b.alt?.branches.length >= 1);
  // Ambos specs deben layout-ear sin crashear
  const la = computeSequenceLayout(a);
  const lb = computeSequenceLayout(b);
  assert.ok(la.width > 0 && la.height > 0);
  assert.ok(lb.width > 0 && lb.height > 0);
});

test('resolveSequenceSpec: preset gana sobre inline ausente', () => {
  const spec = resolveSequenceSpec({ preset: 'tk1437191' });
  assert.ok(spec);
  assert.equal(spec.actors[0].id, 'U');
});