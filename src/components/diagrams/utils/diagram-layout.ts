// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * diagram-graph.ts — grafo dirigido de un diagrama (nodos por id, aristas `from → to`), común a
 * todos los motores que recorren el flujo: capas (node-link), reprocesos (swimlane), índices
 * jerárquicos (flowchart) y las herramientas que derivan una vista de otra (p. ej. la Seq de su
 * Seq in Vec en el consumidor).
 *
 *   - `aristasDeRetorno`: las aristas que cierran un ciclo (DFS blanco / gris / negro); quitándolas el
 *     grafo es un DAG y ningún recorrido se cuelga.
 *   - `grafoDirigido`: hijos hacia adelante (sin retornos, en el orden que pida el llamador),
 *     alcanzables desde cada nodo y la reunión de varias ramas (el primer nodo común).
 */
import type { AristaDirigida, GrafoDirigido, OpcionesGrafo, TOpcionesFlujo, GraphNode, GraphEdge, NodeRect, EdgeAnchorXY, LayoutOpts, LayoutResult } from '@jeff-aporta/iswc-base/components/diagrams/schemas/diagram-layout.schemas.js';
import { snapDiagramGrid } from '@jeff-aporta/iswc-base/core/diagram-grid.js';

/** Clave estable de una arista (para marcar retornos sin depender de ids opcionales). */
export const claveArista = (e: AristaDirigida): string => `${e.from}>${e.to}`;

/**
 * Aristas de retorno (las que cierran un ciclo, self-loops incluidos), como claves `from>to`. Se
 * recorre primero desde las fuentes (sin entradas) en el orden de `ids`, y luego lo que quede: el
 * mismo criterio en todos los diagramas, así un ciclo se corta siempre por la misma arista.
 */
export function aristasDeRetorno(ids: readonly string[], edges: readonly AristaDirigida[]): Set<string> {
  const presentes = new Set(ids);
  const hijos = new Map<string, string[]>();
  for (const id of ids) hijos.set(id, []);
  for (const e of edges) if (presentes.has(e.from) && presentes.has(e.to)) hijos.get(e.from)!.push(e.to);
  const conEntrada = new Set(edges.filter((e) => presentes.has(e.from) && presentes.has(e.to)).map((e) => e.to));
  const estado = new Map<string, 1 | 2>();
  const atras = new Set<string>();
  const visitar = (id: string): void => {
    estado.set(id, 1);
    for (const h of hijos.get(id) ?? []) {
      if (estado.get(h) === 1) atras.add(`${id}>${h}`);
      else if (!estado.has(h)) visitar(h);
    }
    estado.set(id, 2);
  };
  for (const id of ids) if (!conEntrada.has(id) && !estado.has(id)) visitar(id);
  for (const id of ids) if (!estado.has(id)) visitar(id);
  return atras;
}

/**
 * Grafo dirigido listo para recorrer. `orden` ordena los hijos (p. ej. por posición de lectura);
 * `termina` marca nodos que no se atraviesan (el fin de un flujo: su respuesta vuelve al inicio) y
 * que tampoco sirven de reunión.
 */
export function grafoDirigido(
  ids: readonly string[],
  edges: readonly AristaDirigida[],
  opts: OpcionesGrafo = {},
): GrafoDirigido {
  const presentes = new Set(ids);
  const aristas = edges.filter((e) => presentes.has(e.from) && presentes.has(e.to));
  const atras = aristasDeRetorno(ids, aristas);
  const termina = opts.termina ?? (() => false);
  const hijos = new Map<string, string[]>();
  for (const e of aristas) {
    if (atras.has(claveArista(e))) continue;
    hijos.set(e.from, [...(hijos.get(e.from) ?? []), e.to]);
  }
  const entradas = new Set(aristas.map((e) => e.to));
  const salidas = new Set(aristas.map((e) => e.from));
  const cache = new Map<string, string[]>();
  const siguientes = (id: string): string[] => {
    const m = cache.get(id);
    if (m) return m;
    const hs = termina(id) ? [] : [...new Set(hijos.get(id) ?? [])];
    if (opts.orden) hs.sort(opts.orden);
    cache.set(id, hs);
    return hs;
  };
  const alcance = new Map<string, Set<string>>();
  const alcanzables = (id: string): Set<string> => {
    const m = alcance.get(id);
    if (m) return m;
    const vistos = new Set<string>();
    const pila = [id];
    while (pila.length) for (const h of siguientes(pila.pop()!)) if (!vistos.has(h)) { vistos.add(h); pila.push(h); }
    alcance.set(id, vistos);
    return vistos;
  };
  const reunion = (ramas: readonly string[]): string | null => {
    if (!ramas.length) return null;
    const orden: string[] = [];
    const vistos = new Set<string>([ramas[0]!]);
    const cola = [ramas[0]!];
    while (cola.length) {
      const x = cola.shift()!;
      orden.push(x);
      for (const h of siguientes(x)) if (!vistos.has(h)) { vistos.add(h); cola.push(h); }
    }
    return orden.find((x) => !termina(x) && ramas.every((r) => r === x || alcanzables(r).has(x))) ?? null;
  };
  return {
    atras,
    fuentes: ids.filter((id) => !entradas.has(id) && salidas.has(id)),
    conEntrada: (id) => entradas.has(id),
    conSalida: (id) => salidas.has(id),
    siguientes,
    alcanzables,
    reunion,
  };
}

