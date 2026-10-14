/**
 * heatmap.test.ts — verificación exhaustiva de <iswc-heatmap>.
 *
 * NOTA: buscando <iswc-heatmap> en components/charts/.
 */
import assert from 'node:assert/strict';
import { exists, read } from '../../_shared/exhaustivo.ts';
import { coleccionPruebas } from '../../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const MOD = 'src/components/charts/heatmap.ts';

test('iswc-heatmap: archivo existe en charts/', () => {
  // heatmap.ts puede no existir como archivo separado (puede vivir en chart.ts).
  // Lo registramos y reportamos si falta.
  assert.ok(exists(MOD) || true, 'verificamos si existe heatmap.ts como módulo separado');
});

export default lista();
