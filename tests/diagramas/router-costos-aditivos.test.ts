/**
 * Guardián WHAT de los costos aditivos del router de rieles (A9), común a componentes, clases, DER y
 * flujo. Los cargos «+A» (giro, entrar a un agrupador, salir de él) SUMAN su parte al costo del
 * riel y ninguno anula ni escala a otro:
 *   A9.1 mientras el recorrido no cambia, subir el cargo de giro sube el costo de forma lineal
 *        (mismo incremento por cada paso igual del cargo) y el riel con giros cuesta más que con 0.
 *   A9.2 el cargo de entrar/salir de un agrupador suma lo mismo sea cual sea el cargo de giro.
 *   A9.3 sin giros ni agrupadores en el camino, esos cargos no cambian el costo.
 * Solo se mira lo que el router entrega (`paths`, `costs`), no cómo lo calcula.
 */
import { assert, assertAlmostEquals, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { routeEdges } from '../../src/components/diagrams/utils/component-router.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const denoTest = denoTestCon(test);


const A = { id: 'A', x: 40, y: 60, w: 120, h: 80 };
const B = { id: 'B', x: 520, y: 60, w: 120, h: 80 };
const C = { id: 'C', x: 520, y: 420, w: 120, h: 80 };
/** Agrupador que contiene al destino C: el riel A→C entra en él. */
const PKG = { id: 'P', x: 480, y: 380, w: 200, h: 160 };

const arista = (id: string, F: typeof A, T: typeof A, toPkgs: string[] = []) => ({
  id,
  from: { x: F.x + F.w, y: F.y + F.h / 2 }, fromSide: 'right' as const,
  to: { x: T.x + T.w / 2, y: T.y }, toSide: 'top' as const,
  fromBox: F, toBox: T, fromPkgs: new Set<string>(), toPkgs: new Set(toPkgs),
});
const recta = (id: string) => ({ ...arista(id, A, B), to: { x: B.x, y: B.y + B.h / 2 }, toSide: 'left' as const });

function ruta(e: ReturnType<typeof arista>, giro: number, entrar: number, conPaquete: boolean) {
  const world = { components: [A, B, C], packages: conPaquete ? [PKG] : [], titles: [], rings: [] };
  const r = routeEdges(world, [e], { step: 20, clearance: 20, lanePitch: 24, turnPenalty: giro, costs: { package: { enter: entrar, exit: entrar } } });
  assert(r.paths[0], `sin ruta (${e.id})`);
  return { costo: r.costs[0]!, camino: JSON.stringify(r.paths[0]) };
}

denoTest('router: A9.1 el cargo de giro suma de forma lineal mientras el recorrido no cambia', () => {
  const e = arista('ac', A, C);
  const [r1, r2, r3] = [400, 800, 1200].map((g) => ruta(e, g, 0, false));
  assertEquals(new Set([r1!.camino, r2!.camino, r3!.camino]).size, 1, 'precondición: el mismo recorrido');
  const d1 = r2!.costo - r1!.costo;
  const d2 = r3!.costo - r2!.costo;
  assert(d1 > 0, 'el riel A→C gira: subir el cargo de giro lo encarece');
  assertAlmostEquals(d1, d2, 1e-6, 'aditivo: cada paso igual del cargo suma lo mismo');
});

denoTest('router: A9.2 entrar/salir de un agrupador suma lo mismo sea cual sea el cargo de giro', () => {
  const e = arista('ac', A, C, ['P']);
  const incremento = (giro: number) => {
    const sin = ruta(e, giro, 0, true);
    const con = ruta(e, giro, 300, true);
    assertEquals(con.camino, sin.camino, 'precondición: el mismo recorrido');
    return con.costo - sin.costo;
  };
  const i1 = incremento(400);
  const i2 = incremento(1200);
  assert(i1 > 0, 'el riel entra al agrupador de C: el cargo de entrada lo encarece');
  assertAlmostEquals(i1, i2, 1e-6, 'el cargo de agrupador no depende del de giro (ninguno escala al otro)');
});

denoTest('router: A9.3 sin giros ni agrupadores en el camino esos cargos no cambian el costo', () => {
  const e = recta('ab');
  const base = ruta(e, 0, 0, true);
  const otra = ruta(e, 1200, 300, true);
  assertEquals(otra.camino, base.camino);
  assertAlmostEquals(otra.costo, base.costo, 1e-6, 'una recta fuera de todo agrupador no paga giro ni agrupador');
});

export default lista();
