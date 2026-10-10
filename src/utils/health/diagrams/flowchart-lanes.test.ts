/**
 * Guardianes WHAT de los carriles de contexto (swimlanes) del flowchart insoft, de la barra de
 * sincronización y del nodo `nested` sin rótulo. Afirman QUÉ ve quien lee el diagrama:
 *   L1 sin `lanes` no hay carriles (flujo simple de siempre).
 *   L2 verticales (por defecto): cada nodo queda dentro de la columna de su carril; carriles en el
 *      orden declarado, contiguos, y el flujo baja.
 *   L3 horizontales: cada nodo dentro de la fila de su carril y el flujo avanza a la derecha.
 *   L4 un nodo sin `lane` hereda el carril de su antecesor.
 *   L5 la barra cruza el flujo (horizontal si baja, vertical si avanza) y las ramas de una
 *      bifurcación salen de puntos distintos de la barra.
 *   L6 aristas ortogonales que no atraviesan cajas ajenas; nodos sin solaparse.
 *   L7 `lanes` y `lane` sobreviven al JSON del editor.
 *   E1 las etiquetas de aristas llevan ícono: el del spec o, en verbos SQL, uno de BD; la caja lo reserva.
 *   R2 radio de proximidad: un giro cerca de la llegada cuesta más que lejos; en la partida, la mitad.
 *   N1 el `nested` no lleva rótulo propio (el título lo trae su diagrama) y su lado máximo es 200.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fileURLToPath } from 'node:url';
import { Obj } from '../../../cdn/lib/obj.ts';
import { costoGiros, computeFlowchartLayout, flowchartSpecToJson, resolveFlowchartSpec } from '../../../components/diagrams/flowchart-spec.ts';
import { NESTED_DEFAULT_MAX } from '../../../components/_shared/diagram-embed.ts';
import { pathPoints } from '../../../components/_shared/diagram-arrow.ts';
import type { FlowLayout, FlowLayoutNode } from '../../../components/diagrams/flowchart-spec.schemas.ts';

/** Editable del lab con sus referencias { path, query, actions } resueltas (como al exportar). */
async function editable(url: URL): Promise<{ payload: Record<string, unknown> }> {
  const ruta = fileURLToPath(url);
  const crudo = JSON.parse(await Deno.readTextFile(url));
  return await Obj.resolver(crudo, { base: ruta, cargar: async (u) => JSON.parse(await Deno.readTextFile(u)) }) as { payload: Record<string, unknown> };
}

const LANES = [{ id: 'P', label: 'Pasajero' }, { id: 'V', label: 'Vendedor' }, { id: 'A', label: 'Aerolínea' }];
const NODES = [
  { id: 'ini', shape: 'start', lane: 'P' },
  { id: 'n1', label: 'Solicita vuelo', lane: 'P' },
  { id: 'n2', label: 'Consulta disponibilidad', lane: 'V' },
  { id: 'n3', label: 'Entrega detalles', lane: 'A' },
  { id: 'f1', shape: 'bar', lane: 'V' },
  { id: 'n4', label: 'Solicita el pago', lane: 'V' },
  { id: 'n5', label: 'Confirma la silla', lane: 'A' },
  { id: 'j1', shape: 'bar', lane: 'V' },
  { id: 'n6', label: 'Emite el tiquete' }, // sin lane: hereda V de j1
  { id: 'fin', shape: 'end', lane: 'V' },
];
const EDGES = [['ini', 'n1'], ['n1', 'n2'], ['n2', 'n3'], ['n3', 'f1'], ['f1', 'n4'], ['f1', 'n5'], ['n4', 'j1'], ['n5', 'j1'], ['j1', 'n6'], ['n6', 'fin']]
  .map(([from, to]) => ({ from, to }));

const layout = (extra: Record<string, unknown> = {}): FlowLayout =>
  computeFlowchartLayout(resolveFlowchartSpec({ lanes: LANES, nodes: NODES, edges: EDGES, ...extra })!, null, { style: 'insoft' });
const byId = (L: FlowLayout) => new Map<string, FlowLayoutNode>(L.nodes.map((n) => [n.id, n]));
const dentro = (n: FlowLayoutNode, l: { x: number; y: number; w: number; h: number }): boolean =>
  n.x >= l.x && n.x + n.w <= l.x + l.w && n.y >= l.y && n.y + n.h <= l.y + l.h;
const laneOf = (id: string): string => NODES.find((n) => n.id === id)?.lane ?? 'V';

Deno.test('carriles: L1 sin lanes no hay carriles', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec({ nodes: NODES.map(({ lane: _l, ...n }) => n), edges: EDGES })!, null, { style: 'insoft' });
  assertEquals(L.lanes, undefined);
});

Deno.test('carriles: L2/L4 verticales por defecto, cada nodo en su columna, en orden, el flujo baja', () => {
  const L = layout();
  assertEquals(L.laneDirection, 'vertical');
  assertEquals(L.lanes!.map((l) => l.label), ['Pasajero', 'Vendedor', 'Aerolínea']);
  for (let i = 1; i < L.lanes!.length; i++) assertEquals(L.lanes![i]!.x, L.lanes![i - 1]!.x + L.lanes![i - 1]!.w, 'contiguos');
  const lanes = new Map(L.lanes!.map((l) => [l.id, l]));
  for (const n of L.nodes) assert(dentro(n, lanes.get(laneOf(n.id))!), `${n.id} fuera de ${laneOf(n.id)}`);
  const N = byId(L);
  assert(N.get('n2')!.y > N.get('n1')!.y && N.get('fin')!.y > N.get('n6')!.y, 'el flujo baja');
});

