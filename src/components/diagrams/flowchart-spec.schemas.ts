/**
 * flowchart-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import { DiagramNodeKindSchema, NodeEmbedSpecSchema, EmbedBoxSchema, EmbedSizeSchema } from "../_shared/diagram-embed.schemas.js";

export const AnchorSideSchema = z.union([z.literal('left'), z.literal('right'), z.literal('top'), z.literal('bottom')]);
export type AnchorSide = z.infer<typeof AnchorSideSchema>;


export const FlowDirectionSchema = z.union([z.literal('TB'), z.literal('BT'), z.literal('LR'), z.literal('RL')]);
export type FlowDirection = z.infer<typeof FlowDirectionSchema>;


export const FlowShapeSchema = z.union([z.literal('rect'), z.literal('round'), z.literal('stadium'), z.literal('circle'), z.literal('diamond'), z.literal('hexagon'), z.literal('parallelogram'), z.literal('cylinder'), z.literal('subroutine'), z.literal('start'), z.literal('end'), z.literal('bar'), z.literal('comment'), z.literal('vars')]);
export type FlowShape = z.infer<typeof FlowShapeSchema>;


export const FlowEdgeKindSchema = z.union([z.literal('solid'), z.literal('dashed'), z.literal('thick')]);
export type FlowEdgeKind = z.infer<typeof FlowEdgeKindSchema>;


export const FlowOverflowSchema = z.union([z.literal('grow'), z.literal('ellipsis')]);
export type FlowOverflow = z.infer<typeof FlowOverflowSchema>;


export const LeadingIconTokenSchema = z.object({
  iconId: z.string(),
  hue: z.number().optional(),
  rest: z.string(),
});
export type LeadingIconToken = z.infer<typeof LeadingIconTokenSchema>;


export const FlowExclusionZoneSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string().optional(),
});
export type FlowExclusionZone = z.infer<typeof FlowExclusionZoneSchema>;


/**
 * Carril de contexto (swimlane): la entidad o el contexto donde ocurre cada paso (Cliente, Turno,
 * PostgreSQL…). Los nodos lo nombran con `lane`. Sin carriles el diagrama es un flujo simple.
 */
export const FlowLaneSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** `center`: los nodos del carril van centrados a lo largo del diagrama (p. ej. el controller de cliente solo en su columna). */
  align: z.literal('center').optional(),
});
export type FlowLaneSpec = z.infer<typeof FlowLaneSpecSchema>;

/** Carriles como columnas (`vertical`, por defecto; el flujo baja) o como filas (`horizontal`; el flujo avanza a la derecha). */
export const FlowLaneDirectionSchema = z.union([z.literal('vertical'), z.literal('horizontal')]);
export type FlowLaneDirection = z.infer<typeof FlowLaneDirectionSchema>;

/**
 * Una variable de un nodo de declaración (`shape: "vars"`): nombre y valor obligatorios; `desc` solo
 * cuando el nombre no basta. Un nombre puede ir calificado (`pojo.valor`, `instancia.valor`) si choca
 * con otro.
 */
/** Tipos de entidad con color identificador, en orden fijo (un tipo conserva su color en todo diagrama). */
export const TipoEntidadSchema = z.enum(['cliente', 'componente', 'controller', 'pojo', 'tabla']);
export type TipoEntidad = z.infer<typeof TipoEntidadSchema>;

export const FlowVarSchema = z.object({
  name: z.string().min(1),
  /** Alias corto (pocas letras) para nombres o expresiones largas; el texto lo usa como `{{alias}}`. */
  alias: z.string().optional(),
  value: z.string().min(1),
  desc: z.string().optional(),
});
export type FlowVar = z.infer<typeof FlowVarSchema>;

