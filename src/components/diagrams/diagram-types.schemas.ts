/**
 * diagram-types.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const DiagramThemeSchema = z.object({
  text: z.string(),
  muted: z.string(),
  grid: z.string(),
  panel: z.string(),
  border: z.string(),
  accent: z.string(),
  altFill: z.string(),
  altBorder: z.string(),
  chipFill: z.string(),
  chipFillSoft: z.string(),
  dotText: z.string(),
});
export type DiagramTheme = z.infer<typeof DiagramThemeSchema>;


export const DiagramGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number().optional(),
  parent: z.string().optional(),
});
export type DiagramGroup = z.infer<typeof DiagramGroupSchema>;


export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point = z.infer<typeof PointSchema>;


export const RectSchema = z.object({
  width: z.number(),
  height: z.number(),
  cx: z.number(),
  cy: z.number(),
});
export type Rect = z.infer<typeof RectSchema>;


export const GridPointSchema = z.object({
  col: z.number(),
  row: z.number(),
});
export type GridPoint = z.infer<typeof GridPointSchema>;


export const BoxSideSchema = z.union([z.literal('left'), z.literal('right'), z.literal('top'), z.literal('bottom'), z.literal('auto')]);
export type BoxSide = z.infer<typeof BoxSideSchema>;


export const EdgeVariantSchema = z.union([z.literal('default'), z.literal('emphasis'), z.literal('security'), z.literal('dashed')]);
export type EdgeVariant = z.infer<typeof EdgeVariantSchema>;


export const NodeStyleOverrideSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  paddingX: z.number().optional(),
  paddingY: z.number().optional(),
  marginX: z.number().optional(),
  marginY: z.number().optional(),
  radius: z.number().optional(),
  opacity: z.number().optional(),
});
export type NodeStyleOverride = z.infer<typeof NodeStyleOverrideSchema>;


export const EdgeStyleOverrideSchema = z.object({
  width: z.number().optional(),
});
export type EdgeStyleOverride = z.infer<typeof EdgeStyleOverrideSchema>;


export const ComponentTypeSchema = z.union([z.literal('frontend'), z.literal('backend'), z.literal('database'), z.literal('cloud'), z.literal('security'), z.literal('messagebus'), z.literal('external')]);
export type ComponentType = z.infer<typeof ComponentTypeSchema>;


export const ClassSpecClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  stereotype: z.string().optional(),
  group: z.string().optional(),
  hue: z.number().optional(),
  /** Paquete (agrupador dibujado) que contiene la clase. */
  package: z.string().optional(),
  /** Color de acento hex (cabecera, borde, aristas que emite). */
  color: z.string().optional(),
  /** Relleno de la caja en estilo `vp` (#hex). */
  fill: z.string().optional(),
  attributes: z.array(z.string()),
  methods: z.array(z.string()),
});
export type ClassSpecClass = z.infer<typeof ClassSpecClassSchema>;


export const ClassRelationKindSchema = z.union([z.literal('association'), z.literal('inheritance'), z.literal('composition'), z.literal('aggregation'), z.literal('dependency'), z.literal('realization')]);
export type ClassRelationKind = z.infer<typeof ClassRelationKindSchema>;


export const ClassSpecRelationSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  kind: ClassRelationKindSchema,
  label: z.string().optional(),
  fromLabel: z.string().optional(),
  toLabel: z.string().optional(),
  group: z.number().optional(),
});
export type ClassSpecRelation = z.infer<typeof ClassSpecRelationSchema>;


/** Agrupador dibujado de un diagrama de clases (paquete UML). */
export const ClassPackageSchema = z.object({
  id: z.string(),
  name: z.string(),
  stereotype: z.string().optional(),
  parent: z.string().optional(),
  /** Relleno del agrupador (#hex). */
  palette: z.string().optional(),
  /** Acento de las clases que contiene (#hex); si falta, se deriva de `palette`. */
  accent: z.string().optional(),
  /** Clases por fila dentro del paquete, o columnas de su rejilla de subpaquetes. */
  cols: z.number().optional(),
  /** Relleno de las clases que contiene en estilo `vp` (#hex). */
  classFill: z.string().optional(),
});
export type ClassPackage = z.infer<typeof ClassPackageSchema>;

