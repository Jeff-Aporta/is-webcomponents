// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * swimlane-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';
import { LabeledEdgeSchema } from './diagram-edge-actors.schemas.js';


// ── lane-layout.schemas ──
/**
 * lane-layout.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
/** Escala lineal tiempo → píxel, invertible (`invert(px)` devuelve ms). */
export type TimeScale = ((ms: number) => number) & { invert: (px: number) => number };
const TimeScaleSchema = z.custom<TimeScale>((v) => typeof v === 'function' && typeof Reflect.get(v, 'invert') === 'function');

const TickUnitSchema = z.union([z.literal('hour'), z.literal('day'), z.literal('month'), z.literal('year')]);
export type TickUnit = z.infer<typeof TickUnitSchema>;

const TimeTickSchema = z.object({
  ms: z.number(),
  label: z.string(),
  major: z.boolean(),
});
export type TimeTick = z.infer<typeof TimeTickSchema>;

const LaneItemSchema = z.object({
  id: z.string(),
  start: z.number(),
  end: z.number().optional(),
  /* TODO: member [key: string]: unknown */
});
export type LaneItem = z.infer<typeof LaneItemSchema>;

const PackedLaneItemSchema = z.intersection(LaneItemSchema, z.object({
  lane: z.number(),
}));
export type PackedLaneItem = z.infer<typeof PackedLaneItemSchema>;

const PackLanesOptsSchema = z.object({
  laneKey: z.string().optional(),
});
export type PackLanesOpts = z.infer<typeof PackLanesOptsSchema>;

const LayoutLanesOptsSchema = z.object({
  width: z.number().optional(),
  rowH: z.number().optional(),
  rowGap: z.number().optional(),
  laneKey: z.string().optional(),
  domain: z.unknown() /* TODO: cannot convert */.optional(),
});
export type LayoutLanesOpts = z.infer<typeof LayoutLanesOptsSchema>;

const PositionedLaneItemSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  lane: z.number(),
});
export type PositionedLaneItem = z.infer<typeof PositionedLaneItemSchema>;

const LayoutLaneSchema = z.object({
  key: z.number(),
  label: z.string(),
  y: z.number(),
  h: z.number(),
});
export type LayoutLane = z.infer<typeof LayoutLaneSchema>;

const LayoutLanesResultSchema = z.object({
  items: z.array(PositionedLaneItemSchema),
  lanes: z.array(LayoutLaneSchema),
  width: z.number(),
  height: z.number(),
  scale: TimeScaleSchema,
  ticks: z.array(TimeTickSchema),
});
export type LayoutLanesResult = z.infer<typeof LayoutLanesResultSchema>;

// ── swimlane-spec.schemas ──
const SwimlaneStepKindSchema = z.union([z.literal('start'), z.literal('end'), z.literal('process'), z.literal('decision')]);
export type SwimlaneStepKind = z.infer<typeof SwimlaneStepKindSchema>;

const SwimlaneLaneSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
  description: z.string().optional(),
});
export type SwimlaneLaneSpec = z.infer<typeof SwimlaneLaneSpecSchema>;

const SwimlaneStepSpecSchema = z.object({
  id: z.string(),
  lane: z.string(),
  label: z.string(),
  kind: SwimlaneStepKindSchema,
  column: z.number().optional(),
  description: z.string().optional(),
});
export type SwimlaneStepSpec = z.infer<typeof SwimlaneStepSpecSchema>;

const SwimlaneLinkSpecSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
});
export type SwimlaneLinkSpec = z.infer<typeof SwimlaneLinkSpecSchema>;

const SwimlaneResolvedSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  lanes: z.array(SwimlaneLaneSpecSchema),
  steps: z.array(SwimlaneStepSpecSchema),
  links: z.array(SwimlaneLinkSpecSchema),
});
export type SwimlaneResolvedSpec = z.infer<typeof SwimlaneResolvedSpecSchema>;

const SwimlaneLayoutLaneSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
  description: z.string().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  labelW: z.number(),
});
export type SwimlaneLayoutLane = z.infer<typeof SwimlaneLayoutLaneSchema>;

export const SwimlaneLayoutStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: SwimlaneStepKindSchema,
  lane: z.string(),
  description: z.string().optional(),
  hue: z.number().optional(),
  column: z.number(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type SwimlaneLayoutStep = z.infer<typeof SwimlaneLayoutStepSchema>;

export const SwimlaneLayoutLinkSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  forward: z.boolean(),
  path: z.string(),
  arrowTipX: z.number(),
  arrowTipY: z.number(),
  labelX: z.number(),
  labelY: z.number(),
  hue: z.number().optional(),
  /** Ancho medido del chip de la etiqueta; lo añade `applyEdgeActorLayout` (edge-actors). */
  labelW: LabeledEdgeSchema.shape.labelW,
});
export type SwimlaneLayoutLink = z.infer<typeof SwimlaneLayoutLinkSchema>;

const SwimlaneLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  lanes: z.array(SwimlaneLayoutLaneSchema),
  steps: z.array(SwimlaneLayoutStepSchema),
  links: z.array(SwimlaneLayoutLinkSchema),
  columns: z.number(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
});
export type SwimlaneLayout = z.infer<typeof SwimlaneLayoutSchema>;
