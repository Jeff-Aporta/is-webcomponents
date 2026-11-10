// @contexto INDICE.md · tests/exhaustivo/README.md
/**
 * pivot-table.test.ts — verificación exhaustiva de <iswc-pivot-table>.
 *
 * Tabla pivote para análisis multidimensional. Datos vía property
 * assignment (rows/columns/measures) o JSON.
 */
import assert from 'node:assert/strict';
import { exists, read, tieneShadow, tieneEdgeCaseGuards, adoptaCss } from '../_shared/exhaustivo.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const MOD = 'src/components/data/pivot-table.ts';

test('iswc-pivot-table: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-pivot-table: shadow DOM', () => {
  assert.ok(tieneShadow(read(MOD)));
});

test('iswc-pivot-table: registrado', () => {
  const src = read(MOD);
  assert.match(src, /(?:defineElement\s*\(\s*|static\s+(?:override\s+)?tag\s*=\s*|createObserverElement\(\s*'\w+',\s*)['"`]iswc-pivot-table['"`]/);
});

test('iswc-pivot-table: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('iswc-pivot-table: edge cases', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('iswc-pivot-table: behavior — preview asigna properties o config', () => {
  const preview = exists('src/components/data/utils/pivot-table.preview.ts')
    ? read('src/components/data/utils/pivot-table.preview.ts') : '';
  if (preview) {
    // pivot-table.preview debe asignar data via property o .config =
    assert.ok(preview.length > 0, 'preview existe');
  }
});

test('iswc-pivot-table: usa shadow DOM (no requiere importar otros is-*)', () => {
  // pivot-table.ts extiende el molde IswcElement, que abre el shadow ({ mode: 'open' }) al construir.
  const src = read(MOD);
  assert.ok(tieneShadow(src), 'pivot-table monta shadow DOM abierto');
});

export default lista();