export const FlowNodeSpecSchema = z.object({
  /** `shape: "vars"`: las variables que declara (tabla nombre · valor · desc). */
  vars: z.array(FlowVarSchema).optional(),
  id: z.string(),
  label: z.string(),
  shape: FlowShapeSchema,
  icon: z.string().optional(),
  hue: z.number().optional(),
  group: z.string().optional(),
  description: z.string().optional(),
  overflow: FlowOverflowSchema.optional(),
  /** Nodo especial (`nested` / `tableder` / `component`); ver diagram-embed.schemas.ts. */
  kind: DiagramNodeKindSchema.optional(),
  embed: NodeEmbedSpecSchema.optional(),
  /** Carril de contexto (id de `lanes`). Sin él, hereda el de su primer antecesor (o el primer carril). */
  lane: z.string().optional(),
  /** Número de paso (orden de la secuencia): va en la pastilla junto al ícono. */
  step: z.number().int().nonnegative().optional(),
  /** Grupo de contexto dentro del carril (título del recuadro). Ver FlowLayoutContextSchema. */
  context: z.string().optional(),
  /** `shape: "comment"`: id del nodo que comenta (el globo lo señala). */
  about: z.string().optional(),
});
export type FlowNodeSpec = z.infer<typeof FlowNodeSpecSchema>;


export const FlowEdgeSpecSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  kind: FlowEdgeKindSchema,
  group: z.string().optional(),
  waypoints: z.array(z.object({
  x: z.number(),
  y: z.number(),
})).optional(),
  /** Pide la etiqueta en vertical (por defecto horizontal: preferencia INSOFT). */
  labelVertical: z.boolean().optional(),
  /** Ícono de la etiqueta (`set:nombre`), a su izquierda. Los verbos SQL llevan uno de BD por defecto. */
  icon: z.string().optional(),
  /** Flujo animado al revés: de la punta al origen (ver _shared/diagram-flow.ts). */
  reverse: z.boolean().optional(),
});
export type FlowEdgeSpec = z.infer<typeof FlowEdgeSpecSchema>;


export const FlowGroupSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
});
export type FlowGroupSpec = z.infer<typeof FlowGroupSpecSchema>;


export const FlowResolvedSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  direction: FlowDirectionSchema,
  defaultOverflow: FlowOverflowSchema,
  groups: z.array(FlowGroupSpecSchema).optional(),
  exclusionZones: z.array(FlowExclusionZoneSchema).optional(),
  nodes: z.array(FlowNodeSpecSchema),
  edges: z.array(FlowEdgeSpecSchema),
  lanes: z.array(FlowLaneSpecSchema).optional(),
  laneDirection: FlowLaneDirectionSchema.optional(),
  /**
   * `"auto"`: numera TODOS los elementos del flujo (acciones, decisiones, componentes, clases,
   * tablas…) en orden de lectura, 1..N sin saltos; inicio, fin y barras no cuentan. Gana sobre `step`.
   */
  steps: z.literal('auto').optional(),
});
export type FlowResolvedSpec = z.infer<typeof FlowResolvedSpecSchema>;


export const FlowLayoutNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  layer: z.number(),
  label: z.string(),
  shape: FlowShapeSchema,
  icon: z.string().optional(),
  description: z.string().optional(),
  hue: z.number().optional(),
  group: z.string().optional(),
  kind: DiagramNodeKindSchema.optional(),
  embed: NodeEmbedSpecSchema.optional(),
  /** Estilo insoft: líneas ya partidas y caja (rect inscrito en el rombo) donde van. */
  lines: z.array(z.string()).optional(),
  textBox: EmbedBoxSchema.optional(),
  /** Caja del diagrama incrustado (`nested` encajado, `tableder`/`component` natural). */
  embedBox: EmbedBoxSchema.optional(),
  /** Número de paso y pastilla (paso + ícono) a la izquierda del texto, en coords del lienzo. */
  step: z.number().optional(),
  /**
   * Índice jerárquico del paso (`steps: "auto"`): `1`, `2`… sin ramas; en una bifurcación del paso `p`
   * las ramas son `p.1`, `p.2`… y lo que sigue en cada rama `p.k.1`, `p.k.2`…; al reunirse, vuelve al
   * nivel de quien bifurcó. Lo calcula el diagrama a partir del grafo.
   */
  stepLabel: z.string().optional(),
  pill: EmbedBoxSchema.optional(),
  /** Insignia suelta (decisiones y nodos incrustados): número sobre fondo oscuro en la esquina. */
  pillFloat: z.boolean().optional(),
  /** Nodo de declaración: sus variables, el ancho de cada columna y la caja de la tabla (lienzo). */
  vars: z.array(FlowVarSchema).optional(),
  varsCols: z.array(z.number()).optional(),
  varsBox: EmbedBoxSchema.optional(),
  /** Alineación horizontal del texto en su caja (rombo con pastilla: a la izquierda). */
  textAlign: z.literal('start').optional(),
  /** Comentario: nodo que señala y costado del globo donde va el triángulo indicador. */
  about: z.string().optional(),
  pointer: z.union([z.literal('left'), z.literal('right')]).optional(),
});
export type FlowLayoutNode = z.infer<typeof FlowLayoutNodeSchema>;


