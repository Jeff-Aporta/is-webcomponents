/**
 * Guardián WHAT del código de color por tipo de entidad en el flujo.
 *   C1 cada tipo (cliente, componente, controller, POJO, tabla) tiene un solo color y ningún color se
 *      repite entre tipos; sin config, tonos OKLCH entre 0° y 330°.
 *   C2 `config.entityColors` del consumidor manda por tipo.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { coloresDeEntidad, resolveFlowchartSpec, TIPOS_ENTIDAD } from '../../../components/diagrams/flowchart-spec.ts';
import { hexToOklch } from '../../../components/_shared/oklch.ts';

const spec = (config?: unknown) => resolveFlowchartSpec({
  ...(config ? { config } : {}),
  nodes: [
    { id: 'cli', kind: 'class', class: { name: 'TXClient' } },
    { id: 'api', kind: 'component', component: { name: 'api' } },
    { id: 'ext', kind: 'component', component: { name: 'OpenAI' } },
    { id: 'c1', kind: 'class', class: { name: 'TAController' } },
    { id: 'c2', kind: 'class', class: { name: 'TBController' } },
    { id: 'p1', kind: 'class', class: { name: 'TA' } },
    { id: 't1', kind: 'tableder', table: { name: 'ta', attributes: [] } },
    { id: 's', label: 'paso' },
  ],
  edges: [{ from: 'cli', to: 'api' }, { from: 'api', to: 's' }],
})!;
const fill = (n: { embed?: { kind?: string; class?: Record<string, unknown>; component?: Record<string, unknown>; table?: Record<string, unknown> } }): string =>
  String(n.embed?.class?.fill ?? n.embed?.component?.fill ?? (n.embed?.table?.style as { fill?: string } | undefined)?.fill ?? '');

Deno.test('colores: C1 uno por tipo y sin repetir entre tipos', () => {
  const N = new Map(spec().nodes.map((n) => [n.id, fill(n)]));
  assertEquals(N.get('c1'), N.get('c2'), 'mismos controllers, mismo color');
  assertEquals(N.get('api'), N.get('ext'), 'componentes propios y externos, mismo color');
  const porTipo = [N.get('cli'), N.get('api'), N.get('c1'), N.get('p1'), N.get('t1')];
  assertEquals(new Set(porTipo).size, 5, `colores: ${porTipo.join(' ')}`);
  const tonos = Object.values(coloresDeEntidad()).map((h) => { const t = hexToOklch(h)![2]; return t >= 355 ? t - 360 : t; });
  assert(tonos.every((h) => h >= -1 && h <= 331), `tonos en 0°–330°: ${tonos.map((h) => h.toFixed(0)).join(' ')}`);
  assertEquals(TIPOS_ENTIDAD.length, 5);
});

Deno.test('colores: C2 el consumidor fija el color de un tipo', () => {
  const N = new Map(spec({ entityColors: { tabla: '#F4B67B' } }).nodes.map((n) => [n.id, fill(n)]));
  assertEquals(N.get('t1'), '#F4B67B');
});
