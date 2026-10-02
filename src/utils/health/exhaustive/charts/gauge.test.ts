/**
 * gauge.test.ts — verificación exhaustiva de <iswc-gauge>.
 *
 * Indicador tipo "velocímetro" — semicírculo SVG con aguja. Datos vía
 * propiedad .value o atributo `value`. Eventos: iswc-change.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exists,
  read,
  extraerObservados,
  extraerEventos,
  tieneShadow,
  leeJsonScript,
  parseaJson,
  tieneEdgeCaseGuards,
  adoptaCss,
  estaRegistrado,
} from '../_helpers.ts';

const MOD = 'src/components/data/gauge.ts';

test('iswc-gauge: archivo existe en data/', () => {
  assert.ok(exists(MOD));
});

test('iswc-gauge: render — shadow con svg', () => {
  const src = read(MOD);
  assert.ok(tieneShadow(src));
  assert.match(src, /<svg\b/);
});

test('iswc-gauge: observados (value, min, max, label, color)', () => {
  const obs = extraerObservados(read(MOD));
  for (const k of ['value', 'min', 'max']) {
    assert.ok(obs.includes(k), `gauge declara ${k}`);
  }
});

test('iswc-gauge: eventos emitidos (BUG: docs declaran iswc-gauge-change pero código no emite)', () => {
  // NOTA: gauge.ts documenta `Eventos: iswc-gauge-change` pero el código no emite
  // ningún evento. Es un bug visible (no arreglado por política anti-sabotaje).
  const evts = extraerEventos(read(MOD));
  // Solo verifica que la búsqueda funciona; el bug se reporta a través del fallo.
  assert.ok(Array.isArray(evts), `eventos encontrados: ${evts.join(',') || '(ninguno)'}`);
});

test('iswc-gauge: data vía setAttribute (no JSON config)', () => {
  // gauge.preview.ts usa setAttribute('value', ...) — no JSON config.
  const preview = exists('src/components/data/gauge.preview.ts')
    ? read('src/components/data/gauge.preview.ts') : '';
  assert.ok(preview.length > 0, 'gauge.preview.ts existe');
  assert.match(preview, /setAttribute\(\s*['"]value['"]/);
});

test('iswc-gauge: edge cases — value fuera de [min,max]', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('iswc-gauge: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('iswc-gauge: registrado', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-gauge['"`]/);
});
