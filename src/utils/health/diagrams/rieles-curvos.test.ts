/**
 * Guardián WHAT de los estilos de riel (`_shared/diagram-curve`).
 *   C1 `curved` y `bezier` conservan los extremos del recorrido (puntas intactas) y su primer y último tramo rectos.
 *   C2 `bezier` redondea cada giro con la curva más amplia que cabe, sin pasar de BEZIER_MAX.
 *   C3 `orthogonal` (o cualquier otro) deja el path tal cual.
 *   C4 sin `edgeStyle`, `look="sketch"` (servilleta) usa `bezier`; uno explícito gana.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { BEZIER_MAX, styledEdgePath } from '../../../components/_shared/diagram-curve.ts';
import { edgeStyleFor } from '../../../components/diagrams/diagram-vocab.ts';

const D = 'M0,0 L0,200 L300,200 L300,220';

Deno.test('rieles: C1-C3 curvas sobre el mismo recorrido', () => {
  for (const estilo of ['curved', 'bezier']) {
    const d = styledEdgePath(D, estilo);
    assert(d.startsWith('M0,0 L'), `${estilo}: arranca en el origen con un tramo recto (${d})`);
    assert(d.endsWith('L300,220'), `${estilo}: termina recto en la punta (${d})`);
    assert(d.includes('Q0,200') && d.includes('Q300,200'), `${estilo}: el control de cada giro es su vértice`);
  }
  const b = styledEdgePath(D, 'bezier');
  assert(b.includes(`L0,${200 - BEZIER_MAX} Q0,200 ${BEZIER_MAX},200`), `C2 tope en tramo largo: ${b}`);
  assert(b.includes('Q300,200 300,210'), `C2 en tramo corto, la mitad: ${b}`);
  assertEquals(styledEdgePath(D, 'orthogonal'), D);
  assertEquals(styledEdgePath(D, undefined), D);
});

Deno.test('rieles: C4 la servilleta usa bezier salvo edgeStyle explícito', () => {
  const host = (look?: string) => ({ getAttribute: (k: string) => (k === 'look' ? look ?? null : null) }) as unknown as Element;
  assertEquals(edgeStyleFor(host('sketch'), {}), 'bezier');
  assertEquals(edgeStyleFor(host(), {}), 'orthogonal');
  assertEquals(edgeStyleFor(host('sketch'), { edgeStyle: 'curved' }), 'curved');
  assertEquals(edgeStyleFor(host(), { layout: { edgeStyle: 'bezier' } }), 'bezier');
});