Deno.test('carriles: L3 horizontales: cada nodo en su fila y el flujo avanza a la derecha', () => {
  const L = layout({ laneDirection: 'horizontal' });
  assertEquals(L.laneDirection, 'horizontal');
  for (let i = 1; i < L.lanes!.length; i++) assertEquals(L.lanes![i]!.y, L.lanes![i - 1]!.y + L.lanes![i - 1]!.h, 'contiguos');
  const lanes = new Map(L.lanes!.map((l) => [l.id, l]));
  for (const n of L.nodes) assert(dentro(n, lanes.get(laneOf(n.id))!), `${n.id} fuera de ${laneOf(n.id)}`);
  const N = byId(L);
  assert(N.get('n2')!.x > N.get('n1')!.x && N.get('fin')!.x > N.get('n6')!.x, 'el flujo avanza');
});

Deno.test('carriles: L5 la barra cruza el flujo y las ramas salen de puntos distintos', () => {
  const V = byId(layout());
  assert(V.get('f1')!.w > V.get('f1')!.h, 'horizontal si el flujo baja');
  const H = byId(layout({ laneDirection: 'horizontal' }));
  assert(H.get('f1')!.h > H.get('f1')!.w, 'vertical si el flujo avanza');
  const L = layout();
  const salidas = L.edges.filter((e) => e.from === 'f1').map((e) => JSON.stringify(pathPoints(e.path)[0]));
  assertEquals(new Set(salidas).size, 2, `ramas desde el mismo punto: ${salidas.join(' ')}`);
});

Deno.test('carriles: L6 aristas ortogonales que no atraviesan cajas; sin solapes', () => {
  for (const L of [layout(), layout({ laneDirection: 'horizontal' })]) {
    for (const a of L.nodes) for (const b of L.nodes) {
      if (a !== b) assert(!(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h), `${a.id}/${b.id} se solapan`);
    }
    for (const e of L.edges) {
      const pts = pathPoints(e.path);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1]!;
        const q = pts[i]!;
        assert(p.x === q.x || p.y === q.y, `${e.from}→${e.to} no ortogonal`);
        for (const n of L.nodes) {
          if (n.id === e.from || n.id === e.to) continue;
          const [x0, x1] = [Math.min(p.x, q.x), Math.max(p.x, q.x)];
          const [y0, y1] = [Math.min(p.y, q.y), Math.max(p.y, q.y)];
          assert(!(x0 < n.x + n.w - 1 && x1 > n.x + 1 && y0 < n.y + n.h - 1 && y1 > n.y + 1), `${e.from}→${e.to} atraviesa ${n.id}`);
        }
      }
    }
  }
});

Deno.test('carriles: L7 lanes y lane sobreviven al JSON del editor', () => {
  const json = flowchartSpecToJson(resolveFlowchartSpec({ lanes: LANES, laneDirection: 'horizontal', nodes: NODES, edges: EDGES })!);
  assertEquals((json.lanes as unknown[]).length, 3);
  assertEquals(json.laneDirection, 'horizontal');
  assertEquals((json.nodes as Array<{ id: string; lane?: string }>).find((n) => n.id === 'n2')?.lane, 'V');
});

Deno.test('nested: N1 sin rótulo propio y lado máximo 200', () => {
  assertEquals(NESTED_DEFAULT_MAX, 200);
  const L = computeFlowchartLayout(resolveFlowchartSpec({
    nodes: [{ id: 'sub', label: 'Turno de conversación', kind: 'nested', diagram: { tag: 'iswc-flowchart', payload: {} } }],
    edges: [],
  })!, null, { style: 'insoft', embeds: { sub: { w: 1000, h: 800 } } });
  const n = L.nodes[0]!;
  assertEquals(n.lines, undefined, 'el título lo trae el diagrama anidado');
  assert(n.embedBox && Math.max(n.embedBox.w, n.embedBox.h) <= 200 + 1e-9, `encajado en 200: ${JSON.stringify(n.embedBox)}`);
  assertEquals(Math.round(n.embedBox!.w), 200, 'contain: el lado mayor llega a 200');
});

Deno.test('decisión: R1 ramas por el mismo costado no comparten riel (cada una el suyo, sin cruces)', () => {
  const spec = {
    nodes: [
      { id: 'd', label: '¿Qué caso aplica?', shape: 'diamond' },
      { id: 'ok', label: 'Sigue' },
      { id: 'a', label: 'Caso A con texto' }, { id: 'b', label: 'Caso B' }, { id: 'c', label: 'Caso C largo de verdad' },
      { id: 'x', label: 'Otro paso' }, { id: 'y', label: 'Paso final' },
    ],
    edges: [
      { from: 'd', to: 'a', label: 'a' }, { from: 'd', to: 'b', label: 'b' }, { from: 'd', to: 'c', label: 'c' },
      { from: 'd', to: 'ok', label: 'sí' }, { from: 'ok', to: 'x' }, { from: 'x', to: 'y' },
    ],
  };
  const L = computeFlowchartLayout(resolveFlowchartSpec(spec)!, null, { style: 'insoft' });
  const ramas = L.edges.filter((e) => e.from === 'd' && e.to !== 'ok');
  const primeros = ramas.map((e) => { const [p, q] = pathPoints(e.path); return { y: p!.y, x0: Math.min(p!.x, q!.x), x1: Math.max(p!.x, q!.x) }; });
  for (let i = 0; i < primeros.length; i++) for (let j = i + 1; j < primeros.length; j++) {
    const a = primeros[i]!;
    const b = primeros[j]!;
    const solapanEnX = a.x0 < b.x1 && b.x0 < a.x1;
    assert(!(a.y === b.y && solapanEnX), `rieles compartidos: ${JSON.stringify([a, b])}`);
    if (solapanEnX) assert(Math.abs(a.y - b.y) >= 24, `rieles demasiado juntos para su etiqueta: ${a.y} / ${b.y}`);
  }
  const etiquetas = ramas.map((e) => `${e.labelX},${e.labelY}`);
  assertEquals(new Set(etiquetas).size, ramas.length, 'cada condición en su sitio');
});