/** Opciones de empaque cuando hay paquetes (modo capas, como componentes). */
export const ClassLayoutOptsSchema = z.object({
  layerCols: z.number().optional(),
  nestedCols: z.number().optional(),
  colGutter: z.number().optional(),
  nestedRowGap: z.number().optional(),
  nestedPkgGap: z.number().optional(),
  pkgRowGap: z.number().optional(),
  lanePitch: z.number().optional(),
  /** Mismas perillas de rieles que el diagrama de componentes (`resolvePackingGaps`). */
  laneNearFactor: z.number().optional(),
  pkgBorderClearance: z.number().optional(),
  pkgBorderNearFactor: z.number().optional(),
  pkgCrossFactor: z.number().optional(),
  /**
   * `uml` (default), `card` (cabecera con acento, cuerpo blanco y sombra) o
   * `vp` (Visual Paradigm / InSoft: cajas rectas pastel, borde negro,
   * paquetes con pestaña y título centrado).
   */
  boxStyle: z.union([z.literal('uml'), z.literal('card'), z.literal('vp')]).optional(),
});
export type ClassLayoutOpts = z.infer<typeof ClassLayoutOptsSchema>;

export const ClassSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  direction: z.union([z.literal('TB'), z.literal('BT'), z.literal('LR'), z.literal('RL')]),
  classes: z.array(ClassSpecClassSchema),
  relations: z.array(ClassSpecRelationSchema),
  groups: z.array(DiagramGroupSchema).optional(),
  packages: z.array(ClassPackageSchema).optional(),
  layout: ClassLayoutOptsSchema.optional(),
});
export type ClassSpec = z.infer<typeof ClassSpecSchema>;


export const ClassLayoutSectionSchema = z.object({
  type: z.union([z.literal('header'), z.literal('attributes'), z.literal('methods')]),
  y: z.number(),
  h: z.number(),
  rows: z.array(z.string()),
});
export type ClassLayoutSection = z.infer<typeof ClassLayoutSectionSchema>;


export const ClassLayoutNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  layer: z.number(),
  name: z.string(),
  stereotype: z.string().optional(),
  description: z.string().optional(),
  sections: z.array(ClassLayoutSectionSchema),
  dividerYs: z.array(z.number()),
  hue: z.number().optional(),
  group: z.string().optional(),
  package: z.string().optional(),
  /** Acento resuelto (#hex): clase > paquete > hue. */
  color: z.string().optional(),
  /** Relleno resuelto en estilo `vp`: clase > paquete (`classFill`). */
  fill: z.string().optional(),
  overflow: z.union([z.literal('grow'), z.literal('shrink')]).optional(),
});
export type ClassLayoutNode = z.infer<typeof ClassLayoutNodeSchema>;


export const ClassLayoutEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  kind: ClassRelationKindSchema,
  /** Color hex del emisor (modo paquetes). */
  color: z.string().optional(),
  /** Tramo de un bus de herencia: sin decoración propia (el triángulo va en el tronco). */
  noTip: z.boolean().optional(),
  label: z.string().optional(),
  fromLabel: z.string().optional(),
  toLabel: z.string().optional(),
  path: z.string(),
  targetTipX: z.number(),
  targetTipY: z.number(),
  targetAngle: z.number(),
  sourceTipX: z.number(),
  sourceTipY: z.number(),
  sourceAngle: z.number(),
  labelX: z.number(),
  labelY: z.number(),
  labelW: z.number().optional(),
  hue: z.number().optional(),
});
export type ClassLayoutEdge = z.infer<typeof ClassLayoutEdgeSchema>;


export const ClassLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  nodes: z.array(ClassLayoutNodeSchema),
  edges: z.array(ClassLayoutEdgeSchema),
  groups: z.array(DiagramGroupSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  legendX: z.number(),
  /** Agrupadores empacados (modo paquetes), en orden de pintura (padres antes). */
  packages: z.array(ClassPackageSchema.extend({
    x: z.number(), y: z.number(), w: z.number(), h: z.number(), depth: z.number(),
    /** Estilo `vp`: rótulo centrado salvo que tape la vertical de una clase directa. */
    titleAlign: z.union([z.literal('center'), z.literal('left')]).optional(),
  })).optional(),
  boxStyle: z.union([z.literal('uml'), z.literal('card'), z.literal('vp')]).optional(),
});
export type ClassLayout = z.infer<typeof ClassLayoutSchema>;


export const ErCardinalitySchema = z.union([z.literal('one'), z.literal('many'), z.literal('zeroOrOne'), z.literal('zeroOrMany')]);
export type ErCardinality = z.infer<typeof ErCardinalitySchema>;


export const ErSpecAttributeSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  key: z.union([z.literal('PK'), z.literal('FK')]).optional(),
  comment: z.string().optional(),
});
export type ErSpecAttribute = z.infer<typeof ErSpecAttributeSchema>;


export const ErSpecEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  group: z.string().optional(),
  attributes: z.array(ErSpecAttributeSchema),
  hue: z.number().optional(),
  pos: z.tuple([z.number(), z.number()]).optional(),
  size: z.tuple([z.number(), z.number()]).optional(),
  style: NodeStyleOverrideSchema.optional(),
  label: z.string().optional(),
});
export type ErSpecEntity = z.infer<typeof ErSpecEntitySchema>;


