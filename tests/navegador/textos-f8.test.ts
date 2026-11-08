// textos-f8.test.ts — textos fijos de interfaz por `t()` en un navegador real (Edge headless): toast, input, pagination,
// dialog y spinner en español y en inglés heredado de un ancestro (diccionario perezoso). Spec: specs/paridad-webawesome.md.
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { correrCasos } from '../_shared/pagina.ts';
import { TIMEOUT_RENDER_NAVEGADOR } from '../_shared/navegador.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

test('navegador/textos-f8: textos por t() en es y en', { timeout: TIMEOUT_RENDER_NAVEGADOR }, async () => {
  const res = await correrCasos('tests/_shared/paginas/textos-f8.ts');
  const fallos = Object.entries(res).filter(([, r]) => r !== true).map(([n, r]) => `${n}: ${r}`);
  console.log(`  ${Object.keys(res).length - fallos.length}/${Object.keys(res).length} casos en verde`);
  assert.deepEqual(fallos, []);
});

export default lista();