// ── Diagramas combinados: usos punteados, vuelta al origen, clase e íconos ──────────────
import { embedDiagramOf, embedIsNatural, readNodeEmbed } from '../../../components/_shared/diagram-embed.ts';
import { computeClassLayout, resolveClassSpec } from '../../../components/diagrams/class-spec.ts';
import { flowPaint } from '../../../components/diagrams/flowchart-spec.ts';

const COMBINADO = {
  lanes: [{ id: 'P', label: 'Portal' }, { id: 'T', label: 'Controlador' }, { id: 'D', label: 'PostgreSQL' }],
  nodes: [
    { id: 'api', label: 'API', lane: 'P' },
    { id: 'val', label: 'Valida', icon: 'mdi:shield-check-outline', lane: 'T' },
    { id: 'lee', label: 'Lee', lane: 'T' },
    { id: 'tabla', label: 'Tabla', lane: 'D' },
    { id: 'cierra', label: 'Cierra', lane: 'T' },
    { id: 'resp', label: 'Responde', lane: 'T' },
  ],
  edges: [
    { from: 'api', to: 'val' }, { from: 'val', to: 'lee' },
    { from: 'lee', to: 'tabla', kind: 'dashed', label: 'SELECT' },
    { from: 'lee', to: 'cierra' },
    { from: 'cierra', to: 'tabla', kind: 'dashed', label: 'UPDATE' },
    { from: 'cierra', to: 'resp' },
    { from: 'resp', to: 'api', label: 'respuesta' },
  ],
};

Deno.test('combinado: U1 lo que solo se usa (tabla) va a la altura de su primer usuario y no empuja el flujo', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec(COMBINADO)!, null, { style: 'insoft' });
  const N = byId(L);
  const [lee, tabla] = [N.get('lee')!, N.get('tabla')!];
  assert(tabla.y < lee.y + lee.h && lee.y < tabla.y + tabla.h, 'tabla a la altura de «Lee»');
  assert(N.get('cierra')!.y > lee.y, 'el flujo sigue bajando sin hueco por la tabla');
});

Deno.test('combinado: U2 los usos salen de lado; al mismo costado de un destino comparten punta en abanico', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec(COMBINADO)!, null, { style: 'insoft' });
  const usos = L.edges.filter((e) => e.kind === 'dashed');
  for (const e of usos) {
    const [p, q] = pathPoints(e.path);
    assertEquals(p!.y, q!.y, `${e.label}: arranca en horizontal (de lado)`);
  }
  // Abanico: por destino y costado, una sola punta; cada uso con su riel propio (no comparten la
  // bajada) y el codo de unión fuera del radio de la llegada.
  const porPunta = new Map<string, typeof usos>();
  for (const e of usos) {
    const k = `${e.to}|${JSON.stringify(pathPoints(e.path).at(-1))}`;
    porPunta.set(k, [...(porPunta.get(k) ?? []), e]);
  }
  const destinos = new Set(usos.map((e) => `${e.to}|${pathPoints(e.path).at(-1)!.x}`));
  assertEquals(porPunta.size, destinos.size, 'una punta por destino y costado');
  for (const grupo of porPunta.values()) {
    const rieles = grupo.map((e) => pathPoints(e.path)).filter((p) => p.length === 4).map((p) => p[1]!.x);
    assertEquals(new Set(rieles).size, rieles.length, `rieles propios: ${rieles.join(' ')}`);
    for (const e of grupo) {
      const p = pathPoints(e.path);
      if (p.length === 4) assert(Math.abs(p[3]!.x - p[2]!.x) >= 15, `${e.label}: codo pegado a la llegada`);
    }
  }
});

Deno.test('combinado: U3 la vuelta al origen va por fuera, sin atravesar cajas, y entra por el costado', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec(COMBINADO)!, null, { style: 'insoft' });
  const e = L.edges.find((x) => x.to === 'api')!;
  const pts = pathPoints(e.path);
  const api = byId(L).get('api')!;
  assertEquals(pts.at(-1)!.x, api.x, 'entra por el costado izquierdo');
  for (let i = 1; i < pts.length; i++) {
    const [p, q] = [pts[i - 1]!, pts[i]!];
    for (const n of L.nodes) {
      if (n.id === e.from || n.id === e.to) continue;
      const [x0, x1, y0, y1] = [Math.min(p.x, q.x), Math.max(p.x, q.x), Math.min(p.y, q.y), Math.max(p.y, q.y)];
      assert(!(x0 < n.x + n.w - 1 && x1 > n.x + 1 && y0 < n.y + n.h - 1 && y1 > n.y + 1), `atraviesa ${n.id}`);
    }
  }
});

Deno.test('combinado: K1 nodo `class` = una clase del diagrama de clases, a tamaño natural', () => {
  const spec = readNodeEmbed({ kind: 'class', class: { name: 'TConversationTicket', attributes: ['+ itiquete'] } })!;
  assert(embedIsNatural(spec));
  const d = embedDiagramOf(spec)!;
  assertEquals(d.tag, 'iswc-class-diagram');
  assertEquals((d.payload as { classDiagram: { classes: Array<{ name: string }> } }).classDiagram.classes[0]!.name, 'TConversationTicket');
});

