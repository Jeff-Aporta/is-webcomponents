// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * diagram-er.schemas.ts — familia DER (entidad-relación): entidades, relaciones y layout.
 *
 * Tipos del diagrama entidad-relación y el estado del editor de DER.
 */
import { z } from 'zod';
import { BoxSideSchema, DiagramGroupSchema, EdgeStyleOverrideSchema, EdgeVariantSchema, NodeStyleOverrideSchema } from './diagram-base.schemas.js';

const ErCardinalitySchema = z.union([z.literal('one'), z.literal('many'), z.literal('zeroOrOne'), z.literal('zeroOrMany')]);
export type ErCardinality = z.infer<typeof ErCardinalitySchema>;

const ErSpecAttributeSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  key: z.union([z.literal('PK'), z.literal('FK')]).optional(),
  comment: z.string().optional(),
});
export type ErSpecAttribute = z.infer<typeof ErSpecAttributeSchema>;

const ErSpecEntitySchema = z.object({
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

const ErRouteKindSchema = z.union([z.literal('auto'), z.literal('straight'), z.literal('orthogonal'), z.literal('orthogonal-h'), z.literal('orthogonal-v')]);
export type ErRouteKind = z.infer<typeof ErRouteKindSchema>;

const ErDashStyleSchema = z.union([z.literal('solid'), z.literal('dashed'), z.literal('dotted')]);
export type ErDashStyle = z.infer<typeof ErDashStyleSchema>;

const ErSpecRelationSchema = z.object({
  /** Invierte el sentido de la animación de flujo de esta arista (ver _shared/diagram-flow). */
  reverse: z.boolean().optional(),
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

const ErSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  direction: z.union([z.literal('TB'), z.literal('BT'), z.literal('LR'), z.literal('RL')]),
  ratio: z.number(),
  groups: z.array(DiagramGroupSchema).optional(),
  entities: z.array(ErSpecEntitySchema),
  relations: z.array(ErSpecRelationSchema),
  /** `layout.routing`: sobreescritura del campo de costos compartido (igual que componentes y clases). */
  routing: z.record(z.string(), z.record(z.string(), z.number())).optional(),
  /**
   * Consolidación de rieles (efecto estándar, encendido por defecto):
   * `ends` — las aristas que llegan al mismo punto (`->` o el O del `-(O-`)
   * convergen en abanico (rieles paralelos pegados, una sola punta);
   * `starts` — las que salen del mismo origen salen juntas. `false` apaga los
   * incentivos de consolidación. Acepta un booleano para ambos.
   */
  consolidate: z.union([z.boolean(), z.object({ starts: z.boolean().optional(), ends: z.boolean().optional() })]).optional(),

  meta: z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  animation: z.union([z.literal('trace'), z.literal('none')]).optional(),
  locale: z.union([z.literal('en'), z.literal('zh-CN')]).optional(),
}).optional(),
});
export type ErSpec = z.infer<typeof ErSpecSchema>;

const ErLayoutEntitySchema = z.object({
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

const ErLayoutEdgeMarkSchema = z.object({
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

const ErLayoutEdgeSchema = z.object({
  /** Invierte el sentido de la animación de flujo de esta arista (ver _shared/diagram-flow). */
  reverse: z.boolean().optional(),
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

const ErLayoutSchema = z.object({
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

const ErEditorStateSchema = z.object({
  entities: z.array(ErSpecEntitySchema),
  relations: z.array(ErSpecRelationSchema),
  meta: z.unknown() /* TODO: cannot convert */.optional(),
  groups: z.array(DiagramGroupSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  direction: z.unknown() /* TODO: cannot convert */.optional(),
  ratio: z.number().optional(),
  theme: z.string().optional(),
}).extend({ direction: ErSpecSchema.shape.direction.optional(), meta: ErSpecSchema.shape.meta });
export type ErEditorState = z.infer<typeof ErEditorStateSchema>;
