/**
 * Guardianes WHAT del flowchart estilo insoft (actividad a lo Visual
 * Paradigm) y de los nodos especiales (`kind`: nested / tableder /
 * component). Afirman QUÉ cumple el resultado: tokens del tema, geometría
 * del rombo, columna principal recta, rutas ortogonales sin tocar cajas,
 * etiquetas junto a la arista y el contrato de `kind`.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStylesDiagram, styleThemeFor } from '../../../components/diagrams/diagram-styles.ts';
import { pickThemeMode } from '../../../components/diagrams/theme.ts';
import {
  computeFlowchartLayout,
  decisionGeometry,
  flowchartSpecToJson,
  flowPaint,
  resolveFlowchartSpec,
} from '../../../components/diagrams/flowchart-spec.ts';
import {
  embedDiagramOf,
  fitContain,
  NESTED_DEFAULT_MAX,
  readNodeEmbed,
} from '../../../components/_shared/diagram-embed.ts';
import { pathPoints } from '../../../components/_shared/diagram-arrow.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
// Fixtures: payloads de flujo estables (copias de los primeros labs), independientes de lo que el lab regenere.
const LAB = join(ROOT, 'src', 'utils', 'health', 'diagrams', 'fixtures');
const labPayload = (slug: string): unknown => JSON.parse(readFileSync(join(LAB, `${slug}.json`), 'utf8')).payload;

type Caja = { x: number; y: number; w: number; h: number };
const solapan = (a: Caja, b: Caja): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Luminancia relativa WCAG de un #RRGGBB. */
function luminancia(hex: string): number {
  const c = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}
const contraste = (a: string, b: string): number => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

await loadStylesDiagram('insoft');

// ── Tema ───────────────────────────────────────────────────────────────

Deno.test('estilo insoft trae tema flowchart y sus colores salen de los tokens de la paleta', () => {
  const t = styleThemeFor('insoft', 'flowchart');
  assertEquals(t?.kind, 'flowchart');
  const p = flowPaint(t!);
  // El celeste de las acciones es el `primary` de la paleta InSoft (el mismo del DER/componentes).
  assertEquals(p.actionFill, styleThemeFor('insoft', 'er')?.cluster?.palettes?.primary);
  assertEquals(p.decisionFill, p.actionFill);
  assert(!p.actionFill.startsWith('primary') && p.actionBorder.startsWith('#'), 'tokens sin resolver');
});

Deno.test('contraste AA del texto de acciones y etiquetas en claro y oscuro', () => {
  const t = styleThemeFor('insoft', 'flowchart')!;
  for (const dark of [false, true]) {
    const p = flowPaint(pickThemeMode(t, dark));
    assert(contraste(p.actionText, p.actionFill) >= 4.5, `${dark ? 'oscuro' : 'claro'}: texto/acción ${contraste(p.actionText, p.actionFill).toFixed(2)}`);
    assert(contraste(p.labelText, p.background) >= 4.5, `${dark ? 'oscuro' : 'claro'}: etiqueta/lienzo`);
    assert(contraste(p.edgeStroke, p.background) >= 3, `${dark ? 'oscuro' : 'claro'}: arista/lienzo`);
  }
});

// ── Rombo por el rect del texto ────────────────────────────────────────

Deno.test('decisión: el rect del texto queda inscrito y el rombo no queda aplanado (vértices laterales no agudos)', () => {
  for (const [w, n] of [[120, 1], [200, 1], [150, 2]] as const) {
    const g = decisionGeometry(w, n);
    const r = g.rect;
    assert(r.w >= w, 'el rect contiene el texto');
    // Esquina del rect dentro del rombo: |dx|/(W/2) + |dy|/(H/2) <= 1.
    const k = (r.w / 2) / (g.w / 2) + (r.h / 2) / (g.h / 2);
    assert(k <= 1 + 1e-9, `rect fuera del rombo (${k})`);
    // Alto ≥ la mitad del ancho (vértice lateral ≥ ~53°), salvo el redondeo a la rejilla de 16.
    assert(g.h >= g.w * 0.5 - 16, `rombo aplanado (${g.w}×${g.h})`);
    assert(g.w <= 2 * r.w + 16, 'no más ancho que el doble del texto');
    assertEquals(g.w % 16, 0);
    assertEquals(g.h % 16, 0);
  }
});

