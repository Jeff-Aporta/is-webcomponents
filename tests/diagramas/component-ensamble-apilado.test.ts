// tests/diagramas/component-ensamble-apilado.test.ts
//
// Guardián WHAT: en <iswc-component-diagram> ningún riel pasa por encima de una
// entidad y ninguna caja pisa a otra. Caso real (video DER, escena «lo que
// faltaba»): un ensamble -(O- con puertos left/right entre dos cajas APILADAS
// en la misma columna hacía que enforceAssemblyEntityMargins empujara la caja
// de arriba en horizontal hasta montarla sobre una tercera; el router se
// quedaba sin ruta y caía a una recta que cruzaba las entidades.

import { computeComponentLayout, resolveComponentSpec } from '../../src/components/diagrams/utils/component-spec.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

type Caja = { id: string; x: number; y: number; w: number; h: number };
const MARGEN = 2;
const solapan = (a: Caja, b: Caja): boolean =>
  a.x < b.x + b.w - MARGEN && b.x < a.x + a.w - MARGEN && a.y < b.y + b.h - MARGEN && b.y < a.y + a.h - MARGEN;

test('diagramas/component-ensamble-apilado: cajas sin solape y rieles fuera de las entidades', async () => {
  const url = new URL('./fixtures/component-ensamble-apilado.job.json', import.meta.url);
  const job = JSON.parse(await Deno.readTextFile(url)) as { payload: unknown };
  const spec = resolveComponentSpec(job.payload, {});
  if (!spec) throw new Error('spec null');
  const layout = computeComponentLayout(spec) as unknown as {
    components: Caja[];
    _routeViolations?: Array<{ id: string; rules: string[] }>;
  };
  const fallas: string[] = [];
  const cs = layout.components;
  for (let i = 0; i < cs.length; i++) for (let k = i + 1; k < cs.length; k++) {
    if (solapan(cs[i]!, cs[k]!)) fallas.push(`${cs[i]!.id} y ${cs[k]!.id} se solapan`);
  }
  for (const v of layout._routeViolations ?? []) {
    const graves = v.rules.filter((r) => r === 'sin-ruta' || r.startsWith('encima-entidad'));
    if (graves.length) fallas.push(`${v.id}: ${graves.join(', ')}`);
  }
  if (fallas.length) throw new Error(fallas.join('\n'));
});

export default lista();