// ── diagram-flow ──
/**
 * diagram-flow.ts — animación de flujo de los rieles, común a TODOS los diagramas del kit.
 *
 * Estándar: cada riel muestra hacia dónde va lo que transporta.
 *   - Riel punteado: el patrón de trazos avanza (SMIL `stroke-dashoffset`).
 *   - Riel continuo: detrás, una segunda línea de puntos (trazo de largo 0, remate redondo) más
 *     gruesa y espaciada, que avanza; el riel queda encima: un efecto sutil. Por defecto los puntos
 *     son del color de la arista y miden su ancho + `grosorExtra`; el consumidor los personaliza
 *     con `dots: { color, size }` en la arista.
 *   - Pulsos: los puntos laten en alfa y cada O (`-(O-`, `-(O=`) y cada ⦿ de llegada emite un
 *     pulso de radar periódico. Todo pulso arranca transparente y empieza tras `FLUJO.pulso.inicio`:
 *     el PNG (captura estática) sale limpio; la animación solo se ve en el SVG vivo.
 *   - `reverse`: el movimiento va de la punta al origen (p. ej. herencia en clases, o el lado N→1
 *     en el DER cuando la arista se dibuja del 1 al N).
 *
 * Es animación SVG nativa: viaja con el SVG exportado. Se apaga con `prefers-reduced-motion` en el
 * navegador o con el atributo `flow-anim="off"` en el host del diagrama.
 *
 * Doc: diagram-flow.md
 */

