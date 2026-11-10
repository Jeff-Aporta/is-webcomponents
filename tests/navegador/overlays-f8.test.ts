// @contexto INDICE.md · tests/navegador/README.md
// overlays-f8.test.ts — overlays sobre la pila de capas de core/position.ts en un navegador real (Edge headless):
// dialog con un select abierto dentro (Escape cierra primero el select), drawer, window modal/no modal y confirm-modal
// (inert alrededor, Tab dentro, foco devuelto). Spec: specs/paridad-webawesome.md HOW-5.
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { correrCasos } from '../_shared/pagina.ts';
import { TIMEOUT_RENDER_NAVEGADOR } from '../_shared/navegador.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

test('navegador/overlays-f8: pila de capas en dialog, drawer, window y confirm-modal', { timeout: TIMEOUT_RENDER_NAVEGADOR }, async () => {
  const res = await correrCasos('tests/_shared/paginas/overlays-f8.ts');
  const fallos = Object.entries(res).filter(([, r]) => r !== true).map(([n, r]) => `${n}: ${r}`);
  console.log(`  ${Object.keys(res).length - fallos.length}/${Object.keys(res).length} casos en verde`);
  assert.deepEqual(fallos, []);
});

export default lista();
