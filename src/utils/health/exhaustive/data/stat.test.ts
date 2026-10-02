/**
 * stat.test.ts — verificación exhaustiva de <iswc-stat>.
 *
 * Stat/KPI card. Atributos: label, value, helper, trend, trend-direction,
 * icon, color. Slots: label, value, helper, trend, icon. Events: ninguno.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exists,
  read,
  extraerObservados,
  extraerEventos,
  extraerSlots,
  extraerParts,
  tieneShadow,
  tieneEdgeCaseGuards,
  adoptaCss,
  estaRegistrado,
  tieneAccesibilidad,
} from '../_helpers.ts';

const MOD = 'src/components/data/stat.ts';

test('iswc-stat: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-stat: render — shadow DOM', () => {
  assert.ok(tieneShadow(read(MOD)));
});

test('iswc-stat: observados (label, value, helper, trend, trend-direction, icon, color)', () => {
  const obs = extraerObservados(read(MOD));
  for (const k of ['label', 'value', 'helper', 'trend', 'trend-direction', 'icon', 'color']) {
    assert.ok(obs.includes(k), `stat declara ${k}`);
  }
});

test('iswc-stat: slots (label, value, helper, trend, icon)', () => {
  const slots = extraerSlots(read(MOD));
  for (const k of ['label', 'value', 'helper', 'trend', 'icon']) {
    assert.ok(slots.includes(k), `stat slot ${k}: actual=${slots.join(',')}`);
  }
});

test('iswc-stat: CSS parts (base, head, label, value, foot, trend, helper, icon)', () => {
  const parts = extraerParts(read(MOD));
  for (const k of ['base', 'label', 'value', 'helper', 'trend', 'icon']) {
    assert.ok(parts.includes(k), `stat part ${k}: actual=${parts.join(',')}`);
  }
});

test('iswc-stat: eventos (stat no emite eventos según docs)', () => {
  const evts = extraerEventos(read(MOD));
  // stat es display-only: docs no declaran eventos.
  assert.equal(evts.length, 0, `stat no debe emitir eventos (encontró: ${evts.join(',')})`);
});

test('iswc-stat: edge cases — fallback a defaults (stat usa || " ")', () => {
  // stat.ts usa `getAttribute('label') || ''` para fallar con seguridad.
  const src = read(MOD);
  assert.match(src, /getAttribute\([^)]+\)\s*\|\|\s*['"`]/);
});

test('iswc-stat: accesibilidad', () => {
  assert.ok(tieneAccesibilidad(read(MOD)));
});

test('iswc-stat: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('iswc-stat: registrado vía defineElement', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-stat['"`]/);
  assert.ok(estaRegistrado(src, 'iswc-stat'));
});