Deno.test('combinado: I1 una acción con `icon` lleva su insignia arriba a la izquierda y el texto usa toda la caja', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec(COMBINADO)!, null, { style: 'insoft' });
  const val = byId(L).get('val')!;
  assert(val.pill && val.pillFloat, 'insignia suelta');
  assert(val.pill.x < val.x && val.pill.y < val.y, 'montando la esquina superior izquierda');
  assert(val.textBox!.x - val.x < 24, 'el texto no reserva hueco para la insignia');
});
Deno.test('combinado: K2 la clase incrustada sale rellena (caja VP con su `fill`), no transparente', () => {
  const d = embedDiagramOf(readNodeEmbed({ kind: 'class', class: { name: 'TConversationTicket', fill: 'leaf' } })!)!;
  const p = d.payload as { classDiagram: Record<string, unknown> };
  const L = computeClassLayout(resolveClassSpec(p)!);
  assertEquals(L.boxStyle, 'vp');
  assertEquals(L.nodes[0]!.fill, 'leaf');
});

Deno.test('carriles: L8 los separadores tienen color propio (no el de flujos ni usos)', () => {
  const paint = flowPaint({ flow: {} } as never);
  assert(paint.laneLine && paint.laneLine !== paint.edgeStroke, `laneLine ${paint.laneLine}`);
});

Deno.test('combinado: P1 la insignia lleva el paso y el ícono; crece con el número y sobrevive al JSON', () => {
  const spec = resolveFlowchartSpec({
    nodes: [
      { id: 'a', label: 'Valida', step: 2, icon: 'mdi:shield-check-outline' },
      { id: 'b', label: 'Valida', step: 12, icon: 'mdi:shield-check-outline' },
      { id: 'c', label: 'Valida' },
    ],
    edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
  })!;
  const N = byId(computeFlowchartLayout(spec, null, { style: 'insoft' }));
  const [a, b, c] = ['a', 'b', 'c'].map((id) => N.get(id)!);
  assertEquals(a!.step, 2);
  assert(a!.pill && b!.pill && !c!.pill, 'insignia solo con paso o ícono');
  assert(b!.pill!.w > a!.pill!.w, 'el número de dos cifras ensancha la insignia');
  const json = flowchartSpecToJson(spec) as { nodes: Array<{ id: string; step?: number; icon?: string }> };
  assertEquals(json.nodes.find((n) => n.id === 'a'), { id: 'a', label: 'Valida', step: 2, icon: 'mdi:shield-check-outline' });
});
Deno.test('combinado: S1 steps:auto numera TODO el diagrama 1..N sin saltos (inicio, fin y barras no cuentan)', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec({ ...COMBINADO, steps: 'auto', nodes: [{ id: 'ini', shape: 'start', lane: 'P' }, ...COMBINADO.nodes, { id: 'fin', shape: 'end', lane: 'T' }], edges: [{ from: 'ini', to: 'api' }, ...COMBINADO.edges, { from: 'resp', to: 'fin' }] })!, null, { style: 'insoft' });
  const pasos = L.nodes.filter((n) => n.step != null).map((n) => n.step!).sort((a, b) => a - b);
  assertEquals(pasos, Array.from({ length: COMBINADO.nodes.length }, (_, i) => i + 1));
  const N = byId(L);
  assertEquals(N.get('ini')!.step, undefined);
  assertEquals(N.get('api')!.step, 1, 'empieza en 1 (el componente que abre el flujo)');
  assert(L.nodes.filter((n) => n.step != null).every((n) => n.pill && n.pillFloat), 'todo paso lleva su insignia (estándar)');
});

Deno.test('combinado: G1 un carril que mezcla flujo y clases encierra las clases en un grupo «Clases»', () => {
  const spec = {
    lanes: [{ id: 'T', label: 'Controlador' }, { id: 'D', label: 'BD' }],
    nodes: [
      { id: 'ctl', label: 'Ctl', kind: 'class', class: { name: 'Ctl' }, lane: 'T' },
      { id: 'pojo', label: 'Pojo', kind: 'class', class: { name: 'Pojo' }, lane: 'T' },
      { id: 'val', label: 'Valida', lane: 'T' },
      { id: 'tab', label: 'tabla', kind: 'tableder', table: { name: 'tabla', attributes: [] }, lane: 'D' },
    ],
    edges: [{ from: 'ctl', to: 'pojo', kind: 'dashed' }, { from: 'ctl', to: 'val' }, { from: 'val', to: 'tab', kind: 'dashed' }],
  };
  const L = computeFlowchartLayout(resolveFlowchartSpec(spec)!, null, { style: 'insoft', embeds: { ctl: { w: 160, h: 80 }, pojo: { w: 140, h: 70 }, tab: { w: 150, h: 60 } } });
  assertEquals(L.contexts?.map((c) => `${c.lane}:${c.label}`), ['T:Clases'], 'la BD solo tiene tablas: el carril ya es el contexto');
  const g = L.contexts![0]!;
  const N = byId(L);
  for (const id of ['ctl', 'pojo']) assert(dentro(N.get(id)!, g), `${id} dentro del grupo`);
  const v = N.get('val')!;
  assert(!(v.x < g.x + g.w && g.x < v.x + v.w && v.y < g.y + g.h && g.y < v.y + v.h), 'el flujo queda fuera del grupo');
});

