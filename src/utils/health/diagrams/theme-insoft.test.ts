/** Auto-check: tema InSoft = paleta der.svg / render-iswc.mjs */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  resolveErTheme,
  json2css,
  entityPaint,
  clusterPalette,
  edgePaint,
  findOrphanEntityIds,
  themeToDiagramTheme,
} from '../../../components/diagrams/theme.ts';

Deno.test('insoft theme resolves and matches der.svg palette', () => {
  const t = resolveErTheme('insoft');
  assertEquals(t?.id, 'insoft');
  assertEquals(entityPaint(t!, false).fill, '#F4B67B');
  assertEquals(entityPaint(t!, true).fill, '#BFFFC0');
  assertEquals(clusterPalette(t!, 'g_oper').fill, '#7ACFF4');
  assertEquals(clusterPalette(t!, 'g_conf').fill, '#00C3C4');
  assertEquals(clusterPalette(t!, 'g_seg').fill, '#C0C000');
  assertEquals(clusterPalette(t!, 'g_terc').fill, '#BFC0C1');
  assertEquals(edgePaint(t!).stroke, '#3D5A80');
  assertEquals(edgePaint(t!).hideLabels, true);
  assertEquals(themeToDiagramTheme(t!).text, '#0F172A');
});

Deno.test('json2css emits Poppins + CSS vars', () => {
  const css = json2css(resolveErTheme('insoft')!);
  assertEquals(css.includes('Poppins'), true);
  assertEquals(css.includes('--er-entity-fill: #F4B67B'), true);
  assertEquals(css.includes('@import url('), true);
});

Deno.test('findOrphanEntityIds', () => {
  const orphans = findOrphanEntityIds(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    [{ from: 'a', to: 'b' }],
  );
  assertEquals([...orphans], ['c']);
});

Deno.test('payload theme resolution', () => {
  const t = resolveErTheme({ erDiagram: { theme: 'insoft', entities: [] } });
  assertEquals(t?.id, 'insoft');
});