// ── Layout insoft ──────────────────────────────────────────────────────

const parches = () => computeFlowchartLayout(resolveFlowchartSpec(labPayload('parches-de-datos'))!, null, { style: 'insoft' });

Deno.test('insoft: columna principal recta, sin solapes y aristas ortogonales que no atraviesan cajas', () => {
  const L = parches();
  const by = new Map(L.nodes.map((n) => [n.id, n]));
  const cx = (id: string): number => by.get(id)!.x + by.get(id)!.w / 2;
  for (const id of ['inicio', 'A', 'B', 'C', 'D', 'F', 'G', 'fin']) assertEquals(cx(id), cx('A'), `${id} fuera de la columna`);
  for (const a of L.nodes) for (const b of L.nodes) if (a !== b) assert(!solapan(a, b), `${a.id} y ${b.id} se solapan`);
  for (const e of L.edges) {
    const pts = pathPoints(e.path);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]!;
      const q = pts[i]!;
      assert(p.x === q.x || p.y === q.y, `${e.id}: tramo diagonal`);
      for (const n of L.nodes) {
        if (n.id === e.from || n.id === e.to) continue;
        const caja = { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.abs(q.x - p.x) || 0.1, h: Math.abs(q.y - p.y) || 0.1 };
        assert(!solapan(caja, n), `${e.id} atraviesa ${n.id}`);
      }
    }
  }
});

Deno.test('insoft: las ramas de una decisión salen por el vértice lateral y la etiqueta va pegada a su riel, por su lado largo, sin taparlo', () => {
  const L = parches();
  const B = L.nodes.find((n) => n.id === 'B')!;
  const no = L.edges.find((e) => e.from === 'B' && e.to === 'X')!;
  const p0 = pathPoints(no.path)[0]!;
  assert(p0.y === B.y + B.h / 2 && (p0.x === B.x || p0.x === B.x + B.w), 'la rama "no" debe salir por un vértice lateral');
  for (const e of L.edges.filter((x) => x.label)) {
    const c = e.labelBox!;
    assert(c, `${e.id}: etiqueta sin caja`);
    const pts = pathPoints(e.path);
    // Coherencia (a media U ≈ 7,5 px del riel): horizontal → el riel pasa por encima o debajo y recorre todo su lado largo.
    const coherente = pts.slice(1).some((q, k) => {
      const p = pts[k]!;
      if (e.labelVertical) return p.x === q.x && (Math.abs(c.x + c.w - p.x) <= 9 || Math.abs(c.x - p.x) <= 9) && c.y >= Math.min(p.y, q.y) && c.y + c.h <= Math.max(p.y, q.y);
      return p.y === q.y && (Math.abs(c.y + c.h - p.y) <= 9 || Math.abs(c.y - p.y) <= 9) && c.x >= Math.min(p.x, q.x) && c.x + c.w <= Math.max(p.x, q.x);
    });
    assert(coherente, `${e.id}: el riel no recorre el lado largo de su etiqueta`);
    for (let k = 1; k < pts.length; k++) {
      const [p, q] = [pts[k - 1]!, pts[k]!];
      const tapa = Math.min(p.x, q.x) < c.x + c.w && Math.max(p.x, q.x) > c.x && Math.min(p.y, q.y) < c.y + c.h && Math.max(p.y, q.y) > c.y;
      assert(!tapa, `${e.id}: la etiqueta tapa su propia línea`);
    }
  }
});

Deno.test('insoft: if sin else (desvío corto) deja la columna en el punto de unión', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec(labPayload('datos-y-componentes'))!, null, { style: 'insoft' });
  const by = new Map(L.nodes.map((n) => [n.id, n]));
  const cx = (id: string): number => by.get(id)!.x + by.get(id)!.w / 2;
  assertEquals(cx('guarda'), cx('valida'));
  assert(cx('crea') !== cx('valida'), 'el desvío va al costado');
});

Deno.test('estilo clásico intacto: sin opciones no hay etiquetas laterales ni texto pre-partido', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec(labPayload('parches-de-datos'))!);
  assert(L.edges.every((e) => e.labelAnchor === undefined));
  assert(L.nodes.every((n) => n.lines === undefined));
});

