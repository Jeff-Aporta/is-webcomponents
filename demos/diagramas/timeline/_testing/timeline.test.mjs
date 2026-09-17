// timeline.test.mjs — tests del spec `timeline-spec` (funciones puras, sin DOM).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  timelineSpecFromPayload,
  resolveTimelineSpec,
  computeTimelineLayout,
} from '../../../../src/components/diagrams/timeline-spec.ts';

const validPayload = {
  timeline: {
    orientation: 'horizontal',
    events: [
      { id: 'e1', label: 'Kickoff', date: '2026-01-15' },
      { id: 'e2', label: 'MVP', date: '2026-03-01' },
      { id: 'e3', label: 'GA', date: '2026-09-01' },
    ],
  },
};

test('smoke: import no lanza', () => {
  assert.equal(typeof timelineSpecFromPayload, 'function');
  assert.equal(typeof computeTimelineLayout, 'function');
});

test('payload vacío devuelve null', () => {
  assert.equal(timelineSpecFromPayload({}), null);
  assert.equal(timelineSpecFromPayload({ timeline: {} }), null);
});

test('orientación default es horizontal', () => {
  const spec = timelineSpecFromPayload({
    timeline: {
      events: [{ id: 'e1', label: 'A', date: '2026-01-15' }],
    },
  });
  assert.equal(spec.orientation, 'horizontal');
});

test('orientación vertical se respeta', () => {
  const spec = timelineSpecFromPayload({
    timeline: {
      orientation: 'vertical',
      events: [{ id: 'e1', label: 'A', date: '2026-01-15' }],
    },
  });
  assert.equal(spec.orientation, 'vertical');
});

test('layout horizontal produce width/height > 0', () => {
  const spec = timelineSpecFromPayload(validPayload);
  const layout = computeTimelineLayout(spec);
  assert.ok(layout.width > 0);
  assert.ok(layout.height > 0);
  assert.equal(layout.events.length, 3);
  assert.ok(layout.axisLen > 0);
});

test('layout vertical produce width/height > 0', () => {
  const spec = timelineSpecFromPayload({
    timeline: {
      orientation: 'vertical',
      events: [
        { id: 'e1', label: 'A', date: '2026-01-15' },
        { id: 'e2', label: 'B', date: '2026-06-15' },
      ],
    },
  });
  const layout = computeTimelineLayout(spec);
  assert.ok(layout.width > 0);
  assert.ok(layout.height > 0);
  assert.equal(layout.events.length, 2);
});

test('edge case: evento con fecha inválida se descarta', () => {
  const spec = timelineSpecFromPayload({
    timeline: {
      events: [
        { id: 'e1', label: 'OK', date: '2026-01-15' },
        { id: 'e2', label: 'Bad', date: 'no-es-fecha' },
      ],
    },
  });
  const layout = computeTimelineLayout(spec);
  assert.equal(layout.events.length, 1, 'solo el evento válido');
});

test('opts.width define axisLen tope', () => {
  const spec = timelineSpecFromPayload(validPayload);
  const layout = computeTimelineLayout(spec, { width: 300 });
  assert.ok(layout.axisLen <= 300);
});