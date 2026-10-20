/**
 * Guardián WHAT de los índices automáticos del flujo (`steps: "auto"`).
 *   I1 sin ramas: 1, 2, 3 (los hermanos incrementan; nunca se concatenan 1s).
 *   I2 lo que cuelga de una bifurcación del paso p se numera p.1, p.2, p.3… en orden de lectura,
 *      rama tras rama; al reunirse se vuelve al nivel de p (p+1).
 *   I3 una bifurcación anidada abre su nivel (p.k.1…); una rama que va directo a la reunión no consume índice.
 *   I4 barras de paralelismo, inicio y fin no consumen número; un ciclo no rompe la numeración.
 *   I5 lo que solo se usa (punteadas: tablas, POJOs) no lleva índice.
 *   I6 una reunión dentro de una rama vuelve solo al nivel de quien bifurcó.
 *   I7 caso real (ruta de parches): 1, 2, 2.1, 2.2, 2.2.1, 2.2.2, 3.
 *   I8 las entidades de la entrada (cliente, componente, controller) no llevan número: solo los pasos.
 *   I9 en las rutas reales no hay huecos: en cada nivel los índices van 1..n seguidos.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fileURLToPath } from 'node:url';
import { RefObj } from '../../src/vendor-distributions/shared/lib/ref-obj.ts';
import { computeFlowchartLayout, resolveFlowchartSpec } from '../../src/components/diagrams/utils/flowchart-spec.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { conFixtureIss } from '../_shared/iss-fixture.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test: registrar, lista } = coleccionPruebas({ categoria: 'what' });
// Los casos que leen el fixture del ISS (D:\Dev, fuera del VPS) se saltan si no está.
const test = conFixtureIss(registrar);

const denoTest = denoTestCon(test);


type N = { id: string; label?: string; shape?: string };
const indices = (nodes: N[], edges: Array<{ from: string; to: string; kind?: string }>): Record<string, string | undefined> => {
  const L = computeFlowchartLayout(resolveFlowchartSpec({ steps: 'auto', nodes: nodes.map((n) => ({ label: n.id, ...n })), edges })!, null, { style: 'insoft' });
  return Object.fromEntries(L.nodes.filter((n) => n.shape !== 'comment').map((n) => [n.id, n.stepLabel]));
};
const porIndice = (a: string, b: string): number => a.localeCompare(b, 'es', { numeric: true });

denoTest('índices: I1 sin ramas son 1, 2, 3', () => {
  const r = indices([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }]);
  assertEquals([r.a, r.b, r.c], ['1', '2', '3']);
});

denoTest('índices: I2 lo de una bifurcación es p.1, p.2… rama tras rama y la reunión es p+1', () => {
  const r = indices(
    [{ id: 'a' }, { id: 'd', shape: 'diamond' }, { id: 'x' }, { id: 'x2' }, { id: 'y' }, { id: 'y2' }, { id: 'm' }],
    [{ from: 'a', to: 'd' }, { from: 'd', to: 'x' }, { from: 'x', to: 'x2' }, { from: 'd', to: 'y' }, { from: 'y', to: 'y2' }, { from: 'x2', to: 'm' }, { from: 'y2', to: 'm' }],
  );
  assertEquals([r.a, r.d, r.m], ['1', '2', '3']);
  // Cada rama sigue numerando donde quedó la anterior (orden de lectura): 2.1, 2.2 | 2.3, 2.4.
  const ramas = [[r.x!, r.x2!], [r.y!, r.y2!]].sort((p, q) => porIndice(p[0]!, q[0]!));
  assertEquals(ramas, [['2.1', '2.2'], ['2.3', '2.4']]);
});

denoTest('índices: I3 bifurcación anidada y rama directa a la reunión', () => {
  const r = indices(
    [{ id: 'd1', shape: 'diamond' }, { id: 'v' }, { id: 'd2', shape: 'diamond' }, { id: 'p' }, { id: 'q' }, { id: 'm' }],
    [{ from: 'd1', to: 'v' }, { from: 'd1', to: 'm' }, { from: 'v', to: 'd2' }, { from: 'd2', to: 'p' }, { from: 'd2', to: 'q' }, { from: 'p', to: 'm' }, { from: 'q', to: 'm' }],
  );
  assertEquals([r.d1, r.v, r.d2], ['1', '1.1', '1.2']);
  assertEquals(new Set([r.p, r.q]), new Set(['1.2.1', '1.2.2']));
  assertEquals(r.m, '2');
});

denoTest('índices: I4 barras, inicio y fin transparentes; ciclos sin romper', () => {
  const r = indices(
    [{ id: 'i', shape: 'start' }, { id: 'a' }, { id: 'f', shape: 'bar' }, { id: 'x' }, { id: 'y' }, { id: 'j', shape: 'bar' }, { id: 'z' }, { id: 'e', shape: 'end' }],
    [{ from: 'i', to: 'a' }, { from: 'a', to: 'f' }, { from: 'f', to: 'x' }, { from: 'f', to: 'y' }, { from: 'x', to: 'j' }, { from: 'y', to: 'j' }, { from: 'j', to: 'z' }, { from: 'z', to: 'e' }, { from: 'z', to: 'a' }],
  );
  assertEquals([r.i, r.f, r.j, r.e], [undefined, undefined, undefined, undefined]);
  assertEquals(r.a, '1');
  assertEquals(new Set([r.x, r.y]), new Set(['1.1', '1.2']));
  assertEquals(r.z, '2');
});

denoTest('índices: I5 lo que solo se usa no lleva índice', () => {
  const r = indices([{ id: 'a' }, { id: 'b' }, { id: 't' }], [{ from: 'a', to: 'b' }, { from: 'b', to: 't', kind: 'dashed' }]);
  assertEquals([r.a, r.b, r.t], ['1', '2', undefined]);
});

denoTest('índices: I6 una reunión dentro de una rama vuelve solo al nivel de quien bifurcó', () => {
  // ok(1) → sí: n(1.1) → d(1.2) → [t(1.2.1), (no)] → c(1.3); ok no → h; c → h(2)
  const r = indices(
    [{ id: 'ok', shape: 'diamond' }, { id: 'n' }, { id: 'd', shape: 'diamond' }, { id: 't' }, { id: 'c' }, { id: 'h' }],
    [{ from: 'ok', to: 'n' }, { from: 'ok', to: 'h' }, { from: 'n', to: 'd' }, { from: 'd', to: 't' }, { from: 'd', to: 'c' }, { from: 't', to: 'c' }, { from: 'c', to: 'h' }],
  );
  assertEquals([r.ok, r.n, r.d, r.t], ['1', '1.1', '1.2', '1.2.1']);
  assertEquals(r.c, '1.3', 'la reunión de d vuelve al nivel de d');
  assertEquals(r.h, '2', 'la reunión de ok vuelve al nivel de ok');
});

denoTest('índices: I7 caso real de la ruta de parches', () => {
  const r = indices(
    [{ id: 'ini', shape: 'start' }, { id: 'a' }, { id: 'b', shape: 'diamond' }, { id: 'x' }, { id: 'c' }, { id: 'd', shape: 'diamond' }, { id: 'f' }, { id: 'g' }, { id: 'fin', shape: 'end' }],
    [
      { from: 'ini', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'x' }, { from: 'b', to: 'c' }, { from: 'c', to: 'd' },
      { from: 'd', to: 'x' }, { from: 'd', to: 'f' }, { from: 'f', to: 'g' }, { from: 'g', to: 'fin' }, { from: 'x', to: 'fin' },
    ],
  );
  assertEquals([r.a, r.b, r.c, r.d, r.f, r.g, r.x], ['1', '2', '2.1', '2.2', '2.2.1', '2.2.2', '3']);
});

denoTest('índices: I8 las entidades de la entrada no llevan número', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec({
    steps: 'auto',
    nodes: [
      { id: 'cli', kind: 'class', label: 'TClient', class: { name: 'TClient' } },
      { id: 'api', kind: 'component', label: 'api', component: { name: 'flowchart-indices: api' } },
      { id: 'ctl', kind: 'class', label: 'TCtl', class: { name: 'TCtl' } },
      { id: 'a', label: 'a' },
      { id: 'b', label: 'b' },
    ],
    edges: [{ from: 'cli', to: 'api' }, { from: 'api', to: 'ctl' }, { from: 'ctl', to: 'a' }, { from: 'a', to: 'b' }],
  })!, null, { style: 'insoft' });
  const r = Object.fromEntries(L.nodes.map((n) => [n.id, n.stepLabel]));
  assertEquals([r.cli, r.api, r.ctl, r.a, r.b], [undefined, undefined, undefined, '1', '2']);
});

denoTest('índices: I9 sin huecos en ningún nivel (rutas reales)', async () => {
  const dir = new URL('../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);
  const huecos: string[] = [];
  for await (const f of Deno.readDir(dir)) {
    if (!f.name.startsWith('ruta-')) continue;
    const url = new URL(f.name, dir);
    const crudo = JSON.parse(await Deno.readTextFile(url));
    const j = await RefObj.resolver(crudo, { base: fileURLToPath(url), cargar: async (u: string) => JSON.parse(await Deno.readTextFile(u)) }) as { payload: Record<string, unknown> };
    const L = computeFlowchartLayout(resolveFlowchartSpec(j.payload)!, null, { style: 'insoft' });
    const porNivel = new Map<string, number[]>();
    for (const n of L.nodes) {
      if (!n.stepLabel) continue;
      const partes = n.stepLabel.split('.');
      const padre = partes.slice(0, -1).join('.');
      porNivel.set(padre, [...(porNivel.get(padre) ?? []), Number(partes.at(-1))]);
    }
    for (const [padre, ns] of porNivel) {
      const orden = [...ns].sort((a, b) => a - b);
      if (orden.some((v, i) => v !== i + 1)) huecos.push(`${f.name}: nivel «${padre || 'raíz'}» = ${orden.join(',')}`);
    }
  }
  assertEquals(huecos, []);
});

export default lista();
