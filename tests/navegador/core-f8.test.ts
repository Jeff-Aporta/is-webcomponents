// @contexto INDICE.md · tests/navegador/README.md
// core-f8.test.ts — molde reactivo de F8 en un navegador real (Edge headless): IswcReactive (@prop/@state/@watch,
// planificador, `html`, `repetir`, `svg`), IswcFormControl (FormData, validez, estados user-*), localize (t(), idioma
// heredado y diccionario perezoso), PropsElement sobre IswcReactive (pintado síncrono, uno por cambio) y la pila de
// capas de position.ts (inert, Escape solo arriba, foco devuelto). Spec: specs/paridad-webawesome.md.
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { correrCasos } from '../_shared/pagina.ts';
import { TIMEOUT_RENDER_NAVEGADOR } from '../_shared/navegador.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

test('navegador/core-f8: casos del molde reactivo en Edge', { timeout: TIMEOUT_RENDER_NAVEGADOR }, async () => {
  const res = await correrCasos('tests/_shared/paginas/core-f8.ts');
  const fallos = Object.entries(res).filter(([, r]) => r !== true).map(([n, r]) => `${n}: ${r}`);
  console.log(`  ${Object.keys(res).length - fallos.length}/${Object.keys(res).length} casos en verde`);
  assert.deepEqual(fallos, []);
});

export default lista();
