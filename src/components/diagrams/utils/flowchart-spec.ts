import { layoutNodeLink, edgeAnchor, pickSides, assignLayers, orderLayers } from './node-link-layout.js';
import { readNodeEmbed, embedIsNatural, fitContain, nestedMaxSize, EMBED_FALLBACK_SIZE } from './diagram-embed.js';
import { pathPoints, pathSinAutoCruces } from './diagram-arrow.js';
import type { BoxSide } from '../schemas/diagram-types.schemas.js';

// `BoxSide` admite `'auto'`; los anclajes efectivos del router son siempre
// una dirección cardinal. Estrechamos para satisfacer la firma del helper.
import { diagramHeaderWidth } from './diagram-header.js';
import { applyEdgeActorLayout } from './diagram-edge-actors.js';
import { assignEdgeHues } from './diagram-edge-style.js';
import {
  makeCostGrid, blockRect, applyRectCost, applyRadialCost, snapDiagramGrid, ceilDiagramGrid, rectsOverlap,
  readExclusionZones, nudgeRectFromZones, blockExclusionZones, snapPointAwayFromSide,
} from '../../../core/diagram-grid.js';
import { routeOrthogonal, pixelToGrid, gridPathToSvg, buildOrthogonalPath } from './diagram-astar.js';
import { countIconTokens, extractLeadingIconToken } from '../../../core/tk-icon-inline.js';
import { richTextPlain } from '../../../core/tk-rich-text.js';
import { resolveTkHue } from '../../../core/tk-hue.js';
import { estimateTextWidth, wrapText } from './diagram-text-wrap.js';
import { grafoDirigido } from './diagram-graph.js';
import type { CajaPuente, LadoPuente, PuertoPuente, AnchorSide, FlowDirection, FlowShape, FlowEdgeKind, FlowOverflow, LeadingIconToken, FlowExclusionZone, FlowNodeSpec, FlowEdgeSpec, FlowGroupSpec, FlowResolvedSpec, FlowLayoutNode, FlowLayoutEdge, FlowLayout, FlowLayoutOverrides, FlowLayoutOptions, FlowSizedNode, FlowPlacement, FlowPlacedNode, FlowPaint, FlowSegment, FlowPoint, FlowLaneSpec, FlowLaneDirection, FlowLayoutLane, FlowLayoutContext, FlowVar, TipoEntidad, FlowBridge } from "../schemas/flowchart-spec.schemas.js";
import type { TPuntosRiel } from "../schemas/diagram-flow.schemas.js";
import type { ErThemeJson } from "../schemas/theme.schemas.js";
import { resolverEtiquetas, U } from './flowchart-labels.js';
import { perimeterPorts, routeEdges, simplifyOrthoPath } from './component-router.js';
import { anchoDeComponente } from './component-spec.js';
import { vectorAFlujo } from './vector-flow-spec.js';
import { ROUTING_COSTS_DEFAULTS } from './routing-costs.js';
import { oklchToHex } from './oklch.js';
import { FlowBridgeSchema, FlowVarSchema, TipoEntidadSchema } from '../schemas/flowchart-spec.schemas.js';
import type { RouterEdge, RouterPort } from '../schemas/component-router.schemas.js';
import type { Lado } from '../schemas/diagram-tipos.schemas.js';
import type { EmbedBox } from "../schemas/diagram-embed.schemas.js";

/**
 * Especificación y layout de diagramas de flujo (sin Mermaid).
 *
 * Mismo contrato que el diagrama de secuencia: la entrada es JSON, la salida es
 * geometría pura. Reutiliza el motor node-link (capas + baricentro) para colocar
 * y el A* de la rejilla de costos para rutear, de modo que las aristas rodean las
 * cajas en vez de atravesarlas.
 */

const ICON_INLINE_W = 16;
const MIN_W = 88;
const MAX_W = 260;
const NODE_H = 44;
const DIAMOND_PAD = 28;

/** Direcciones aceptadas (equivalen a las de Mermaid: TB/TD, BT, LR, RL). */
const DIRECTIONS: Set<string> = new Set(['TB', 'BT', 'LR', 'RL']);

/** Formas soportadas; el resto cae a 'rect'. */
export const FLOW_SHAPES: Set<string> = new Set([
  'rect', 'round', 'stadium', 'circle', 'diamond', 'hexagon', 'parallelogram', 'cylinder', 'subroutine',
  'start', 'end', 'bar', 'comment', 'vars', 'bridge',
]);

/**
 * Estilo insoft: pastilla de una acción (número de paso + ícono) a la izquierda del texto. Alto 22,
 * relleno de 6 por lado, ícono de 14, 4 entre número e ícono y 8 de aire hasta el texto.
 */
export const FLOW_PILL_H = 22;
/** Hueco entre la pastilla y el texto dentro del rombo (caja de dos columnas). */
const DECISION_GAP = 6;
export const FLOW_PILL_ICON = 14;
const PILL_PAD = 6;
const PILL_GAP = 4;
const PILL_AIRE = 8;
/** Ancho del número de paso en la pastilla (negrita de 10 px; el punto de un índice jerárquico es angosto). */
export const pillStepW = (step: number | string): number => String(step).replace(/\./g, '').length * 6.5 + (String(step).match(/\./g)?.length ?? 0) * 3;
/** Ancho de la pastilla de un nodo (0 si no trae ni paso ni ícono). */
export function pillWidth(step: number | string | undefined, icon: string | undefined): number {
  if (step == null && !icon) return 0;
  const num = step != null ? pillStepW(step) : 0;
  const w = PILL_PAD * 2 + num + (icon ? FLOW_PILL_ICON : 0) + (step != null && icon ? PILL_GAP : 0);
  return Math.max(FLOW_PILL_H, Math.ceil(w));
}

/** Barra de sincronización (bifurcación / unión de flujos paralelos): ancho y grosor. */
export const FLOW_BAR_W = 112;
export const FLOW_BAR_H = 8;

/** Diámetro de los nodos de inicio (círculo negro) y fin (anillo, bullseye). */
export const FLOW_TERMINAL_D = 24;

const DEFAULT_HUES: number[] = [210, 239, 160, 38, 280, 199];

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Ancho estimado de la caja según su etiqueta, descontando tokens {{icon}}.
 *
 * Ademas de la estimacion lineal `chars * factor`, se considera el ancho
 * real de la PALABRA MAS LARGA del label: el wrap no parte palabras, asi que
 * si una sola palabra es mas ancha que la caja, el texto se desborda fuera
 * del borde. Para evitarlo se toma el max entre la estimacion agregada y
 * el ancho de la palabra mas larga, mas un pequeno margen. */
function nodeWidth(label: string, shape: string): number {
  const plain = richTextPlain(label);
  const icons = countIconTokens(label);
  let longestWord = 0;
  for (const w of plain.split(/\s+/)) {
    if (!w) continue;
    const chars = w.length;
    // Misma relacion aprox que el factor 7.1/char del estimador agregado:
    // cada glyph mide ~7.1px a fontSize 11 con Poppins; corregimos por longitud.
    const wordEst = Math.ceil(chars * 7.1) + 8;
    if (wordEst > longestWord) longestWord = wordEst;
  }
  const est = Math.ceil(plain.length * 7.1) + 32 + icons * ICON_INLINE_W;
  // Tomamos el MAYOR entre la estimacion agregada (caja normal) y la palabra
  // mas larga (para que el wrap no desborde). Esto sacrifica un poco de ancho
  // en labels cortos con palabras muy largas, pero arregla los desbordes.
  if (shape === 'start' || shape === 'end') return FLOW_TERMINAL_D;
  if (shape === 'bar') return FLOW_BAR_W;
  const base = snapDiagramGrid(Math.min(MAX_W, Math.max(MIN_W, Math.max(est, longestWord))));
  // Rombo y círculo necesitan más caja para que el texto no se salga del contorno.
  if (shape === 'diamond') return snapDiagramGrid(base + DIAMOND_PAD);
  if (shape === 'circle') return snapDiagramGrid(Math.max(base, NODE_H * 2));
  return base;
}

function nodeHeight(shape: string): number {
  if (shape === 'start' || shape === 'end') return FLOW_TERMINAL_D;
  if (shape === 'bar') return FLOW_BAR_H;
  if (shape === 'circle') return snapDiagramGrid(NODE_H * 1.6);
  if (shape === 'diamond') return snapDiagramGrid(NODE_H * 1.35);
  return NODE_H;
}

function readNode(raw: Record<string, unknown>, i: number): FlowNodeSpec {
  const rawLabel = String(raw.label ?? raw.text ?? raw.id ?? `Nodo ${i + 1}`);
  const leading = extractLeadingIconToken(rawLabel) as LeadingIconToken | null;
  const shapeStr = String(raw.shape ?? '');
  const shape = (FLOW_SHAPES.has(shapeStr) ? shapeStr : 'rect') as FlowShape;
  const overflowRaw = String(raw.overflow ?? '').trim();
  const overflow: FlowOverflow | undefined = overflowRaw === 'grow' || overflowRaw === 'ellipsis'
    ? (overflowRaw as FlowOverflow)
    : undefined;
  return {
    id: String(raw.id ?? `n${i}`),
    label: rawLabel,
    shape,
    icon: leading?.iconId ?? (raw.icon != null ? String(raw.icon) : undefined),
    hue: leading?.hue ?? (raw.hue != null ? resolveTkHue(raw) : undefined),
    group: String(raw.group ?? '') || undefined,
    description: String(raw.desc ?? raw.description ?? '').trim() || undefined,
    overflow,
    ...(raw.lane != null && String(raw.lane) ? { lane: String(raw.lane) } : {}),
    ...(typeof raw.context === 'string' && raw.context.trim() ? { context: raw.context.trim() } : {}),
    ...(typeof raw.about === 'string' && raw.about.trim() ? { about: raw.about.trim() } : {}),
    ...(Number.isInteger(Number(raw.step)) && raw.step !== null && raw.step !== '' && Number(raw.step) >= 0 ? { step: Number(raw.step) } : {}),
    ...embedFields(raw),
    ...(shape === 'vars' ? leerVars(raw.vars) : {}),
    ...(shape === 'bridge' ? leerPuente(raw) : {}),
  };
}

/** Puente `-(O=`: su controller (`of`) y su letra CRUD (`op`). */
function leerPuente(raw: Record<string, unknown>): { bridge?: FlowBridge } {
  const r = FlowBridgeSchema.safeParse({ of: String(raw.of ?? ''), op: String(raw.op ?? '').toUpperCase() });
  return r.success ? { bridge: r.data } : {};
}

/** Variables de un nodo `vars`: solo las que traen nombre y valor (ambos obligatorios). */
function leerVars(raw: unknown): { vars?: FlowVar[] } {
  if (!Array.isArray(raw)) return {};
  const vars = raw.flatMap((v) => {
    const o = asRecord(v);
    const r = FlowVarSchema.safeParse({
      name: String(o.name ?? '').trim(), value: String(o.value ?? '').trim(),
      ...(o.alias ? { alias: String(o.alias).trim() } : {}), ...(o.desc ? { desc: String(o.desc).trim() } : {}),
    });
    return r.success ? [r.data] : [];
  });
  return vars.length ? { vars } : {};
}

/** `kind` + campos del nodo especial (nested/tableder/component), si los declara. */
function embedFields(raw: Record<string, unknown>): Pick<FlowNodeSpec, 'kind' | 'embed'> {
  const embed = readNodeEmbed(raw);
  return embed ? { kind: embed.kind, embed } : {};
}

function readEdge(raw: Record<string, unknown>, i: number): FlowEdgeSpec {
  // Waypoints opcionales: fuerzan el A* a pasar por coordenadas en píxeles.
  // Cada item es { x, y } en el plano del SVG. Sirven para guiar la ruta
  // estéticamente cuando el algoritmo directo cae en zigzag.
  const waypoints: Array<{ x: number; y: number }> | undefined = Array.isArray(raw.waypoints)
    ? raw.waypoints
        .map((w: unknown) => asRecord(w))
        .filter((w) => Number.isFinite(w.x) && Number.isFinite(w.y))
        .map((w) => ({ x: Number(w.x), y: Number(w.y) }))
    : undefined;
  return {
    id: String(raw.id ?? `e${i}`),
    from: String(raw.from ?? raw.source ?? ''),
    to: String(raw.to ?? raw.target ?? ''),
    label: String(raw.label ?? '').trim() || undefined,
    kind: raw.kind === 'dashed' || raw.kind === 'thick' ? (raw.kind as FlowEdgeKind) : 'solid',
    group: String(raw.group ?? '') || undefined,
    waypoints: waypoints?.length ? waypoints : undefined,
    ...(raw.labelVertical === true || raw.labelDirection === 'vertical' ? { labelVertical: true } : {}),
    ...(typeof raw.icon === 'string' && raw.icon.includes(':') ? { icon: raw.icon.trim() } : {}),
    ...(raw.reverse === true ? { reverse: true } : {}),
    ...(typeof raw.color === 'string' && raw.color.trim() ? { color: raw.color.trim() } : {}),
    ...(leerPuntos(raw.dots) ?? {}),
  };
}

/** `dots: { color, size }` de una arista: los puntos animados personalizados (ver diagram-flow). */
function leerPuntos(raw: unknown): { dots: TPuntosRiel } | null {
  const r = asRecord(raw);
  const color = typeof r.color === 'string' && r.color.trim() ? r.color.trim() : undefined;
  const size = Number(r.size);
  const dots = { ...(color ? { color } : {}), ...(Number.isFinite(size) && size > 0 ? { size } : {}) };
  return Object.keys(dots).length ? { dots } : null;
}

/** Carriles de contexto: `lanes: [{ id, label }]` (o `["Cliente", …]`, id = label). */
function readLanes(src: Record<string, unknown>): FlowLaneSpec[] | undefined {
  const list = Array.isArray(src.lanes) ? src.lanes : [];
  const out: FlowLaneSpec[] = [];
  const vistos = new Set<string>();
  for (const [i, raw] of list.entries()) {
    const r = typeof raw === 'string' ? { id: raw, label: raw } : asRecord(raw);
    const id = String(r.id ?? r.label ?? `carril-${i + 1}`);
    if (vistos.has(id)) continue;
    vistos.add(id);
    out.push({ id, label: String(r.label ?? r.name ?? id), ...(r.align === 'center' ? { align: 'center' as const } : {}), ...(r.stack === true ? { stack: true } : {}) });
  }
  return out.length ? out : undefined;
}

function readGroups(src: Record<string, unknown>): FlowGroupSpec[] | undefined {
  const raw = src.groups;
  const list = Array.isArray(raw) ? raw : [];
  if (!list.length) return undefined;
  return list.map((g: unknown, i: number) => {
    const r = asRecord(g);
    return {
      id: String(r.id ?? `grp-${i}`),
      name: String(r.name ?? r.label ?? `Grupo ${i + 1}`),
      hue: resolveTkHue(r, DEFAULT_HUES[i % DEFAULT_HUES.length]),
    };
  });
}

/** payload → spec normalizada, o null si no hay nodos. */
export function flowchartSpecFromPayload(payload: unknown): FlowResolvedSpec | null {
  const p0 = asRecord(payload);
  // Diagrama de flujo en vector: se valida (cada columna restringida a sus tipos) y se compila aquí.
  const p = p0.vectorFlow ? vectorAFlujo(p0.vectorFlow) : p0;
  const src = asRecord(p.flowchart ?? p.flow ?? p);
  const rawNodes = src.nodes;
  if (!Array.isArray(rawNodes) || !rawNodes.length) return null;

  const nodes: FlowNodeSpec[] = rawNodes.map((raw: unknown, i: number) => readNode(asRecord(raw), i));
  // Componentes incrustados: ancho homogéneo por carril (el del más ancho), como las acciones.
  {
    const porCarril = new Map<string, FlowNodeSpec[]>();
    for (const n of nodes) {
      if (n.embed?.kind !== 'component' || !n.embed.component || n.embed.component.w != null) continue;
      const k = n.lane ?? '';
      porCarril.set(k, [...(porCarril.get(k) ?? []), n]);
    }
    for (const grupo of porCarril.values()) {
      if (grupo.length < 2) continue;
      const w = Math.max(...grupo.map((n) => anchoDeComponente(n.embed!.component as Record<string, unknown>)));
      for (const n of grupo) n.embed = { ...n.embed!, component: { ...n.embed!.component, w } };
    }
  }
  // Código de color por tipo de entidad (cliente, componente, controller, POJO, tabla): uno por tipo,
  // sin repetir entre tipos. Lo fija `config.entityColors`; si no, rotación de tono OKLCH en 0°–330°.
  {
    const propios = asRecord(asRecord(src.config).entityColors);
    const colores = coloresDeEntidad(Object.fromEntries(Object.entries(propios).filter(([, v]) => typeof v === 'string')) as Partial<Record<TipoEntidad, string>>);
    for (const n of nodes) {
      const t = tipoDeEntidad(n);
      if (!t || !n.embed) continue;
      const color = colores[t];
      if (n.embed.kind === 'class' && n.embed.class && n.embed.class.fill == null) n.embed = { ...n.embed, class: { ...n.embed.class, fill: color } };
      else if (n.embed.kind === 'component' && n.embed.component && n.embed.component.fill == null) n.embed = { ...n.embed, component: { ...n.embed.component, fill: color } };
      else if (n.embed.kind === 'tableder' && n.embed.table) {
        const st = asRecord(n.embed.table.style);
        if (st.fill == null) n.embed = { ...n.embed, table: { ...n.embed.table, style: { ...st, fill: color } } };
      }
    }
  }
  // Config del diagrama: miembros por sección de las clases incrustadas antes del «N más».
  const tope = Number(asRecord(src.config).classMaxMembers ?? src.classMaxMembers);
  if (Number.isInteger(tope) && tope > 0) {
    for (const n of nodes) if (n.embed?.kind === 'class') n.embed = { ...n.embed, classMaxMembers: tope };
  }
  const known = new Set<string>(nodes.map((n) => n.id));
  // Descarta aristas colgantes: una arista a un id inexistente rompería el layout.
  const rawEdges = Array.isArray(src.edges) ? src.edges : [];
  const edges: FlowEdgeSpec[] = rawEdges
    .map((raw: unknown, i: number) => readEdge(asRecord(raw), i))
    .filter((e) => known.has(e.from) && known.has(e.to));

  const lanes = readLanes(src);
  const laneDirection: FlowLaneDirection | undefined = lanes
    ? (String(src.laneDirection ?? src.lanesDirection ?? '').toLowerCase() === 'horizontal' ? 'horizontal' : 'vertical')
    : undefined;
  // Con carriles el sentido lo fijan ellos: verticales → el flujo baja; horizontales → avanza a la derecha.
  const dir = lanes ? (laneDirection === 'horizontal' ? 'LR' : 'TB') : String(src.direction ?? 'TB').toUpperCase();
  const defaultOverflowRaw = String(src.defaultOverflow ?? 'grow').trim();
  const defaultOverflow: FlowOverflow = defaultOverflowRaw === 'ellipsis' ? 'ellipsis' : 'grow';
  return {
    title: String(src.title ?? p.title ?? '') || undefined,
    subtitle: String(src.subtitle ?? p.subtitle ?? '') || undefined,
    direction: DIRECTIONS.has(dir) ? (dir as FlowDirection) : (dir === 'TD' ? 'TB' : 'TB'),
    defaultOverflow,
    groups: readGroups(src),
    // Zonas donde nodos y aristas tienen prohibido entrar (espaciado estético).
    // Mismo espacio de coordenadas que los nodos, antes del margen del lienzo.
    exclusionZones: readExclusionZones(src.exclusionZones) as FlowExclusionZone[] | undefined,
    nodes: nodes.map((n) => ({ ...n, overflow: n.overflow ?? defaultOverflow })),
    edges,
    ...(lanes ? { lanes, laneDirection } : {}),
    ...(src.steps === 'auto' || src.steps === true ? { steps: 'auto' as const } : {}),
  };
}

export function resolveFlowchartSpec(payload: unknown): FlowResolvedSpec | null {
  return flowchartSpecFromPayload(payload);
}

/** spec → objeto `flowchart` listo para persistir / mostrar en el editor. */
export function flowchartSpecToJson(spec: FlowResolvedSpec): Record<string, unknown> {
  const out: Record<string, unknown> = { direction: spec.direction, nodes: [], edges: [] };
  if (spec.title) out.title = spec.title;
  if (spec.subtitle) out.subtitle = spec.subtitle;
  if (spec.groups?.length) out.groups = spec.groups;
  if (spec.exclusionZones?.length) out.exclusionZones = spec.exclusionZones;
  if (spec.steps === 'auto') out.steps = 'auto';
  if (spec.lanes?.length) {
    out.lanes = spec.lanes;
    if (spec.laneDirection === 'horizontal') out.laneDirection = 'horizontal';
  }
  out.nodes = spec.nodes.map((n) => {
    const row: Record<string, unknown> = { id: n.id, label: n.label };
    if (n.shape !== 'rect') row.shape = n.shape;
    if (n.lane) row.lane = n.lane;
    if (n.context) row.context = n.context;
    if (n.about) row.about = n.about;
    if (n.step != null) row.step = n.step;
    if (n.icon) row.icon = n.icon;
    if (n.vars?.length) row.vars = n.vars;
    if (n.group) row.group = n.group;
    if (n.description) row.desc = n.description;
    if (n.embed) Object.assign(row, n.embed);
    return row;
  });
  out.edges = spec.edges.map((e) => {
    const row: Record<string, unknown> = { from: e.from, to: e.to };
    if (e.label) row.label = e.label;
    if (e.kind !== 'solid') row.kind = e.kind;
    if (e.group) row.group = e.group;
    if (e.waypoints?.length) row.waypoints = e.waypoints;
    if (e.labelVertical) row.labelVertical = true;
    if (e.icon) row.icon = e.icon;
    if (e.reverse) row.reverse = true;
    if (e.color) row.color = e.color;
    if (e.dots) row.dots = e.dots;
    return row;
  });
  return out;
}

export function expandFlowchartPayloadForJson(payload: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = { ...asRecord(payload) };
  const spec = resolveFlowchartSpec(out);
  if (spec) out.flowchart = flowchartSpecToJson(spec);
  return out;
}

/* ───────────────────────── formas ───────────────────────── */

/** Contorno SVG de una caja según su forma. x/y = esquina superior izquierda. */
export function shapePath(shape: string, x: number, y: number, w: number, h: number): string {
  const r = 8;
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (shape) {
    case 'round':
      return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
    case 'stadium': {
      const rr = h / 2;
      return `M${x + rr},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} H${x + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} Z`;
    }
    case 'start':
    case 'end':
    case 'circle': {
      const rad = Math.min(w, h) / 2;
      return `M${cx - rad},${cy} a${rad},${rad} 0 1 0 ${rad * 2},0 a${rad},${rad} 0 1 0 ${-rad * 2},0 Z`;
    }
    case 'diamond':
      return `M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z`;
    case 'vars': {
      // Declaración de variables: rectángulo con la esquina superior derecha en diagonal (hoja).
      const k = Math.min(14, w / 6, h / 2);
      return `M${x},${y} H${x + w - k} L${x + w},${y + k} V${y + h} H${x} Z`;
    }
    case 'hexagon': {
      const k = Math.min(20, w / 4);
      return `M${x + k},${y} H${x + w - k} L${x + w},${cy} L${x + w - k},${y + h} H${x + k} L${x},${cy} Z`;
    }
    case 'parallelogram': {
      const k = Math.min(18, w / 5);
      return `M${x + k},${y} H${x + w} L${x + w - k},${y + h} H${x} Z`;
    }
    case 'cylinder': {
      const ry = Math.min(9, h / 5);
      return `M${x},${y + ry} a${w / 2},${ry} 0 0 1 ${w},0 V${y + h - ry} a${w / 2},${ry} 0 0 1 ${-w},0 Z`;
    }
    case 'subroutine':
      return `M${x},${y} H${x + w} V${y + h} H${x} Z M${x + 8},${y} V${y + h} M${x + w - 8},${y} V${y + h}`;
    case 'bar': {
      // Cápsula: horizontal (flujo que baja) o vertical (flujo hacia la derecha).
      const rb = Math.min(w, h) / 2;
      return w >= h
        ? `M${x + rb},${y} H${x + w - rb} A${rb},${rb} 0 0 1 ${x + w - rb},${y + h} H${x + rb} A${rb},${rb} 0 0 1 ${x + rb},${y} Z`
        : `M${x},${y + rb} A${rb},${rb} 0 0 1 ${x + w},${y + rb} V${y + h - rb} A${rb},${rb} 0 0 1 ${x},${y + h - rb} Z`;
    }
    default:
      return `M${x},${y} H${x + w} V${y + h} H${x} Z`;
  }
}

/* ───────────────────────── layout ───────────────────────── */

const MARGIN = { top: 16, right: 20, bottom: 20, left: 20 };

/**
 * spec → geometría lista para pintar.
 *
 * Acepta un parámetro opcional `overrides` con la forma:
 *   { nodes: { [id]: { x?, y?, label?, hue? } }, edges: { [id]: { label?, hue? } } }
 * Si un nodo tiene x/y en overrides, se respeta esa posición exacta en lugar
 * de la calculada por el layout Sugiyama. Sirve para el modo edición.
 */