Deno.test('combinado: G2 `context` explícito agrupa por título dentro del carril y sobrevive al JSON', () => {
  const spec = resolveFlowchartSpec({
    lanes: [{ id: 'T', label: 'T' }],
    nodes: [{ id: 'a', label: 'A', lane: 'T', context: 'Validación' }, { id: 'b', label: 'B', lane: 'T', context: 'Validación' }, { id: 'c', label: 'C', lane: 'T' }],
    edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
  })!;
  const L = computeFlowchartLayout(spec, null, { style: 'insoft' });
  assertEquals(L.contexts?.map((c) => c.label), ['Validación']);
  assertEquals((flowchartSpecToJson(spec).nodes as Array<{ id: string; context?: string }>).find((n) => n.id === 'a')?.context, 'Validación');
});

Deno.test('combinado: B1 las ramas de una barra salen de puntos distintos aunque sus destinos queden lejos', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec({
    lanes: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }, { id: 'C', label: 'C' }],
    nodes: [{ id: 'x', label: 'X', lane: 'A' }, { id: 'f', shape: 'bar', lane: 'A' }, { id: 'y', label: 'Y', lane: 'B' }, { id: 'z', label: 'Z', lane: 'C' }],
    edges: [{ from: 'x', to: 'f' }, { from: 'f', to: 'y' }, { from: 'f', to: 'z' }],
  })!, null, { style: 'insoft' });
  const salidas = L.edges.filter((e) => e.from === 'f').map((e) => JSON.stringify(pathPoints(e.path)[0]));
  assertEquals(new Set(salidas).size, 2, salidas.join(' '));
});

Deno.test('combinado: S2 insignia estándar: arriba a la izquierda en todo paso; en el rombo, sobre su lado superior izquierdo; todos con ícono', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec({
    steps: 'auto',
    nodes: [
      { id: 't', label: 'tabla', kind: 'tableder', table: { name: 'tabla', attributes: [] } },
      { id: 'd', label: '¿Sigue?', shape: 'diamond' }, { id: 'a', label: 'Acción' },
    ],
    edges: [{ from: 't', to: 'd' }, { from: 'd', to: 'a', label: 'sí' }],
  })!, null, { style: 'insoft', embeds: { t: { w: 150, h: 60 } } });
  const N = byId(L);
  assertEquals([N.get('t')!.step, N.get('d')!.step, N.get('a')!.step], [1, 2, 3]);
  for (const id of ['t', 'd', 'a']) assert(N.get(id)!.pillFloat, `${id}: insignia suelta`);
  const d = N.get('d')!;
  const cx = d.pill!.x + d.pill!.w / 2;
  const cy = d.pill!.y + d.pill!.h / 2;
  assert(Math.abs(cx - (d.x + d.w / 4)) <= 1 && Math.abs(cy - (d.y + d.h / 4)) <= 1, 'centrada sobre el lado superior izquierdo del rombo');
  const a = N.get('a')!;
  assert(a.pill!.x < a.x && a.pill!.y < a.y, 'acción: montando la esquina superior izquierda');
  assertEquals([N.get('t')!.icon, d.icon, a.icon], ['mdi:table', 'mdi:source-branch', 'mdi:play-circle-outline'], 'ícono por defecto junto a cada número');
});
Deno.test('comentario: C1 globo pegado al nodo que comenta, sin número, sin empujar la columna; texto a la izquierda', () => {
  const spec = {
    steps: 'auto', lanes: [{ id: 'A', label: 'A' }],
    nodes: [
      { id: 'a', label: 'Primero', lane: 'A' }, { id: 'b', label: 'Segundo', lane: 'A' }, { id: 'c', label: 'Tercero', lane: 'A' },
      { id: 'nota', label: 'Se repite en cada paso', shape: 'comment', about: 'b' },
    ],
    edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
  };
  const L = computeFlowchartLayout(resolveFlowchartSpec(spec)!, null, { style: 'insoft' });
  const N = byId(L);
  const [b, nota] = [N.get('b')!, N.get('nota')!];
  const hueco = nota.pointer === 'left' ? nota.x - (b.x + b.w) : b.x - (nota.x + nota.w);
  assert(hueco > 0 && hueco <= 16, `pegado (≤ 2U): ${hueco}`);
  assert(Math.abs((nota.y + nota.h / 2) - (b.y + b.h / 2)) <= 8, 'centrado con su nodo');
  assertEquals(nota.step, undefined, 'el comentario no se numera');
  const cx = (id: string) => N.get(id)!.x + N.get(id)!.w / 2;
  assertEquals(cx('b'), cx('a'), 'el nodo comentado sigue en la columna');
  assertEquals(N.get('a')!.textAlign, 'start', 'texto de las acciones a la izquierda');
});

Deno.test('comentario: C2 con x/y fijados a mano manda esa posición', () => {
  const spec = resolveFlowchartSpec({ nodes: [{ id: 'a', label: 'A' }, { id: 'n', label: 'nota', shape: 'comment', about: 'a' }], edges: [] })!;
  const L0 = computeFlowchartLayout(spec, null, { style: 'insoft' });
  const L = computeFlowchartLayout(spec, { nodes: { n: { x: 300, y: 200 } } }, { style: 'insoft' });
  const n0 = byId(L0).get('n')!;
  const n = byId(L).get('n')!;
  assert(n.x !== n0.x || n.y !== n0.y, 'se movió a la posición fijada');
});

