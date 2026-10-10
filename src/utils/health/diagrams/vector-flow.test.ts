/**
 * Guardián WHAT del diagrama de flujo en vector.
 *   VF1 compila al flowchart: una columna = un carril, en orden; el grupo es el contexto del nodo.
 *   VF2 cada columna es estricta: un tipo que no acepta, un grupo no declarado, un nodo repetido o
 *       una arista a un nodo inexistente → error con el nodo, el tipo y la columna.
 *   VF3 un controller con `klass` y su POJO presente recibe la arista `klass` sola.
 *   VF4 el flowchart lo dibuja tal cual (`{ vectorFlow }`), con índices automáticos.
 */
import { assert, assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { validarVector, vectorAFlujo } from '../../../components/diagrams/vector-flow-spec.ts';
import { ZVectorFlow } from '../../../components/diagrams/vector-flow-spec.schemas.ts';
import { computeFlowchartLayout, resolveFlowchartSpec } from '../../../components/diagrams/flowchart-spec.ts';

const base = () => ({
  steps: 'auto' as const,
  columns: [
    { id: 'cli', label: 'Clientes', tipo: 'clientes', nodes: [{ id: 'c', kind: 'class', class: { name: 'TXClient' } }] },
    { id: 'cmp', label: 'Componentes', tipo: 'componentes', groups: [{ id: 'own', label: 'Propios (API)' }], nodes: [{ id: 'api', kind: 'component', component: { name: 'api' }, group: 'own' }, { id: 'fin', shape: 'end' }] },
    { id: 'flu', label: 'Flujo', tipo: 'flujo', nodes: [{ id: 'a', label: 'Valida' }, { id: 'd', label: '¿Ok?', shape: 'diamond' }, { id: 'b', label: 'Guarda' }] },
    { id: 'ctl', label: 'Controllers', tipo: 'controllers', nodes: [{ id: 'x', kind: 'class', class: { name: 'TXController' }, klass: 'p' }] },
    { id: 'mod', label: 'Modelos', tipo: 'modelos', nodes: [{ id: 'p', kind: 'class', class: { name: 'TX' } }] },
    { id: 'db', label: 'BD', tipo: 'tablas', nodes: [{ id: 't', kind: 'tableder', table: { name: 'tx', attributes: [] } }] },
  ],
  edges: [
    { from: 'c', to: 'api', label: 'fetch' }, { from: 'api', to: 'x' }, { from: 'x', to: 'a' }, { from: 'a', to: 'd' },
    { from: 'd', to: 'b', label: 'sí' }, { from: 'd', to: 'fin', label: 'no' }, { from: 'b', to: 'fin' }, { from: 'b', to: 't', kind: 'dashed', label: 'INSERT' },
  ],
});

Deno.test('vector: VF1 compila columnas a carriles y grupos a contextos', () => {
  const f = vectorAFlujo(base()) as { lanes: Array<{ id: string }>; nodes: Array<{ id: string; lane: string; context?: string }> };
  assertEquals(f.lanes.map((l) => l.id), ['cli', 'cmp', 'flu', 'ctl', 'mod', 'db']);
  const api = f.nodes.find((n) => n.id === 'api')!;
  assertEquals([api.lane, api.context], ['cmp', 'Propios (API)']);
});

Deno.test('vector: VF2 cada columna es estricta', () => {
  const v = base();
  v.columns[4]!.nodes.push({ id: 'y', kind: 'class', class: { name: 'TYController' } } as never);
  v.columns[2]!.nodes.push({ id: 'z', label: 'otro', group: 'nada' } as never);
  v.columns[5]!.nodes.push({ id: 'a', kind: 'tableder', table: { name: 'dup' } } as never);
  v.edges.push({ from: 'b', to: 'fantasma' });
  const errores = validarVector(ZVectorFlow.parse(v));
  assert(errores.some((e) => e.includes('«y» (controller)') && e.includes('«Modelos»')), errores.join('\n'));
  assert(errores.some((e) => e.includes('grupo «nada»')), 'grupo no declarado');
  assert(errores.some((e) => e.includes('«a» está en dos columnas')), 'nodo repetido');
  assert(errores.some((e) => e.includes('«fantasma»')), 'arista a nodo inexistente');
  assertThrows(() => vectorAFlujo(v), Error, 'Diagrama de flujo en vector inválido');
});

Deno.test('vector: VF3 controller con su POJO recibe la arista klass sola', () => {
  const f = vectorAFlujo(base()) as { edges: Array<{ from: string; to: string; label?: string; kind?: string }> };
  const k = f.edges.find((e) => e.from === 'x' && e.to === 'p');
  assertEquals([k?.label, k?.kind], ['klass', 'dashed']);
});

Deno.test('vector: VF4 el flowchart lo dibuja con índices automáticos', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec({ vectorFlow: base() })!, null, { style: 'insoft' });
  const idx = Object.fromEntries(L.nodes.map((n) => [n.id, n.stepLabel]));
  assertEquals([idx.c, idx.api, idx.x, idx.a, idx.d, idx.b], ['1', '2', '3', '4', '5', '5.1']);
  assertEquals(idx.t, undefined, 'la tabla solo se usa');
});
