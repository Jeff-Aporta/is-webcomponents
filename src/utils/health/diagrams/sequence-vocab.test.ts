/**
 * Guardianes WHAT del vocabulario común, la capa «curva» y las regiones del
 * diagrama de secuencia. Afirman el resultado, no la implementación.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyDiagramPolicy,
  getEdgeKind,
  listEdgeKinds,
  readEdgeStyle,
  recommendationFor,
} from '../../../components/diagrams/diagram-vocab.ts';
import { roundOrthogonalPath, styledEdgePath } from '../../../components/_shared/diagram-curve.ts';
import { pathPoints } from '../../../components/_shared/diagram-arrow.ts';
import { computeSequenceLayout, resolveSequenceSpec } from '../../../components/diagrams/sequence-spec.ts';
import { lineColor, paletteColor, pickThemeMode, sequencePaint } from '../../../components/diagrams/theme.ts';
import { ErThemeJsonSchema } from '../../../components/diagrams/theme.schemas.ts';
import { loadStylesDiagram, styleThemeFor } from '../../../components/diagrams/diagram-styles.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

Deno.test('vocabulario: cada familia tiene tipos y cada tipo dice dónde se recomienda', () => {
  for (const fam of ['connector', 'relational', 'signal', 'flow', 'structural'] as const) {
    assert(listEdgeKinds(fam).length > 0, `familia ${fam} vacía`);
  }
  for (const e of listEdgeKinds()) {
    assert(e.recommendedFor.length > 0, `${e.id} sin recomendación`);
    assert(e.usage.length > 20, `${e.id} sin uso descrito`);
  }
  assertEquals(getEdgeKind('assembly')?.direction, 'expose');
  assert(getEdgeKind('relation')?.cardinal, 'relation debe aceptar cardinalidad');
  assertEquals(getEdgeKind('signal')?.end, 'none');
  assertEquals(recommendationFor('assembly', 'component'), 'recommended');
  assertEquals(recommendationFor('assembly', 'sequence'), 'allowed');
  assertEquals(recommendationFor('no-existe', 'sequence'), 'unknown');
});

Deno.test('política: sin política todo pasa; con allow/deny se rechaza con motivo', () => {
  const edges = [
    { id: 'a', kind: 'assembly' },
    { id: 'b', kind: 'message-sync' },
    { id: 'c', kind: 'relation' },
  ];
  assertEquals(applyDiagramPolicy(null, edges, (e) => e.kind).rejected.length, 0);
  const soloSenales = applyDiagramPolicy({ allowFamilies: ['signal'] }, edges, (e) => e.kind);
  assertEquals(soloSenales.acceptedIds, ['b']);
  assertEquals(soloSenales.rejected.map((r) => r.id), ['a', 'c']);
  assert(soloSenales.rejected.every((r) => r.reason.includes('allowFamilies')));
  const sinRelacion = applyDiagramPolicy({ denyEdges: ['relation'] }, edges, (e) => e.kind);
  assertEquals(sinRelacion.acceptedIds, ['a', 'b']);
  assertEquals(readEdgeStyle({ componentDiagram: { layout: { edgeStyle: 'curved' } } }), 'curved');
  assertEquals(readEdgeStyle({ sequence: { policy: { edgeStyle: 'curved' } } }), 'curved');
  assertEquals(readEdgeStyle({ sequence: {} }), 'orthogonal');
});

Deno.test('curva: conserva extremos y vértices del recorrido ortogonal, es determinista y no toca rectas', () => {
  const d = 'M10,10 H100 V60 H200';
  const c = roundOrthogonalPath(d, 12);
  assert(c.includes('Q100,10'), 'el giro usa el vértice como control');
  assert(c.includes('Q100,60'), 'segundo giro');
  assert(c.startsWith('M10,10') && c.endsWith('L200,60'), `extremos intactos: ${c}`);
  assertEquals(c, roundOrthogonalPath(d, 12));
  assertEquals(styledEdgePath(d, 'orthogonal'), d);
  assertEquals(roundOrthogonalPath('M0,0 L50,0', 12), 'M0,0 L50,0');
  // El radio se acota a medio tramo: un tramo de 10 px no produce curvas de 12.
  const corto = roundOrthogonalPath('M0,0 H10 V100', 12);
  assert(corto.includes('L5,0 Q10,0 10,5'), corto);
  // Los puntos del path original siguen siendo alcanzables para las puntas.
  assertEquals(pathPoints(d).length, 4);
});

const SEQ = {
  sequence: {
    actors: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
    groups: [{ id: 'g1', name: 'Uno', color: 'auth' }, { id: 'g2', name: 'Dos', hue: 120 }],
    fragments: [
      { id: 'f1', kind: 'region', name: 'r', messages: ['m2', 'm3'] },
      { id: 'f2', kind: 'async', name: 's', messages: ['m3'], color: 'service' },
      { id: 'malo', kind: 'loop', name: 'x', messages: ['no-existe'] },
    ],
    messages: [
      { id: 'm1', from: 'a', to: 'b', label: 'uno', group: 'g1' },
      { id: 'm2', from: 'b', to: 'c', label: 'dos', group: 'g2' },
      { id: 'm3', from: 'c', to: 'b', label: 'tres', kind: 'async' },
      { id: 'm4', from: 'b', to: 'a', label: 'cuatro', kind: 'async' },
    ],
  },
};

Deno.test('secuencia: grupos con color por nombre y regiones acotadas a sus filas y lifelines', () => {
  const spec = resolveSequenceSpec(SEQ)!;
  assertEquals(spec.groups?.[0]?.color, 'auth');
  assertEquals(spec.fragments?.length, 3);
  const L = computeSequenceLayout(spec);
  assertEquals(L.messages.find((m) => m.id === 'm1')?.groupColor, 'auth');
  assertEquals(L.messages.find((m) => m.id === 'm2')?.groupHue, 120);
  // La región sin mensajes válidos se omite; m4 (async sin agrupar) recibe
  // su agrupador automático: los procesos asíncronos siempre van agrupados.
  assertEquals(L.fragments?.map((f) => f.id).sort(), ['auto-async-1', 'f1', 'f2']);
  assertEquals(L.fragments?.find((f) => f.id === 'auto-async-1')?.kind, 'async');
  const f1 = L.fragments!.find((f) => f.id === 'f1')!;
  const f2 = L.fragments!.find((f) => f.id === 'f2')!;
  const m1 = L.messages.find((m) => m.id === 'm1')!;
  const m2 = L.messages.find((m) => m.id === 'm2')!;
  const m3 = L.messages.find((m) => m.id === 'm3')!;
  const m4 = L.messages.find((m) => m.id === 'm4')!;
  // Verticalmente: la región cubre sus filas y deja fuera las ajenas.
  assert(f1.y < m2.labelY && f1.y + f1.h > m3.y, 'f1 cubre m2..m3');
  assert(f1.y > m1.y, 'f1 empieza después de m1');
  assert(f1.y + f1.h < m4.labelY, 'f1 termina antes del chip de m4');
  // Anidada: f2 dentro de f1 con sangría.
  assertEquals(f2.depth, 1);
  assert(f2.x > f1.x && f2.x + f2.w < f1.x + f1.w && f2.y > f1.y && f2.y + f2.h < f1.y + f1.h, 'f2 dentro de f1');
  // Horizontal: solo las lifelines que participan (b y c), no la de a.
  const ax = Object.fromEntries(L.actors.map((a) => [a.id, a.x]));
  assert(f1.x > ax.a, 'f1 no abarca la lifeline a');
  assert(f1.x < ax.b && f1.x + f1.w > ax.c, 'f1 abarca b y c');
  // Las filas de una región se abren: m2 queda más abajo que sin regiones.
  const sin = computeSequenceLayout(resolveSequenceSpec({ sequence: { ...SEQ.sequence, fragments: [] } })!);
  assert(m2.y > sin.messages.find((m) => m.id === 'm2')!.y, 'la región abre hueco');
  assert(L.height > sin.height);
});

Deno.test('secuencia: alt tras una región no se monta sobre ella', () => {
  const spec = resolveSequenceSpec({
    sequence: {
      actors: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      fragments: [{ id: 'f', kind: 'region', name: 'r', messages: ['p1', 'p2'] }],
      preamble: [
        { id: 'p1', from: 'a', to: 'b', label: 'uno' },
        { id: 'p2', from: 'b', to: 'a', label: 'dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos dos', kind: 'async' },
      ],
      alt: { branches: [{ condition: 'x', messages: [{ id: 'q1', from: 'a', to: 'b', label: 'tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres tres' }] }] },
    },
  })!;
  const L = computeSequenceLayout(spec);
  const f = L.fragments![0]!;
  assert(L.altBox!.y >= f.y + f.h, `alt (${L.altBox!.y}) monta la región (${f.y + f.h})`);
});

Deno.test('estilo insoft: trae tema de secuencia con tipografía, líneas por nombre y pintura completa', async () => {
  const file = join(ROOT, 'src', 'components', 'diagrams', 'themes', 'insoft-seq.json');
  assert(existsSync(file), 'falta themes/insoft-seq.json');
  const raw = ErThemeJsonSchema.passthrough().parse(JSON.parse(readFileSync(file, 'utf8')));
  assertEquals(raw.kind, 'sequence');
  assert(raw.font?.family?.includes('Poppins'));
  const light = pickThemeMode(raw, false);
  const dark = pickThemeMode(raw, true);
  for (const name of ['auth', 'seg', 'data', 'llm', 'stream', 'ticket', 'error', 'neutral']) {
    assert(/^#[0-9A-F]{6}$/i.test(lineColor(light, name) ?? ''), `línea ${name} sin color`);
    assert(lineColor(dark, name) !== lineColor(light, name), `línea ${name} igual en oscuro`);
  }
  assertEquals(lineColor(light, '#123456'), '#123456');
  assertEquals(paletteColor(light, 'primary'), '#7ACFF4');
  assertEquals(paletteColor(light, 'no-existe'), null);
  const p = sequencePaint(light);
  assertEquals(p.actorRadius, 0);
  assertEquals(p.labelFont?.includes('Poppins'), true);
  assert(sequencePaint(dark).actorFill !== p.actorFill, 'actor cambia en oscuro');
  // El naranja de entidad del DER no aparece en el tema de secuencia.
  assert(!JSON.stringify(raw).toUpperCase().includes('#F4B67B'));
  // Y el estilo lo publica junto a los otros tres.
  await loadStylesDiagram('insoft').catch(() => undefined);
  assert(styleThemeFor('insoft', 'sequence') !== null || !existsSync(join(ROOT, 'dist', 'cdn', 'diagrams', 'themes', 'insoft-seq.json')));
  assert(existsSync(join(ROOT, 'dist', 'cdn', 'diagrams', 'themes', 'insoft-seq.json')), 'el build no publicó insoft-seq.json');
});