Deno.test('combinado: G3 el grupo abraza a TODOS sus miembros (y sus insignias) en sus posiciones finales', async () => {
  // Ruta de un solo controller: sus clases comparten carril con los pasos y van en un grupo «Clases»
  // (con más de un controller, las clases tienen su propia columna y no hace falta recuadro).
  const d = await editable(new URL('../../../../labs/iss-ayudascpia-flujos/payloads/ruta-conversacion-borrado.json', import.meta.url));
  const L = computeFlowchartLayout(resolveFlowchartSpec(d.payload)!, null, { style: 'insoft', embeds: { ctl: { w: 300, h: 110 }, 'ctl-pojo': { w: 230, h: 110 }, api: { w: 230, h: 80 } } });
  for (const g of L.contexts ?? []) {
    for (const id of g.members ?? []) {
      const n = byId(L).get(id)!;
      for (const b of [n, ...(n.pill ? [n.pill] : [])]) {
        assert(b.x >= g.x && b.y >= g.y && b.x + b.w <= g.x + g.w && b.y + b.h <= g.y + g.h, `${g.label}: ${id} se sale del grupo`);
      }
    }
  }
  assert((L.contexts ?? []).some((g) => g.label === 'Clases'));
});

Deno.test('etiquetas: E1 ícono de BD por defecto en verbos SQL, ícono propio del spec y caja que lo reserva', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec({
    lanes: [{ id: 'T', label: 'Controller' }, { id: 'D', label: 'PostgreSQL' }],
    nodes: [
      { id: 'a', label: 'Lee', lane: 'T' }, { id: 'b', label: 'Guarda', lane: 'T' }, { id: 'c', label: 'Avisa', lane: 'T' },
      { id: 't', label: 'tabla', lane: 'D' },
    ],
    edges: [
      { from: 'a', to: 'b' }, { from: 'b', to: 'c', label: 'listo', icon: 'mdi:bell-outline' },
      { from: 'a', to: 't', kind: 'dashed', label: 'SELECT' }, { from: 'b', to: 't', kind: 'dashed', label: 'insert' },
      { from: 'c', to: 't', kind: 'dashed', label: 'otra cosa' },
    ],
  })!, null, { style: 'insoft' });
  const por = (l: string) => L.edges.find((e) => e.label === l)!;
  assertEquals(por('SELECT').labelIcon, 'mdi:database-search-outline');
  assertEquals(por('insert').labelIcon, 'mdi:database-plus-outline');
  assertEquals(por('listo').labelIcon, 'mdi:bell-outline');
  assertEquals(por('otra cosa').labelIcon, undefined);
  // La caja reserva el ícono: el texto arranca después de él.
  const e = por('SELECT');
  assert(e.labelBox && e.labelX - e.labelBox.x >= 12, 'el texto empieza después del ícono');
  // Sobrevive al JSON del editor.
  const json = flowchartSpecToJson(resolveFlowchartSpec({ nodes: [{ id: 'a' }, { id: 'b' }], edges: [{ from: 'a', to: 'b', icon: 'mdi:bell-outline' }] })!);
  assertEquals((json.edges as Array<Record<string, unknown>>)[0]!.icon, 'mdi:bell-outline');
});

Deno.test('ruteo: R2 radio de proximidad de giros (llegada pesa el doble que la partida; fuera del radio no cuesta)', () => {
  const z = (x: number) => [{ x: 0, y: 0 }, { x, y: 0 }, { x, y: 30 }, { x: 300, y: 30 }];
  // Codo a 15 px de la llegada vs. a 15 px de la partida: la llegada cuesta el doble.
  const llegada = costoGiros(z(285));
  const partida = costoGiros(z(15));
  assert(llegada > partida, `llegada ${llegada} > partida ${partida}`);
  // Más cerca de la llegada → más caro; en el centro (fuera de ambos radios), barato.
  assert(costoGiros(z(290)) > costoGiros(z(270)), 'crece al acercarse a la llegada');
  assert(costoGiros(z(150)) < partida, 'lejos de ambos extremos casi no cuesta');
  // Un uso entre carriles a la misma altura llega recto, sin giros.
  const L = computeFlowchartLayout(resolveFlowchartSpec({
    lanes: [{ id: 'T', label: 'T' }, { id: 'D', label: 'D' }],
    nodes: [{ id: 'a', label: 'Lee', lane: 'T' }, { id: 't', label: 'tabla', lane: 'D' }],
    edges: [{ from: 'a', to: 't', kind: 'dashed', label: 'SELECT' }],
  })!, null, { style: 'insoft' });
  const pts = pathPoints(L.edges[0]!.path);
  const n = byId(L);
  const sale = n.get('a')!.y + n.get('a')!.h / 2;
  const t = n.get('t')!;
  if (sale > t.y + 8 && sale < t.y + t.h - 8) assertEquals(pts.length, 2, 'recta si la altura cabe');
});

Deno.test('ruteo: A1 el flujo animado es el estándar (activo por defecto; un tema lo puede apagar)', async () => {
  const tema = JSON.parse(await Deno.readTextFile(new URL('../../../components/diagrams/themes/insoft-flow.json', import.meta.url)));
  assertEquals(flowPaint(tema).dashFlow, true, 'insoft: rieles punteados en movimiento');
  assertEquals(flowPaint(tema).pillTone, 'entity', 'insoft: insignia del tono de su entidad, oscuro');
  assertEquals(flowPaint({ flow: {} } as never).dashFlow, true, 'estándar: activo sin flag');
  assertEquals(flowPaint({ flow: { dashFlow: false } } as never).dashFlow, false, 'un tema lo apaga');
});

Deno.test('combinado: H1 las acciones insoft tienen un ancho homogéneo (el de la más ancha)', () => {
  const L = computeFlowchartLayout(resolveFlowchartSpec({
    nodes: [
      { id: 'a', label: 'Emite begin' },
      { id: 'b', label: 'Guarda el mensaje assistant con others.traza hasta ese momento' },
      { id: 'd', label: '¿Sigue?', shape: 'diamond' },
      { id: 'c', label: 'Fin corto' },
    ],
    edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'd' }, { from: 'd', to: 'c' }],
  })!, null, { style: 'insoft' });
  const n = byId(L);
  const anchos = new Set(['a', 'b', 'c'].map((id) => n.get(id)!.w));
  assertEquals(anchos.size, 1, `anchos: ${[...anchos].join(' ')}`);
});

