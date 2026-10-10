/**
 * Guardián WHAT de los índices automáticos del flujo (`steps: "auto"`).
 *   I1 sin ramas: 1, 2, 3.
 *   I2 una bifurcación del paso p abre p.1, p.2 (por lectura, de izquierda a derecha) y lo que sigue
 *      en cada rama cuelga de su cabeza (p.k.1, p.k.2); al reunirse se vuelve al nivel de p (p+1).
 *   I3 las ramas anidan (p.k.j…); una rama que va directo a la reunión no consume índice propio.
 *   I4 barras de paralelismo, inicio y fin no consumen número; un ciclo no rompe la numeración.
 *   I5 lo que solo se usa (punteadas: tablas, POJOs) no lleva índice.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { computeFlowchartLayout, resolveFlowchartSpec } from '../../../components/diagrams/flowchart-spec.ts';

type N = { id: string; label?: string; shape?: string };
const indices = (nodes: N[], edges: Array<{ from: string; to: string; kind?: string }>): Record<string, string | undefined> => {
  const L = computeFlowchartLayout(resolveFlowchartSpec({ steps: 'auto', nodes: nodes.map((n) => ({ label: n.id, ...n })), edges })!, null, { style: 'insoft' });
  return Object.fromEntries(L.nodes.filter((n) => n.shape !== 'comment').map((n) => [n.id, n.stepLabel]));
};

Deno.test('índices: I1 sin ramas son 1, 2, 3', () => {
  const r = indices([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }]);
  assertEquals([r.a, r.b, r.c], ['1', '2', '3']);
});

Deno.test('índices: I2 bifurcación p.k, seguidores p.k.j y reunión p+1', () => {
  const r = indices(
    [{ id: 'a' }, { id: 'd', shape: 'diamond' }, { id: 'x' }, { id: 'x2' }, { id: 'y' }, { id: 'y2' }, { id: 'm' }],
    [{ from: 'a', to: 'd' }, { from: 'd', to: 'x' }, { from: 'x', to: 'x2' }, { from: 'd', to: 'y' }, { from: 'y', to: 'y2' }, { from: 'x2', to: 'm' }, { from: 'y2', to: 'm' }],
  );
  assertEquals(r.a, '1');
  assertEquals(r.d, '2');
  assertEquals(new Set([r.x, r.y]), new Set(['2.1', '2.2']));
  assertEquals(r.x2, `${r.x}.1`);
  assertEquals(r.y2, `${r.y}.1`);
  assertEquals(r.m, '3');
});

Deno.test('índices: I3 ramas anidadas y rama directa a la reunión', () => {
  const r = indices(
    [{ id: 'd1', shape: 'diamond' }, { id: 'v' }, { id: 'd2', shape: 'diamond' }, { id: 'p' }, { id: 'q' }, { id: 'm' }],
    [{ from: 'd1', to: 'v' }, { from: 'd1', to: 'm' }, { from: 'v', to: 'd2' }, { from: 'd2', to: 'p' }, { from: 'd2', to: 'q' }, { from: 'p', to: 'm' }, { from: 'q', to: 'm' }],
  );
  assertEquals(r.d1, '1');
  const v = r.v!;
  assertEquals(v.split('.').length, 2, `v es cabeza de rama de 1: ${v}`);
  assertEquals(r.d2, `${v}.1`);
  assertEquals(new Set([r.p, r.q]), new Set([`${v}.1.1`, `${v}.1.2`]));
  assertEquals(r.m, '2');
});

Deno.test('índices: I4 barras, inicio y fin transparentes; ciclos sin romper', () => {
  const r = indices(
    [{ id: 'i', shape: 'start' }, { id: 'a' }, { id: 'f', shape: 'bar' }, { id: 'x' }, { id: 'y' }, { id: 'j', shape: 'bar' }, { id: 'z' }, { id: 'e', shape: 'end' }],
    [{ from: 'i', to: 'a' }, { from: 'a', to: 'f' }, { from: 'f', to: 'x' }, { from: 'f', to: 'y' }, { from: 'x', to: 'j' }, { from: 'y', to: 'j' }, { from: 'j', to: 'z' }, { from: 'z', to: 'e' }, { from: 'z', to: 'a' }],
  );
  assertEquals([r.i, r.f, r.j, r.e], [undefined, undefined, undefined, undefined]);
  assertEquals(r.a, '1');
  assertEquals(new Set([r.x, r.y]), new Set(['1.1', '1.2']));
  assertEquals(r.z, '2');
});

Deno.test('índices: I5 lo que solo se usa no lleva índice', () => {
  const r = indices([{ id: 'a' }, { id: 'b' }, { id: 't' }], [{ from: 'a', to: 'b' }, { from: 'b', to: 't', kind: 'dashed' }]);
  assertEquals([r.a, r.b, r.t], ['1', '2', undefined]);
});

Deno.test('índices: I6 una reunión dentro de una rama vuelve solo al nivel de quien bifurcó', () => {
  // ok(1) → sí: n(1.1) → d(1.1.1) → [t(1.1.1.1), (no)] → c(1.1.2); ok no → h; c → h(2)
  const r = indices(
    [{ id: 'ok', shape: 'diamond' }, { id: 'n' }, { id: 'd', shape: 'diamond' }, { id: 't' }, { id: 'c' }, { id: 'h' }],
    [{ from: 'ok', to: 'n' }, { from: 'ok', to: 'h' }, { from: 'n', to: 'd' }, { from: 'd', to: 't' }, { from: 'd', to: 'c' }, { from: 't', to: 'c' }, { from: 'c', to: 'h' }],
  );
  assertEquals(r.ok, '1');
  assertEquals(r.d, `${r.n}.1`);
  assertEquals(r.c, `${r.n}.2`, 'la reunión de d vuelve al nivel de d');
  assertEquals(r.h, '2', 'la reunión de ok vuelve al nivel de ok');
});