/** Medidas del efecto (compartidas por todos los diagramas). */
export const FLUJO = {
  /** Periodo del patrón punteado (trazo + hueco) y su duración. */
  punteado: { periodo: 9, dur: 0.9 },
  /** Puntos de los rieles continuos: separación, velocidad (px/s) y grosor extra sobre el riel. */
  puntos: { paso: 100, velocidad: 120, grosorExtra: 3 },
  /** Pulsos (radar en las O y ⦿, alfa en los puntos): periodo, arranque diferido y crecimiento del radar. */
  pulso: { periodo: 3, inicio: 1.5, crece: 2.4, alfa: 0.55 },
} as const;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** ¿El host permite la animación? (atributo `flow-anim="off"` o movimiento reducido la apagan). */
export function flujoActivo(host?: Element | null): boolean {
  if (host?.getAttribute('flow-anim') === 'off') return false;
  return !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Anima un riel ya pintado. En un punteado agrega el `<animate>` a su `path`; en un continuo
 * devuelve la línea de puntos para insertarla ANTES del riel (detrás: el trazo queda encima). `null`
 * si no hay nada que agregar fuera del path. Los pintores usan `animarRielEn`, que ya la coloca.
 */
export function animarRiel(path: SVGElement, op: TOpcionesFlujo): SVGElement | null {
  if (op.punteado) {
    const periodo = periodoDe(op.dasharray ?? path.getAttribute('stroke-dasharray')) ?? FLUJO.punteado.periodo;
    const a = document.createElementNS(SVG_NS, 'animate');
    a.setAttribute('attributeName', 'stroke-dashoffset');
    a.setAttribute('values', op.reverse ? `0;${periodo}` : `${periodo};0`);
    a.setAttribute('dur', `${(FLUJO.punteado.dur * periodo) / FLUJO.punteado.periodo}s`);
    a.setAttribute('repeatCount', 'indefinite');
    a.setAttribute('class', 'iswc-flow__dash');
    path.appendChild(a);
    return null;
  }
  const d = path.getAttribute('d');
  if (!d) return null;
  const { paso, velocidad, grosorExtra } = FLUJO.puntos;
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  p.setAttribute('fill', 'none');
  // Del color de la arista (o el que pida el consumidor) y DETRÁS del riel (el llamador lo inserta
  // antes): el riel continuo queda encima y los puntos no invaden.
  p.setAttribute('stroke', op.puntos?.color ?? op.color ?? path.getAttribute('stroke') ?? 'currentColor');
  p.setAttribute('stroke-width', String(op.puntos?.size ?? (op.ancho ?? Number(path.getAttribute('stroke-width') ?? 1)) + grosorExtra));
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-dasharray', `0 ${paso}`);
  p.setAttribute('class', 'iswc-flow__dots');
  p.setAttribute('pointer-events', 'none');
  // Pulso de alfa: arranca transparente (el PNG no lleva los puntos).
  p.setAttribute('stroke-opacity', '0');
  p.appendChild(animar('stroke-opacity', '0;1;0', { keyTimes: '0;0.5;1' }));
  const a = document.createElementNS(SVG_NS, 'animate');
  a.setAttribute('attributeName', 'stroke-dashoffset');
  a.setAttribute('values', op.reverse ? `0;${paso}` : `${paso};0`);
  a.setAttribute('dur', `${paso / velocidad}s`);
  a.setAttribute('repeatCount', 'indefinite');
  p.appendChild(a);
  return p;
}

/**
 * Anima el riel `path` dentro de su grupo `g`: la línea de puntos de un continuo queda detrás del
 * riel (estándar de todos los diagramas). Único punto de entrada de los pintores.
 */
export function animarRielEn(g: Element, path: SVGElement, op: TOpcionesFlujo): void {
  const puntos = animarRiel(path, op);
  if (puntos) g.insertBefore(puntos, path);
}

/**
 * Pulso de radar de una O o un ⦿: un anillo que nace en el borde, crece y se desvanece cada
 * `FLUJO.pulso.periodo` s. Arranca transparente. Se inserta DETRÁS de la figura (el llamador lo pone
 * antes de ella).
 */
export function pulsoRadar(cx: number, cy: number, r: number, color: string): SVGElement {
  const { crece, alfa } = FLUJO.pulso;
  const c = document.createElementNS(SVG_NS, 'circle');
  c.setAttribute('cx', String(cx));
  c.setAttribute('cy', String(cy));
  c.setAttribute('r', String(r));
  c.setAttribute('fill', color);
  c.setAttribute('fill-opacity', '0.25');
  c.setAttribute('stroke', color);
  c.setAttribute('stroke-width', '1.5');
  c.setAttribute('opacity', '0');
  c.setAttribute('class', 'iswc-flow__radar');
  c.setAttribute('pointer-events', 'none');
  c.appendChild(animar('r', `${r};${r * crece}`));
  c.appendChild(animar('opacity', `${alfa};0`));
  return c;
}

/** `<animate>` periódico del pulso, con arranque diferido (antes de empezar rige el valor base). */
function animar(atributo: string, valores: string, extra: Record<string, string> = {}): SVGElement {
  const a = document.createElementNS(SVG_NS, 'animate');
  a.setAttribute('attributeName', atributo);
  a.setAttribute('values', valores);
  a.setAttribute('dur', `${FLUJO.pulso.periodo}s`);
  a.setAttribute('begin', `${FLUJO.pulso.inicio}s`);
  a.setAttribute('repeatCount', 'indefinite');
  for (const [k, v] of Object.entries(extra)) a.setAttribute(k, v);
  return a;
}

/** Periodo (suma) de un `stroke-dasharray` («5 4» → 9). */
function periodoDe(dash: string | null | undefined): number | null {
  if (!dash) return null;
  const n = dash.split(/[\s,]+/).map(Number).filter((x) => Number.isFinite(x) && x >= 0);
  const s = n.reduce((a, b) => a + b, 0) * (n.length % 2 ? 2 : 1);
  return s > 0 ? s : null;
}

// ── node-link-layout ──
/**
 * Motor de layout puro (sin DOM, sin globals) para diagramas de nodos y
 * enlaces (flowchart, class, state, ER, C4, architecture, block).
 * Implementa un pipeline estilo Sugiyama: capas -> orden -> coordenadas px.
 * No importa diagram-grid.js a propósito: este módulo debe ser
 * dependency-free para poder testearse con Node puro.
 */

/** Redondea al múltiplo de 8px más cercano (misma rejilla que el resto de los diagramas). */
/** Nodo de un grafo tipo node-link. Solo se necesitan id/w/h para `assignLayers`; el layout completo exige w/h. */

/** Arista de un grafo tipo node-link. */

/**
 * Asigna una capa (nivel jerárquico) a cada nodo mediante longest-path.
 * Tolera ciclos: primero rompe back-edges con una DFS (visited / en-pila),
 * y luego capa el DAG resultante. Nunca entra en loop infinito.
 * @param nodes Lista de nodos con `id`.
 * @param edges Aristas con `from` y `to`.
 * @returns Mapa `id -> layer`.
 */
export function assignLayers(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): Map<string, number> {
  const ids = new Set(nodes.map((n) => n.id));
  // 1) Descartar los retornos (ciclos) con el detector común: queda un DAG.
  const atras = aristasDeRetorno(nodes.map((n) => n.id), edges);
  const dagAdj = new Map<string, string[]>();
  for (const id of ids) dagAdj.set(id, []);
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to) || atras.has(claveArista(e))) continue;
    dagAdj.get(e.from)!.push(e.to);
  }

  // 2) Longest-path layering sobre el DAG (sin back-edges), iterativo.
  const layer = new Map<string, number>();
  for (const id of ids) layer.set(id, 0);
  const preds = new Map<string, string[]>();
  for (const id of ids) preds.set(id, []);
  for (const [u, list] of dagAdj) {
    for (const v of list) preds.get(v)!.push(u);
  }

  // Relajación iterativa acotada: como el grafo (dagAdj) es acíclico, converge
  // en a lo sumo |V| pasadas. El límite explícito evita cualquier loop infinito.
  const maxPasses = ids.size + 1;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    for (const id of ids) {
      const ps = preds.get(id)!;
      if (ps.length === 0) continue;
      let maxPred = -1;
      for (const p of ps) maxPred = Math.max(maxPred, layer.get(p) ?? -1);
      const next = maxPred + 1;
      if (next !== layer.get(id)) {
        layer.set(id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return layer;
}

/**
 * Ordena los nodos dentro de cada capa con el heurístico de baricentro para
 * reducir cruces de aristas. Alterna barridos hacia abajo y hacia arriba.
 * @param layersMap Mapa de capas producido por `assignLayers`.
 * @param nodes Lista de nodos con `id`.
 * @param edges Aristas con `from` y `to`.
 * @param sweeps Número de pasadas del heurístico.
 * @returns Mapa `id -> índice de orden dentro de su capa`.
 */
export function orderLayers(layersMap: Map<string, number>, nodes: readonly GraphNode[], edges: readonly GraphEdge[], sweeps: number = 4): Map<string, number> {
  const byLayer = new Map<number, string[]>();
  for (const n of nodes) {
    const l = layersMap.get(n.id) ?? 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(n.id);
  }
  const maxLayer = byLayer.size ? Math.max(...byLayer.keys()) : 0;

  const order = new Map<string, number>();
  for (const [, ids] of byLayer) {
    ids.forEach((id, i) => order.set(id, i));
  }

  const neighborsDown = new Map<string, string[]>(); // id -> ids en la capa siguiente (mayor)
  const neighborsUp = new Map<string, string[]>(); // id -> ids en la capa anterior (menor)
  for (const n of nodes) {
    neighborsDown.set(n.id, []);
    neighborsUp.set(n.id, []);
  }
  for (const e of edges) {
    if (!neighborsDown.has(e.from) || !neighborsDown.has(e.to)) continue;
    const lf = layersMap.get(e.from) ?? 0;
    const lt = layersMap.get(e.to) ?? 0;
    if (lt > lf) {
      neighborsDown.get(e.from)!.push(e.to);
      neighborsUp.get(e.to)!.push(e.from);
    } else if (lf > lt) {
      neighborsDown.get(e.to)!.push(e.from);
      neighborsUp.get(e.from)!.push(e.to);
    }
    // aristas dentro de la misma capa (o self-loops) no afectan el orden.
  }

  function barycenter(id: string, neighborMap: Map<string, string[]>): number | null {
    const ns = neighborMap.get(id);
    if (!ns || ns.length === 0) return null;
    let sum = 0;
    for (const nb of ns) sum += order.get(nb) ?? 0;
    return sum / ns.length;
  }

  function sortLayer(layerIdx: number, neighborMap: Map<string, string[]>): void {
    const ids = byLayer.get(layerIdx);
    if (!ids) return;
    const withBc = ids.map((id, i) => ({ id, i, bc: barycenter(id, neighborMap) }));
    withBc.sort((a, b) => {
      if (a.bc === null && b.bc === null) return a.i - b.i;
      if (a.bc === null) return 1;
      if (b.bc === null) return -1;
      if (a.bc !== b.bc) return a.bc - b.bc;
      return a.i - b.i; // estable
    });
    withBc.forEach((entry, idx) => {
      order.set(entry.id, idx);
    });
    byLayer.set(layerIdx, withBc.map((e) => e.id));
  }

  for (let s = 0; s < sweeps; s++) {
    if (s % 2 === 0) {
      // barrido hacia abajo: reordena cada capa usando vecinos de la capa anterior
      for (let l = 0; l <= maxLayer; l++) sortLayer(l, neighborsUp);
    } else {
      // barrido hacia arriba: reordena cada capa usando vecinos de la capa siguiente
      for (let l = maxLayer; l >= 0; l--) sortLayer(l, neighborsDown);
    }
  }

  return order;
}

/** Rectángulo `{ x, y, w, h }` que representa la caja de un nodo ya colocado. */

/**
 * Punto de conexión (midpoint) de un lado del nodo.
 * @param node Caja del nodo con x/y/w/h.
 * @param side Lado del rectángulo del que se extrae el anchor.
 */
export function edgeAnchor(node: NodeRect, side: 'top' | 'bottom' | 'left' | 'right'): EdgeAnchorXY {
  // El punto medio de un lado cae a menudo fuera de la rejilla de 8px (la
  // mitad de una altura no múltiplo de 16 no es múltiplo de 8). Sin este snap,
  // el primer tramo ruteado —que sí vive en la rejilla— arranca en un punto
  // distinto al de este ancla, y la línea "M ancla ... L primer punto" queda
  // en diagonal en vez de horizontal/vertical: el "torcido" que se ve en ER.
  switch (side) {
    case 'top':
      return { x: snapDiagramGrid(node.x + node.w / 2), y: node.y };
    case 'bottom':
      return { x: snapDiagramGrid(node.x + node.w / 2), y: node.y + node.h };
    case 'left':
      return { x: node.x, y: snapDiagramGrid(node.y + node.h / 2) };
    case 'right':
    default:
      return { x: node.x + node.w, y: snapDiagramGrid(node.y + node.h / 2) };
  }
}

/**
 * Elige los lados de anclaje más sensatos entre dos nodos según la dirección
 * del layout. Para aristas hacia atrás (o mismo nivel / self-loop) rutea por
 * los costados (right -> right / bottom -> bottom) en vez de atravesar el nodo.
 */
export function pickSides(
  fromNode: { layer: number },
  toNode: { layer: number },
  direction: 'TB' | 'BT' | 'LR' | 'RL',
): { fromSide: string; toSide: string } {
  const isBack = toNode.layer <= fromNode.layer;

  if (direction === 'TB') {
    return isBack ? { fromSide: 'right', toSide: 'right' } : { fromSide: 'bottom', toSide: 'top' };
  }
  if (direction === 'BT') {
    return isBack ? { fromSide: 'right', toSide: 'right' } : { fromSide: 'top', toSide: 'bottom' };
  }
  if (direction === 'LR') {
    return isBack ? { fromSide: 'bottom', toSide: 'bottom' } : { fromSide: 'right', toSide: 'left' };
  }
  // RL
  return isBack ? { fromSide: 'bottom', toSide: 'bottom' } : { fromSide: 'left', toSide: 'right' };
}

/** Nodo con tamaño, ya colocado por el layout. */

/**
 * Calcula el layout completo: capas, orden y coordenadas en píxeles.
 */
export function layoutNodeLink(nodes: readonly GraphNode[], edges: readonly GraphEdge[], opts: LayoutOpts = {}): LayoutResult {
  const { direction = 'TB', layerGap = 64, nodeGap = 28, align = 'center' } = opts;
  const swapAxes = direction === 'LR' || direction === 'RL';
  const mirrorMain = direction === 'BT' || direction === 'RL';

  const layers = assignLayers(nodes, edges);
  const order = orderLayers(layers, nodes, edges);

  const byId = new Map<string, GraphNode>(nodes.map((n) => [n.id, n]));
  const byLayer = new Map<number, string[]>();
  for (const n of nodes) {
    const l = layers.get(n.id) ?? 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(n.id);
  }
  for (const [, ids] of byLayer) {
    ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  }

  const maxLayer = byLayer.size ? Math.max(...byLayer.keys()) : 0;

  // Extensión en el eje cruzado (ancho para TB/BT, alto para LR/RL) y tamaño
  // principal (alto para TB/BT, ancho para LR/RL) de cada nodo, según eje.
  function crossSize(n: GraphNode): number {
    return swapAxes ? n.h ?? 0 : n.w ?? 0;
  }
  function mainSize(n: GraphNode): number {
    return swapAxes ? n.w ?? 0 : n.h ?? 0;
  }

  // Extensión cruzada total de cada capa (para centrar/alinear) y overall.
  const layerCrossExtent = new Map<number, number>();
  let overallCrossExtent = 0;
  for (const [l, ids] of byLayer) {
    const nodesInLayer = ids.map((id) => byId.get(id)!);
    const total =
      nodesInLayer.reduce((acc: number, n: GraphNode) => acc + crossSize(n), 0) +
      nodeGap * Math.max(0, nodesInLayer.length - 1);
    layerCrossExtent.set(l, total);
    overallCrossExtent = Math.max(overallCrossExtent, total);
  }

  // Tamaño principal (grosor) de cada capa = el nodo más "grueso" de la capa.
  const layerMainSize = new Map<number, number>();
  for (const [l, ids] of byLayer) {
    const nodesInLayer = ids.map((id) => byId.get(id)!);
    layerMainSize.set(l, Math.max(0, ...nodesInLayer.map((n: GraphNode) => mainSize(n))));
  }

  // Offset principal acumulado (posición inicial de cada capa a lo largo del eje principal).
  const layerMainOffset = new Map<number, number>();
  let mainCursor = 0;
  for (let l = 0; l <= maxLayer; l++) {
    layerMainOffset.set(l, mainCursor);
    mainCursor += (layerMainSize.get(l) ?? 0) + layerGap;
  }
  const totalMain = mainCursor > 0 ? mainCursor - layerGap : 0;

  const positioned: { id: string; layer: number; order: number; crossPos: number; mainPos: number; w: number; h: number }[] = [];
  for (const [l, ids] of byLayer) {
    const crossExtent = layerCrossExtent.get(l) ?? 0;
    const startCross = align === 'start' ? 0 : (overallCrossExtent - crossExtent) / 2;
    let crossCursor = startCross;
    const mainStart = layerMainOffset.get(l) ?? 0;
    ids.forEach((id, idx) => {
      const n = byId.get(id)!;
      const cross = crossCursor;
      crossCursor += crossSize(n) + nodeGap;
      positioned.push({
        id,
        layer: l,
        order: idx,
        crossPos: cross,
        mainPos: mainStart,
        w: n.w ?? 0,
        h: n.h ?? 0,
      });
    });
  }

  const outNodes = positioned.map((p) => {
    let x: number;
    let y: number;
    if (!swapAxes) {
      x = p.crossPos;
      y = p.mainPos;
    } else {
      x = p.mainPos;
      y = p.crossPos;
    }
    return { id: p.id, x, y, w: p.w, h: p.h, layer: p.layer, order: p.order };
  });

  // Mirroring para BT/RL: invierte la coordenada principal.
  if (mirrorMain) {
    for (const n of outNodes) {
      if (!swapAxes) {
        n.y = totalMain - n.y - n.h;
      } else {
        n.x = totalMain - n.x - n.w;
      }
    }
  }

  // Snap a rejilla de 8px.
  for (const n of outNodes) {
    n.x = snapDiagramGrid(n.x);
    n.y = snapDiagramGrid(n.y);
  }

  let width = 0;
  let height = 0;
  for (const n of outNodes) {
    width = Math.max(width, n.x + n.w);
    height = Math.max(height, n.y + n.h);
  }

  return { nodes: outNodes, width, height, layers };
}