Deno.test('combinado: U4 abanico: los usos a un mismo destino comparten punta y corren por vías paralelas propias', async () => {
  const j = await editable(new URL('../../../../labs/iss-ayudascpia-flujos/payloads/ruta-conversacion-turno.json', import.meta.url));
  const L = computeFlowchartLayout(resolveFlowchartSpec(j.payload)!, null, { style: 'insoft' });
  // El destino con más usos de la ruta (hoy Chat Completions: clasifica y título).
  const usos = L.edges.filter((e) => e.kind === 'dashed');
  const cuenta = new Map<string, number>();
  for (const e of usos) cuenta.set(e.to, (cuenta.get(e.to) ?? 0) + 1);
  const destino = [...cuenta].sort((a, b) => b[1] - a[1])[0]![0];
  const llegan = usos.filter((e) => e.to === destino);
  const alAi = llegan.map((e) => pathPoints(e.path));
  assert(alAi.length >= 2, `varios usos a ${destino}`);
  const puntas = new Set(llegan.map((e) => `${e.arrowTipX},${e.arrowTipY}`));
  assertEquals(puntas.size, 1, 'una sola punta');
  // Vías propias: ningún par de usos comparte el tramo vertical por el que baja o sube.
  const verticales = alAi.map((p) => p.slice(1).flatMap((q, k) => (q.x === p[k]!.x && q.y !== p[k]!.y ? [q.x] : [])));
  const xs = verticales.map((v) => v.join(','));
  assertEquals(new Set(xs).size, xs.length, `vías: ${xs.join(' | ')}`);
});


Deno.test('etiquetas: E2 en las rutas reales del ISS ningún texto de arista se monta sobre otro', async () => {
  const dir = new URL('../../../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);
  const choques: string[] = [];
  for await (const f of Deno.readDir(dir)) {
    if (!f.name.startsWith('ruta-')) continue;
    const j = await editable(new URL(f.name, dir));
    const L = computeFlowchartLayout(resolveFlowchartSpec(j.payload)!, null, { style: 'insoft' });
    const cajas = L.edges.filter((e) => e.labelBox).map((e) => ({ e: e.label, b: e.labelBox! }));
    for (let i = 0; i < cajas.length; i++) {
      for (let k = i + 1; k < cajas.length; k++) {
        const [a, b] = [cajas[i]!.b, cajas[k]!.b];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) choques.push(`${f.name}: «${cajas[i]!.e}» × «${cajas[k]!.e}»`);
      }
    }
  }
  assertEquals(choques, []);
});