export function computeFlowchartLayout(
  spec: FlowResolvedSpec,
  overrides: FlowLayoutOverrides | null = null,
  opts: FlowLayoutOptions = {},
): FlowLayout {
  // Presupuesto del layout (ms): las vueltas de etiquetas se detienen al agotarlo (el navegador no se cuelga).
  const inicioLayout = Date.now();
  const insoft = opts.style === 'insoft';
  const title = spec.title ?? '';
  const subtitle = spec.subtitle ?? '';
  const hasHeader = !!(title || subtitle);
  const titleY = title ? 22 : 14;
  const subtitleY = title ? 40 : 24;
  const headerH = hasHeader ? (subtitle ? 54 : 36) : 0;

  // Si el diagrama declara `overflow: 'grow'` en un nodo, el wrap puede
  // necesitar más líneas de las que caben en el alto inicial; ajustamos la
  // altura del nodo antes del layout Sugiyama para que el A* de aristas
  // coloque las cajas con el alto real.
  const FONT_SIZE = 11;
  const FONT_FAMILY = 'Tahoma,Arial,sans-serif';

  const specByIdPre = new Map<string, FlowNodeSpec>(spec.nodes.map((n) => [n.id, n]));
  // Numeración automática: la pastilla de cada acción se mide con el número más ancho (N), y los
  // números reales se ponen después de colocar (orden de lectura).
  const autoSteps = insoft && spec.steps === 'auto';
  const numerables = autoSteps ? spec.nodes.filter(esNumerable) : [];
  const sized: FlowSizedNode[] = spec.nodes.map((n0) => {
    const n = autoSteps
      ? { ...n0, step: esNumerable(n0) ? numerables.length : undefined, icon: n0.icon ?? (esNumerable(n0) ? iconoPorDefecto(n0) : undefined) }
      : n0;
    const special = sizeEmbedNode(n, opts) ?? (insoft ? sizeInsoftNode(n, opts) : null);
    if (special) return special;
    const w = nodeWidth(n.label, n.shape);
    const baseH = nodeHeight(n.shape);
    if (n.overflow === 'grow' && n.label && !/[*`\[]/.test(n.label) && !n.label.includes('{{')) {
      const wrap = wrapText({
        text: n.label, maxWidth: w, maxHeight: baseH,
        fontSize: FONT_SIZE, fontFamily: FONT_FAMILY, overflow: 'grow',
      });
      return { id: n.id, w, h: Math.ceil(wrap.requiredHeightUsed) };
    }
    return { id: n.id, w, h: baseH };
  });

  // Insoft: las acciones comparten un ancho homogéneo (el de la más ancha; el texto ya parte en
  // INSOFT.actionText, así que queda acotado): la columna se lee pareja, sin cajas irregulares.
  if (insoft) {
    const esAccion = (z: FlowSizedNode): boolean => {
      const n = specByIdPre.get(z.id);
      return !!n && !n.embed && (n.shape ?? 'rect') === 'rect';
    };
    const acciones = sized.filter(esAccion);
    const ancho = Math.max(0, ...acciones.map((z) => z.w));
    for (const z of acciones) {
      z.w = ancho;
      if (z.textBox) z.textBox = { ...z.textBox, w: ancho - INSOFT.actionPadX * 2 };
    }
  }

  // La barra de sincronización cruza el flujo: horizontal si baja, vertical si avanza a la derecha.
  if (spec.direction === 'LR' || spec.direction === 'RL') {
    for (const z of sized) if (specByIdPre.get(z.id)?.shape === 'bar') [z.w, z.h] = [z.h, z.w];
  }
  // Punto de convergencia (barra con 2+ entradas y una sola salida): un ⦿, no una barra.
  const uniones = insoft ? unionesDe(spec) : new Set<string>();
  for (const z of sized) if (uniones.has(z.id)) [z.w, z.h] = [FLOW_TERMINAL_D, FLOW_TERMINAL_D];
  const hasEdgeLabels = spec.edges.some((e) => e.label);
  const lanesOn = insoft && !!spec.lanes?.length;
  // Comentarios: no son pasos del flujo; van pegados al nodo que señalan (su espacio se reserva ahí).
  const comentados = new Map<string, FlowSizedNode>();
  for (const n of spec.nodes) {
    if (n.shape !== 'comment' || !n.about || !specByIdPre.has(n.about)) continue;
    const z = sized.find((s) => s.id === n.id);
    if (z) comentados.set(n.about, z);
  }
  const esComentario = new Set(spec.nodes.filter((n) => n.shape === 'comment' && n.about && specByIdPre.has(n.about)).map((n) => n.id));
  const enFlujo = sized.filter((z) => !esComentario.has(z.id));
  const placed: FlowPlacement = lanesOn
    ? placeLanes(enFlujo, spec, hasEdgeLabels ? INSOFT.labelLayerGap : INSOFT.layerGap, INSOFT.nodeGap, measurer(opts), comentados)
    : insoft && spec.direction === 'TB'
    ? placeInsoft(enFlujo, spec.edges, hasEdgeLabels ? INSOFT.labelLayerGap : INSOFT.layerGap, INSOFT.nodeGap)
    : layoutNodeLink(sized, spec.edges, {
      direction: spec.direction,
      layerGap: hasEdgeLabels ? 80 : 64,
      nodeGap: 32,
    });
  const sizedById = new Map<string, FlowSizedNode>(sized.map((n) => [n.id, n]));

  const byId = new Map<string, FlowPlacedNode>(placed.nodes.map((n) => [n.id, n]));
  const specById = new Map<string, FlowNodeSpec>(spec.nodes.map((n) => [n.id, n]));
  // Controllers con puentes `-(O=` (cuelgan bajo él): su flujo sale por el costado.
  const conPuentes = new Set(spec.nodes.filter((n) => n.bridge).map((n) => n.bridge!.of));
  const groupHue = new Map<string, number>((spec.groups ?? []).map((g) => [g.id, g.hue]));

  // Insoft: el margen respeta la rejilla de 8 px, así los centros y vértices
  // de los nodos son anclas exactas para el router ortogonal.
  const offsetX = insoft ? ceilDiagramGrid(MARGIN.left, 8) : MARGIN.left;
  const offsetY = insoft ? ceilDiagramGrid(MARGIN.top + headerH, 8) : MARGIN.top + headerH;
  const zones = spec.exclusionZones ?? [];

  const nodes: FlowLayoutNode[] = placed.nodes.map((n) => {
    const s = specById.get(n.id);
    const ov = overrides?.nodes?.[n.id];
    const hasOverridePos = ov?.x != null && ov?.y != null;
    // Una posición editada a mano gana sobre el auto-layout: no se nudgea.
    const auto = !hasOverridePos && zones.length
      ? nudgeRectFromZones({ x: n.x, y: n.y, w: n.w, h: n.h }, zones)
      : n;
    return {
      id: n.id,
      x: (ov?.x ?? auto.x) + offsetX,
      y: (ov?.y ?? auto.y) + offsetY,
      w: n.w,
      h: n.h,
      layer: n.layer,
      label: ov?.label ?? (s?.label ?? ''),
      shape: (s?.shape ?? 'rect') as FlowShape,
      icon: s?.icon ?? (autoSteps && s && esNumerable(s) ? iconoPorDefecto(s) : undefined),
      description: s?.description,
      hue: ov?.hue ?? s?.hue ?? (s?.group ? groupHue.get(s.group) : undefined),
      group: s?.group,
      ...(uniones.has(n.id) ? { union: true } : {}),
      ...placedExtras(s, sizedById.get(n.id), (ov?.x ?? auto.x) + offsetX, (ov?.y ?? auto.y) + offsetY),
    };
  });

  if (insoft) colocarComentarios(nodes, spec, sizedById, offsetX + placed.width, overrides?.nodes, { x: offsetX, y: offsetY });
  if (autoSteps) numerarEnOrden(nodes, specById, spec.laneDirection === 'horizontal', spec.edges);
  if (insoft) insignias(nodes);

  const legendGroups = spec.groups?.length ? spec.groups : undefined;
  const legendW = legendGroups
    ? Math.max(...legendGroups.map((g) => Math.ceil(g.name.length * 6) + 30))
    : 0;

  const contentW = placed.width + offsetX + MARGIN.right;
  let width = Math.max(legendGroups ? Math.max(contentW, legendW + 180) : contentW, 160, diagramHeaderWidth(title, subtitle));
  let height = placed.height + offsetY + MARGIN.bottom;
  const legendX = legendGroups ? Math.max(8, width - legendW - 8) : 0;

  /** Rutea todas las aristas sobre las posiciones actuales de los nodos (se repite si se abre espacio). */
  const rutear = (textos: ReadonlyMap<number, EmbedBox> = new Map(), anclas: ReadonlyMap<number, [FlowPoint, FlowPoint]> = new Map(), final = false): FlowLayoutEdge[] => {
  // Rejilla de costos: las cajas se bloquean para que el A* las rodee.
  const grid = makeCostGrid(width, height);
  const posById = new Map<string, FlowLayoutNode>(nodes.map((n) => [n.id, n]));
  // Capas de costo: (1) proximidad RADIAL, 3U alrededor de cada entidad, conector y texto, más cara
  // cuanto más cerca (los `-(O` más que los demás conectores), combinada por MÁXIMO (dos cercanos no
  // se suman; ver PROXIMIDAD); (2) cajas y textos bloqueados; (3) rieles quemados, ADITIVOS (ver
  // costearRiel), que se suman sobre todo lo anterior a medida que se rutea.
  for (const n of nodes) proximidad(grid, n, specById.get(n.id)?.shape);
  for (const t of textos.values()) applyRadialCost(grid, t, PROXIMIDAD.radio, PROXIMIDAD.texto);
  for (const n of nodes) blockRect(grid, n.x - 6, n.y - 6, n.w + 12, n.h + 12);
  // Segunda pasada: los textos de las aristas también son obstáculos para el A*.
  for (const t of textos.values()) blockRect(grid, t.x - 4, t.y - 4, t.w + 8, t.h + 8);
  // Títulos de los grupos (posición final): ningún riel pasa por encima de ellos.
  const titulosGrupo: EmbedBox[] = placed.contexts?.length
    ? abrazar(placed.contexts, nodes, offsetX, offsetY).map((c) => ({ x: c.x - 4, y: c.y - 4, w: Math.ceil(c.label.length * 6.2) + 14 + 8, h: 18 + 8 }))
    : [];
  for (const t of titulosGrupo) applyRadialCost(grid, t, PROXIMIDAD.radio, PROXIMIDAD.texto);
  for (const t of titulosGrupo) blockRect(grid, t.x, t.y, t.w, t.h);
  // Borde izquierdo del recuadro de grupo que contiene a un nodo (para rodearlo por fuera).
  const cajasGrupo = placed.contexts?.length ? abrazar(placed.contexts, nodes, offsetX, offsetY) : [];
  const grupoIzq = (n: FlowLayoutNode): number | undefined => cajasGrupo.find((c) => c.members?.includes(n.id))?.x;
  // (c) Entrar o salir de un grupo cuesta una suma fija (la misma del router de componentes): el borde
  // es una franja de una celda con ese costo, así que un riel que no tiene nada adentro lo rodea y uno
  // que sí lo paga una vez. Se aplica antes de los rieles para que la capa aditiva quede encima.
  for (const c of cajasGrupo) costearBordeGrupo(grid, c);
  // Zonas de exclusión: ni nodos (ya nudgeados) ni aristas pueden cruzarlas.
  blockExclusionZones(grid, zones, offsetX, offsetY);

  const insoftSegs: FlowSegment[] = [];
  const abanico = insoft ? salidasEnAbanico(spec.edges, posById, byId, placed.primaryChild, spec.direction) : new Map<number, FlowPoint>();
  const enBarra = insoft ? puntosEnBarras(spec.edges, posById) : new Map<string, FlowPoint>();
  const consumeSocket = insoft ? predicadoSocket(spec) : () => false;
  /** Punta compartida y rieles de las aristas de uso que llegan a un mismo costado (abanico). */
  const rielesUso = new Map<string, { punta?: FlowPoint; rieles: number[] }>();
  /** Costados de salida y llegada de cada arista. */
  const ladosDe = spec.edges.map((e) => {
    const from = posById.get(e.from);
    const to = posById.get(e.to);
    const fromMeta = byId.get(e.from);
    const toMeta = byId.get(e.to);
    if (!from || !to || !fromMeta || !toMeta) return null;
    const sides = insoft
      ? insoftSides(fromMeta, toMeta, from, to, specById.get(e.from)?.shape, placed.primaryChild?.get(e.from), spec.direction, conPuentes.has(e.from), nodes)
      : pickSides(fromMeta, toMeta, spec.direction);
    // La respuesta desde un fin siempre sale por abajo (por los costados llegan las ramas).
    if (insoft && specById.get(e.from)?.shape === 'end') (sides as { fromSide: string }).fromSide = 'bottom';
    // `pickSides` devuelve `sides` con `fromSide`/`toSide` como `string` (no
    // tipado en el helper); los narrow explícitos aquí para mantener el
    // contrato BoxSide en el resto del pipeline.
    return { fromSide: sides.fromSide as AnchorSide, toSide: sides.toSide as AnchorSide };
  });
  const puertoDeArista = insoft ? puertosEnPerimetro(spec.edges, ladosDe, posById, specById) : new Map<string, FlowPoint>();
  const routed: Array<FlowLayoutEdge | null> = spec.edges.map((e, i) => {
    const from = posById.get(e.from);
    const to = posById.get(e.to);
    const fromMeta = byId.get(e.from);
    const toMeta = byId.get(e.to);
    const lados = ladosDe[i];
    if (!from || !to || !fromMeta || !toMeta || !lados) {
      return null;
    }
    const { fromSide, toSide } = lados;
    const a = enBarra.get(`${i}|from`) ?? puertoDeArista.get(`${i}|from`) ?? sobreBarra(edgeAnchor(from, fromSide), from, to, specById.get(e.from)?.shape, spec.edges.filter((x) => x.from === e.from).length < 2);
    const b = enBarra.get(`${i}|to`) ?? puertoDeArista.get(`${i}|to`) ?? sobreBarra(edgeAnchor(to, toSide), to, from, specById.get(e.to)?.shape, spec.edges.filter((x) => x.to === e.to).length < 2);

    // El anclaje cae sobre el borde bloqueado: se sale un paso antes de rutear.
    const out = stepOut(a, fromSide, 16);
    const into = stepOut(b, toSide, 16);
    // Snap direccional: nunca redondea de vuelta hacia el nodo del que se aleja
    // (ver snapPointAwayFromSide — corrige el redondeo-al-más-cercano de antes).
    const outSnap = snapPointAwayFromSide(out, fromSide, grid.grid);
    const intoSnap = snapPointAwayFromSide(into, toSide, grid.grid);
    const aGrid = pixelToGrid(outSnap.x, outSnap.y, grid.grid);
    const bGrid = pixelToGrid(intoSnap.x, intoSnap.y, grid.grid);
    // Convierte waypoints píxel → grid antes de pasarlos al A*, recortados al
    // lienzo: un waypoint fuera de rango (dato de usuario, no del layout) no
    // debe forzar a A* fuera de la rejilla, donde cae en su fallback recto.
    const wpGrid: Array<{ col: number; row: number }> = (e.waypoints ?? []).map((w) => {
      const cell = pixelToGrid(snapDiagramGrid(w.x), snapDiagramGrid(w.y), grid.grid);
      return {
        col: Math.max(0, Math.min(grid.cols - 1, cell.col)),
        row: Math.max(0, Math.min(grid.rows - 1, cell.row)),
      };
    });
    const points = wpGrid.length
      ? routeOrthogonal(aGrid, bGrid, grid, { waypoints: wpGrid })
      : routeOrthogonal(aGrid, bGrid, grid);

    // Insoft: primero rutas limpias (recta, L, Z) que no tocan cajas ni se
    // montan sobre otra arista; el A* queda de respaldo.
    // Ramas de una decisión que salen por el mismo costado: cada una con su riel (ver salidasEnAbanico).
    const salida = abanico.get(i);
    const topX = snapDiagramGrid(to.x + to.w / 2);
    const lateral = lanesOn && e.kind === 'dashed' ? rutaDeUso(from, to, rielesUso, nodes) : null;
    // Desde un fin (la respuesta al componente) nunca por el costado: ahí llegan las ramas que
    // terminan y quedarían dos puntas enfrentadas. Sale por abajo (rutaDeVuelta).
    const desdeFin = specById.get(e.from)?.shape === 'end';
    const corta = !lateral && !desdeFin && lanesOn && spec.laneDirection !== 'horizontal' && toMeta.layer <= fromMeta.layer
      ? vueltaCorta(from, to, nodes, insoftSegs)
      : null;
    const vuelta = corta ?? (!lateral && lanesOn && spec.laneDirection !== 'horizontal' && toMeta.layer <= fromMeta.layer
      ? rutaDeVuelta(from, to, Math.max(...nodes.map((n) => n.y + n.h)), grupoIzq(to))
      : null);
    const direct = lateral ?? vuelta ?? (salida
      ? [salida, { x: topX, y: salida.y }, { x: topX, y: to.y }]
      : insoft && toMeta.layer > fromMeta.layer && !e.waypoints?.length
      ? routeInsoftEdge(a, fromSide, to, nodes, e.to, insoftSegs, specById.get(e.to)?.shape === 'bar' || puertoDeArista.has(`${i}|to`) ? b : undefined,
        [...textos].filter(([k]) => k !== i).map(([, t]) => t), anclas.get(i))
      : null);
    // Segunda pasada: los textos son muros. Una ruta de forma fija (abanico, uso de lado, vuelta) que
    // pase por encima de un texto ajeno se descarta y manda la rejilla, donde los textos están bloqueados.
    const ajenos = [...[...textos].filter(([k]) => k !== i).map(([, t]) => t), ...titulosGrupo];
    const tocaTexto = (pts: readonly FlowPoint[]): boolean =>
      pts.slice(1).some((q, k) => ajenos.some((t) => segHitsRect(pts[k]!, q, t, 2)));
    // Las cajas también son muros: una ruta fija que atraviese un nodo ajeno se descarta.
    const tocaCaja = (pts: readonly FlowPoint[]): boolean =>
      pts.slice(1).some((q, k) => nodes.some((n) => n.id !== e.from && n.id !== e.to && specById.get(n.id)?.shape !== 'comment' && segHitsRect(pts[k]!, q, n, 2)));
    const limpia = direct && !tocaTexto(direct) && !tocaCaja(direct) ? direct : null;
    // Auto-cruce prohibido: si la ruta se corta a sí misma, se descarta el bucle (ver quitarAutoCruces).
    const path = pathSinAutoCruces(limpia ? polylinePath(limpia) : buildOrthogonalPath(a, b, aGrid, bGrid, points, grid.grid));
    const end = limpia?.[limpia.length - 1];
    const tip = end ? { x: end.x, y: end.y, angle: 0 } : arrowTip(b, toSide);
    if (insoft) rememberSegments(insoftSegs, path, e.to);
    // Capa aditiva de rieles quemados: la siguiente arista paga más cuantas más pasen cerca.
    costearRiel(grid, pathPoints(path));
    // (d) Capa dinámica de giros: cada codo de esta ruta encarece su vecindad para las siguientes,
    // así los giros no se apilan en el mismo punto (dos codos juntos se leen como un cruce).
    costearCodos(grid, pathPoints(path));
    // Un consumo de componente o tabla termina en `-(O-`: su bola irradia el costo de conector.
    if (consumeSocket(e)) applyRadialCost(grid, { x: tip.x - SOCKET.bola, y: tip.y - SOCKET.bola, w: SOCKET.bola * 2, h: SOCKET.bola * 2 }, PROXIMIDAD.radio, PROXIMIDAD.socket);
    const mid = points.length
      ? { x: points[Math.floor(points.length / 2)].col * grid.grid, y: points[Math.floor(points.length / 2)].row * grid.grid }
      : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    // La etiqueta ocupa espacio: encarece la zona para que otras aristas la esquiven.
    // Insoft: la etiqueta va junto al arranque de la arista, a un costado.
    // En abanico, la condición va encima de su riel, junto al codo donde baja (del lado del rombo).
    // Bucle corto: la etiqueta va en vertical, pegada al pasillo por fuera (no choca con los nodos).
    // Rama en abanico: la condición va junto al codo, del lado del rombo; si ahí cae sobre una caja
    // (p. ej. el propio rombo cuando la rama baja pegada a él), pasa al otro lado de su riel.
    const ladoRama = (): { x: number; y: number; anchor: 'start' | 'end' } => {
      const hacia = salida!.x > topX ? 'end' : 'start';
      const lw = (e.label ?? '').length * 6.2 + 8;
      const choca = (anchor: 'start' | 'end'): boolean => {
        const x0 = anchor === 'end' ? topX - 6 - lw : topX + 6;
        return nodes.some((n) => specById.get(n.id)?.shape !== 'comment' && x0 < n.x + n.w && x0 + lw > n.x && salida!.y - 18 < n.y + n.h && salida!.y > n.y);
      };
      const anchor = choca(hacia) && !choca(hacia === 'end' ? 'start' : 'end') ? (hacia === 'end' ? 'start' : 'end') : hacia;
      return { x: topX + (anchor === 'end' ? -6 : 6), y: salida!.y - 6, anchor };
    };
    const side = insoft && e.label
      ? (salida ? ladoRama() : sideLabel(path))
      : null;
    const lab = side ?? { x: mid.x, y: mid.y, anchor: 'middle' as const };
    if (e.label) {
      const lw = e.label.length * 6.2 + 8;
      const lx = lab.anchor === 'start' ? lab.x : lab.anchor === 'end' ? lab.x - lw : lab.x - lw / 2;
      applyRectCost(grid, side ? lx : mid.x - 30, side ? lab.y - 12 : mid.y - 9, side ? lw : 60, 18, 6, true);
    }

    const eOv = overrides?.edges?.[e.id];
    return {
      id: e.id ?? `e${i}`,
      from: e.from,
      to: e.to,
      label: eOv?.label ?? e.label,
      kind: e.kind,
      path,
      arrowTipX: tip.x,
      arrowTipY: tip.y,
      arrowAngle: tip.angle,
      labelX: lab.x,
      labelY: lab.y,
      ...(side ? { labelAnchor: side.anchor } : {}),
      ...(e.labelVertical ? { labelPide: 'vertical' as const } : {}),
      ...(e.reverse ? { reverse: true } : {}),
      ...(e.color ? { color: e.color } : {}),
      ...(e.dots ? { dots: e.dots } : {}),
      ...(insoft && (e.icon ?? iconoDeEtiqueta(eOv?.label ?? e.label)) ? { labelIcon: e.icon ?? iconoDeEtiqueta(eOv?.label ?? e.label) } : {}),
      hue: eOv?.hue ?? (e.group ? groupHue.get(e.group) : undefined),
    };
  });

  // Carriles: los usos (punteadas) los rutea en lote el router compartido (el de clases y
  // componentes), con el flujo ya trazado como rieles fijos. Si no halla ruta, queda la de arriba.
  // Solo en la pasada final (la que se dibuja): la primera, que abre espacio, usa el ruteo rápido.
  // Estándar: las aristas del flujo que comparten punta convergen en abanico (vías a delta).
  if (final) abanicoDelFlujo(routed, spec);
  if (lanesOn && final) {
    const mideFijos = (t: string): number => measurer(opts)(t) * (10.5 / (opts.fontSize ?? INSOFT.fontSize));
    const muros = [...cajasFijas(nodes, placed.lanes, placed.contexts, offsetX, offsetY, spec.laneDirection === 'horizontal', mideFijos), ...textos.values()];
    rutearUsos(routed, spec, nodes, muros);
  }
  // Componentes que exponen interfaz: quien llega se conecta por `-(O-` (socket en el riel).
  if (final) socketsDeComponentes(routed, spec);
  // Estándar de todos los rieles: ningún tramo interior corre encima del de otra arista (sólida o
  // punteada); el que coincide se separa por un delta. Extremos intactos (puertos, puntas, sockets).
  if (final) separarRielesGlobal(routed);
  const routedEdges: FlowLayoutEdge[] = routed.filter((e): e is FlowLayoutEdge => e !== null);
  // Ninguna pasada posterior puede dejar una arista que se corte a sí misma.
  for (const e of routedEdges) e.path = pathSinAutoCruces(e.path);
  if (insoft) separarEtiquetasCompartidas(routedEdges);
  return routedEdges;
  };
  let routedEdges = rutear();
  // Insoft: las etiquetas de las aristas son entidades (1U de margen con todo). Lo que no encuentra
  // sitio abre espacio: se empujan las entidades que siguen y se vuelve a rutear.
  if (insoft) {
    const mide = (t: string): number => measurer(opts)(t) * (10.5 / (opts.fontSize ?? INSOFT.fontSize));
    const fijos = (): EmbedBox[] => cajasFijas(nodes, placed.lanes, placed.contexts, offsetX, offsetY, spec.laneDirection === 'horizontal', mide);
    // Primera pasada: textos y espaciados. Lo que no cabe abre espacio en la dirección de su tramo
    // (horizontal → a la derecha; vertical → hacia abajo); si empujar no lo resuelve, se deja de empujar.
    const intentadas = new Set<number>();
    for (let vuelta = 0; ; vuelta++) {
      const conflictos = resolverEtiquetas(routedEdges, nodes, fijos(), mide, { w: width, h: height });
      if (!conflictos.length || vuelta >= 8 || Date.now() - inicioLayout > LAYOUT_PRESUPUESTO) break;
      // El primer conflicto aún no intentado (uno que no se resuelve no tapa a los demás).
      const c = conflictos.find((x) => !intentadas.has(x.edge));
      if (!c) break;
      intentadas.add(c.edge);
      const derecha = c.tramo === 'h';
      const extra = abrirEspacio(c.caja, nodes, byId, placed, offsetX, offsetY, derecha, spec.laneDirection === 'horizontal');
      if (derecha) width += extra; else height += extra;
      pegarComentarios(nodes, overrides?.nodes);
      routedEdges = rutear();
    }
    // Segunda pasada: anclas (dos vértices de cada texto sobre su arista) y rieles regenerados con los
    // textos como obstáculos; luego los textos se reacomodan conservando su caja si sigue válida. Los
    // textos son entidades: si alguno queda sin sitio, se abre espacio y se repite (nunca se montan).
    const segundaPasada = (): ReturnType<typeof resolverEtiquetas> => {
      const textos = new Map<number, EmbedBox>();
      const anclas = new Map<number, [FlowPoint, FlowPoint]>();
      const previos = new Map<string, FlowLayoutEdge>();
      routedEdges.forEach((e) => previos.set(e.id, e));
      spec.edges.forEach((e, i) => {
        const r = previos.get(e.id ?? `e${i}`);
        if (!r?.labelBox) return;
        textos.set(i, r.labelBox);
        const an = anclasDeEtiqueta(r);
        if (an) anclas.set(i, an);
      });
      routedEdges = rutear(textos, anclas, true);
      for (const e of routedEdges) {
        const p = previos.get(e.id);
        if (p?.labelBox) e.labelBox = p.labelBox;
      }
      return resolverEtiquetas(routedEdges, nodes, fijos(), mide, { w: width, h: height });
    };
    let pendientes = segundaPasada();
    // Cada vuelta atiende el primer conflicto que no se haya intentado: uno que abrir espacio no
    // resuelve no tapa a los demás.
    const intentadas2 = new Set<number>();
    // Cada vuelta re-rutea todo (lo más caro del layout): pocas vueltas bastan.
    for (let vuelta = 0; vuelta < 3 && Date.now() - inicioLayout <= LAYOUT_PRESUPUESTO; vuelta++) {
      const c = pendientes.find((x) => !intentadas2.has(x.edge));
      if (!c) break;
      intentadas2.add(c.edge);
      const derecha = c.tramo === 'h';
      const extra = abrirEspacio(c.caja, nodes, byId, placed, offsetX, offsetY, derecha, spec.laneDirection === 'horizontal');
      if (derecha) width += extra; else height += extra;
      pegarComentarios(nodes, overrides?.nodes);
      pendientes = segundaPasada();
    }
  }

  assignEdgeHues(routedEdges);
  const layout: FlowLayout = {
    width,
    height,
    nodes,
    edges: routedEdges,
    groups: legendGroups,
    // Rects en coords del lienzo final (con el mismo offset que los nodos),
    // listos para dibujarse como zona sutil sin recalcular nada en el componente.
    exclusionZones: zones.map((z) => ({ x: z.x + offsetX, y: z.y + offsetY, w: z.w, h: z.h, label: z.label })),
    title: title || undefined,
    subtitle: subtitle || undefined,
    titleY,
    subtitleY,
    legendX,
    ...(placed.lanes ? {
      lanes: placed.lanes.map((l) => ({ ...l, x: l.x + offsetX, y: l.y + offsetY })),
      laneDirection: spec.laneDirection ?? 'vertical',
    } : {}),
    ...(placed.contexts?.length ? { contexts: abrazar(placed.contexts, nodes, offsetX, offsetY) } : {}),
  };
  // Insoft: las ramas que llegan al mismo nodo se funden en una sola entrada
  // (estilo actividad) y la etiqueta ya va junto a su arista; sin reparto.
  if (!insoft) applyEdgeActorLayout(layout, nodes.map((n) => ({ x: n.x, y: n.y, w: n.w, h: n.h })));
  return layout;
}

/** Abanico de usos que comparten punta: separación entre vías paralelas y largo del embudo final. */
const ABANICO = { delta: 4, embudo: U } as const;

/**
 * Radio de proximidad de los giros: dentro de `radio` de un extremo, un giro se penaliza más cuanto
 * más cerca está (lineal, `peso` pegado al extremo y 0 en el borde del radio); fuera no cuesta.
 * En la partida la penalización es la mitad (`partida`) que en la llegada.
 */
const GIRO = { radio: 4 * U, peso: 12, partida: 0.5 } as const;

/**
 * Costo estético de los giros de una ruta: un giro pegado a la llegada se ve como un garabato junto a
 * la flecha. Cada vértice interior suma su proximidad a la llegada y, a la mitad, a la partida
 * (medidas a lo largo de la ruta; ver GIRO).
 */
export function costoGiros(pts: readonly FlowPoint[], giro: { radio: number; peso: number; partida: number } = GIRO): number {
  const tramos = pts.slice(1).map((q, k) => Math.abs(q.x - pts[k]!.x) + Math.abs(q.y - pts[k]!.y));
  const total = tramos.reduce((x, y) => x + y, 0);
  const cerca = (d: number): number => (d < giro.radio ? giro.peso * (1 - d / giro.radio) : 0);
  let recorrido = 0;
  let costo = 0;
  for (let k = 1; k < pts.length - 1; k++) {
    recorrido += tramos[k - 1]!;
    costo += cerca(total - recorrido) + giro.partida * cerca(recorrido);
  }
  return costo;
}

/**
 * Usos (punteadas) en lote con el router compartido (`routeEdges`, el de clases y componentes):
 *   - puertos del perímetro en el costado que mira al destino (rombo: su vértice), así ninguna
 *     sale por una esquina ni por el lado del flujo;
 *   - `shareKey` por destino: los que llegan a la misma entidad convergen en abanico a una punta;
 *   - cajas, comentarios, insignias, títulos y textos como muros; el flujo trazado, como rieles
 *     fijos (cruzarlo o correr encima cuesta lo de cualquier riel ajeno).
 * Muta `routed` (alineado con `spec.edges`); una arista sin ruta conserva la que traía.
 */
/**
 * Ortogonaliza una ruta: un tramo en diagonal pequeño (≤ 2U) se absorbe corriendo el tramo previo
 * (sin escalones); uno grande recibe un codo. Los extremos no se mueven.
 */
function ortogonalizar(pts: FlowPoint[]): FlowPoint[] {
  for (let i = pts.length - 1; i > 0; i--) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (a.x === b.x || a.y === b.y) continue;
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const prev = pts[i - 2];
    if (prev && i - 2 > 0 && Math.min(dx, dy) <= 2 * U) {
      // Corre el vértice a (y su tramo con prev) para alinearse con b en el eje del desvío menor.
      if (dy <= dx && prev.y === a.y) { prev.y = b.y; a.y = b.y; continue; }
      if (dx < dy && prev.x === a.x) { prev.x = b.x; a.x = b.x; continue; }
    }
    pts.splice(i, 0, dy <= dx ? { x: a.x, y: b.y } : { x: b.x, y: a.y });
  }
  return simplifyOrthoPath(pts);
}

/** Presupuesto total (ms) de las vueltas de etiquetas de un layout. */
const LAYOUT_PRESUPUESTO = 40000;

/** Paso (px) de la rejilla del ruteo de usos. */
const RUTEO_USOS_PASO = 16;
/**
 * Proximidad en el ruteo de usos (router compartido): entidades, textos y bolas `-(O=` irradian hasta
 * 3U (PROXIMIDAD.radio), más cuanto más cerca; las bolas pesan más que entidades y textos.
 */
const costosUsos = () => ({
  entity: { radius: PROXIMIDAD.radio, glow: 3 },
  text: { radius: PROXIMIDAD.radio, glow: 3 },
  connector: { radius: PROXIMIDAD.radio + PUENTE.bola, glow: 6 },
});
/** Tiempo máximo (ms) de una llamada al router de usos: pasado, se conserva la ruta previa. */
const RUTEO_USOS_PRESUPUESTO = 12000;

/** Memoria del ruteo de usos por firma de su entrada (ver rutearUsos). */
const RUTEO_USOS = new Map<string, ReturnType<typeof routeEdges>>();

function rutearUsos(routed: Array<FlowLayoutEdge | null>, spec: FlowResolvedSpec, nodes: readonly FlowLayoutNode[], muros: readonly EmbedBox[]): void {
  const porId = new Map(nodes.map((n) => [n.id, n]));
  const usos = spec.edges.map((e, i) => ({ e, i })).filter(({ e, i }) => e.kind === 'dashed' && routed[i] && porId.has(e.from) && porId.has(e.to) && e.from !== e.to);
  if (!usos.length) return;
  const caja = (n: FlowLayoutNode) => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h });
  const lados = (a: FlowLayoutNode, b: FlowLayoutNode): [Lado, Lado] => {
    // Dos tablas apiladas (propagación maestro → detalle): el riel rodea por la derecha, con largo
    // suficiente para su texto, en vez de un tramo corto entre ellas.
    if (a.kind === 'tableder' && b.kind === 'tableder' && b.x < a.x + a.w && a.x < b.x + b.w) return ['right', 'right'];
    if (b.x >= a.x + a.w) return ['right', 'left'];
    if (b.x + b.w <= a.x) return ['left', 'right'];
    return b.y >= a.y + a.h ? ['bottom', 'top'] : ['top', 'bottom'];
  };
  const puertos = (n: FlowLayoutNode, lado: Lado): RouterPort[] => {
    if (n.shape === 'diamond') {
      const cx = n.x + n.w / 2;
      const cy = n.y + n.h / 2;
      const v = { left: { x: n.x, y: cy }, right: { x: n.x + n.w, y: cy }, top: { x: cx, y: n.y }, bottom: { x: cx, y: n.y + n.h } }[lado];
      return [{ ...v, side: lado }];
    }
    const ps = perimeterPorts(caja(n), U, [lado]);
    return ps.length ? ps : [{ ...edgeAnchor(n, lado), side: lado }];
  };
  const fijos = routed.flatMap((r, i) => (r && spec.edges[i]!.kind !== 'dashed' ? [pathPoints(r.path)] : []));
  // Puentes `-(O=`: cada arista tiene su puerto en la mitad libre de la bola (ver puertosPuente).
  const puertoDe = new Map<number, PuertoPuente>();
  for (const n of nodes.filter((x) => x.shape === 'bridge')) {
    const ent = usos.filter(({ e }) => e.to === n.id).sort((p, q) => (porId.get(q.e.from)!.x - porId.get(p.e.from)!.x));
    const sal = usos.filter(({ e }) => e.from === n.id).sort((p, q) => (porId.get(q.e.to)!.x - porId.get(p.e.to)!.x));
    // Un solo puerto de entrada (todas las que consumen convergen ahí); uno por salida.
    const { puertos: ps } = puertosPuente(n, ent.length ? 1 : 0, sal.length);
    sal.forEach(({ i }, k) => puertoDe.set(i, ps[k]!));
    ent.forEach(({ i }) => puertoDe.set(i, ps[sal.length]!));
  }
  // Lados de un controller ocupados por sus puentes: sus otros rieles salen o llegan por uno libre.
  const ocupado = new Set(nodes.filter((x) => x.bridge).map((x) => `${x.bridge!.of}|${x.lado ?? 'bottom'}`));
  const libre = (n: FlowLayoutNode, lado: Lado, otro: FlowLayoutNode): Lado => {
    if (!ocupado.has(`${n.id}|${lado}`)) return lado;
    const haciaDer = otro.x + otro.w / 2 >= n.x + n.w / 2;
    const orden: Lado[] = haciaDer ? ['right', 'left', 'top', 'bottom'] : ['left', 'right', 'top', 'bottom'];
    return orden.find((l) => !ocupado.has(`${n.id}|${l}`)) ?? lado;
  };
  const edges: RouterEdge[] = usos.map(({ e, i }) => {
    const a = porId.get(e.from)!;
    const b = porId.get(e.to)!;
    let [ls, ll] = lados(a, b);
    if (a.shape !== 'bridge') ls = libre(a, ls, b);
    if (b.shape !== 'bridge') ll = libre(b, ll, a);
    let fromC = puertos(a, ls);
    let toC = puertos(b, ll);
    const pp = puertoDe.get(i);
    if (pp && b.shape === 'bridge') { ll = pp.lado; toC = [{ x: pp.bx, y: pp.by, side: pp.lado }]; }
    if (pp && a.shape === 'bridge') { ls = pp.lado; fromC = [{ x: pp.bx, y: pp.by, side: pp.lado }]; }
    return {
      id: e.id ?? `e${i}`,
      from: { x: fromC[0]!.x, y: fromC[0]!.y }, fromSide: ls,
      to: { x: toC[0]!.x, y: toC[0]!.y }, toSide: ll,
      fromBox: caja(a), toBox: caja(b),
      fromPkgs: new Set<string>(), toPkgs: new Set<string>(),
      // Un puente tiene un puerto por arista: cada una con su propia clave (compartir punta entre
      // puertos distintos dejaba al router sin salida).
      shareKey: pp && b.shape === 'bridge' ? `${e.to}::${ll}::${pp.bx},${pp.by}` : `${e.to}::${ll}`,
      fromCandidates: fromC, toCandidates: toC,
      // La bola del puente del que sale o al que llega no le cobra su brillo de conector.
      ownRings: [a, b].filter((n) => n.shape === 'bridge').map((n) => `bola:${n.id}`),
    };
  });
  // Bolas `-(O=` de los puentes: conectores con brillo radial (más caro que el de las entidades).
  const anillos = nodes.filter((n) => n.shape === 'bridge').map((n) => {
    const c = centroPuente(n);
    return { id: `bola:${n.id}`, x: c.x - PUENTE.bola, y: c.y - PUENTE.bola, w: PUENTE.bola * 2, h: PUENTE.bola * 2 };
  });
  // El ruteo de usos es lo más caro del layout y las vueltas de etiquetas lo repiten con el mismo
  // mundo: se memoriza por la firma exacta de su entrada (determinista: misma entrada, misma salida).
  const mundo = { components: nodes.map(caja), packages: [], titles: [...muros], rings: anillos, fixedRails: fijos };
  const firma = JSON.stringify([mundo.components, mundo.titles, anillos, fijos, edges.map((x) => [x.id, x.fromCandidates, x.toCandidates, x.shareKey])]);
  let res = RUTEO_USOS.get(firma);
  if (!res) {
    // Rejilla de 16 px: gruesa para que el ruteo sea rápido; con 2U (30 px) el router no termina
    // con los puertos de los puentes `-(O=` (deuda del router, ver lessons).
    const limite = Date.now() + RUTEO_USOS_PRESUPUESTO;
    res = routeEdges(mundo, edges, { step: RUTEO_USOS_PASO, clearance: 8, stub: U, iterations: 2, deadline: limite, costs: costosUsos() });
    // Solo se memoriza un ruteo completo (uno cortado por tiempo puede mejorar en otra pasada).
    if (Date.now() <= limite) RUTEO_USOS.set(firma, res);
    if (RUTEO_USOS.size > 64) RUTEO_USOS.delete(RUTEO_USOS.keys().next().value!);
  }
  // Copia: lo que sigue ajusta las rutas y no debe tocar la memoria. La rejilla gruesa deja los
  // extremos (fuera de rejilla) en diagonal: se vuelven ortogonales.
  res = { ...res, paths: res.paths.map((p) => (p ? ortogonalizar(p.map((q) => ({ ...q }))) : p)) };
  // Una sola punta por destino y costado (obligatoria, no solo incentivo): la que llegue a otra
  // altura baja o sube a la del primero justo antes de entrar.
  const puntaDe = new Map<string, FlowPoint>();
  usos.forEach(({ e }, k) => {
    const pts = res.paths[k];
    if (!pts || pts.length < 2) return;
    const clave = edges[k]!.shareKey!;
    const T = pts[pts.length - 1]!;
    const T0 = puntaDe.get(clave);
    if (!T0) { puntaDe.set(clave, T); return; }
    if (Math.abs(T0.x - T.x) < 1 && Math.abs(T0.y - T.y) < 1) return;
    const P = pts[pts.length - 2]!;
    const horizontal = P.y === T.y;
    const codo = horizontal ? { x: T0.x - Math.sign(T0.x - P.x || 1) * 2 * U, y: T.y } : { x: T.x, y: T0.y - Math.sign(T0.y - P.y || 1) * 2 * U };
    const giro = horizontal ? { x: codo.x, y: T0.y } : { x: T0.x, y: codo.y };
    res.paths[k] = simplifyOrthoPath([...pts.slice(0, -1), codo, giro, T0]);
    void e;
  });
  const caminos = abanicoEnVias(usos.map((_, k) => res.paths[k]));
  usos.forEach(({ i }, k) => {
    const pts = caminos[k];
    const r = routed[i];
    if (!pts || pts.length < 2 || !r) return;
    // Puente: el riel sigue derecho desde el borde de la caja hasta la bola (llega o sale del O).
    const pp = puertoDe.get(i);
    const vertical = pp && (pp.lado === 'bottom' || pp.lado === 'top');
    if (pp && pp.tipo === 'entrada') {
      const u = pts[pts.length - 1]!;
      pts.push(vertical ? { x: u.x, y: pp.y } : { x: pp.x, y: u.y });
    } else if (pp) {
      const p0 = pts[0]!;
      pts.unshift(vertical ? { x: p0.x, y: pp.y } : { x: pp.x, y: p0.y });
    }
    const fin = pts[pts.length - 1]!;
    // La etiqueta arranca en el centro del tramo más largo; el solucionador la reubica.
    let largo = -1;
    let mitad = pts[0]!;
    pts.slice(1).forEach((q, j) => {
      const p = pts[j]!;
      const l = Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
      if (l > largo) { largo = l; mitad = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; }
    });
    const finReal = pts[pts.length - 1]!;
    routed[i] = { ...r, path: polylinePath(simplifyOrthoPath(pts)), arrowTipX: finReal.x, arrowTipY: finReal.y, arrowAngle: 0, labelX: mitad.x, labelY: mitad.y, ...(pp ? { puente: pp.tipo } : {}) };
    void fin;
  });
  // Puentes sin ruta nueva (el router no la dio a tiempo): igual entran y salen por su puerto, en
  // línea recta desde la bola, nunca por el costado de la caja (donde va el nombre de la acción).
  usos.forEach(({ i }, k) => {
    const pp = puertoDe.get(i);
    const r = routed[i];
    if (!pp || !r || (caminos[k] && caminos[k]!.length >= 2)) return;
    const prev = pathPoints(r.path);
    if (prev.length < 2) return;
    const { d } = ejesPuente(pp.lado);
    const fuera = { x: pp.bx + d.x * 2 * U, y: pp.by + d.y * 2 * U };
    const alinear = (q: FlowPoint): FlowPoint => (d.y ? { x: q.x, y: fuera.y } : { x: fuera.x, y: q.y });
    const bola = { x: pp.x, y: pp.y };
    const pts = pp.tipo === 'entrada'
      ? [...prev.slice(0, -1), alinear(prev[prev.length - 2]!), fuera, bola]
      : [bola, fuera, alinear(prev[1]!), ...prev.slice(1)];
    const limpios = ortogonalizar(pts);
    const t = limpios[limpios.length - 1]!;
    routed[i] = { ...r, path: polylinePath(limpios), arrowTipX: t.x, arrowTipY: t.y, puente: pp.tipo };
  });
  // Una sola punta por destino y costado, también para las que no salieron del router: la que llega a
  // otra altura baja o sube a la de la primera justo antes de entrar (como en el ruteo).
  const primera = new Map<string, FlowPoint>();
  usos.forEach(({ e, i }) => {
    const r = routed[i];
    if (!r || puertoDe.get(i)?.tipo === 'entrada') return;
    const pts = pathPoints(r.path);
    if (pts.length < 2) return;
    const T = pts[pts.length - 1]!;
    const P = pts[pts.length - 2]!;
    const horizontal = P.y === T.y;
    const clave = `${e.to}|${horizontal ? (P.x < T.x ? 'izq' : 'der') : (P.y < T.y ? 'arr' : 'aba')}`;
    const T0 = primera.get(clave);
    if (!T0) { primera.set(clave, T); return; }
    if (Math.abs(T0.x - T.x) < 0.5 && Math.abs(T0.y - T.y) < 0.5) return;
    const codo = horizontal ? { x: T0.x - Math.sign(T0.x - P.x || 1) * 2 * U, y: T.y } : { x: T.x, y: T0.y - Math.sign(T0.y - P.y || 1) * 2 * U };
    const giro = horizontal ? { x: codo.x, y: T0.y } : { x: T0.x, y: codo.y };
    const nuevos = simplifyOrthoPath([...pts.slice(0, -1), codo, giro, T0]);
    routed[i] = { ...r, path: polylinePath(nuevos), arrowTipX: T0.x, arrowTipY: T0.y };
  });
}

/**
 * Abanico con separación por delta (estándar de todas las aristas que comparten punta, como en
 * clases): por punta, la primera es el anfitrión; cada otra se corta donde se monta sobre él y sigue
 * por su propia vía, paralela a `ABANICO.delta`, hasta reincorporarse escalonada justo antes de la
 * punta. Luego ningún tramo interior queda encima de otro (separarColineales).
 */
function abanicoEnVias(entrada: ReadonlyArray<FlowPoint[] | null | undefined>): Array<FlowPoint[] | null | undefined> {
  const vias = new Map<string, number>();
  const anfitrion = new Map<string, number>();
  const caminos = entrada.map((pts, k) => {
    if (!pts || pts.length < 2) return pts;
    const punta = `${Math.round(pts[pts.length - 1]!.x)},${Math.round(pts[pts.length - 1]!.y)}`;
    const h = anfitrion.get(punta);
    if (h == null) { anfitrion.set(punta, k); return pts; }
    const host = entrada[h]!;
    const sobre = (q: FlowPoint): boolean => host.slice(1).some((r, i) => tramoContiene(host[i]!, r, q));
    // Primer vértice desde el que todo el resto va sobre el anfitrión.
    let t = pts.length - 1;
    while (t > 1 && sobre(pts[t - 1]!) && sobre({ x: (pts[t - 1]!.x + pts[t]!.x) / 2, y: (pts[t - 1]!.y + pts[t]!.y) / 2 })) t--;
    return enVia(simplifyOrthoPath(pts.slice(0, t + 1)), host, vias, h) ?? pts;
  });
  separarColineales(caminos);
  return caminos;
}

/** Tipos de entidad con color identificador, en orden fijo (así un tipo conserva su color en todo diagrama). */
export const TIPOS_ENTIDAD = TipoEntidadSchema.options;

/** Tipo de entidad de un nodo incrustado (null si es un paso del flujo). */
export function tipoDeEntidad(n: FlowNodeSpec): TipoEntidad | null {
  const k = n.embed?.kind;
  if (k === 'component') return 'componente';
  if (k === 'tableder') return 'tabla';
  if (k !== 'class') return null;
  const name = String(asRecord(n.embed?.class).name ?? n.label ?? '');
  return /Client$/.test(name) ? 'cliente' : /Controller$/.test(name) ? 'controller' : 'pojo';
}

/**
 * Color por tipo de entidad: el que fije el consumidor, o una rotación de tono OKLCH repartida entre
 * 0° y 330° (de 330° a 360° se omite: se confunde con los de 0°). Pastel legible con texto oscuro.
 * Nunca dos tipos con el mismo color.
 */
export function coloresDeEntidad(propios: Partial<Record<TipoEntidad, string>> = {}): Record<TipoEntidad, string> {
  const paso = 330 / (TIPOS_ENTIDAD.length - 1);
  const out = {} as Record<TipoEntidad, string>;
  TIPOS_ENTIDAD.forEach((t, i) => { out[t] = propios[t] ?? oklchToHex(0.87, 0.09, i * paso); });
  return out;
}

/** Largo del conector `-(O-` desde el borde del componente: palo, bola y socket (px). */
export const SOCKET = { palo: 10, bola: 5, socket: 8 } as const;

/**
 * Las aristas que llegan a un componente con interfaz (`provides`) terminan en su socket: se recorta
 * el último tramo (palo + bola + socket) y se marca `socket`. La punta sigue en el borde del
 * componente, así las que llegan al mismo costado comparten un solo `-(O-`.
 */
/**
 * ¿La arista es un consumo que llega por `-(O-`? Todo consumo (punteada) de un componente, y toda
 * llegada a lo que expone interfaz (tablas del DER, componentes con `provides`); entre dos tablas no.
 */
function predicadoSocket(spec: FlowResolvedSpec): (r: Pick<FlowEdgeSpec, 'from' | 'to' | 'kind'>) => boolean {
  const expone = new Set(spec.nodes.filter((n) => {
    // Las tablas del DER se consumen (a través de su controller): siempre exponen su `-(O-`.
    if (n.embed?.kind === 'tableder') return true;
    const c = n.embed?.kind === 'component' ? (n.embed.component as Record<string, unknown> | undefined) : undefined;
    const p = c?.provides ?? c?.expose ?? c?.exposes;
    return Array.isArray(p) ? p.length > 0 : !!p;
  }).map((n) => n.id));
  // Todo consumo (arista punteada) de un componente es `-(O-`, declare o no lo que expone; una arista
  // continua (consecuencia, p. ej. la llamada HTTP al login) llega normal.
  const componentes = new Set(spec.nodes.filter((n) => n.embed?.kind === 'component').map((n) => n.id));
  // Entre dos tablas (propagación maestro → detalle) no hay consumo: ninguna expone su `-(O-` a la otra.
  const tablas = new Set(spec.nodes.filter((n) => n.embed?.kind === 'tableder').map((n) => n.id));
  return (r) => !(tablas.has(r.from) && tablas.has(r.to)) && (expone.has(r.to) || (componentes.has(r.to) && r.kind === 'dashed'));
}

function socketsDeComponentes(routed: Array<FlowLayoutEdge | null>, spec: FlowResolvedSpec): void {
  const consume = predicadoSocket(spec);
  // Convención InSoft: el componente expone el socket `(` (palo + arco) y el riel llega a la bola O.
  const largo = SOCKET.palo + SOCKET.socket + SOCKET.bola;
  routed.forEach((r, i) => {
    if (!r || !consume(r) || r.from === r.to) return;
    const pts = pathPoints(r.path);
    if (pts.length < 2) return;
    const T = pts[pts.length - 1]!;
    let P = pts[pts.length - 2]!;
    let l = Math.abs(T.x - P.x) + Math.abs(T.y - P.y);
    const d = { x: Math.sign(T.x - P.x), y: Math.sign(T.y - P.y) };
    // Llegada corta tras un escalón: el escalón retrocede lo que falta para que quepa el socket.
    if (l <= largo + 4 && pts.length >= 4) {
      const Q = pts[pts.length - 3]!;
      const R = pts[pts.length - 4]!;
      const falta = largo + 8 - l;
      const enLinea = Math.sign(Q.x - R.x) === d.x && Math.sign(Q.y - R.y) === d.y;
      if (enLinea && Math.abs(Q.x - R.x) + Math.abs(Q.y - R.y) > falta + 8) {
        pts[pts.length - 3] = { x: Q.x - d.x * falta, y: Q.y - d.y * falta };
        pts[pts.length - 2] = P = { x: P.x - d.x * falta, y: P.y - d.y * falta };
        l = Math.abs(T.x - P.x) + Math.abs(T.y - P.y);
      }
    }
    const fin = { x: T.x - d.x * largo, y: T.y - d.y * largo };
    if (l <= largo + 4) {
      // Escalera del abanico pegada a la punta: se corta donde entra a la zona del socket y se llega
      // a él por el eje de la punta (un tramo recto de 8 px antes del socket).
      const antes = (q: FlowPoint): number => (T.x - q.x) * d.x + (T.y - q.y) * d.y;
      const k = pts.findIndex((q) => antes(q) <= largo + 8);
      const A = pts[k - 1];
      const B = pts[k];
      if (k < 1 || !A || !B || Math.sign(B.x - A.x) !== d.x || Math.sign(B.y - A.y) !== d.y) return;
      const corte = antes(A) - (largo + 8);
      // Si el corte cae a menos de 8 px del vértice anterior, se usa ese vértice (sin escalones de 1 px).
      const C = corte >= 8 ? { x: A.x + d.x * corte, y: A.y + d.y * corte } : A;
      // Proyección de C sobre el eje de la punta.
      const C2 = d.x ? { x: C.x, y: fin.y } : { x: fin.x, y: C.y };
      routed[i] = { ...r, path: polylinePath(simplifyOrthoPath([...pts.slice(0, corte >= 8 ? k : k - 1), C, C2, fin])), arrowTipX: T.x, arrowTipY: T.y, socket: true };
      return;
    }
    routed[i] = { ...r, path: polylinePath([...pts.slice(0, -1), fin]), arrowTipX: T.x, arrowTipY: T.y, socket: true };
    void spec.edges[i];
  });
}

/** El flujo (aristas continuas) también converge en abanico a sus puntas compartidas. */
function abanicoDelFlujo(routed: Array<FlowLayoutEdge | null>, spec: FlowResolvedSpec): void {
  const idx = routed.flatMap((r, i) => (r && spec.edges[i]!.kind !== 'dashed' && spec.edges[i]!.from !== spec.edges[i]!.to ? [i] : []));
  const caminos = abanicoEnVias(idx.map((i) => pathPoints(routed[i]!.path)));
  idx.forEach((i, k) => {
    const pts = caminos[k];
    const r = routed[i]!;
    if (!pts || pts.length < 2) return;
    const nuevo = polylinePath(pts);
    if (nuevo !== r.path) routed[i] = { ...r, path: nuevo };
  });
}

/** Separación global por delta entre todas las aristas ya ruteadas (ver separarColineales). */
function separarRielesGlobal(routed: Array<FlowLayoutEdge | null>): void {
  const idx = routed.flatMap((r, i) => (r ? [i] : []));
  const caminos = idx.map((i) => pathPoints(routed[i]!.path).map((q) => ({ ...q })));
  const antes = caminos.map((c) => JSON.stringify(c));
  separarColineales(caminos);
  // Una llegada que entra por el mismo punto por donde sale otra arista de ese nodo: la llegada (y todo
  // el abanico que converge a esa punta) se corre 2·delta a lo largo del costado; la punta sigue en el
  // borde, así no comparten tramo. Se compara por la PUNTA (con socket el riel termina antes, en el O).
  const movidas = new Set<number>();
  idx.forEach((i, k) => {
    const r = routed[i]!;
    const pts = caminos[k];
    if (movidas.has(i) || !pts || pts.length < 2) return;
    const tip = { x: r.arrowTipX, y: r.arrowTipY };
    const P = pts[pts.length - 2]!;
    const T = pts[pts.length - 1]!;
    const horizontal = P.y === T.y;
    const choca = idx.some((j, m) => {
      if (j === i || routed[j]!.from !== r.to) return false;
      const S = caminos[m]?.[0];
      return !!S && Math.abs(S.x - tip.x) < 1 && Math.abs(S.y - tip.y) < 1;
    });
    if (!choca) return;
    const d = ABANICO.delta * 2;
    // Todo el abanico de esa punta se mueve junto.
    idx.forEach((j, m) => {
      const rj = routed[j]!;
      if (Math.abs(rj.arrowTipX - tip.x) > 0.5 || Math.abs(rj.arrowTipY - tip.y) > 0.5) return;
      const q = caminos[m];
      if (!q || q.length < 2) return;
      const a = q[q.length - 2]!;
      const b = q[q.length - 1]!;
      if (horizontal) { a.y += d; b.y += d; } else { a.x += d; b.x += d; }
      routed[j] = { ...rj, arrowTipX: rj.arrowTipX + (horizontal ? 0 : d), arrowTipY: rj.arrowTipY + (horizontal ? d : 0) };
      movidas.add(j);
    });
  });
  idx.forEach((i, k) => {
    const pts = caminos[k];
    if (!pts || JSON.stringify(pts) === antes[k]) return;
    routed[i] = { ...routed[i]!, path: polylinePath(pts) };
  });
}

/**
 * Dentro de un grupo de punta, ningún tramo interior corre encima del de otra arista: el que
 * coincide (colineal y solapado) se corre `ABANICO.delta` hacia el lado del que viene, hasta quedar
 * libre. Los tramos extremos (salida y llegada) no se mueven: están anclados a sus puertos.
 */
function separarColineales(caminos: Array<FlowPoint[] | null | undefined>): void {
  const hechos: FlowPoint[][] = [];
  const solapa = (a: FlowPoint, b: FlowPoint, c: FlowPoint, d: FlowPoint): boolean => {
    if (a.x === b.x && c.x === d.x && Math.abs(a.x - c.x) < 1) {
      return Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) > 1;
    }
    if (a.y === b.y && c.y === d.y && Math.abs(a.y - c.y) < 1) {
      return Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) > 1;
    }
    return false;
  };
  const ocupado = (a: FlowPoint, b: FlowPoint): boolean =>
    hechos.some((h) => h.slice(1).some((q, i) => solapa(a, b, h[i]!, q)));
  for (const pts of caminos) {
    if (!pts) continue;
    // Tramos interiores: del 1 al penúltimo (el primero y el último tocan puertos).
    for (let i = 1; i < pts.length - 2; i++) {
      for (let n = 0; n < 8 && ocupado(pts[i]!, pts[i + 1]!); n++) {
        const a = pts[i]!;
        const b = pts[i + 1]!;
        const prev = pts[i - 1]!;
        if (a.x === b.x) {
          const dx = prev.x < a.x ? -ABANICO.delta : ABANICO.delta;
          pts[i] = { x: a.x + dx, y: a.y };
          pts[i + 1] = { x: b.x + dx, y: b.y };
        } else {
          const dy = prev.y < a.y ? -ABANICO.delta : ABANICO.delta;
          pts[i] = { x: a.x, y: a.y + dy };
          pts[i + 1] = { x: b.x, y: b.y + dy };
        }
      }
    }
    hechos.push(pts);
  }
}

/**
 * Lleva a una arista unida a otra (misma punta) por una VÍA paralela al tramo compartido: desde el
 * punto de unión corre a `ABANICO.delta · n` del anfitrión, del lado por el que llega, y se
 * reincorpora escalonada justo antes de la punta (embudo + delta · n). `null` si la geometría no
 * da (llega en línea con el anfitrión, o los tramos son demasiado cortos).
 */
function enVia(pts: readonly FlowPoint[], host: readonly FlowPoint[], vias: Map<string, number>, raiz: number): FlowPoint[] | null {
  const J = pts[pts.length - 1]!;
  const P = pts[pts.length - 2];
  if (!P) return null;
  // Tramo del anfitrión que contiene el punto de unión.
  const k = host.slice(1).findIndex((q, i) => tramoContiene(host[i]!, q, J));
  if (k < 0) return null;
  const cola = [J, ...host.slice(k + 1)].filter((q, i, a) => i === 0 || q.x !== a[i - 1]!.x || q.y !== a[i - 1]!.y);
  if (cola.length < 2) return null;
  const dir = (a: FlowPoint, b: FlowPoint) => ({ x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) });
  const perp = (d: { x: number; y: number }) => ({ x: -d.y, y: d.x });
  // Lado: hacia donde viene la arista (opuesto a su último tramo), perpendicular al primer tramo de la cola.
  const llega = dir(P, J);
  const n = { x: -llega.x, y: -llega.y };
  const d0 = dir(cola[0]!, cola[1]!);
  const p0 = perp(d0);
  if (p0.x * n.x + p0.y * n.y === 0) return null;
  const s = p0.x * n.x + p0.y * n.y > 0 ? 1 : -1;
  const clave = `${raiz}|${s}`;
  const v = (vias.get(clave) ?? 0) + 1;
  const o = ABANICO.delta * v;
  if (Math.abs(J.x - P.x) + Math.abs(J.y - P.y) <= o + 1) return null;
  const ds = cola.slice(1).map((q, i) => dir(cola[i]!, q));
  const desplazado = cola.map((q, i) => {
    const a = perp(ds[Math.max(0, i - 1)]!);
    const b = perp(ds[Math.min(ds.length - 1, i)]!);
    const m = i === 0 ? perp(ds[0]!) : i === cola.length - 1 ? perp(ds[ds.length - 1]!) : { x: a.x + b.x, y: a.y + b.y };
    return { x: q.x + s * o * m.x, y: q.y + s * o * m.y };
  });
  // Reincorporación antes de la punta: el último tramo tiene que dar para el embudo.
  const T = cola[cola.length - 1]!;
  const dl = ds[ds.length - 1]!;
  const ultimo = cola[cola.length - 2]!;
  const largo = Math.abs(T.x - ultimo.x) + Math.abs(T.y - ultimo.y);
  const atras = ABANICO.embudo + o;
  if (largo <= atras + o) return null;
  const E = { x: T.x - dl.x * atras, y: T.y - dl.y * atras };
  const Ev = { x: E.x + s * o * perp(dl).x, y: E.y + s * o * perp(dl).y };
  vias.set(clave, v);
  return simplifyOrthoPath([...pts.slice(0, -1), ...desplazado.slice(0, -1), Ev, E, T]);
}

/**
 * Arista de uso entre carriles (punteada: «uses», SELECT, INSERT…): sale por el costado que mira al
 * destino y entra por el costado opuesto.
 *   - Todas las que llegan al mismo costado del mismo destino COMPARTEN la punta y convergen en
 *     abanico, como en clases: cada una baja por su riel, paralelos a corta distancia, y se unen en
 *     un tronco final. El codo de unión queda fuera del radio de proximidad de la llegada (GIRO).
 *   - La primera fija la punta: a su altura de salida si cabe en el costado (llega RECTA), si no al
 *     centro; su riel va donde menos cuestan sus giros (ver costoGiros).
 * Sin costados libres → null.
 */
function rutaDeUso(
  from: FlowLayoutNode,
  to: FlowLayoutNode,
  /** Punta y rieles ya tomados por las aristas de uso, por costado de destino. */
  usos: Map<string, { punta?: FlowPoint; rieles: number[]; vias?: Record<string, number> }>,
  nodes: readonly FlowLayoutNode[] = [],
): FlowPoint[] | null {
  const derecha = to.x >= from.x + from.w + 16;
  const izquierda = to.x + to.w <= from.x - 16;
  if (!derecha && !izquierda) return null;
  const clave = `${to.id}|${derecha ? 'izq' : 'der'}`;
  const tomado = usos.get(clave) ?? { rieles: [] };
  usos.set(clave, tomado);
  const a = { x: derecha ? from.x + from.w : from.x, y: snapDiagramGrid(from.y + from.h / 2) };
  const choca = (pts: readonly FlowPoint[]): boolean => pts.slice(1).some((q, k) =>
    nodes.some((n) => n.id !== from.id && n.id !== to.id && segHitsRect(pts[k]!, q, n, 4)));
  const bx = derecha ? to.x : to.x + to.w;
  // Alturas de llegada: la punta ya tomada; si no, todas las del costado, la de salida primero.
  const alturas: number[] = [];
  if (tomado.punta) alturas.push(tomado.punta.y);
  else {
    for (let y = snapDiagramGrid(to.y + 8); y <= to.y + to.h - 8; y += 8) alturas.push(y);
    if (!alturas.length) alturas.push(snapDiagramGrid(to.y + to.h / 2));
  }
  const recta = alturas.find((y) => y === a.y && !choca([a, { x: bx, y }]));
  if (recta != null) {
    tomado.punta ??= { x: bx, y: recta };
    return [a, tomado.punta];
  }
  // Riel: cada 8 px entre los extremos, sin pisar otro riel de esta punta ni atravesar cajas. Los que
  // se suman a una punta ya tomada quedan pegados a los rieles hermanos (abanico) y con el codo de
  // unión fuera del radio de la llegada. Para la primera, cuánto se aleja la llegada de la salida
  // también cuenta (poco).
  const s = derecha ? 1 : -1;
  const hermano = tomado.rieles.length
    ? tomado.rieles.reduce((p, q) => ((bx - p) * s > (bx - q) * s ? p : q))
    : bx - s * GIRO.radio;
  let mejor: FlowPoint[] | null = null;
  let mejorCosto = Infinity;
  let mejorX = 0;
  for (const y of alturas) {
    const b = { x: bx, y };
    for (let xm = snapDiagramGrid(a.x + s * 16); (b.x - xm) * s >= 16; xm += s * 8) {
      if (tomado.rieles.some((r) => Math.abs(r - xm) < 8)) continue;
      const pts = [a, { x: xm, y: a.y }, { x: xm, y: b.y }, b];
      if (choca(pts)) continue;
      const junto = tomado.rieles.length ? Math.abs(xm - hermano) / 8 : 0;
      const c = costoGiros(pts) + junto + Math.abs(y - a.y) / 64;
      if (c < mejorCosto) { mejorCosto = c; mejor = pts; mejorX = xm; }
    }
  }
  // Ninguna ruta lateral libre de cajas: que decida la rejilla (A*), nunca encima de un nodo.
  if (!mejor) return null;
  const sumada = !!tomado.punta;
  tomado.punta ??= mejor[3]!;
  // Abanico con separación por delta (el de clases): la que se suma a una punta ya tomada no pisa el
  // tronco; corre por su propia vía, paralela a ABANICO.delta por vía del lado del que llega, y
  // converge escalonada justo antes de la punta (las vías de afuera entran un poco antes).
  if (sumada && a.y !== tomado.punta.y) {
    const p = tomado.punta;
    const lado = Math.sign(a.y - p.y);
    const vias = (tomado.vias ??= {});
    const k = (vias[lado] = (vias[lado] ?? 0) + 1);
    const yk = p.y + lado * ABANICO.delta * k;
    const xj = p.x - s * (ABANICO.embudo + ABANICO.delta * k);
    if ((p.x - mejorX) * s > (p.x - xj) * s + 4) {
      mejor = [a, { x: mejorX, y: a.y }, { x: mejorX, y: yk }, { x: xj, y: yk }, { x: xj, y: p.y }, p];
    }
  }
  tomado.rieles.push(mejorX);
  return mejor;
}

/**
 * Vuelta corta (un bucle): sale por el costado izquierdo del origen, sube por un pasillo pegado a
 * los dos nodos y entra por el costado izquierdo del destino. Solo si el pasillo no toca otra caja.
 */
function vueltaCorta(from: FlowLayoutNode, to: FlowLayoutNode, nodes: readonly FlowLayoutNode[], segs: readonly FlowSegment[] = []): FlowPoint[] | null {
  // Un punto ya usado por otra arista (su llegada o su tramo): arrancar o llegar ahí es prohibitivo,
  // no se vería de dónde sale la vuelta.
  const ocupado = (p: FlowPoint): boolean => segs.some((s) =>
    (s.x1 === s.x2 && Math.abs(p.x - s.x1) <= 1 && p.y >= Math.min(s.y1, s.y2) - 1 && p.y <= Math.max(s.y1, s.y2) + 1)
    || (s.y1 === s.y2 && Math.abs(p.y - s.y1) <= 1 && p.x >= Math.min(s.x1, s.x2) - 1 && p.x <= Math.max(s.x1, s.x2) + 1));
  for (const lado of ['izquierda', 'derecha'] as const) {
    const izq = lado === 'izquierda';
    const x = izq ? snapDiagramGrid(Math.min(from.x, to.x) - 24) : snapDiagramGrid(Math.max(from.x + from.w, to.x + to.w) + 24);
    const a = { x: izq ? from.x : from.x + from.w, y: snapDiagramGrid(from.y + from.h / 2) };
    const b = { x: izq ? to.x : to.x + to.w, y: snapDiagramGrid(to.y + to.h / 2) };
    if (ocupado(a) || ocupado(b)) continue;
    const pts = [a, { x, y: a.y }, { x, y: b.y }, b];
    let choca = false;
    for (let i = 1; i < pts.length && !choca; i++) {
      for (const n of nodes) {
        if (n.id === from.id || n.id === to.id) continue;
        if (segHitsRect(pts[i - 1]!, pts[i]!, n, 4)) { choca = true; break; }
      }
    }
    if (!choca) return pts;
  }
  return null;
}

/**
 * Vuelta hacia arriba (p. ej. la respuesta que regresa al componente que inició el flujo): baja por
 * debajo de todo, corre por fuera del lado izquierdo del destino y entra por su costado izquierdo.
 * Así no cruza el flujo que baja.
 */
function rutaDeVuelta(from: FlowLayoutNode, to: FlowLayoutNode, fondo: number, izquierda?: number): FlowPoint[] {
  const a = { x: snapDiagramGrid(from.x + from.w / 2), y: from.y + from.h };
  const y = snapDiagramGrid(fondo + 24);
  // Sube por fuera del recuadro de grupo del destino (si lo tiene), nunca por su título.
  const x = snapDiagramGrid(Math.min(to.x, izquierda ?? to.x) - 16);
  const cy = snapDiagramGrid(to.y + to.h / 2);
  return [a, { x: a.x, y }, { x, y }, { x, y: cy }, { x: to.x, y: cy }];
}

/** Separación mínima entre rieles de un abanico (px): cabe la etiqueta encima de cada uno. */
const RIEL_GAP = 24;

/**
 * Ramas de una decisión que salen por el MISMO costado (3+ casos): si todas partieran del vértice
 * lateral compartirían el primer tramo (un solo riel para varias ramas). Cada una sale de un punto
 * distinto del borde inferior de ese costado, en su propio riel horizontal: la más lejana por el
 * vértice (riel más alto) y las más cercanas más abajo, así las bajadas no cruzan ningún riel.
 * Devuelve el punto de salida por índice de arista.
 */
function salidasEnAbanico(
  edges: readonly FlowEdgeSpec[],
  pos: ReadonlyMap<string, FlowLayoutNode>,
  meta: ReadonlyMap<string, FlowPlacedNode>,
  primary: ReadonlyMap<string, string> | undefined,
  direction: FlowDirection,
): Map<number, FlowPoint> {
  const out = new Map<number, FlowPoint>();
  if (direction !== 'TB') return out;
  const grupos = new Map<string, number[]>();
  edges.forEach((e, i) => {
    const from = pos.get(e.from);
    const to = pos.get(e.to);
    const fm = meta.get(e.from);
    const tm = meta.get(e.to);
    if (!from || !to || !fm || !tm || from.shape !== 'diamond' || tm.layer <= fm.layer) return;
    const lado = insoftSides(fm, tm, from, to, from.shape, primary?.get(e.from), direction, false, [...pos.values()]).fromSide;
    if (lado !== 'left' && lado !== 'right') return;
    const k = `${e.from}|${lado}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(i);
  });
  for (const [k, idxs] of grupos) {
    if (idxs.length < 2) continue;
    const from = pos.get(edges[idxs[0]!]!.from)!;
    const izquierda = k.endsWith('|left');
    const cx = from.x + from.w / 2;
    const cy = from.y + from.h / 2;
    const centro = (i: number): number => { const t = pos.get(edges[i]!.to)!; return t.x + t.w / 2; };
    idxs.sort((a, b) => Math.abs(centro(b) - cx) - Math.abs(centro(a) - cx));
    idxs.forEach((i, j) => {
      // Sobre el borde inferior del costado: y baja RIEL_GAP por rama; x sigue el borde del rombo.
      const y = snapDiagramGrid(cy + Math.min(j * RIEL_GAP, from.h / 2 - 8));
      const t = (y - cy) / (from.h / 2);
      const x = izquierda ? from.x + t * (from.w / 2) : from.x + from.w - t * (from.w / 2);
      out.set(i, { x, y });
    });
  }
  return out;
}

/**
 * Varias aristas que salen de (o llegan a) la misma barra: puntos repartidos a lo largo de la barra,
 * en el orden de sus otros extremos, para que ninguna comparta tramo. Clave `<índice>|from|to`.
 */
/**
 * Puntos de convergencia: barras con dos o más entradas y una sola salida (la reunión de ramas
 * paralelas). Se dibujan como ⦿ con pulso de radar, no como barra.
 */
export function unionesDe(spec: Pick<FlowResolvedSpec, 'nodes' | 'edges'>): Set<string> {
  const out = new Set<string>();
  for (const n of spec.nodes) {
    if (n.shape !== 'bar') continue;
    const entran = spec.edges.filter((e) => e.to === n.id).length;
    const salen = spec.edges.filter((e) => e.from === n.id).length;
    if (entran >= 2 && salen <= 1) out.add(n.id);
  }
  return out;
}

function puntosEnBarras(edges: readonly FlowEdgeSpec[], pos: ReadonlyMap<string, FlowLayoutNode>): Map<string, FlowPoint> {
  const out = new Map<string, FlowPoint>();
  for (const bar of pos.values()) {
    if (bar.shape !== 'bar' || bar.union) continue;
    const horizontal = bar.w >= bar.h;
    for (const lado of ['from', 'to'] as const) {
      const idxs = edges.map((e, i) => [e, i] as const).filter(([e]) => e[lado] === bar.id && pos.has(lado === 'from' ? e.to : e.from));
      if (idxs.length < 2) continue;
      const otro = (e: FlowEdgeSpec) => pos.get(lado === 'from' ? e.to : e.from)!;
      const eje = (n: FlowLayoutNode) => (horizontal ? n.x + n.w / 2 : n.y + n.h / 2);
      idxs.sort(([a], [b]) => eje(otro(a)) - eje(otro(b)));
      idxs.forEach(([e, i], k) => {
        const t = (k + 1) / (idxs.length + 1);
        if (horizontal) {
          const x = snapDiagramGrid(bar.x + t * bar.w);
          out.set(`${i}|${lado}`, { x, y: lado === 'from' ? bar.y + bar.h : bar.y });
        } else {
          const y = snapDiagramGrid(bar.y + t * bar.h);
          out.set(`${i}|${lado}`, { x: lado === 'from' ? bar.x + bar.w : bar.x, y });
        }
      });
    }
  }
  return out;
}

/**
 * Barra de sincronización: cada arista sale (bifurcación) o llega (unión) a la altura del nodo del
 * otro extremo, dentro del largo de la barra; así las ramas no se amontonan en el centro. La arista
 * ÚNICA de su costado (la que inicia el paralelismo, o la que sigue a la reunión) va centrada: de una
 * salen varias. Un ⦿ de convergencia se toca en el centro de su costado.
 */
function sobreBarra(p: FlowPoint, bar: FlowLayoutNode, otro: FlowLayoutNode, shape: FlowShape | undefined, unica = false): FlowPoint {
  if (shape !== 'bar' || bar.union || unica) return p;
  const m = 8;
  if (bar.w >= bar.h) {
    const x = Math.min(bar.x + bar.w - m, Math.max(bar.x + m, snapDiagramGrid(otro.x + otro.w / 2)));
    return { x, y: p.y };
  }
  const y = Math.min(bar.y + bar.h - m, Math.max(bar.y + m, snapDiagramGrid(otro.y + otro.h / 2)));
  return { x: p.x, y };
}

/**
 * Cajas que empujan a las etiquetas y no se mueven: insignias sueltas de los nodos y títulos de
 * carriles y de grupos de contexto (en coords del lienzo).
 */
function cajasFijas(
  nodes: readonly FlowLayoutNode[],
  lanes: readonly FlowLayoutLane[] | undefined,
  contexts: readonly FlowLayoutContext[] | undefined,
  ox: number,
  oy: number,
  horizontal: boolean,
  mide: (t: string) => number,
): EmbedBox[] {
  const out: EmbedBox[] = [];
  for (const n of nodes) if (n.pill && n.pillFloat) out.push(n.pill);
  for (const l of lanes ?? []) {
    const w = mide(l.label) * 1.3;
    out.push(horizontal
      ? { x: l.x + ox + 12, y: l.y + oy + l.h / 2 - 9, w, h: 18 }
      : { x: l.x + ox + l.w / 2 - w / 2, y: l.y + oy + 12, w, h: 18 });
  }
  // Títulos de los grupos en su posición FINAL (la misma caja que se dibuja: unión de sus miembros,
  // partida para no abrazar ajenos). Ningún riel ni texto pasa por encima de ellos.
  for (const c of contexts?.length ? abrazar(contexts, nodes, ox, oy) : []) {
    out.push({ x: c.x - 4, y: c.y - 4, w: Math.ceil(c.label.length * 6.2) + 14 + 8, h: 18 + 8 });
  }
  return out;
}

/**
 * Abre espacio para una etiqueta sin sitio: empuja hacia abajo (o a la derecha, si el flujo avanza
 * así) todo lo que empieza a partir de su caja. Mueve nodos (con sus cajas internas), carriles y
 * grupos. Devuelve cuánto creció el lienzo.
 */
function abrirEspacio(
  caja: EmbedBox,
  nodes: FlowLayoutNode[],
  meta: ReadonlyMap<string, FlowPlacedNode>,
  placed: FlowPlacement,
  ox: number,
  oy: number,
  haciaLaDerecha: boolean,
  lanesHorizontales = false,
): number {
  const extra = snapDiagramGrid((haciaLaDerecha ? caja.w : caja.h) + U * 2);
  const corte = haciaLaDerecha ? caja.x : caja.y;
  const mover = (b: { x: number; y: number } | undefined): void => {
    if (!b) return;
    if (haciaLaDerecha) b.x += extra; else b.y += extra;
  };
  // Un controller y sus puentes son un bloque (el puente nunca se despega): se corre entero si
  // alguno de sus miembros arranca detrás del corte.
  const bloque = (n: FlowLayoutNode): string => n.bridge?.of ?? n.id;
  const arranque = new Map<string, number>();
  for (const n of nodes) {
    const k = bloque(n);
    arranque.set(k, Math.max(arranque.get(k) ?? -Infinity, haciaLaDerecha ? n.x : n.y));
  }
  for (const n of nodes) {
    if (arranque.get(bloque(n))! < corte) continue;
    for (const b of [n, n.textBox, n.embedBox, n.pill, n.varsBox]) mover(b);
    const m = meta.get(n.id) as { x: number; y: number } | undefined;
    mover(m);
  }
  // Grupos: el que queda detrás del corte se corre; el que el corte atraviesa crece.
  for (const c of placed.contexts ?? []) {
    const ini = haciaLaDerecha ? c.x + ox : c.y + oy;
    const fin = ini + (haciaLaDerecha ? c.w : c.h);
    if (ini >= corte) mover(c);
    else if (fin > corte) { if (haciaLaDerecha) c.w += extra; else c.h += extra; }
  }
  // Carriles: los que corren a lo largo del empuje crecen; si el empuje los cruza (columnas empujadas
  // a la derecha o filas empujadas hacia abajo), crece el atravesado y se corren los de detrás.
  for (const l of placed.lanes ?? []) {
    const cruza = haciaLaDerecha ? !lanesHorizontales : lanesHorizontales;
    if (!cruza) { if (haciaLaDerecha) l.w += extra; else l.h += extra; continue; }
    const ini = haciaLaDerecha ? l.x + ox : l.y + oy;
    const fin = ini + (haciaLaDerecha ? l.w : l.h);
    if (ini >= corte) mover(l);
    else if (fin > corte) { if (haciaLaDerecha) l.w += extra; else l.h += extra; }
  }
  placed.width += haciaLaDerecha ? extra : 0;
  placed.height += haciaLaDerecha ? 0 : extra;
  return extra;
}

/** ¿El punto cae sobre el tramo ortogonal p→q? */
function tramoContiene(p: FlowPoint, q: FlowPoint, a: FlowPoint): boolean {
  if (p.y === q.y) return a.y === p.y && a.x >= Math.min(p.x, q.x) - 0.5 && a.x <= Math.max(p.x, q.x) + 0.5;
  return a.x === p.x && a.y >= Math.min(p.y, q.y) - 0.5 && a.y <= Math.max(p.y, q.y) + 0.5;
}

/**
 * Anclas de una etiqueta: los dos vértices de su caja del lado de su arista, proyectados sobre el
 * tramo junto al que quedó. En la segunda pasada la arista dueña prefiere la ruta que pasa por ambos.
 */
export function anclasDeEtiqueta(e: FlowLayoutEdge): [FlowPoint, FlowPoint] | null {
  const c = e.labelBox;
  if (!c) return null;
  const pts = pathPoints(e.path);
  for (let k = 1; k < pts.length; k++) {
    const p = pts[k - 1]!;
    const q = pts[k]!;
    if (p.y === q.y && c.x < Math.max(p.x, q.x) && c.x + c.w > Math.min(p.x, q.x) && Math.abs((c.y + c.h / 2) - p.y) <= c.h / 2 + U) {
      const x0 = Math.max(c.x, Math.min(p.x, q.x));
      const x1 = Math.min(c.x + c.w, Math.max(p.x, q.x));
      return [{ x: x0, y: p.y }, { x: x1, y: p.y }];
    }
    if (p.x === q.x && c.y < Math.max(p.y, q.y) && c.y + c.h > Math.min(p.y, q.y) && Math.abs((c.x + c.w / 2) - p.x) <= c.w / 2 + U) {
      const y0 = Math.max(c.y, Math.min(p.y, q.y));
      const y1 = Math.min(c.y + c.h, Math.max(p.y, q.y));
      return [{ x: p.x, y: y0 }, { x: p.x, y: y1 }];
    }
  }
  return null;
}

/** Desplaza un punto hacia afuera del nodo, en la dirección de su lado. */
function stepOut(p: { x: number; y: number }, side: AnchorSide, d: number): { x: number; y: number } {
  if (side === 'top') return { x: p.x, y: p.y - d };
  if (side === 'bottom') return { x: p.x, y: p.y + d };
  if (side === 'left') return { x: p.x - d, y: p.y };
  return { x: p.x + d, y: p.y };
}

/** Punta de flecha: posición y ángulo de rotación según el lado de llegada. */
function arrowTip(p: { x: number; y: number }, side: AnchorSide): { x: number; y: number; angle: number } {
  const angle = side === 'top' ? 90 : side === 'bottom' ? 270 : side === 'left' ? 0 : 180;
  return { x: p.x, y: p.y, angle };
}
/* ───────────────────── estilo insoft (actividad) ───────────────────── */

/**
 * Medidas del estilo insoft: diagrama de actividad a lo Visual Paradigm.
 * Acciones muy redondeadas, rombos anchos y bajos construidos alrededor del
 * texto, columna principal recta y ramas a los costados.
 */
const INSOFT = {
  fontSize: 11,
  lineH: 14,
  /** Ancho máximo del texto de una acción antes de partir en líneas. */
  actionText: 176,
  actionPadX: 14,
  actionPadY: 10,
  actionMinW: 96,
  actionMinH: 40,
  /** Ancho máximo del texto de una decisión: parte en dos líneas antes de
   *  estirar el rombo hacia los lados. */
  decisionText: 180,
  /** Alto mínimo del rombo respecto a su ancho: con menos, los vértices
   *  izquierdo y derecho quedan muy agudos (0.5 ≈ 53° en el vértice lateral). */
  decisionMinAspect: 0.5,
  decisionPadX: 6,
  decisionPadY: 4,
  decisionMinRectH: 22,
  /** Recuadro de los nodos `nested`. */
  nestedPad: 8,
  nestedGap: 6,
  layerGap: 44,
  labelLayerGap: 52,
  nodeGap: 40,
} as const;

/** Estimación de ancho sin DOM (Poppins 500 ≈ 0,6 em por carácter). */
const estimateWidth = (text: string, fontSize: number): number => estimateTextWidth(text, fontSize, 0.6);

/** Parte `text` en líneas de como mucho `maxW` px (greedy por palabras). */
export function wrapFlowLines(text: string, maxW: number, measure: (t: string) => number): { lines: string[]; width: number } {
  const words = richTextPlain(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (!cur || measure(cand) <= maxW) cur = cand;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (!lines.length) lines.push('');
  return { lines, width: Math.max(0, ...lines.map((l) => measure(l))) };
}

function measurer(opts: FlowLayoutOptions): (t: string) => number {
  const fs = opts.fontSize ?? INSOFT.fontSize;
  return opts.measure ?? ((t: string) => estimateWidth(t, fs));
}

/**
 * Rombo de decisión por el rect del texto: el texto se mide en un rectángulo
 * (rw × rh) y el rombo se construye con diagonales que cruzan por el centro.
 * El rect queda inscrito si sus esquinas no pasan de los lados:
 * rw/W + rh/H ≤ 1 (W, H = diagonales). Con W = 2rw y H = 2rh se cumple justo,
 * pero un texto ancho da un rombo ancho y bajo, de vértices laterales agudos.
 * Si H/W queda por debajo de `decisionMinAspect` (q), se reparte: H = q·W con
 * rw/W + rh/(q·W) = 1 → W = rw + rh/q. Más alto y más angosto, el texto sigue dentro.
 */
export function decisionGeometry(textW: number, nLines: number, pastilla: { w: number; h: number } | null = null): { w: number; h: number; rect: EmbedBox } {
  // `pastilla` (paso + ícono): caja de dos columnas dentro del rombo — la pastilla a la izquierda y el
  // texto en el resto, ambos centrados en vertical. El rect inscrito las incluye a las dos.
  const rw = Math.ceil(textW + (pastilla ? pastilla.w + DECISION_GAP : 0) + INSOFT.decisionPadX * 2);
  const rh = Math.max(INSOFT.decisionMinRectH, nLines * INSOFT.lineH + INSOFT.decisionPadY * 2, pastilla ? pastilla.h + INSOFT.decisionPadY * 2 : 0);
  const q = INSOFT.decisionMinAspect;
  const [dw, dh] = rh / rw >= q ? [rw * 2, rh * 2] : [rw + rh / q, (rw + rh / q) * q];
  // Múltiplos de 16: el centro cae en la rejilla de 8 y los vértices
  // laterales/inferior son anclas exactas de las aristas.
  const w = ceilDiagramGrid(dw, 16);
  const h = ceilDiagramGrid(dh, 16);
  return { w, h, rect: { x: (w - rw) / 2, y: (h - rh) / 2, w: rw, h: rh } };
}

function sizeInsoftNode(n: FlowNodeSpec, opts: FlowLayoutOptions): FlowSizedNode {
  if (n.shape === 'start' || n.shape === 'end') return { id: n.id, w: FLOW_TERMINAL_D, h: FLOW_TERMINAL_D };
  if (n.shape === 'bar') return { id: n.id, w: FLOW_BAR_W, h: FLOW_BAR_H };
  if (n.shape === 'comment') {
    // Globo: comillas a la izquierda y el texto (alineado a la izquierda) en el resto.
    const t = wrapFlowLines(n.label, COMENTARIO.texto, measurer(opts));
    const w = ceilDiagramGrid(t.width + COMENTARIO.pad * 2 + COMENTARIO.comillas, 8);
    const h = ceilDiagramGrid(Math.max(32, t.lines.length * INSOFT.lineH + COMENTARIO.pad * 2), 8);
    return { id: n.id, w, h, lines: t.lines, textBox: { x: COMENTARIO.pad + COMENTARIO.comillas, y: 0, w: w - COMENTARIO.pad * 2 - COMENTARIO.comillas, h }, textAlign: 'start' };
  }
  const measure = measurer(opts);
  if (n.shape === 'bridge') {
    // Puente `-(O=`: palo, socket y bola (con el ícono CRUD dentro); a la derecha la función del
    // controller que hace la operación (`get()`, `list()`…).
    const texto = n.label.trim() && n.label !== n.id ? n.label.trim() : '';
    const w = ceilDiagramGrid(PUENTE.socket * 2 + 8 + (texto ? measure(texto) + 6 : 0), 8);
    const h = ceilDiagramGrid(PUENTE.palo + PUENTE.socket * 2 + 6, 8);
    return { id: n.id, w, h, ...(texto ? { lines: [texto], textBox: { x: PUENTE.socket * 2 + 8, y: PUENTE.palo, w: measure(texto) + 6, h: PUENTE.socket * 2 }, textAlign: 'start' as const } : {}) };
  }
  if (n.shape === 'vars' && n.vars?.length) {
    // Tabla de declaración con encabezados: Variable (alias o nombre) · Valor (código, partido en la
    // cadena de `.`) · Descripción (solo si alguna la trae). Cada fila mide lo que su valor.
    const conDesc = n.vars.some((v) => v.desc);
    const valor = n.vars.map((v) => partirCadena(v.value));
    const mono = (t: string) => t.length * VARS.charMono;
    const col = (xs: string[], m: (t: string) => number) => ceilDiagramGrid(Math.max(...xs.map(m)) + VARS.celda * 2, 4);
    const cols = [
      col(['Variable', ...n.vars.map((v) => v.alias ?? v.name)], mono),
      col(['Valor', ...valor.flat()], mono),
      ...(conDesc ? [col(['Descripción', ...n.vars.map((v) => v.desc ?? '')], measure)] : []),
    ];
    const filas = valor.map((ls) => Math.max(1, ls.length) * VARS.lineaCodigo + VARS.celda);
    const titulo = n.label.trim() && n.label !== n.id ? n.label.trim() : '';
    const tituloH = titulo ? VARS.fila : 0;
    const tabla = cols.reduce((a, b) => a + b, 0);
    const altoTabla = VARS.fila + filas.reduce((a, b) => a + b, 0);
    const w = ceilDiagramGrid(Math.max(INSOFT.actionMinW, tabla + VARS.pad * 2, titulo ? measure(titulo) + VARS.pad * 2 + VARS.esquina : 0), 16);
    const h = ceilDiagramGrid(VARS.pad + tituloH + altoTabla + VARS.pad, 8);
    return {
      id: n.id, w, h,
      ...(titulo ? { lines: [titulo], textBox: { x: VARS.pad, y: VARS.pad, w: w - VARS.pad * 2 - VARS.esquina, h: tituloH }, textAlign: 'start' as const } : {}),
      varsCols: cols, varsValor: valor, varsFilas: filas,
      varsBox: { x: VARS.pad, y: VARS.pad + tituloH, w: tabla, h: altoTabla },
    };
  }
  if (n.shape === 'diamond') {
    const t = wrapFlowLines(n.label, INSOFT.decisionText, measure);
    // El número y el ícono van en la insignia sobre el lado superior izquierdo (ver insignias()).
    const g = decisionGeometry(t.width, t.lines.length);
    return { id: n.id, w: g.w, h: g.h, lines: t.lines, textBox: g.rect };
  }
  const t = wrapFlowLines(n.label, INSOFT.actionText, measure);
  // El número y el ícono van en la insignia arriba a la izquierda (ver insignias()): el texto usa toda la caja.
  const w = ceilDiagramGrid(Math.max(INSOFT.actionMinW, t.width + INSOFT.actionPadX * 2), 16);
  const h = ceilDiagramGrid(Math.max(INSOFT.actionMinH, t.lines.length * INSOFT.lineH + INSOFT.actionPadY * 2), 8);
  return {
    id: n.id, w, h, lines: t.lines,
    textBox: { x: INSOFT.actionPadX, y: 0, w: w - INSOFT.actionPadX * 2, h },
    textAlign: 'start',
  };
}

/**
 * Nodos especiales: `nested` = recuadro con el diagrama encajado (contain),
 * sin rótulo propio (el título lo trae el diagrama); `tableder` / `component` = tamaño natural.
 */
function sizeEmbedNode(n: FlowNodeSpec, opts: FlowLayoutOptions): FlowSizedNode | null {
  const embed = n.embed;
  if (!embed) return null;
  const natural = opts.embeds?.[n.id];
  if (embedIsNatural(embed)) {
    const s = natural ?? EMBED_FALLBACK_SIZE;
    const w = Math.ceil(s.w);
    const h = Math.ceil(s.h);
    return { id: n.id, w, h, embedBox: { x: 0, y: 0, w, h } };
  }
  const max = nestedMaxSize(embed);
  const inner = fitContain(natural ?? max, max);
  const pad = INSOFT.nestedPad;
  // Sin rótulo propio: el diagrama anidado ya trae su título (el `label` solo se ve si falta la captura).
  const t = { lines: [] as string[], width: 0 };
  const textH = 0;
  const gap = textH ? INSOFT.nestedGap : 0;
  const w = ceilDiagramGrid(Math.max(INSOFT.actionMinW, t.width + INSOFT.actionPadX * 2, inner.w + pad * 2), 16);
  const h = ceilDiagramGrid(pad + textH + gap + inner.h + pad, 8);
  return {
    id: n.id,
    w,
    h,
    lines: t.lines.length ? t.lines : undefined,
    textBox: textH ? { x: INSOFT.actionPadX, y: pad, w: w - INSOFT.actionPadX * 2, h: textH } : undefined,
    embedBox: { x: (w - inner.w) / 2, y: pad + textH + gap + (h - pad * 2 - textH - gap - inner.h) / 2, w: inner.w, h: inner.h },
  };
}

/**
 * Ícono por defecto de un elemento numerado sin `icon` (con `steps: "auto"`): el número siempre va
 * acompañado de un ícono que dice qué clase de elemento es.
 */
/**
 * Ícono temático de un componente por su estereotipo y nombre (el primero que coincide gana). Un
 * `icon` propio del componente manda sobre esto.
 */
const ICONO_COMPONENTE: ReadonlyArray<[RegExp, string]> = [
  [/whisper|audio|transcri|voz/, 'mdi:microphone-message'],
  [/completion|operativ/, 'mdi:message-processing-outline'],
  [/response|stream/, 'mdi:message-fast-outline'],
  [/conversation|hilo|thread/, 'mdi:forum-outline'],
  [/model|catálogo|catalogo/, 'mdi:brain'],
  [/openai|llm|asistente|ia/, 'mdi:robot-outline'],
  [/vector/, 'mdi:vector-polyline'],
  [/datasnap|dsclientes/, 'mdi:server-network'],
  [/r2|s3|bucket|cdn/, 'mdi:bucket-outline'],
  [/archivo|file/, 'mdi:file-cloud-outline'],
  [/auth|login|identidad|jwt/, 'mdi:shield-account-outline'],
  [/seg|permis/, 'mdi:shield-key-outline'],
  [/config|proveedor/, 'mdi:cog-outline'],
  [/ops|operaci/, 'mdi:tools'],
  [/calificaci|tiquete|ticket/, 'mdi:star-check-outline'],
  [/chat|conversaci/, 'mdi:chat-outline'],
  [/pg|postgres|base de datos|clientesis/, 'mdi:database-outline'],
  [/isw|app|apps|portal/, 'mdi:application-outline'],
];

/** Ícono de un componente incrustado: el suyo (`icon`) o el temático; si nada coincide, la pieza. */
export function iconoDeComponente(c: Record<string, unknown> | undefined): string {
  if (typeof c?.icon === 'string' && c.icon.includes(':')) return c.icon;
  const texto = `${c?.stereotype ?? ''} ${c?.name ?? ''}`.toLowerCase();
  return ICONO_COMPONENTE.find(([re]) => re.test(texto))?.[1] ?? 'mdi:puzzle-outline';
}

export function iconoPorDefecto(n: FlowNodeSpec): string {
  if (n.kind === 'component') return iconoDeComponente(n.embed?.component as Record<string, unknown> | undefined);
  if (n.kind === 'class') return 'mdi:code-braces';
  if (n.kind === 'tableder') return 'mdi:table';
  if (n.kind === 'nested') return 'mdi:sitemap-outline';
  if (n.shape === 'diamond') return 'mdi:source-branch';
  if (n.shape === 'vars') return 'mdi:variable-box';
  if (n.shape === 'bridge') return '';
  return 'mdi:play-circle-outline';
}

/** Verbos SQL de la etiqueta de una arista → ícono de BD (acciones de datos siempre ilustradas). */
const ICONO_SQL: Record<string, string> = {
  SELECT: 'mdi:database-search-outline',
  INSERT: 'mdi:database-plus-outline',
  UPDATE: 'mdi:database-edit-outline',
  UPSERT: 'mdi:database-sync-outline',
  DELETE: 'mdi:database-remove-outline',
};

/** Ícono por defecto de una etiqueta: el del primer verbo SQL que nombre (otro verbo de BD: genérico). */
export function iconoDeEtiqueta(label: string | undefined): string | undefined {
  const verbo = label?.trim().match(/^(SELECT|INSERT|UPDATE|UPSERT|DELETE|MERGE|TRUNCATE)\b/i)?.[1]?.toUpperCase();
  return verbo ? ICONO_SQL[verbo] ?? 'mdi:database-outline' : undefined;
}

/** Medidas del globo de comentario: ancho del texto, relleno, espacio de las comillas y aire al nodo. */
// `aire` = largo del triángulo señalador (ver globoPath): la punta toca el nodo comentado.
const COMENTARIO = { texto: 150, pad: 10, comillas: 18, aire: 8 } as const;

/**
 * Vuelve a pegar cada comentario a su nodo (mismo costado), tras mover nodos al abrir espacio: el
 * señalador siempre toca la entidad comentada. Los fijados a mano (x/y) no se tocan.
 */
function pegarComentarios(nodes: FlowLayoutNode[], fijados: FlowLayoutOverrides['nodes'] = {}): void {
  for (const c of nodes) {
    if (c.shape !== 'comment' || !c.about || (fijados?.[c.id]?.x != null && fijados?.[c.id]?.y != null)) continue;
    const t = nodes.find((n) => n.id === c.about);
    if (!t) continue;
    const x = c.pointer === 'right' ? t.x - COMENTARIO.aire - c.w : t.x + t.w + COMENTARIO.aire;
    const y = snapDiagramGrid(t.y + t.h / 2 - c.h / 2);
    if (c.textBox) c.textBox = { ...c.textBox, x: c.textBox.x + x - c.x, y: c.textBox.y + y - c.y };
    c.x = x;
    c.y = y;
  }
}

/**
 * Coloca cada comentario junto al nodo que señala: a la derecha (el triángulo apunta a la izquierda)
 * o, si ahí choca o se sale, a la izquierda. Centrado en vertical con el nodo.
 */
function colocarComentarios(
  nodes: FlowLayoutNode[],
  spec: FlowResolvedSpec,
  sized: ReadonlyMap<string, FlowSizedNode>,
  ancho: number,
  fijados: FlowLayoutOverrides['nodes'] = {},
  offset: FlowPoint = { x: 0, y: 0 },
): void {
  for (const c of spec.nodes) {
    if (c.shape !== 'comment' || !c.about) continue;
    const t = nodes.find((n) => n.id === c.about);
    const z = sized.get(c.id);
    if (!t || !z) continue;
    // Posición fijada a mano (x/y): manda. Por defecto, pegado al nodo que comenta.
    const ov = fijados?.[c.id];
    if (ov?.x != null && ov?.y != null) {
      const fx = ov.x + offset.x;
      const fy = ov.y + offset.y;
      nodes.push({
        id: c.id, x: fx, y: fy, w: z.w, h: z.h, layer: t.layer, label: c.label, shape: 'comment', about: c.about,
        pointer: fx >= t.x + t.w / 2 ? 'left' : 'right', lines: z.lines, textAlign: 'start',
        ...(z.textBox ? { textBox: { x: fx + z.textBox.x, y: fy + z.textBox.y, w: z.textBox.w, h: z.textBox.h } } : {}),
      });
      continue;
    }
    const y = snapDiagramGrid(t.y + t.h / 2 - z.h / 2);
    const libre = (x: number): boolean => x >= 0 && x + z.w <= ancho + COMENTARIO.aire * 4
      && !nodes.some((n) => n.x < x + z.w + 8 && x - 8 < n.x + n.w && n.y < y + z.h + 8 && y - 8 < n.y + n.h);
    const der = t.x + t.w + COMENTARIO.aire;
    const izq = t.x - COMENTARIO.aire - z.w;
    // El globo prefiere el costado por donde NO salen aristas del nodo (p. ej. sus usos a la BD).
    const vecinos = spec.edges.flatMap((e) => (e.from === t.id ? [e.to] : e.to === t.id ? [e.from] : []))
      .map((id) => nodes.find((n) => n.id === id)).filter((n): n is FlowLayoutNode => !!n);
    const aLaDerecha = vecinos.some((n) => n.x >= t.x + t.w);
    const aLaIzquierda = vecinos.some((n) => n.x + n.w <= t.x);
    const orden = aLaDerecha && !aLaIzquierda
      ? [[izq, 'right'], [der, 'left']] as const
      : [[der, 'left'], [izq, 'right']] as const;
    const [x, pointer] = orden.find(([px]) => libre(px)) ?? orden[0];
    nodes.push({
      id: c.id, x, y, w: z.w, h: z.h, layer: t.layer, label: c.label, shape: 'comment', about: c.about, pointer,
      lines: z.lines, textAlign: 'start',
      ...(z.textBox ? { textBox: { x: x + z.textBox.x, y: y + z.textBox.y, w: z.textBox.w, h: z.textBox.h } } : {}),
    });
  }
}

/** Cuenta para la numeración automática: todo menos inicio, fin, barras, comentarios y rombos de fusión vacíos. */
function esNumerable(n: FlowNodeSpec): boolean {
  if (n.shape === 'start' || n.shape === 'end' || n.shape === 'bar' || n.shape === 'comment' || n.shape === 'bridge') return false;
  return !(n.shape === 'diamond' && !n.label.trim());
}

/**
 * Numera 1..N sin saltos en orden de lectura: por capa (el orden del flujo) y, dentro de la capa, de
 * izquierda a derecha (de arriba abajo si los carriles son horizontales). Las acciones ya traen su
 * pastilla; decisiones y nodos incrustados llevan una insignia en la esquina superior izquierda.
 */
function numerarEnOrden(nodes: FlowLayoutNode[], specById: ReadonlyMap<string, FlowNodeSpec>, horizontal: boolean, edges: readonly FlowEdgeSpec[] = []): void {
  const lista = nodes
    .filter((n) => { const s = specById.get(n.id); return !!s && esNumerable(s); })
    .sort((a, b) => a.layer - b.layer || (horizontal ? a.y - b.y : a.x - b.x));
  const indices = indicesJerarquicos(nodes, specById, edges, horizontal);
  const hayFlujo = indices.size > 0;
  let orden = 0;
  for (const n of lista) {
    const idx = indices.get(n.id);
    // Lo que no es paso del flujo (tablas, POJOs, componentes que solo se usan) lleva solo su ícono.
    if (hayFlujo && !idx) continue;
    n.step = ++orden;
    n.stepLabel = idx ?? String(orden);
  }
}

/**
 * Índices jerárquicos del flujo (aristas continuas), solo para los PASOS (acciones, decisiones,
 * declaraciones, subprocesos); cliente, componentes, controllers, tablas, inicio, fin, barras y
 * comentarios son transparentes (llevan solo su ícono).
 *   - Sin ramas: `1, 2, 3…` (los hermanos incrementan; nunca se concatenan 1s).
 *   - Lo que cuelga de una bifurcación del paso `p` (decisión o varios procesos) se numera `p.1, p.2,
 *     p.3…` en orden de lectura, rama tras rama; una bifurcación anidada abre su propio nivel.
 *   - Donde las ramas se reúnen se vuelve al nivel de quien bifurcó (`p+1`); una rama que va directo
 *     a la reunión o al fin no consume número.
 * Una bifurcación sin paso propio (barra de paralelismo) numera sus ramas bajo el último paso; si no
 * hay ninguno antes, en el mismo nivel.
 */
export function indicesJerarquicos(
  nodes: readonly FlowLayoutNode[],
  specById: ReadonlyMap<string, FlowNodeSpec>,
  edges: readonly FlowEdgeSpec[],
  horizontal = false,
): Map<string, string> {
  const pos = new Map(nodes.map((n) => [n.id, n]));
  const flujo = edges.filter((e) => e.kind !== 'dashed' && e.from !== e.to && pos.has(e.from) && pos.has(e.to));
  const esFin = (id: string): boolean => specById.get(id)?.shape === 'end';
  /** Paso numerable: lo numerable que no es una entidad incrustada (clase, componente, tabla). */
  const esPaso = (id: string): boolean => {
    const s = specById.get(id);
    return !!s && esNumerable(s) && !(s.kind === 'class' || s.kind === 'component' || s.kind === 'tableder');
  };
  const lectura = (id: string): number => { const n = pos.get(id)!; return horizontal ? n.y : n.x; };
  // Grafo del flujo sin retornos (ciclos): hijos en orden de lectura; el fin no se atraviesa (su
  // respuesta vuelve al inicio).
  const G = grafoDirigido(nodes.map((n) => n.id), flujo, { orden: (a, b) => lectura(a) - lectura(b), termina: esFin });
  const { siguientes, reunion } = G;

  const out = new Map<string, string>();
  const visitados = new Set<string>();
  /**
   * Numera la secuencia que arranca en `id` hasta `alto` (la reunión de quien la contiene): cada paso
   * toma `base.(n+1)` del contador del nivel; una bifurcación numera sus ramas en un nivel propio.
   */
  const recorrer = (inicio: string | null | undefined, base: number[], contador: { n: number }, alto: string | null): void => {
    let id = inicio;
    let ultimo: number[] | null = null;
    while (id && id !== alto && !visitados.has(id)) {
      visitados.add(id);
      if (esPaso(id)) {
        ultimo = [...base, ++contador.n];
        out.set(id, ultimo.join('.'));
      }
      const hs = siguientes(id);
      if (hs.length >= 2) {
        const junta = reunion(hs);
        const tope = junta ?? alto;
        // Las ramas viven bajo el paso que bifurca (o el último paso); sin ninguno, en este nivel.
        const sub = ultimo ? { base: ultimo, contador: { n: 0 } } : { base, contador };
        for (const h of hs) recorrer(h, sub.base, sub.contador, tope);
        id = junta;
        continue;
      }
      id = hs[0];
    }
  };
  const raiz = { n: 0 };
  for (const f of [...G.fuentes].sort((a, b) => lectura(a) - lectura(b))) recorrer(f, [], raiz, null);
  // Lo que solo se alcanza por un ciclo o sin fuente clara: en el nivel raíz, al final.
  for (const n of nodes) if (!visitados.has(n.id) && G.conSalida(n.id)) recorrer(n.id, [], raiz, null);
  return out;
}

/**
 * Insignia estándar de cada paso (número + ícono, fondo oscuro): arriba a la izquierda, montando la
 * esquina del nodo (casi toda por encima del borde: no tapa títulos ni texto). En el rombo, centrada
 * sobre su lado superior izquierdo.
 */
function insignias(nodes: FlowLayoutNode[]): void {
  for (const n of nodes) {
    if (n.step == null && !n.icon) continue;
    if (n.shape === 'start' || n.shape === 'end' || n.shape === 'bar' || n.shape === 'comment' || n.shape === 'bridge') continue;
    const w = pillWidth(n.stepLabel ?? n.step, n.icon);
    n.pill = n.shape === 'diamond'
      ? { x: n.x + n.w / 4 - w / 2, y: n.y + n.h / 4 - FLOW_PILL_H / 2, w, h: FLOW_PILL_H }
      : { x: n.x - 8, y: n.y - FLOW_PILL_H + 6, w, h: FLOW_PILL_H };
    n.pillFloat = true;
  }
}

/**
 * Geometría del puente `-(O=`: palo desde el controller, radio del socket `(` y de la bola `O`,
 * separación mínima entre puertos, paso angular entre puertos (simétricos a los 90°) y distancia de
 * la flecha de salida al O.
 */
export const PUENTE = { palo: 10, socket: 17, bola: 12, icono: 14, sep: 10, delta: 20, flechaSalida: 34 } as const;

/**
 * Operación CRUD de un puente llevada a SQL con los colores de los métodos HTTP (convención de
 * Swagger): SELECT ↔ GET azul, INSERT ↔ POST verde, UPDATE ↔ PUT naranja, DELETE rojo. La bola va
 * del color de su operación y lleva su ícono (sin letras).
 */
export const CRUD_SQL = {
  R: { sql: 'SELECT', http: 'GET', color: '#61AFFE', icono: 'mdi:database-search-outline' },
  C: { sql: 'INSERT', http: 'POST', color: '#49CC90', icono: 'mdi:database-plus-outline' },
  U: { sql: 'UPDATE', http: 'PUT', color: '#FCA130', icono: 'mdi:database-edit-outline' },
  D: { sql: 'DELETE', http: 'DELETE', color: '#F93E3E', icono: 'mdi:database-remove-outline' },
} as const;

/** Ejes de un puente según su lado: `d` sale del controller hacia la bola, `t` cruza el palo. */
export const ejesPuente = (lado: LadoPuente = 'bottom'): { d: FlowPoint; t: FlowPoint } => ({
  bottom: { d: { x: 0, y: 1 }, t: { x: 1, y: 0 } },
  top: { d: { x: 0, y: -1 }, t: { x: 1, y: 0 } },
  right: { d: { x: 1, y: 0 }, t: { x: 0, y: 1 } },
  left: { d: { x: -1, y: 0 }, t: { x: 0, y: 1 } },
}[lado]);

/**
 * Centro de la bola de un puente colocado. Abajo y arriba, el ícono y la acción van al lado de la
 * bola; a los costados, en un renglón debajo de ella (la mitad libre queda para los rieles).
 */
export const centroPuente = (n: CajaPuente): FlowPoint => {
  const { palo: p, socket: S } = PUENTE;
  switch (n.lado ?? 'bottom') {
    case 'top': return { x: n.x + S + 4, y: n.y + n.h - p - S };
    case 'right': return { x: n.x + p + S, y: n.y + S + 4 };
    case 'left': return { x: n.x + n.w - p - S, y: n.y + S + 4 };
    default: return { x: n.x + S + 4, y: n.y + p + S };
  }
};

/** Alto de un puente a un costado del controller: bola y, debajo, el renglón del ícono y la acción. */
const ALTO_PUENTE_LADO = ceilDiagramGrid(PUENTE.socket * 2 + 8 + 16, 8);

/** Cambia el tamaño y la caja de texto de un puente medido para colgarlo del lado dado. */
function orientarPuente(z: FlowSizedNode, lado: LadoPuente): void {
  const { palo: p, socket: S } = PUENTE;
  z.lado = lado;
  if (lado === 'bottom') return;
  const tw = z.textBox?.w ?? 0;
  if (lado === 'top') {
    if (z.textBox) z.textBox = { ...z.textBox, y: z.h - p - S * 2 };
    return;
  }
  z.w = ceilDiagramGrid(Math.max(p + S * 2 + 6, p + tw), 8);
  z.h = ALTO_PUENTE_LADO;
  if (z.textBox) z.textBox = { x: lado === 'right' ? p : z.w - tw, y: S * 2 + 8, w: tw, h: 16 };
}

/**
 * Puertos de un puente en la mitad libre (abajo; el socket cubre la de arriba): simétricos a los 90°
 * cada `delta` grados; las salidas a la derecha (hacia la BD) y las entradas a la izquierda. Si los
 * puertos quedaran a menos de `sep` px, la bola crece. Cada puerto: x, el punto sobre la bola y su
 * proyección al borde de la caja (donde el riel llega o sale en vertical).
 */
export function puertosPuente(n: CajaPuente, entradas: number, salidas: number): { r: number; puertos: PuertoPuente[] } {
  const total = entradas + salidas;
  const c = centroPuente(n);
  const lado = n.lado ?? 'bottom';
  const { d, t } = ejesPuente(lado);
  const r = PUENTE.bola;
  // Separación horizontal entre puertos: `sep`, o menos si no caben en la bola (siempre dentro).
  const sep = total > 1 ? Math.min(PUENTE.sep, (2 * (r - 2)) / (total - 1)) : 0;
  const puertos = Array.from({ length: total }, (_, k) => {
    const dx = (k - (total - 1) / 2) * sep;
    const fuera = Math.sqrt(r * r - dx * dx);
    const x = c.x + t.x * dx + d.x * fuera;
    const y = c.y + t.y * dx + d.y * fuera;
    return {
      // De derecha a izquierda: primero las salidas (hacia la BD), luego las entradas.
      tipo: (k >= total - salidas ? 'salida' : 'entrada') as 'entrada' | 'salida',
      lado, x, y,
      // Proyección al borde de la caja: ahí el riel llega o sale perpendicular al palo.
      bx: d.x ? (d.x > 0 ? n.x + n.w : n.x) : x,
      by: d.y ? (d.y > 0 ? n.y + n.h : n.y) : y,
    };
  });
  // Orden devuelto: salidas (derecha → izquierda) y luego entradas.
  return { r, puertos: [...puertos.filter((p) => p.tipo === 'salida').reverse(), ...puertos.filter((p) => p.tipo === 'entrada').reverse()] };
}

/** Columnas de la tabla de declaración: nombre y valor siempre; alias y desc si alguna variable los trae. */
export function columnasVars(vars: readonly FlowVar[]): Array<'name' | 'alias' | 'value' | 'desc'> {
  return ['name', ...(vars.some((v) => v.alias) ? ['alias' as const] : []), 'value', ...(vars.some((v) => v.desc) ? ['desc' as const] : [])];
}

/** Medidas de la tabla de un nodo de declaración de variables. */
export const VARS = { pad: 10, fila: 18, celda: 6, esquina: 14, charMono: 6.1, lineaCodigo: 14, maxValor: 30 } as const;

/**
 * Valor de una variable en líneas: si es largo, se parte antes de cada `.` de la cadena (fuera de
 * paréntesis), con sangría: `TSysValueController` / `  .getOpenaiCfg()`.
 */
export function partirCadena(valor: string): string[] {
  if (valor.length <= VARS.maxValor) return [valor];
  const partes: string[] = [];
  let prof = 0;
  let actual = '';
  for (const ch of valor) {
    if (ch === '(' || ch === '[') prof++;
    if (ch === ')' || ch === ']') prof--;
    if (ch === '.' && prof === 0 && actual) { partes.push(actual); actual = ''; }
    actual += ch;
  }
  if (actual) partes.push(actual);
  return partes.map((p, i) => (i === 0 ? p : `  ${p}`));
}

/** Campos extra del nodo colocado: kind/embed y cajas absolutas de texto/incrustado. */
function placedExtras(s: FlowNodeSpec | undefined, z: FlowSizedNode | undefined, x: number, y: number): Partial<FlowLayoutNode> {
  const out: Partial<FlowLayoutNode> = {};
  if (s?.kind) out.kind = s.kind;
  if (s?.step != null) out.step = s.step;
  if (z?.pill) out.pill = { x: x + z.pill.x, y: y + z.pill.y, w: z.pill.w, h: z.pill.h };
  if (z?.textAlign) out.textAlign = z.textAlign;
  if (s?.embed) out.embed = s.embed;
  if (z?.lines) out.lines = z.lines;
  if (z?.textBox) out.textBox = { x: x + z.textBox.x, y: y + z.textBox.y, w: z.textBox.w, h: z.textBox.h };
  if (z?.embedBox) out.embedBox = { x: x + z.embedBox.x, y: y + z.embedBox.y, w: z.embedBox.w, h: z.embedBox.h };
  if (s?.bridge) out.bridge = s.bridge;
  if (z?.lado) out.lado = z.lado;
  if (s?.vars?.length && z?.varsCols && z.varsBox) {
    out.vars = s.vars;
    out.varsCols = z.varsCols;
    out.varsValor = z.varsValor;
    out.varsFilas = z.varsFilas;
    out.varsBox = { x: x + z.varsBox.x, y: y + z.varsBox.y, w: z.varsBox.w, h: z.varsBox.h };
  }
  return out;
}

/**
 * Colocación insoft (TB): capas y orden del motor node-link, pero en x cada
 * nodo sigue a su padre: el hijo PRINCIPAL (el del camino más largo) queda en
 * la misma columna y las ramas salen a los costados (derecha, luego
 * izquierda). Resultado: la columna principal recta, sin zigzag, y cada
 * decisión con su rama al lado.
 */
export function placeInsoft(sized: readonly FlowSizedNode[], edges: readonly FlowEdgeSpec[], layerGap: number, nodeGap: number): FlowPlacement {
  const layers = assignLayers(sized, edges);
  const order = orderLayers(layers, sized, edges);
  const byId = new Map<string, FlowSizedNode>(sized.map((n) => [n.id, n]));
  const layerOf = (id: string): number => layers.get(id) ?? 0;

  const kids = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const e of edges) {
    if (layerOf(e.to) <= layerOf(e.from)) continue; // hacia atrás: no decide la columna
    if (!kids.has(e.from)) kids.set(e.from, []);
    if (!kids.get(e.from)!.includes(e.to)) kids.get(e.from)!.push(e.to);
    if (!parents.has(e.to)) parents.set(e.to, []);
    if (!parents.get(e.to)!.includes(e.from)) parents.get(e.to)!.push(e.from);
  }

  // Camino más largo hasta un sumidero (las aristas hacia adelante no ciclan).
  const depth = new Map<string, number>();
  const depthOf = (id: string): number => {
    const memo = depth.get(id);
    if (memo != null) return memo;
    const d = 1 + Math.max(0, ...(kids.get(id) ?? []).map(depthOf));
    depth.set(id, d);
    return d;
  };
  // Alcanzables hacia adelante (para reconocer el punto de unión de un if).
  const reach = new Map<string, Set<string>>();
  const reachOf = (id: string): Set<string> => {
    const memo = reach.get(id);
    if (memo) return memo;
    const out = new Set<string>();
    for (const k of kids.get(id) ?? []) { out.add(k); for (const r of reachOf(k)) out.add(r); }
    reach.set(id, out);
    return out;
  };
  // Hijo principal: el punto de unión si las demás ramas son un desvío corto
  // que vuelve a él (if sin else: el desvío sale al costado y la columna
  // sigue recta); si no, el del camino más largo.
  const DESVIO_CORTO = 2;
  const primaryChild = new Map<string, string>();
  for (const [p, ks] of kids) {
    const union = ks.find((k) => ks.every((o) => o === k || (reachOf(o).has(k) && depthOf(o) - depthOf(k) <= DESVIO_CORTO)));
    let best = ks[0]!;
    for (const k of ks) if (depthOf(k) > depthOf(best)) best = k;
    primaryChild.set(p, union ?? best);
  }

  const byLayer = new Map<number, string[]>();
  for (const n of sized) {
    const l = layerOf(n.id);
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(n.id);
  }
  const maxLayer = byLayer.size ? Math.max(...byLayer.keys()) : 0;
  const layerH = new Map<number, number>();
  for (const [l, ids] of byLayer) layerH.set(l, Math.max(0, ...ids.map((id) => byId.get(id)!.h)));
  const layerY = new Map<number, number>();
  let cursor = 0;
  for (let l = 0; l <= maxLayer; l++) {
    layerY.set(l, cursor);
    cursor += (layerH.get(l) ?? 0) + layerGap;
  }

  const cx = new Map<string, number>();
  /** Nodos seguidos en la misma columna hasta este (cuánto "espina" es). */
  const colRun = new Map<string, number>();
  const mainParent = new Map<string, string>();
  const w = (id: string): number => byId.get(id)!.w;
  for (let l = 0; l <= maxLayer; l++) {
    const ids = [...(byLayer.get(l) ?? [])].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    const desired = new Map<string, number>();
    let anchor: string | null = null;
    for (const id of ids) {
      const ps = (parents.get(id) ?? []).filter((p) => cx.has(p));
      // Entre varios padres que lo tienen de principal manda el que viene de
      // la columna más larga (la principal), no una rama que vuelve.
      const main = ps.filter((p) => primaryChild.get(p) === id)
        .sort((a, b) => (colRun.get(b) ?? 1) - (colRun.get(a) ?? 1) || layerOf(a) - layerOf(b))[0];
      if (main) {
        desired.set(id, cx.get(main)!);
        mainParent.set(id, main);
        if (!anchor || depthOf(id) > depthOf(anchor)) anchor = id;
        continue;
      }
      if (!ps.length) continue;
      // Rama: a la derecha del padre; la segunda rama, a la izquierda; y así.
      // Si la capa del padre ya tiene algo a su derecha (otra rama), la
      // primera rama sale por la izquierda: así no rodea esa caja.
      // Tampoco se pone encima de un corredor: la bajada de una arista larga
      // que cruza esta capa (de un nodo ya puesto a uno más abajo).
      const corredores: number[] = [];
      for (const [u, ks] of kids) {
        if (!cx.has(u) || layerOf(u) >= l) continue;
        if (ks.some((v) => layerOf(v) > l && !cx.has(v) && v !== id)) corredores.push(cx.get(u)!);
      }
      const pisa = (c: number): boolean => corredores.some((x) => x > c - w(id) / 2 - 12 && x < c + w(id) / 2 + 12);
      const cands = ps.map((p) => {
        const branches = (kids.get(p) ?? []).filter((k) => k !== primaryChild.get(p));
        const k = Math.max(0, branches.indexOf(id));
        const vecinos = (byLayer.get(layerOf(p)) ?? []).filter((q) => q !== p && cx.has(q));
        const derechaOcupada = vecinos.some((q) => cx.get(q)! > cx.get(p)!);
        const izquierdaOcupada = vecinos.some((q) => cx.get(q)! < cx.get(p)!);
        let first = derechaOcupada && !izquierdaOcupada ? -1 : 1;
        const ring = Math.floor(k / 2);
        const at = (dir: number): number => cx.get(p)! + dir * (w(p) / 2 + nodeGap + w(id) / 2 + ring * (w(id) + nodeGap));
        if (pisa(at(first)) && !pisa(at(-first))) first = -first;
        return at(k % 2 === 0 ? first : -first);
      });
      const right = cands.filter((c, i) => c >= cx.get(ps[i]!)!);
      desired.set(id, right.length === cands.length ? Math.max(...cands) : right.length ? Math.max(...right) : Math.min(...cands));
    }
    // Sin padre colocado (raíces): en fila, a continuación de lo ya puesto.
    const placedIds = ids.filter((id) => desired.has(id)).sort((a, b) => desired.get(a)! - desired.get(b)!);
    const loose = ids.filter((id) => !desired.has(id));
    if (!placedIds.length) {
      const total = loose.reduce((acc, id) => acc + w(id), 0) + nodeGap * Math.max(0, loose.length - 1);
      let x = -total / 2;
      for (const id of loose) { cx.set(id, snapDiagramGrid(x + w(id) / 2)); x += w(id) + nodeGap; }
      continue;
    }
    // Sin solapes: el ancla (columna principal) no se mueve; el resto se aparta.
    const ai = Math.max(0, placedIds.indexOf(anchor ?? placedIds[0]!));
    const pos = new Map<string, number>([[placedIds[ai]!, desired.get(placedIds[ai]!)!]]);
    for (let i = ai + 1; i < placedIds.length; i++) {
      const prev = placedIds[i - 1]!;
      const id = placedIds[i]!;
      pos.set(id, Math.max(desired.get(id)!, pos.get(prev)! + w(prev) / 2 + nodeGap + w(id) / 2));
    }
    for (let i = ai - 1; i >= 0; i--) {
      const next = placedIds[i + 1]!;
      const id = placedIds[i]!;
      pos.set(id, Math.min(desired.get(id)!, pos.get(next)! - w(next) / 2 - nodeGap - w(id) / 2));
    }
    let right = Math.max(...placedIds.map((id) => pos.get(id)! + w(id) / 2));
    for (const id of loose) { pos.set(id, right + nodeGap + w(id) / 2); right += nodeGap + w(id); }
    for (const [id, c] of pos) {
      cx.set(id, snapDiagramGrid(c));
      const mp = mainParent.get(id);
      colRun.set(id, mp && cx.get(mp) === cx.get(id) ? (colRun.get(mp) ?? 1) + 1 : 1);
    }
  }

  const minX = Math.min(...sized.map((n) => cx.get(n.id)! - n.w / 2));
  const shift = -Math.floor(minX / 8) * 8;
  const nodes: FlowPlacedNode[] = sized.map((n) => {
    const l = layerOf(n.id);
    return {
      id: n.id,
      x: cx.get(n.id)! + shift - n.w / 2,
      y: (layerY.get(l) ?? 0) + snapDiagramGrid(((layerH.get(l) ?? n.h) - n.h) / 2),
      w: n.w,
      h: n.h,
      layer: l,
    };
  });
  return {
    nodes,
    width: Math.max(0, ...nodes.map((n) => n.x + n.w)),
    height: Math.max(0, ...nodes.map((n) => n.y + n.h)),
    primaryChild,
  };
}

/** Medidas de los carriles de contexto. */
const LANES = {
  /** Banda del rótulo (arriba en verticales; a la izquierda en horizontales, ancho mínimo). */
  header: 40,
  headerMinW: 96,
  /** Aire entre la banda del carril y sus nodos. */
  pad: 24,
  minSpan: 152,
  labelFont: 13,
} as const;

/**
 * Carril de cada nodo: el suyo si existe en `lanes`; si no, el de su primer antecesor ya resuelto
 * (en orden de capas); si nada, el primer carril.
 */
function lanesOfNodes(spec: FlowResolvedSpec, layerOf: (id: string) => number): Map<string, string> {
  const ids = new Set((spec.lanes ?? []).map((l) => l.id));
  const first = spec.lanes?.[0]?.id ?? '';
  const out = new Map<string, string>();
  for (const n of spec.nodes) if (n.lane && ids.has(n.lane)) out.set(n.id, n.lane);
  const pending = spec.nodes.filter((n) => !out.has(n.id)).sort((a, b) => layerOf(a.id) - layerOf(b.id));
  for (const n of pending) {
    const padre = spec.edges.find((e) => e.to === n.id && out.has(e.from));
    out.set(n.id, padre ? out.get(padre.from)! : first);
  }
  return out;
}

/**
 * Colocación por carriles de contexto (swimlanes). Las capas (el orden del recorrido) salen del
 * motor node-link como siempre; cada carril es una columna (verticales: el flujo baja) o una fila
 * (horizontales: el flujo avanza a la derecha) del ancho/alto que piden sus nodos. Dentro de un
 * carril, los nodos de una misma capa van lado a lado, centrados. Las aristas entre carriles las
 * rutea el router insoft (recta / Z / L) como en cualquier flujo.
 */
export function placeLanes(
  sized: readonly FlowSizedNode[],
  spec: FlowResolvedSpec,
  layerGap: number,
  nodeGap: number,
  measure: (t: string) => number,
  /** Comentarios por nodo señalado: su globo va a la derecha del nodo, dentro de su celda. */
  comentados: ReadonlyMap<string, FlowSizedNode> = new Map(),
): FlowPlacement {
  const edges = spec.edges;
  const lanes = spec.lanes ?? [];
  const horizontal = spec.laneDirection === 'horizontal';
  // Las aristas punteadas («uses», SELECT, INSERT…) relacionan, no ordenan: fuera de las capas.
  // Un nodo al que solo llegan punteadas (tabla, POJO) va a la altura de su primer usuario.
  const flujo = edges.filter((e) => e.kind !== 'dashed');
  const layers = assignLayers(sized, flujo);
  // Puentes `-(O=`: en la fila siguiente a su controller (debajo de él).
  const puenteDe = new Map(spec.nodes.filter((n) => n.bridge).map((n) => [n.id, n.bridge!.of]));
  // En un carril apilado, el puente comparte la capa de su controller (va en su grupo, debajo de él).
  const apilados = new Set((spec.lanes ?? []).filter((l) => l.stack).map((l) => l.id));
  const carrilDe = new Map(spec.nodes.map((n) => [n.id, n.lane]));
  for (const [id, of] of puenteDe) if (layers.has(of)) layers.set(id, (layers.get(of) ?? 0) + (apilados.has(carrilDe.get(of) ?? '') ? 0 : 1));
  const soloUsos = new Set(sized.map((n) => n.id).filter((id) => !puenteDe.has(id) && !flujo.some((e) => e.to === id || e.from === id) && edges.some((e) => e.to === id)));
  // En cadena: un nodo de solo usos cuyo usuario también lo es (p. ej. el POJO o la tabla de un
  // controller que solo se usa) toma la altura de ese usuario cuando ya está resuelta.
  const resueltos = new Set<string>();
  for (let vuelta = 0; vuelta <= soloUsos.size; vuelta++) {
    let avanzo = false;
    for (const id of soloUsos) {
      if (resueltos.has(id)) continue;
      const desde = edges.filter((e) => e.to === id && e.from !== id);
      if (desde.some((e) => soloUsos.has(e.from) && !resueltos.has(e.from))) continue;
      const usuarios = desde.map((e) => layers.get(e.from) ?? 0);
      if (usuarios.length) layers.set(id, Math.min(...usuarios));
      resueltos.add(id);
      avanzo = true;
    }
    if (!avanzo) break;
  }
  // Ciclos entre nodos de solo usos: lo que quede, con sus usuarios del flujo (como antes).
  for (const id of soloUsos) {
    if (resueltos.has(id)) continue;
    const usuarios = edges.filter((e) => e.to === id && !soloUsos.has(e.from)).map((e) => layers.get(e.from) ?? 0);
    if (usuarios.length) layers.set(id, Math.min(...usuarios));
  }
  const order = orderLayers(layers, sized, flujo);
  const layerOf = (id: string): number => layers.get(id) ?? 0;
  const laneOf = lanesOfNodes(spec, layerOf);
  const byId = new Map<string, FlowSizedNode>(sized.map((n) => [n.id, n]));
  const ctx = contextosDe(spec, laneOf);
  /** Aire que pide el recuadro de grupo alrededor de un nodo: en x y en y (con el título arriba). */
  const extraX = (id: string): number => (ctx.has(id) ? CTX.pad * 2 : 0);
  const extraY = (id: string): number => (ctx.has(id) ? CTX.pad * 2 + CTX.title : 0);
  const maxLayer = Math.max(0, ...sized.map((n) => layerOf(n.id)));
  const etiqueta = (l: FlowLaneSpec): number => Math.ceil(measure(l.label) * (LANES.labelFont / INSOFT.fontSize));

  // Nodos por (carril, capa), en el orden del motor.
  const celda = new Map<string, string[]>();
  const key = (lane: string, l: number): string => `${lane}|${l}`;
  for (const n of [...sized].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))) {
    const k = key(laneOf.get(n.id)!, layerOf(n.id));
    if (!celda.has(k)) celda.set(k, []);
    celda.get(k)!.push(n.id);
  }
  // Dentro de una celda, los de un mismo grupo van juntos (en el orden en que aparecen los grupos):
  // así cada grupo es una sub-columna y su recuadro no abraza a los del otro.
  const ordenGrupo = new Map<string, number>();
  for (const n of spec.nodes) { const g = ctx.get(n.id); if (g && !ordenGrupo.has(g)) ordenGrupo.set(g, ordenGrupo.size); }
  if (ordenGrupo.size > 1) {
    for (const ids of celda.values()) ids.sort((a, b) => (ordenGrupo.get(ctx.get(a) ?? '') ?? -1) - (ordenGrupo.get(ctx.get(b) ?? '') ?? -1));
  }
  /** Lo que ocupa una celda a lo ancho del carril (cruzado al flujo) y a lo largo del flujo. */
  const globo = (id: string): FlowSizedNode | undefined => comentados.get(id);
  const cruz = (id: string): number => {
    const n = byId.get(id)!;
    const g = globo(id);
    // El globo se reserva a ambos lados: el nodo sigue centrado en su columna y el globo cabe a su derecha.
    return horizontal ? Math.max(n.h, g?.h ?? 0) + extraY(id) : n.w + extraX(id) + (g ? (g.w + COMENTARIO.aire) * 2 : 0);
  };
  const largo = (id: string): number => {
    const n = byId.get(id)!;
    const g = globo(id);
    return horizontal ? n.w + extraX(id) + (g ? g.w + COMENTARIO.aire : 0) : Math.max(n.h, g?.h ?? 0) + extraY(id);
  };
  const anchoFila = (ids: readonly string[]): number => ids.reduce((a, id) => a + cruz(id), 0) + nodeGap * Math.max(0, ids.length - 1);
  // Puentes de un controller apilado: siempre enchufados a él, nunca en el aire. Primero abajo
  // mientras la fila quepa en su ancho; luego a la derecha y a la izquierda (tantos como quepan en su
  // alto), luego arriba; si aun sobran, van abajo y el controller se ensancha.
  const puentesDe = new Map<string, string[]>();
  for (const [id, of] of puenteDe) {
    if (horizontal || !byId.has(id) || !byId.has(of) || !apilados.has(laneOf.get(of) ?? '')) continue;
    if (!puentesDe.has(of)) puentesDe.set(of, []);
    puentesDe.get(of)!.push(id);
  }
  const ladosDe = new Map<string, Record<LadoPuente, string[]>>();
  for (const [of, ids] of puentesDe) {
    const ctl = byId.get(of)!;
    const l: Record<LadoPuente, string[]> = { bottom: [], right: [], left: [], top: [] };
    const cabeFila = (fila: string[], id: string) => !fila.length || anchoFila([...fila, id]) <= ctl.w;
    const cabeLado = (lado: string[]) => !lado.length || lado.length * ALTO_PUENTE_LADO <= ctl.h - 16;
    for (const id of ids) {
      const lado: LadoPuente = cabeFila(l.bottom, id) ? 'bottom' : cabeLado(l.right) ? 'right' : cabeLado(l.left) ? 'left' : cabeFila(l.top, id) ? 'top' : 'bottom';
      l[lado].push(id);
      orientarPuente(byId.get(id)!, lado);
    }
    if (anchoFila(l.bottom) > ctl.w) ctl.w = ceilDiagramGrid(anchoFila(l.bottom), 16);
    ladosDe.set(of, l);
  }
  /** Lugar de cada puente relativo a su controller y lo que el conjunto sobresale por cada lado. */
  const disposicion = (of: string) => {
    const ctl = byId.get(of)!;
    const l = ladosDe.get(of)!;
    const rel = new Map<string, FlowPoint>();
    const fila = (ids: string[], arriba: boolean) => {
      let x = Math.max(0, (ctl.w - anchoFila(ids)) / 2);
      for (const id of ids) {
        const z = byId.get(id)!;
        rel.set(id, { x: snapDiagramGrid(x), y: arriba ? -z.h : ctl.h });
        x += z.w + nodeGap;
      }
    };
    const columna = (ids: string[], derecha: boolean) => {
      ids.forEach((id, k) => {
        const z = byId.get(id)!;
        const cy = ctl.h / 2 + (k - (ids.length - 1) / 2) * ALTO_PUENTE_LADO;
        rel.set(id, { x: derecha ? ctl.w : -z.w, y: Math.round(cy - PUENTE.socket - 4) });
      });
    };
    fila(l.bottom, false);
    fila(l.top, true);
    columna(l.right, true);
    columna(l.left, false);
    const zs = [...rel].map(([id, p]) => ({ ...p, w: byId.get(id)!.w, h: byId.get(id)!.h }));
    return {
      rel,
      izq: Math.max(0, ...zs.map((z) => -z.x)),
      der: Math.max(0, ...zs.map((z) => z.x + z.w - ctl.w)),
      arriba: Math.max(0, ...zs.map((z) => -z.y)),
      abajo: Math.max(0, ...zs.map((z) => z.y + z.h - ctl.h)),
    };
  };
  const dispDe = new Map([...ladosDe.keys()].map((of) => [of, disposicion(of)]));
  // Carriles apilados (solo con el flujo hacia abajo): cada entidad en su propio renglón y sus puentes
  // en fila debajo de ella; la celda mide lo ancho del grupo más ancho y lo alto de todos.
  const apilar = (lane: string): boolean => !horizontal && apilados.has(lane);
  const gruposDe = (ids: readonly string[]): Array<{ main: string; puentes: string[] }> => {
    const out: Array<{ main: string; puentes: string[] }> = [];
    for (const id of ids) if (!puenteDe.has(id)) out.push({ main: id, puentes: [] });
    for (const id of ids) {
      if (!puenteDe.has(id)) continue;
      const g = out.find((x) => x.main === puenteDe.get(id));
      if (g) g.puentes.push(id); else out.push({ main: id, puentes: [] });
    }
    return out;
  };
  const anchoGrupo = (g: { main: string; puentes: string[] }): number => {
    const dp = dispDe.get(g.main);
    return dp ? cruz(g.main) + dp.izq + dp.der : Math.max(cruz(g.main), anchoFila(g.puentes));
  };
  const largoGrupo = (g: { main: string; puentes: string[] }): number => {
    const dp = dispDe.get(g.main);
    return dp ? dp.arriba + largo(g.main) + dp.abajo : largo(g.main) + (g.puentes.length ? Math.max(...g.puentes.map(largo)) : 0);
  };
  const ancho = (ids: readonly string[], lane = ''): number => (apilar(lane) ? Math.max(0, ...gruposDe(ids).map(anchoGrupo)) : anchoFila(ids));
  const largoCelda = (ids: readonly string[], lane: string): number => {
    const gs = gruposDe(ids);
    return gs.reduce((a, g) => a + largoGrupo(g), 0) + nodeGap * Math.max(0, gs.length - 1);
  };

  // Ancho de cada carril (cruzado al flujo).
  const span = new Map<string, number>();
  for (const lane of lanes) {
    let m = 0;
    for (let l = 0; l <= maxLayer; l++) m = Math.max(m, ancho(celda.get(key(lane.id, l)) ?? [], lane.id));
    const rotulo = horizontal ? 0 : etiqueta(lane) + LANES.pad;
    span.set(lane.id, ceilDiagramGrid(Math.max(LANES.minSpan, m + LANES.pad * 2, rotulo), 16));
  }
  // Largo de cada capa (a lo largo del flujo) y su arranque, después de la banda del rótulo.
  const head = horizontal ? ceilDiagramGrid(Math.max(LANES.headerMinW, ...lanes.map(etiqueta)) + LANES.pad, 16) : LANES.header;
  const capaLargo = new Map<number, number>();
  // Las columnas apiladas no empujan a las demás: no cuentan en el largo de las capas (cada una lleva
  // su propio cursor, ver más abajo); solo el flujo define las capas.
  for (const n of sized) {
    if (apilar(laneOf.get(n.id) ?? '')) continue;
    capaLargo.set(layerOf(n.id), Math.max(capaLargo.get(layerOf(n.id)) ?? 0, largo(n.id)));
  }
  const capaIni = new Map<number, number>();
  let cursor = head + LANES.pad;
  for (let l = 0; l <= maxLayer; l++) {
    capaIni.set(l, cursor);
    cursor += (capaLargo.get(l) ?? 0) + layerGap;
  }
  // Columnas apiladas: cada celda arranca en su capa o, si la anterior de ESA columna aún no termina,
  // debajo de ella (el empuje solo viene de la misma columna).
  const inicioApilado = new Map<string, number>();
  let fondoApilado = 0;
  for (const lane of lanes) {
    if (!apilar(lane.id)) continue;
    let cursorCarril = 0;
    for (let l = 0; l <= maxLayer; l++) {
      const ids = celda.get(key(lane.id, l)) ?? [];
      if (!ids.length) continue;
      const y = Math.max(capaIni.get(l)!, cursorCarril);
      inicioApilado.set(key(lane.id, l), y);
      cursorCarril = y + largoCelda(ids, lane.id) + nodeGap;
      fondoApilado = Math.max(fondoApilado, cursorCarril - nodeGap);
    }
  }
  const total = snapDiagramGrid(Math.max(cursor - layerGap, fondoApilado) + LANES.pad);

  // Carriles uno tras otro; nodos centrados en su carril y en su capa.
  const out: FlowPlacedNode[] = [];
  const bandas: FlowLayoutLane[] = [];
  let pos = 0;
  for (const lane of lanes) {
    const sp = span.get(lane.id)!;
    bandas.push(horizontal
      ? { id: lane.id, label: lane.label, x: 0, y: pos, w: total, h: sp }
      : { id: lane.id, label: lane.label, x: pos, y: 0, w: sp, h: total });
    for (let l = 0; l <= maxLayer; l++) {
      const ids = celda.get(key(lane.id, l)) ?? [];
      if (apilar(lane.id) && ids.length) {
        // Apilado: un grupo debajo del otro, centrados en el carril; los puentes en fila bajo su entidad.
        let y = inicioApilado.get(key(lane.id, l)) ?? capaIni.get(l)!;
        for (const g of gruposDe(ids)) {
          const dp = dispDe.get(g.main);
          if (dp) {
            // Controller con sus puentes alrededor: el conjunto centrado en el carril (los puentes se
            // ubican abajo, pegados a él).
            const n = byId.get(g.main)!;
            const across = snapDiagramGrid(pos + sp / 2 - anchoGrupo(g) / 2 + dp.izq);
            const dx = ctx.has(g.main) ? CTX.pad : 0;
            const dy = ctx.has(g.main) ? CTX.pad + CTX.title : 0;
            out.push({ id: g.main, x: across + dx, y: snapDiagramGrid(y + dp.arriba) + dy, w: n.w, h: n.h, layer: l });
            for (const id of g.puentes) { const z = byId.get(id)!; out.push({ id, x: 0, y: 0, w: z.w, h: z.h, layer: l }); }
            y += largoGrupo(g) + nodeGap;
            continue;
          }
          const fila = [g.main];
          let filaY = y;
          for (const [k, idsFila] of [fila, g.puentes].entries()) {
            if (!idsFila.length) continue;
            let c = pos + sp / 2 - anchoFila(idsFila) / 2;
            for (const id of idsFila) {
              const n = byId.get(id)!;
              const across = snapDiagramGrid(c + cruz(id) / 2) - cruz(id) / 2;
              const dx = ctx.has(id) ? CTX.pad : 0;
              const dy = ctx.has(id) ? CTX.pad + CTX.title : 0;
              out.push({ id, x: across + dx, y: snapDiagramGrid(filaY) + dy, w: n.w, h: n.h, layer: l });
              c += cruz(id) + nodeGap;
            }
            if (k === 0) filaY += largo(g.main);
          }
          y += largoGrupo(g) + nodeGap;
        }
        continue;
      }
      let c = pos + sp / 2 - ancho(ids) / 2;
      for (const id of ids) {
        const n = byId.get(id)!;
        const along = capaIni.get(l)! + snapDiagramGrid(((capaLargo.get(l) ?? largo(id)) - largo(id)) / 2);
        const across = snapDiagramGrid(c + cruz(id) / 2) - cruz(id) / 2;
        // Dentro de su recuadro de grupo, el nodo se corre por el aire y el título.
        const dx = (ctx.has(id) ? CTX.pad : 0) + (!horizontal && globo(id) ? globo(id)!.w + COMENTARIO.aire : 0);
        const dy = ctx.has(id) ? CTX.pad + CTX.title : 0;
        out.push(horizontal
          ? { id, x: along + dx, y: across + dy, w: n.w, h: n.h, layer: l }
          : { id, x: across + dx, y: along + dy, w: n.w, h: n.h, layer: l });
        c += cruz(id) + nodeGap;
      }
    }
    pos += sp;
  }
  // Carriles centrados: sus nodos van a la mitad del largo del diagrama (sin salirse de la banda).
  for (const lane of lanes.filter((l) => l.align === 'center')) {
    const ms = out.filter((n) => laneOf.get(n.id) === lane.id);
    if (!ms.length) continue;
    const a = (n: FlowPlacedNode) => (horizontal ? n.x : n.y);
    const l = (n: FlowPlacedNode) => (horizontal ? n.w : n.h);
    const ini = Math.min(...ms.map(a));
    const fin = Math.max(...ms.map((n) => a(n) + l(n)));
    const d = snapDiagramGrid(Math.max(head + LANES.pad - ini, Math.min(total - LANES.pad - fin, total / 2 - (ini + fin) / 2)));
    for (const n of ms) { if (horizontal) n.x += d; else n.y += d; }
  }

  // Puentes pegados a su controller (el palo los une): en su lado asignado o, si no, justo debajo.
  for (const n of out) {
    const of = puenteDe.get(n.id);
    const ctl = of ? out.find((x) => x.id === of) : undefined;
    if (!ctl) continue;
    const r = dispDe.get(of!)?.rel.get(n.id);
    if (r) { n.x = ctl.x + r.x; n.y = ctl.y + r.y; } else if (horizontal) n.x = ctl.x + ctl.w; else n.y = ctl.y + ctl.h;
  }

  // Hijo principal: el que sigue en el mismo carril; si ninguno, el del camino más largo (una
  // decisión saca la rama principal por abajo y las demás por los costados).
  const kids = new Map<string, string[]>();
  for (const e of edges) {
    if (layerOf(e.to) <= layerOf(e.from)) continue;
    if (!kids.has(e.from)) kids.set(e.from, []);
    kids.get(e.from)!.push(e.to);
  }
  const depth = new Map<string, number>();
  const depthOf = (id: string): number => {
    const m = depth.get(id);
    if (m != null) return m;
    const d = 1 + Math.max(0, ...(kids.get(id) ?? []).map(depthOf));
    depth.set(id, d);
    return d;
  };
  const primaryChild = new Map<string, string>();
  for (const [from, ks] of kids) {
    const mismo = ks.filter((k) => laneOf.get(k) === laneOf.get(from));
    const pool = mismo.length ? mismo : ks;
    primaryChild.set(from, pool.reduce((a, b) => (depthOf(b) > depthOf(a) ? b : a)));
  }
  // Recuadros de grupo: por (carril, título), la caja que envuelve a sus nodos con aire y título.
  const contexts: FlowLayoutContext[] = [];
  const grupos = new Map<string, FlowPlacedNode[]>();
  for (const n of out) {
    const label = ctx.get(n.id);
    if (!label) continue;
    const k = `${laneOf.get(n.id)}|${label}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(n);
  }
  for (const [k, todos] of grupos) {
    const corte = k.indexOf('|');
    // Un grupo puede ser varias cajas: ninguna abraza un nodo que no es del grupo.
    for (const ms of partirGrupo(todos, out)) {
      const x0 = Math.min(...ms.map((n) => n.x)) - CTX.pad;
      const y0 = Math.min(...ms.map((n) => n.y)) - CTX.pad - CTX.title;
      const x1 = Math.max(...ms.map((n) => n.x + n.w)) + CTX.pad;
      const y1 = Math.max(...ms.map((n) => n.y + n.h)) + CTX.pad;
      contexts.push({ lane: k.slice(0, corte), label: k.slice(corte + 1), members: ms.map((n) => n.id), x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  }
  return {
    nodes: out,
    width: horizontal ? total : pos,
    height: horizontal ? pos : total,
    primaryChild,
    lanes: bandas,
    contexts,
  };
}

/**
 * Caja final de cada grupo: la UNIÓN de sus miembros en sus posiciones definitivas (tras abrir espacio
 * y medir los diagramas incrustados), más aire y la franja del título. Ningún hijo queda afuera.
 */
function abrazar(contexts: readonly FlowLayoutContext[], nodes: readonly FlowLayoutNode[], ox: number, oy: number): FlowLayoutContext[] {
  // Con las posiciones definitivas se vuelve a partir: un grupo que quedó abrazando un nodo ajeno
  // se separa en varias cajas (mismo título).
  // La nota (comentario) de un miembro va con él: queda dentro del recuadro, no pisada por su borde.
  const conNotas = (ids: readonly string[] | undefined): string[] => {
    const base = new Set(ids ?? []);
    for (const n of nodes) if (n.shape === 'comment' && n.about && base.has(n.about)) base.add(n.id);
    return [...base];
  };
  const partidos = contexts.map((c) => ({ ...c, members: conNotas(c.members) })).flatMap((c) => {
    const ms = nodes.filter((n) => c.members?.includes(n.id));
    return ms.length ? partirGrupo(ms, nodes).map((p) => ({ ...c, members: p.map((n) => n.id) })) : [c];
  });
  return partidos.map((c) => {
    const ms = nodes.filter((n) => c.members?.includes(n.id));
    if (!ms.length) return { ...c, x: c.x + ox, y: c.y + oy };
    // La insignia de cada miembro también va dentro.
    const cajas = ms.flatMap((n) => [n, ...(n.pill ? [n.pill] : [])]);
    const x0 = Math.min(...cajas.map((b) => b.x)) - CTX.pad;
    const y0 = Math.min(...cajas.map((b) => b.y)) - CTX.pad - CTX.title;
    const x1 = Math.max(...cajas.map((b) => b.x + b.w)) + CTX.pad;
    const y1 = Math.max(...cajas.map((b) => b.y + b.h)) + CTX.pad;
    return { ...c, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  });
}

/**
 * Parte los miembros de un grupo en cajas que no abrazan nodos ajenos: cada miembro empieza en su
 * caja y dos cajas se unen si el rectángulo que las envuelve (con su aire) no toca ningún otro nodo.
 */
function partirGrupo<T extends { id: string; x: number; y: number; w: number; h: number }>(ms: readonly T[], todos: readonly { id: string; x: number; y: number; w: number; h: number }[]): T[][] {
  const ids = new Set(ms.map((n) => n.id));
  const ajenos = todos.filter((n) => !ids.has(n.id));
  const caja = (g: readonly T[]) => ({
    x0: Math.min(...g.map((n) => n.x)) - CTX.pad, y0: Math.min(...g.map((n) => n.y)) - CTX.pad - CTX.title,
    x1: Math.max(...g.map((n) => n.x + n.w)) + CTX.pad, y1: Math.max(...g.map((n) => n.y + n.h)) + CTX.pad,
  });
  const libre = (g: readonly T[]): boolean => {
    const b = caja(g);
    return !ajenos.some((n) => n.x < b.x1 && n.x + n.w > b.x0 && n.y < b.y1 && n.y + n.h > b.y0);
  };
  let grupos: T[][] = ms.map((n) => [n]);
  for (let unio = true; unio && grupos.length > 1;) {
    unio = false;
    for (let i = 0; i < grupos.length && !unio; i++) {
      for (let j = i + 1; j < grupos.length && !unio; j++) {
        const g = [...grupos[i]!, ...grupos[j]!];
        if (libre(g)) { grupos = [...grupos.filter((_, k) => k !== i && k !== j), g]; unio = true; }
      }
    }
  }
  return grupos;
}

/** Aire y franja de título de los recuadros de grupo de contexto. */
const CTX = { pad: 12, title: 26 } as const;

/** Título automático del grupo según la naturaleza del nodo incrustado. */
const CONTEXTO_POR_KIND: Record<string, string> = { class: 'Clases', tableder: 'Tablas', component: 'Componentes' };

/**
 * Grupo de contexto de cada nodo: el que declara (`context`) o, si el carril mezcla el flujo con
 * entidades de otra naturaleza (clases, tablas, componentes), uno automático por naturaleza. Un
 * carril que solo tiene tablas (o solo clases) no necesita recuadro: el carril ya es el contexto.
 */
function contextosDe(spec: FlowResolvedSpec, laneOf: ReadonlyMap<string, string>): Map<string, string> {
  const out = new Map<string, string>();
  // Un puente `-(O=` es parte de su controller, no un paso del flujo.
  const esFlujo = (n: FlowNodeSpec): boolean => !n.kind && n.shape !== 'start' && n.shape !== 'end' && n.shape !== 'bridge';
  const carrilConFlujo = new Set(spec.nodes.filter(esFlujo).map((n) => laneOf.get(n.id)));
  for (const n of spec.nodes) {
    if (n.context) out.set(n.id, n.context);
    else if (n.kind && CONTEXTO_POR_KIND[n.kind] && carrilConFlujo.has(laneOf.get(n.id))) out.set(n.id, CONTEXTO_POR_KIND[n.kind]!);
  }
  return out;
}

/**
 * Lados de anclaje insoft: las ramas de una decisión salen por el vértice
 * lateral hacia su lado y bajan a la cara superior del destino; la rama
 * principal sale por el vértice inferior. Hacia atrás, como el motor clásico.
 */
function insoftSides(
  fromMeta: FlowPlacedNode,
  toMeta: FlowPlacedNode,
  from: FlowLayoutNode,
  to: FlowLayoutNode,
  fromShape: FlowShape | undefined,
  primary: string | undefined,
  direction: FlowDirection,
  /** El origen es un controller con puentes `-(O=` colgando abajo: su flujo sale por el costado. */
  conPuentes = false,
  /** Todas las cajas colocadas: para elegir el costado libre de una rama lateral. */
  nodes: readonly FlowLayoutNode[] = [],
): { fromSide: string; toSide: string } {
  const base = pickSides(fromMeta, toMeta, direction);
  if (conPuentes && direction === 'TB') {
    const dx = (to.x + to.w / 2) - (from.x + from.w / 2);
    return { fromSide: dx < 0 ? 'left' : 'right', toSide: to.shape === 'diamond' || toMeta.layer > fromMeta.layer ? 'top' : base.toSide };
  }
  // A una decisión se entra siempre por arriba: sus vértices laterales e inferior son salidas de rama
  // (entrar por un costado haría que la llegada y una rama compartan vértice).
  const aRombo = to.shape === 'diamond' && direction === 'TB' && fromShape !== 'end';
  if (aRombo && (fromShape !== 'diamond' || toMeta.layer <= fromMeta.layer)) return { fromSide: base.fromSide, toSide: 'top' };
  if (direction !== 'TB' || toMeta.layer <= fromMeta.layer) return base;
  // Rombo: el vértice inferior es para la rama cuyo destino queda alineado debajo; cualquier otra
  // (sea o no la principal) sale por el vértice que mira a su destino. Así dos ramas nunca
  // comparten el primer tramo. (También cuando el destino es otro rombo: se entra por arriba.)
  if (fromShape === 'diamond') {
    const dx = (to.x + to.w / 2) - (from.x + from.w / 2);
    if (Math.abs(dx) > 8) return { fromSide: dx > 0 ? 'right' : 'left', toSide: 'top' };
    // Destino alineado debajo pero la rama NO es la principal (p. ej. el «no» que va directo a la
    // reunión): sale por el vértice lateral cuyo costado está libre hasta el destino, así nunca
    // comparte el vértice inferior con la rama principal.
    // Solo cuando el vértice inferior ya lo ocupa la principal (alineada debajo); si la principal
    // sale por un costado, el inferior queda libre para esta rama.
    const principal = primary ? nodes.find((n) => n.id === primary) : undefined;
    const inferiorOcupado = !!principal && Math.abs((principal.x + principal.w / 2) - (from.x + from.w / 2)) <= 8;
    if (primary && primary !== to.id && inferiorOcupado) {
      const libre = (lado: 'right' | 'left'): boolean => {
        const franja = { x: lado === 'right' ? from.x + from.w : from.x - 3 * U, y: from.y, w: 3 * U, h: Math.max(from.h, to.y - from.y) };
        return !nodes.some((n) => n.id !== from.id && n.id !== to.id && n.shape !== 'comment' && rectsOverlap(n, franja));
      };
      return { fromSide: libre('right') ? 'right' : libre('left') ? 'left' : 'right', toSide: 'top' };
    }
  }
  // Un rectángulo de flujo sale por cualquiera de sus lados (nunca por una esquina): si el destino está
  // en otra columna, sale por el lado que lo mira y baja en L a su cara superior.
  // Solo si el destino está claramente en otra columna (y no es un fin ni una barra: a esos se llega
  // por la columna, donde las ramas se funden).
  const rect = fromShape !== 'diamond' && fromShape !== 'bar' && fromShape !== 'start' && fromShape !== 'end' && fromShape !== 'comment';
  const llegadaComun = to.shape === 'end' || to.shape === 'bar';
  const lejos = Math.abs((to.x + to.w / 2) - (from.x + from.w / 2)) > from.w / 2 + to.w / 2 + 3 * 15;
  if (rect && !llegadaComun && lejos && to.y > from.y + from.h) {
    if (to.x >= from.x + from.w + 16) return { fromSide: 'right', toSide: 'top' };
    if (to.x + to.w <= from.x - 16) return { fromSide: 'left', toSide: 'top' };
  }
  return base;
}

/**
 * Varias ramas etiquetadas que salen por el mismo punto (una decisión con 3+ casos) comparten el
 * primer tramo: sus etiquetas caerían una encima de otra. Cada una se lleva al codo donde su rama
 * deja el tramo común, del lado que mira al origen.
 */
function separarEtiquetasCompartidas(edges: FlowLayoutEdge[]): void {
  const porSalida = new Map<string, FlowLayoutEdge[]>();
  for (const e of edges) {
    if (!e.label) continue;
    const p = pathPoints(e.path)[0];
    if (!p) continue;
    const k = `${p.x},${p.y}`;
    if (!porSalida.has(k)) porSalida.set(k, []);
    porSalida.get(k)!.push(e);
  }
  for (const grupo of porSalida.values()) {
    if (grupo.length < 2) continue;
    for (const e of grupo) {
      const [a, b] = pathPoints(e.path);
      if (!a || !b || a.y !== b.y || a.x === b.x) continue; // solo si arranca en horizontal
      const dir = Math.sign(b.x - a.x);
      e.labelX = b.x - dir * 6;
      e.labelY = a.y - 6;
      e.labelAnchor = dir < 0 ? 'start' : 'end';
    }
  }
}

/** Etiqueta junto al primer tramo de la arista, a un costado (no encima de la línea). */
function sideLabel(path: string): { x: number; y: number; anchor: 'start' | 'end' } | null {
  const pts = pathPoints(path);
  const a = pts[0];
  const b = pts.find((p) => p.x !== a?.x || p.y !== a?.y);
  if (!a || !b) return null;
  if (a.y === b.y) {
    const dir = Math.sign(b.x - a.x) || 1;
    return { x: a.x + dir * 8, y: a.y - 6, anchor: dir > 0 ? 'start' : 'end' };
  }
  const down = b.y > a.y;
  return { x: a.x + 6, y: down ? a.y + 14 : a.y - 6, anchor: 'start' };
}

/**
 * Pintura insoft a partir del tema `flowchart` del estilo. Cada color del
 * bloque `flow` es un NOMBRE de token del tema (`cluster.palettes`, `fills`,
 * `lines`) o un color literal: el celeste de las acciones es el `primary` de
 * la paleta InSoft, el mismo de los demás diagramas.
 */
export function flowPaint(theme: ErThemeJson): FlowPaint {
  const f = theme.flow ?? {};
  const canvas = theme.canvas ?? {};
  const token = (v: string | undefined, fallback: string): string => {
    if (!v) return fallback;
    return theme.cluster?.palettes?.[v] ?? theme.fills?.[v] ?? theme.lines?.[v] ?? v;
  };
  const text = canvas.text ?? '#0F172A';
  return {
    font: theme.font?.family ?? 'Tahoma,Arial,sans-serif',
    fontSize: f.fontSize ?? INSOFT.fontSize,
    fontWeight: f.fontWeight ?? 500,
    background: canvas.background ?? '#FFFFFF',
    text,
    muted: canvas.muted ?? '#475569',
    actionFill: token(f.actionFill, theme.cluster?.fallback ?? '#7ACFF4'),
    actionBorder: token(f.actionBorder, text),
    actionText: token(f.actionText, text),
    borderWidth: f.borderWidth ?? 1,
    radius: f.radius ?? 14,
    decisionFill: token(f.decisionFill, token(f.actionFill, '#7ACFF4')),
    startFill: token(f.startFill, text),
    endFill: token(f.endFill, text),
    edgeStroke: token(f.edgeStroke, text),
    edgeWidth: f.edgeWidth ?? 1.1,
    labelText: token(f.labelText, text),
    nestedBg: token(f.nestedBg, '#FFFFFF'),
    hueRotate: f.hueRotate ?? false,
    pillTone: f.pillTone === 'entity' ? 'entity' : token(f.pillTone, token(f.startFill, text)),
    dashFlow: f.dashFlow ?? true,
    laneLine: token(f.laneLine, '#7DD3FC'),
  };
}

/** Interlineado del texto insoft (px). */
export const FLOW_LINE_H = INSOFT.lineH;

/* ───────────────────── ruteo insoft (recta / L / Z) ───────────────────── */

function polylinePath(pts: readonly FlowPoint[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
}

/** Guarda los tramos de una arista ya ruteada (para medir cruces y solapes). */
/**
 * Rieles quemados (capa ADITIVA del A* del flujo): cada arista ruteada suma costo sobre su recorrido
 * (`nucleo`) y un halo alrededor (`halo`, hasta `radio` px). Cuantas más aristas pasan por una zona,
 * más caro es pasar cerca: las siguientes se reparten en vez de amontonarse en un corredor común.
 * Los extremos (`libre` px junto a cada nodo) no se costean: las aristas que comparten partida o
 * llegada no se castigan entre sí donde convergen.
 */
/**
 * Proximidad (capa RADIAL del A* del flujo): pasar cerca de una entidad, un conector o un texto se
 * desincentiva hasta `radio` (3U) de su borde, más cuanto más cerca; fuera del radio no cuesta. El
 * `pico` es el costo extra pegado al borde: los `-(O` (puentes y sockets) pesan más que los demás
 * conectores (⦿ de fin y de convergencia, inicio) y estos más que entidades y textos. Así los rieles
 * dejan un margen cuando pueden.
 */
export const PROXIMIDAD = { radio: 3 * U, entidad: 1, texto: 1, conector: 1.5, socket: 3 } as const;

/** Siembra la proximidad de un nodo colocado (un puente irradia desde su bola, como `-(O`). */
function proximidad(grid: ReturnType<typeof makeCostGrid>, n: FlowLayoutNode, forma: FlowShape | undefined): void {
  const { radio } = PROXIMIDAD;
  if (forma === 'bridge') {
    const c = centroPuente(n);
    applyRadialCost(grid, { x: c.x - PUENTE.bola, y: c.y - PUENTE.bola, w: PUENTE.bola * 2, h: PUENTE.bola * 2 }, radio, PROXIMIDAD.socket);
    return;
  }
  const conector = forma === 'start' || forma === 'end' || !!n.union;
  applyRadialCost(grid, n, radio, conector ? PROXIMIDAD.conector : PROXIMIDAD.entidad);
}
/**
 * (c) Borde de un grupo: una franja de una celda en sus cuatro lados con la suma de entrar/salir de
 * `routing-costs.ts` (`package.enter`, en px equivalentes) pasada a celdas de esta rejilla.
 */
function costearBordeGrupo(grid: ReturnType<typeof makeCostGrid>, c: { x: number; y: number; w: number; h: number }): void {
  const v = ROUTING_COSTS_DEFAULTS.package.enter / ROUTING_COSTS_DEFAULTS.grid.step;
  const t = grid.grid;
  applyRectCost(grid, c.x, c.y, c.w, t, v, true);
  applyRectCost(grid, c.x, c.y + c.h - t, c.w, t, v, true);
  applyRectCost(grid, c.x, c.y + t, t, c.h - 2 * t, v, true);
  applyRectCost(grid, c.x + c.w - t, c.y + t, t, c.h - 2 * t, v, true);
}
/** (d) Suma aditiva alrededor de cada codo ya trazado (`grid.turnPenalty` de routing-costs, en celdas). */
const CODO = { radio: 2 * ROUTING_COSTS_DEFAULTS.grid.step, valor: ROUTING_COSTS_DEFAULTS.grid.turnPenalty / ROUTING_COSTS_DEFAULTS.grid.step / 4 } as const;
function costearCodos(grid: ReturnType<typeof makeCostGrid>, pts: readonly FlowPoint[]): void {
  for (let k = 1; k < pts.length - 1; k++) {
    const p = pts[k - 1]!, q = pts[k]!, r = pts[k + 1]!;
    const giro = (q.x - p.x) * (r.y - q.y) - (q.y - p.y) * (r.x - q.x) !== 0;
    if (giro) applyRectCost(grid, q.x - CODO.radio, q.y - CODO.radio, CODO.radio * 2, CODO.radio * 2, CODO.valor, true);
  }
}
const RIEL_QUEMADO = { nucleo: 3, halo: 1.5, radio: 16, libre: 24 } as const;
function costearRiel(grid: ReturnType<typeof makeCostGrid>, pts: readonly FlowPoint[]): void {
  const { nucleo, halo, radio, libre } = RIEL_QUEMADO;
  const largo = pts.slice(1).reduce((acc, q, k) => acc + Math.abs(q.x - pts[k]!.x) + Math.abs(q.y - pts[k]!.y), 0);
  if (largo <= libre * 2) return;
  let recorrido = 0;
  pts.slice(1).forEach((q, k) => {
    const p = pts[k]!;
    const l = Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
    // Recorta el tramo a la parte que no está junto a los extremos.
    const desde = Math.max(0, libre - recorrido);
    const hasta = Math.min(l, largo - libre - recorrido);
    recorrido += l;
    if (hasta <= desde || !l) return;
    const dx = Math.sign(q.x - p.x);
    const dy = Math.sign(q.y - p.y);
    const a = { x: p.x + dx * desde, y: p.y + dy * desde };
    const b = { x: p.x + dx * hasta, y: p.y + dy * hasta };
    const x0 = Math.min(a.x, b.x);
    const y0 = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);
    applyRectCost(grid, x0 - radio, y0 - radio, w + radio * 2, h + radio * 2, halo, true);
    applyRectCost(grid, x0 - 2, y0 - 2, w + 4, h + 4, nucleo, true);
  });
}

function rememberSegments(out: FlowSegment[], path: string, to: string): void {
  const pts = pathPoints(path);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (a.x !== b.x || a.y !== b.y) out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, to });
  }
}

/** ¿El tramo atraviesa la caja (inflada `pad`)? */
function segHitsRect(a: FlowPoint, b: FlowPoint, r: { x: number; y: number; w: number; h: number }, pad: number): boolean {
  const x1 = Math.min(a.x, b.x);
  const x2 = Math.max(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const y2 = Math.max(a.y, b.y);
  return x2 > r.x - pad && x1 < r.x + r.w + pad && y2 > r.y - pad && y1 < r.y + r.h + pad;
}

/** Cruces perpendiculares y solapes colineales de un tramo contra lo ya ruteado. */
function segConflicts(a: FlowPoint, b: FlowPoint, to: string, segs: readonly FlowSegment[]): { cross: number; overlap: number } {
  let cross = 0;
  let overlap = 0;
  const horiz = a.y === b.y;
  for (const s of segs) {
    const sh = s.y1 === s.y2;
    if (horiz === sh) {
      // Colineales: solape real (más de un punto) en la misma recta.
      const same = horiz ? s.y1 === a.y : s.x1 === a.x;
      if (!same) continue;
      const [p1, p2] = horiz ? [Math.min(a.x, b.x), Math.max(a.x, b.x)] : [Math.min(a.y, b.y), Math.max(a.y, b.y)];
      const [q1, q2] = horiz ? [Math.min(s.x1, s.x2), Math.max(s.x1, s.x2)] : [Math.min(s.y1, s.y2), Math.max(s.y1, s.y2)];
      // Dos ramas que llegan al mismo nodo se funden: no cuenta.
      if (Math.min(p2, q2) - Math.max(p1, q1) > 1 && s.to !== to) overlap++;
      continue;
    }
    const [hx1, hx2, hy] = horiz ? [Math.min(a.x, b.x), Math.max(a.x, b.x), a.y] : [Math.min(s.x1, s.x2), Math.max(s.x1, s.x2), s.y1];
    const [vy1, vy2, vx] = horiz ? [Math.min(s.y1, s.y2), Math.max(s.y1, s.y2), s.x1] : [Math.min(a.y, b.y), Math.max(a.y, b.y), a.x];
    if (vx > hx1 + 0.5 && vx < hx2 - 0.5 && hy > vy1 + 0.5 && hy < vy2 - 0.5) cross++;
  }
  return { cross, overlap };
}

/**
 * Ruta limpia de una arista hacia adelante: recta si están alineados; L
 * (sale por el costado y baja a la cara superior, o baja y entra por el
 * costado); Z (baja, cruza, baja). Gana la de menos solapes, cruces y
 * giros; si todas tocan una caja, null (el A* decide).
 */
/** Formas cuyo perímetro admite puertos en cualquier punto de la rejilla (las demás usan sus vértices). */
const PERIMETRO_LIBRE = new Set(['rect', 'round', 'stadium', 'vars', 'subroutine', 'parallelogram', 'hexagon', 'document', 'cylinder']);

/**
 * Puertos en el perímetro (cortes de la rejilla de 16 px sobre cada costado), para las aristas que
 * comparten costado de un nodo rectangular:
 *   - las que LLEGAN a un costado convergen en un solo puerto (abanico de consolidación);
 *   - las que SALEN de un costado toman puertos distintos, ordenados por su destino (no se cruzan);
 *   - una llegada y una salida nunca comparten puerto (evita arranques en sitios estrechos o muy
 *     transitados).
 * Un costado con una sola arista, o solo con llegadas, conserva su centro.
 */
function puertosEnPerimetro(
  edges: readonly FlowEdgeSpec[],
  lados: ReadonlyArray<{ fromSide: AnchorSide; toSide: AnchorSide } | null>,
  pos: ReadonlyMap<string, FlowLayoutNode>,
  specById: ReadonlyMap<string, FlowNodeSpec>,
): Map<string, FlowPoint> {
  const out = new Map<string, FlowPoint>();
  type Uso = { clave: string; rol: 'entra' | 'sale'; otro: FlowLayoutNode };
  const porCostado = new Map<string, Uso[]>();
  const anotar = (nodo: string, lado: AnchorSide, u: Uso) => {
    const k = `${nodo}|${lado}`;
    if (!porCostado.has(k)) porCostado.set(k, []);
    porCostado.get(k)!.push(u);
  };
  edges.forEach((e, i) => {
    const l = lados[i];
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!l || !a || !b || e.from === e.to || e.kind === 'dashed') return;
    anotar(e.from, l.fromSide, { clave: `${i}|from`, rol: 'sale', otro: b });
    anotar(e.to, l.toSide, { clave: `${i}|to`, rol: 'entra', otro: a });
  });
  for (const [k, usos] of porCostado) {
    const corte = k.lastIndexOf('|');
    const id = k.slice(0, corte);
    const lado = k.slice(corte + 1) as AnchorSide;
    const n = pos.get(id);
    const forma = specById.get(id)?.shape ?? 'rect';
    if (!n || !PERIMETRO_LIBRE.has(forma)) continue;
    const entran = usos.filter((u) => u.rol === 'entra');
    const salen = usos.filter((u) => u.rol === 'sale');
    // Solo llegadas (convergen en el centro) o una sola arista: nada que cambiar.
    if (!salen.length || usos.length < 2) continue;
    const vertical = lado === 'left' || lado === 'right';
    const cands = perimeterPorts({ x: n.x, y: n.y, w: n.w, h: n.h }, 16, [lado])
      .map((q) => ({ x: snapDiagramGrid(q.x), y: snapDiagramGrid(q.y) }))
      .filter((q) => (vertical ? q.y > n.y + 4 && q.y < n.y + n.h - 4 : q.x > n.x + 4 && q.x < n.x + n.w - 4));
    const eje = (q: FlowPoint) => (vertical ? q.y : q.x);
    const centroOtro = (u: Uso) => (vertical ? u.otro.y + u.otro.h / 2 : u.otro.x + u.otro.w / 2);
    // Cada rol ocupa el tramo del costado que mira a lo que conecta: el que va «antes» toma los
    // puertos del inicio. Las llegadas son un solo grupo (un puerto); cada salida, el suyo.
    const media = (us: Uso[]) => us.reduce((acc, u) => acc + centroOtro(u), 0) / us.length;
    const grupos = [
      ...(entran.length ? [entran] : []),
      ...salen.map((u) => [u]),
    ].sort((p, q) => media(p) - media(q));
    const ordenados = [...new Map(cands.map((q) => [`${q.x},${q.y}`, q])).values()].sort((p, q) => eje(p) - eje(q));
    if (ordenados.length < grupos.length) continue;
    const medio = Math.floor((ordenados.length - grupos.length) / 2);
    grupos.forEach((g, j) => {
      const q = ordenados[medio + j]!;
      for (const u of g) out.set(u.clave, q);
    });
  }
  return out;
}

function routeInsoftEdge(
  a: FlowPoint,
  fromSide: AnchorSide,
  to: FlowLayoutNode,
  nodes: readonly FlowLayoutNode[],
  toId: string,
  segs: readonly FlowSegment[],
  /** Punto de entrada fijo (p. ej. sobre una barra de sincronización); por defecto el centro de la cara. */
  entrada?: FlowPoint,
  /** Segunda pasada: cajas de etiquetas ajenas (ningún riel pasa por encima de un texto). */
  textos: readonly EmbedBox[] = [],
  /** Segunda pasada: dos vértices de la caja de la etiqueta propia; la ruta que pasa por ambos manda. */
  ancla?: readonly [FlowPoint, FlowPoint],
): FlowPoint[] | null {
  const top = { x: entrada?.x ?? snapDiagramGrid(to.x + to.w / 2), y: to.y };
  const cy = to.y + to.h / 2;
  const cands: FlowPoint[][] = [];
  if (fromSide === 'bottom') {
    if (a.x === top.x) cands.push([a, top]);
    for (const ym of new Set([snapDiagramGrid((a.y + top.y) / 2), top.y - 16, a.y + 16, top.y - 24])) {
      if (ym > a.y + 4 && ym < top.y - 4) cands.push([a, { x: a.x, y: ym }, { x: top.x, y: ym }, top]);
    }
    // Baja y entra por el costado que mira al origen (nodos finales y de unión). A un rombo no:
    // sus vértices laterales son salidas de rama; a una decisión se entra por arriba.
    if (to.shape !== 'diamond' && cy > a.y + 8 && (a.x < to.x || a.x > to.x + to.w)) {
      const sx = a.x < to.x ? to.x : to.x + to.w;
      cands.push([a, { x: a.x, y: cy }, { x: sx, y: cy }]);
    }
  } else if (fromSide === 'left' || fromSide === 'right') {
    const s = fromSide === 'right' ? 1 : -1;
    if ((top.x - a.x) * s > 8 && top.y > a.y) cands.push([a, { x: top.x, y: a.y }, top]);
    // Flujo hacia la derecha (carriles horizontales): recta o Z hasta la cara izquierda del destino.
    if (fromSide === 'right' && to.x > a.x + 8) {
      const left = { x: to.x, y: entrada?.y ?? snapDiagramGrid(cy) };
      if (a.y === left.y) cands.push([a, left]);
      for (const xm of new Set([snapDiagramGrid((a.x + left.x) / 2), left.x - 16, a.x + 16, left.x - 24])) {
        if (xm > a.x + 4 && xm < left.x - 4) cands.push([a, { x: xm, y: a.y }, { x: xm, y: left.y }, left]);
      }
    }
  }
  let best: FlowPoint[] | null = null;
  let bestScore = Infinity;
  for (const pts of cands) {
    let blocked = false;
    let cross = 0;
    let overlap = 0;
    let len = 0;
    for (let i = 1; i < pts.length && !blocked; i++) {
      const p = pts[i - 1]!;
      const q = pts[i]!;
      len += Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
      for (const n of nodes) {
        if (n.id === toId && i === pts.length - 1) continue; // el último tramo toca su destino
        const own = n.x <= a.x && a.x <= n.x + n.w && n.y <= a.y && a.y <= n.y + n.h;
        if (own && i === 1) continue; // el primero arranca en el borde del origen
        if (segHitsRect(p, q, n, 4)) { blocked = true; break; }
      }
      for (const t of textos) {
        if (segHitsRect(p, q, t, U / 2)) { blocked = true; break; }
      }
      const c = segConflicts(p, q, toId, segs);
      cross += c.cross;
      overlap += c.overlap;
    }
    if (blocked) continue;
    // Entrar por un costado (y no por arriba) solo gana si ahorra cruces: el costado queda libre para
    // las aristas de uso y las ramas.
    const porCostado = pts.length === 3 && pts[2]!.y === cy ? 6 : 0;
    // Pasa por las dos anclas de su etiqueta (un mismo tramo contiene a ambas): esa ruta manda.
    const porAnclas = ancla && pts.slice(1).some((q, k) => tramoContiene(pts[k]!, q, ancla[0]) && tramoContiene(pts[k]!, q, ancla[1])) ? -1000 : 0;
    // Giros pegados a la llegada (o, a la mitad, a la partida) se penalizan: ver costoGiros.
    const score = overlap * 100 + cross * 10 + (pts.length - 2) * 3 + len / 200 + costoGiros(pts) + porCostado + porAnclas;
    if (score < bestScore) { bestScore = score; best = pts; }
  }
  return best;
}
