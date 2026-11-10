// @contexto INDICE.md · tests/navegador/README.md
// a11y-axe.test.ts — axe-core (solo dependencia de desarrollo, D6 de specs/paridad-webawesome.md) sobre una muestra por
// familia de HOW-7 (botón, campo, listbox, diálogo, pestañas, árbol) en Edge headless, entrando en los shadow roots.
// Trinquete: las reglas que hoy fallan están en PENDIENTES y solo pueden desaparecer; una regla nueva es rojo.
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { correrCasos } from '../_shared/pagina.ts';
import { TIMEOUT_RENDER_NAVEGADOR } from '../_shared/navegador.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

/** Reglas de axe que fallan hoy por muestra (se corrigen al migrar cada familia en su lote de F8). */
const PENDIENTES: Record<string, readonly string[]> = {
  // Medido 7-nov-2026 al registrar de verdad los tags en la página (antes la prueba corría en vacío: ver
  // tests/_shared/pagina.ts, ignoreAnnotations). F8 hito 6 corrigió lista (slot oculto en un `div hidden`), pestanas
  // (el host `role=tab` es el único enfocable) y arbol (todo `iswc-tree-item` es `treeitem`). Queda dialogo: la página
  // no carga el tema y `--iswc-bg` sin definir deja la caja transparente sobre el fondo al 55 %; arreglarlo pide un
  // color de respaldo en el tema o cargar el tema en la muestra.
  dialogo: ['color-contrast'],
};

test('navegador/a11y-axe: sin violaciones WCAG 2 A/AA nuevas por familia', { timeout: TIMEOUT_RENDER_NAVEGADOR }, async () => {
  const res = await correrCasos('tests/_shared/paginas/a11y-axe.ts');
  const nuevas: string[] = [];
  for (const [muestra, r] of Object.entries(res)) {
    const ids = r === true ? [] : r.split(',');
    console.log(`  ${muestra}: ${ids.length ? ids.join(', ') : 'sin violaciones'}`);
    for (const id of ids) if (!(PENDIENTES[muestra] ?? []).includes(id)) nuevas.push(`${muestra}: ${id}`);
  }
  const resueltas = Object.entries(PENDIENTES).flatMap(([m, ids]) => ids.filter((id) => !(String(res[m]).split(',').includes(id))).map((id) => `${m}: ${id}`));
  if (resueltas.length) console.log(`  resueltas (quitar de PENDIENTES): ${resueltas.join('; ')}`);
  assert.deepEqual(nuevas, []);
});

export default lista();