Deno.test('combinado: F1 la respuesta desde el fin sale por abajo (no por un costado donde llegan ramas)', async () => {
  const dir = new URL('../../../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);
  for await (const f of Deno.readDir(dir)) {
    if (!f.name.startsWith('ruta-')) continue;
    const j = await editable(new URL(f.name, dir));
    const L = computeFlowchartLayout(resolveFlowchartSpec(j.payload)!, null, { style: 'insoft' });
    for (const e of L.edges) {
      const fin = L.nodes.find((n) => n.id === e.from && n.shape === 'end');
      if (!fin) continue;
      const p0 = pathPoints(e.path)[0]!;
      assert(Math.abs(p0.y - (fin.y + fin.h)) < 1, `${f.name}: ${e.from}→${e.to} sale por abajo`);
    }
  }
});

Deno.test('etiquetas: E3 en las rutas reales ningún texto de arista queda bajo un nodo', async () => {
  const dir = new URL('../../../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);
  const choques: string[] = [];
  for await (const f of Deno.readDir(dir)) {
    if (!f.name.startsWith('ruta-')) continue;
    const j = await editable(new URL(f.name, dir));
    const L = computeFlowchartLayout(resolveFlowchartSpec(j.payload)!, null, { style: 'insoft' });
    for (const e of L.edges) {
      const b = e.labelBox;
      if (!b) continue;
      for (const n of L.nodes) {
        if (b.x < n.x + n.w - 1 && n.x < b.x + b.w - 1 && b.y < n.y + n.h - 1 && n.y < b.y + b.h - 1) choques.push(`${f.name}: «${e.label}» bajo ${n.id}`);
      }
    }
  }
  assertEquals(choques, []);
});

Deno.test('combinado: U5 en las rutas reales, los usos a un mismo destino y costado llegan a UNA sola punta', async () => {
  const dir = new URL('../../../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);
  const malos: string[] = [];
  for await (const f of Deno.readDir(dir)) {
    if (!f.name.startsWith('ruta-')) continue;
    const j = await editable(new URL(f.name, dir));
    const L = computeFlowchartLayout(resolveFlowchartSpec(j.payload)!, null, { style: 'insoft' });
    const puntas = new Map<string, Set<string>>();
    for (const e of L.edges.filter((x) => x.kind === 'dashed')) {
      const t = L.nodes.find((n) => n.id === e.to)!;
      const fin = pathPoints(e.path).at(-1)!;
      const lado = Math.abs(fin.x - t.x) < 1 ? 'izq' : Math.abs(fin.x - (t.x + t.w)) < 1 ? 'der' : Math.abs(fin.y - t.y) < 1 ? 'arr' : 'aba';
      const k = `${e.to}|${lado}`;
      puntas.set(k, (puntas.get(k) ?? new Set()).add(`${Math.round(fin.x)},${Math.round(fin.y)}`));
    }
    for (const [k, s] of puntas) if (s.size > 1) malos.push(`${f.name}: ${k} (${[...s].join(' ')})`);
  }
  assertEquals(malos, []);
});

Deno.test('combinado: D1 en las rutas reales, a un rombo se entra por arriba (sus costados son salidas de rama)', async () => {
  const dir = new URL('../../../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);
  const malas: string[] = [];
  for await (const f of Deno.readDir(dir)) {
    if (!f.name.startsWith('ruta-')) continue;
    const j = await editable(new URL(f.name, dir));
    const L = computeFlowchartLayout(resolveFlowchartSpec(j.payload)!, null, { style: 'insoft' });
    for (const e of L.edges) {
      const d = L.nodes.find((n) => n.id === e.to && n.shape === 'diamond');
      if (!d || e.kind === 'dashed') continue;
      const fin = pathPoints(e.path).at(-1)!;
      if (Math.abs(fin.y - d.y) > 1) malas.push(`${f.name}: ${e.from}→${e.to} entra por (${fin.x},${fin.y})`);
    }
  }
  assertEquals(malas, []);
});

Deno.test('combinado: K1 a un componente que expone interfaz se llega por -(O- (socket), nunca con flecha', async () => {
  const j = await editable(new URL('../../../../labs/iss-ayudascpia-flujos/payloads/ruta-conversacion-turno.json', import.meta.url));
  const spec = resolveFlowchartSpec(j.payload)!;
  const L = computeFlowchartLayout(spec, null, { style: 'insoft' });
  const expone = new Set(spec.nodes.filter((n) => {
    const c = n.embed?.kind === 'component' ? (n.embed.component as { provides?: unknown[] }) : undefined;
    return !!c?.provides?.length;
  }).map((n) => n.id));
  assert(expone.size >= 4, `componentes de OpenAI con interfaz: ${[...expone].join(', ')}`);
  const llegan = L.edges.filter((e) => expone.has(e.to));
  assert(llegan.length >= 5);
  for (const e of llegan) {
    assert(e.socket, `${e.from}→${e.to} sin socket`);
    const fin = pathPoints(e.path).at(-1)!;
    assert(Math.abs(fin.x - e.arrowTipX) + Math.abs(fin.y - e.arrowTipY) >= 20, `${e.from}→${e.to}: el riel termina en el socket, antes del borde`);
  }
});

/** Tramos de aristas continuas que atraviesan una caja ajena (ni su origen ni su destino). */
function crucesDeFlujo(L: FlowLayout): string[] {
  const out: string[] = [];
  for (const e of L.edges.filter((x) => x.kind !== 'dashed')) {
    const pts = pathPoints(e.path);
    for (let k = 1; k < pts.length; k++) {
      const [a, b] = [pts[k - 1]!, pts[k]!];
      for (const n of L.nodes) {
        if (n.id === e.from || n.id === e.to || n.shape === 'comment') continue;
        const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
        if (x1 > n.x + 2 && x0 < n.x + n.w - 2 && y1 > n.y + 2 && y0 < n.y + n.h - 2) out.push(`${e.from}→${e.to} cruza ${n.id}`);
      }
    }
  }
  return out;
}

Deno.test('combinado: X1 en las rutas reales ninguna arista del flujo atraviesa una caja ajena', async () => {
  const dir = new URL('../../../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);
  const malos: string[] = [];
  for await (const f of Deno.readDir(dir)) {
    if (!f.name.startsWith('ruta-')) continue;
    const j = await editable(new URL(f.name, dir));
    const L = computeFlowchartLayout(resolveFlowchartSpec(j.payload)!, null, { style: 'insoft' });
    malos.push(...crucesDeFlujo(L).map((m) => `${f.name}: ${m}`));
  }
  assertEquals(malos, []);
});

Deno.test('combinado: H2 los componentes de un mismo carril tienen un ancho homogéneo (el del más ancho)', async () => {
  const j = await editable(new URL('../../../../labs/iss-ayudascpia-flujos/payloads/ruta-conversacion-turno.json', import.meta.url));
  const spec = resolveFlowchartSpec(j.payload)!;
  const comps = spec.nodes.filter((n) => n.embed?.kind === 'component' && n.lane === 'O');
  assert(comps.length >= 4, 'componentes de OpenAI en su carril');
  const anchos = new Set(comps.map((n) => (n.embed!.component as { w?: number }).w));
  assertEquals(anchos.size, 1, `anchos: ${[...anchos].join(' ')}`);
  assert([...anchos][0]! > 0);
});

Deno.test('combinado: X2 en las rutas reales ningún recuadro de grupo abraza un nodo que no es suyo', async () => {
  const dir = new URL('../../../../labs/iss-ayudascpia-flujos/payloads/', import.meta.url);
  const malos: string[] = [];
  for await (const f of Deno.readDir(dir)) {
    if (!f.name.startsWith('ruta-')) continue;
    const j = await editable(new URL(f.name, dir));
    const L = computeFlowchartLayout(resolveFlowchartSpec(j.payload)!, null, { style: 'insoft' });
    for (const c of L.contexts ?? []) {
      for (const n of L.nodes) {
        if (c.members?.includes(n.id) || n.shape === 'comment') continue;
        if (n.x < c.x + c.w && n.x + n.w > c.x && n.y < c.y + c.h && n.y + n.h > c.y) malos.push(`${f.name}: «${c.label}» abraza ${n.id}`);
      }
    }
  }
  assertEquals(malos, []);
});