export const FlowLayoutEdgeSchema = z.object({
  /**
   * Llega a un componente que expone interfaz (`provides`): conector UML `-(O-`. El riel termina en
   * el socket `(`; la punta (`arrowTip*`) es el borde del componente, donde nace su lollipop `O-`.
   */
  socket: z.boolean().optional(),
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  kind: FlowEdgeKindSchema,
  path: z.string(),
  arrowTipX: z.number(),
  arrowTipY: z.number(),
  arrowAngle: z.number(),
  labelX: z.number(),
  labelY: z.number(),
  /** Alineación de la etiqueta (estilo insoft: junto a la arista, no encima). */
  labelAnchor: z.union([z.literal('start'), z.literal('middle'), z.literal('end')]).optional(),
  /** Etiqueta escrita en vertical (resultado del layout: a lo largo de un tramo vertical). */
  labelVertical: z.boolean().optional(),
  /** Orientación pedida por el spec de la arista (`labelVertical: true`); INSOFT prefiere horizontal. */
  labelPide: z.literal('vertical').optional(),
  /** Estilo insoft: caja que ocupa la etiqueta (entidad del layout) y sus líneas (partida o resumida). */
  labelBox: EmbedBoxSchema.optional(),
  labelLines: z.array(z.string()).optional(),
  /** Ícono de la etiqueta (del spec o, en verbos SQL, el de BD por defecto). */
  labelIcon: z.string().optional(),
  /** Flujo animado al revés (de la punta al origen). */
  reverse: z.boolean().optional(),
  hue: z.number().optional(),
});
export type FlowLayoutEdge = z.infer<typeof FlowLayoutEdgeSchema>;


export const FlowLayoutExclusionZoneSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string().optional(),
});
export type FlowLayoutExclusionZone = z.infer<typeof FlowLayoutExclusionZoneSchema>;


/** Carril ya colocado (coords del lienzo): banda del carril y dónde va su rótulo. */
export const FlowLayoutLaneSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type FlowLayoutLane = z.infer<typeof FlowLayoutLaneSchema>;

/**
 * Grupo de contexto ya colocado: recuadro con título y fondo suave que separa, dentro de un mismo
 * carril, entidades de distinta naturaleza (clases, tablas, componentes) del flujo.
 */
export const FlowLayoutContextSchema = z.object({
  label: z.string(),
  lane: z.string(),
  /** Ids de los nodos que abraza (la caja es su unión, más aire y título). */
  members: z.array(z.string()).optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type FlowLayoutContext = z.infer<typeof FlowLayoutContextSchema>;

export const FlowLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  nodes: z.array(FlowLayoutNodeSchema),
  edges: z.array(FlowLayoutEdgeSchema),
  groups: z.array(FlowGroupSpecSchema).optional(),
  exclusionZones: z.array(FlowLayoutExclusionZoneSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  legendX: z.number(),
  lanes: z.array(FlowLayoutLaneSchema).optional(),
  laneDirection: FlowLaneDirectionSchema.optional(),
  contexts: z.array(FlowLayoutContextSchema).optional(),
});
export type FlowLayout = z.infer<typeof FlowLayoutSchema>;


export const FlowLayoutOverridesSchema = z.object({
  nodes: z.record(z.string(), z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  label: z.string().optional(),
  hue: z.number().optional(),
})).optional(),
  edges: z.record(z.string(), z.object({
  label: z.string().optional(),
  hue: z.number().optional(),
})).optional(),
});
export type FlowLayoutOverrides = z.infer<typeof FlowLayoutOverridesSchema>;



/** Estilo de layout: `classic` (el de siempre) o `insoft` (actividad estilo Visual Paradigm). */
export const FlowLayoutStyleSchema = z.union([z.literal('classic'), z.literal('insoft')]);
export type FlowLayoutStyle = z.infer<typeof FlowLayoutStyleSchema>;