export const ErRouteKindSchema = z.union([z.literal('auto'), z.literal('straight'), z.literal('orthogonal'), z.literal('orthogonal-h'), z.literal('orthogonal-v')]);
export type ErRouteKind = z.infer<typeof ErRouteKindSchema>;


export const ErDashStyleSchema = z.union([z.literal('solid'), z.literal('dashed'), z.literal('dotted')]);
export type ErDashStyle = z.infer<typeof ErDashStyleSchema>;


export const ErSpecRelationSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  fromCard: ErCardinalitySchema,
  toCard: ErCardinalitySchema,
  identifying: z.boolean(),
  route: ErRouteKindSchema.optional(),
  fromSide: BoxSideSchema.optional(),
  toSide: BoxSideSchema.optional(),
  via: z.array(z.tuple([z.number(), z.number()])).optional(),
  labelAt: z.tuple([z.number(), z.number()]).optional(),
  labelDx: z.number().optional(),
  labelDy: z.number().optional(),
  labelSegment: z.number().optional(),
  dashStyle: ErDashStyleSchema.optional(),
  width: z.number().optional(),
  variant: EdgeVariantSchema.optional(),
  style: EdgeStyleOverrideSchema.optional(),
});
export type ErSpecRelation = z.infer<typeof ErSpecRelationSchema>;


export const ErSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  direction: z.union([z.literal('TB'), z.literal('BT'), z.literal('LR'), z.literal('RL')]),
  ratio: z.number(),
  groups: z.array(DiagramGroupSchema).optional(),
  entities: z.array(ErSpecEntitySchema),
  relations: z.array(ErSpecRelationSchema),
  meta: z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  animation: z.union([z.literal('trace'), z.literal('none')]).optional(),
  locale: z.union([z.literal('en'), z.literal('zh-CN')]).optional(),
}).optional(),
});
export type ErSpec = z.infer<typeof ErSpecSchema>;


export const ErLayoutEntitySchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  layer: z.number(),
  name: z.string(),
  attributes: z.array(ErSpecAttributeSchema),
  group: z.string().optional(),
  hue: z.number().optional(),
  style: NodeStyleOverrideSchema.optional(),
  locked: z.boolean().optional(),
});
export type ErLayoutEntity = z.infer<typeof ErLayoutEntitySchema>;


export const ErLayoutEdgeMarkSchema = z.object({
  x: z.number(),
  y: z.number(),
  angle: z.number(),
  path: z.string(),
  circle: z.object({
  cx: z.number(),
  cy: z.number(),
  r: z.number(),
}).optional(),
});
export type ErLayoutEdgeMark = z.infer<typeof ErLayoutEdgeMarkSchema>;


export const ErLayoutEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  hue: z.number().optional(),
  identifying: z.boolean(),
  path: z.string(),
  fromMark: ErLayoutEdgeMarkSchema,
  toMark: ErLayoutEdgeMarkSchema,
  labelX: z.number(),
  labelY: z.number(),
  labelW: z.number().optional(),
  route: ErRouteKindSchema.optional(),
  fromSide: BoxSideSchema.optional(),
  toSide: BoxSideSchema.optional(),
  dashStyle: ErDashStyleSchema.optional(),
  variant: EdgeVariantSchema.optional(),
  width: z.number().optional(),
  style: EdgeStyleOverrideSchema.optional(),
});
export type ErLayoutEdge = z.infer<typeof ErLayoutEdgeSchema>;


export const ErLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  entities: z.array(ErLayoutEntitySchema),
  relations: z.array(ErLayoutEdgeSchema),
  clusters: z.array(z.object({
  id: z.union([z.string(), z.null()]),
  name: z.string(),
  hue: z.number().optional(),
  parentId: z.string().optional(),
  depth: z.number().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
})).optional(),
  groups: z.array(DiagramGroupSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  titleLines: z.array(z.string()).optional(),
  subtitleLines: z.array(z.string()).optional(),
  legendX: z.number(),
  legendY: z.number().optional(),
  ratio: z.number().optional(),
});
export type ErLayout = z.infer<typeof ErLayoutSchema>;


export const ErEditorStateSchema = z.object({
  entities: z.array(ErSpecEntitySchema),
  relations: z.array(ErSpecRelationSchema),
  meta: z.unknown() /* TODO: cannot convert */.optional(),
  groups: z.array(DiagramGroupSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  direction: z.unknown() /* TODO: cannot convert */.optional(),
  ratio: z.number().optional(),
  theme: z.string().optional(),
});
export type ErEditorState = z.infer<typeof ErEditorStateSchema>;