// ── Nodos especiales (kind) ────────────────────────────────────────────

Deno.test('kind: contrato de nested / tableder / component y kinds inválidos', () => {
  const nested = readNodeEmbed({ kind: 'nested', src: 'a.json', diagram: { tag: 'iswc-sequence-diagram', payload: {} }, maxH: 80, bg: '#fff' });
  assertEquals(nested?.kind, 'nested');
  assertEquals(nested?.maxH, 80);
  assertEquals(readNodeEmbed({ kind: 'otro' }), undefined);
  assertEquals(readNodeEmbed({ kind: 'nested', diagram: { tag: 'div', payload: {} } }), undefined, 'tag fuera del kit');
  const t = embedDiagramOf(readNodeEmbed({ kind: 'tableder', table: { name: 't1', attributes: [{ name: 'id', type: 'int' }] } })!);
  assertEquals(t?.tag, 'iswc-er-diagram');
  assertEquals(JSON.stringify(t?.payload).includes('"orphans":false'), true, 'la tabla suelta no se pinta como huérfana');
  const c = embedDiagramOf(readNodeEmbed({ kind: 'component', component: { name: 'API' } })!);
  assertEquals(c?.tag, 'iswc-component-diagram');
});

Deno.test('kind nested: contain dentro de NESTED_DEFAULT_MAX por defecto, ajustable por nodo, sin deformar', () => {
  const f = fitContain({ w: 900, h: 600 }, { w: NESTED_DEFAULT_MAX, h: NESTED_DEFAULT_MAX });
  assert(f.w <= NESTED_DEFAULT_MAX && f.h <= NESTED_DEFAULT_MAX);
  assert(Math.abs(f.w / f.h - 1.5) < 1e-9, 'proporción');
  const spec = resolveFlowchartSpec({
    nodes: [
      { id: 'a', label: 'Sub', kind: 'nested', diagram: { tag: 'iswc-flowchart', payload: {} } },
      { id: 'b', label: 'Grande', kind: 'nested', maxW: 200, maxH: 120, diagram: { tag: 'iswc-flowchart', payload: {} } },
    ],
    edges: [{ from: 'a', to: 'b' }],
  })!;
  const L = computeFlowchartLayout(spec, null, { style: 'insoft', embeds: { a: { w: 900, h: 600 }, b: { w: 900, h: 600 } } });
  const a = L.nodes.find((n) => n.id === 'a')!;
  const b = L.nodes.find((n) => n.id === 'b')!;
  assert(a.embedBox && a.embedBox.w <= NESTED_DEFAULT_MAX && a.embedBox.h <= NESTED_DEFAULT_MAX);
  assert(b.embedBox && Math.abs(b.embedBox.w - 180) < 1e-6 && Math.abs(b.embedBox.h - 120) < 1e-6);
  // El incrustado queda dentro de su recuadro.
  for (const n of [a, b]) {
    const e = n.embedBox!;
    assert(e.x >= n.x && e.y >= n.y && e.x + e.w <= n.x + n.w && e.y + e.h <= n.y + n.h, `${n.id}: incrustado fuera del recuadro`);
  }
  // tableder / component: tamaño natural medido.
  const nat = computeFlowchartLayout(resolveFlowchartSpec({
    nodes: [{ id: 't', label: 'T', kind: 'tableder', table: { name: 'T' } }],
    edges: [],
  })!, null, { embeds: { t: { w: 210, h: 130 } } });
  assertEquals([nat.nodes[0]!.w, nat.nodes[0]!.h], [210, 130]);
});

Deno.test('kind se conserva al serializar la spec (editor / persistencia)', () => {
  const spec = resolveFlowchartSpec({
    nodes: [{ id: 'a', label: 'Sub', kind: 'nested', src: 'x.json', bg: '#FFFFFF' }, { id: 'i', label: 'Inicio', shape: 'start' }],
    edges: [],
  })!;
  const json = flowchartSpecToJson(spec);
  const again = resolveFlowchartSpec(json)!;
  assertEquals(again.nodes[0]!.kind, 'nested');
  assertEquals(again.nodes[0]!.embed?.src, 'x.json');
  assertEquals(again.nodes[1]!.shape, 'start');
});