/** Opciones de `computeFlowchartLayout` (todas opcionales; sin ellas = classic). */
export const FlowLayoutOptionsSchema = z.object({
  style: FlowLayoutStyleSchema.optional(),
  /** Ancho en px de un texto con la tipografía real (navegador); por defecto, estimación. */
  measure: z.custom<(text: string) => number>((v) => typeof v === 'function').optional(),
  fontSize: z.number().optional(),
  /** Tamaño natural medido de los diagramas incrustados, por id de nodo. */
  embeds: z.record(z.string(), EmbedSizeSchema).optional(),
});
export type FlowLayoutOptions = z.infer<typeof FlowLayoutOptionsSchema>;

/** Tamaño de un nodo antes de colocarlo, con su texto ya partido (insoft). */
export const FlowSizedNodeSchema = z.object({
  id: z.string(),
  w: z.number(),
  h: z.number(),
  lines: z.array(z.string()).optional(),
  /** Caja del texto relativa a la esquina del nodo. */
  textBox: EmbedBoxSchema.optional(),
  embedBox: EmbedBoxSchema.optional(),
  /** Pastilla (paso + ícono) relativa a la esquina del nodo. */
  pill: EmbedBoxSchema.optional(),
  /** Alineación horizontal del texto en su caja (rombo con pastilla: a la izquierda). */
  textAlign: z.literal('start').optional(),
  /** Nodo de declaración: ancho de cada columna y caja de la tabla (relativa al nodo). */
  varsCols: z.array(z.number()).optional(),
  varsBox: EmbedBoxSchema.optional(),
});
export type FlowSizedNode = z.infer<typeof FlowSizedNodeSchema>;

/** Nodo colocado por el layout (antes del margen del lienzo). */
export const FlowPlacedNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  layer: z.number(),
});
export type FlowPlacedNode = z.infer<typeof FlowPlacedNodeSchema>;

export const FlowPlacementSchema = z.object({
  nodes: z.array(FlowPlacedNodeSchema),
  width: z.number(),
  height: z.number(),
  /** Insoft: hijo principal (sigue la columna) de cada nodo con varias salidas. */
  primaryChild: z.custom<Map<string, string>>((v) => v instanceof Map).optional(),
  /** Carriles colocados (antes del margen del lienzo). */
  lanes: z.array(FlowLayoutLaneSchema).optional(),
  contexts: z.array(FlowLayoutContextSchema).optional(),
});
export type FlowPlacement = z.infer<typeof FlowPlacementSchema>;

/** Pintura del estilo insoft ya resuelta (tokens del tema → colores). */
export const FlowPaintSchema = z.object({
  font: z.string(),
  fontSize: z.number(),
  fontWeight: z.number(),
  background: z.string(),
  text: z.string(),
  muted: z.string(),
  actionFill: z.string(),
  actionBorder: z.string(),
  actionText: z.string(),
  borderWidth: z.number(),
  radius: z.number(),
  decisionFill: z.string(),
  startFill: z.string(),
  endFill: z.string(),
  edgeStroke: z.string(),
  edgeWidth: z.number(),
  labelText: z.string(),
  nestedBg: z.string(),
  /** Un tono distinto por símbolo (rotación OKLCH del relleno base). */
  hueRotate: z.boolean(),
  /** Fondo de la insignia: `entity` (tono de su entidad, oscuro) o un color fijo. */
  pillTone: z.string(),
  /** Rieles punteados animados hacia su destino (SMIL `stroke-dashoffset`). */
  dashFlow: z.boolean(),
  /** Separadores de los carriles de contexto: un color propio (no se confunden con flujos ni usos). */
  laneLine: z.string(),
});
export type FlowPaint = z.infer<typeof FlowPaintSchema>;

/** Punto en píxeles del lienzo. */
export const FlowPointSchema = z.object({ x: z.number(), y: z.number() });
export type FlowPoint = z.infer<typeof FlowPointSchema>;

/** Tramo ortogonal ya ruteado (insoft), con el destino de su arista. */
export const FlowSegmentSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  to: z.string(),
});
export type FlowSegment = z.infer<typeof FlowSegmentSchema>;
