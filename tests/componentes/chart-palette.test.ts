// apps/AppWebcomponents/components/_shared/chart-palette.selfcheck.mjs
import assert from 'node:assert';
import { resolvePaletteKey, resolveMode } from '../../src/components/charts/utils/chart-palette.js';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

test('componentes/chart-palette', async () => {
  assert.strictEqual(resolvePaletteKey('turquesa'), 'turquesa');
  assert.strictEqual(resolvePaletteKey('nonexistent'), 'delfin');
  assert.strictEqual(resolvePaletteKey(null), 'delfin');
  assert.strictEqual(resolveMode(true), 'light');
  assert.strictEqual(resolveMode(false), 'dark');

  console.log('chart-palette self-check: PASS');
});

export default lista();
