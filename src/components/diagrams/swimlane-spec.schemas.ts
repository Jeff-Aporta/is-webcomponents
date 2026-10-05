/**
 * swimlane-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SwimlaneStepKindSchema = z.union([z.literal('start'), z.literal('end'), z.literal('process'), z.literal('decision')]);
export type SwimlaneStepKind = z.infer<typeof SwimlaneStepKindSchema>;


export const SwimlaneLaneSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
  description: z.string().optional(),
});
export type SwimlaneLaneSpec = z.infer<typeof SwimlaneLaneSpecSchema>;


export const SwimlaneStepSpecSchema = z.object({
  id: z.string(),
  lane: z.string(),
  label: z.string(),
  kind: SwimlaneStepKindSchema,
  column: z.number().optional(),
  description: z.string().optional(),
});
export type SwimlaneStepSpec = z.infer<typeof SwimlaneStepSpecSchema>;


export const SwimlaneLinkSpecSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
});
export type SwimlaneLinkSpec = z.infer<typeof SwimlaneLinkSpecSchema>;


export const SwimlaneResolvedSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  lanes: z.array(SwimlaneLaneSpecSchema),
  steps: z.array(SwimlaneStepSpecSchema),
  links: z.array(SwimlaneLinkSpecSchema),
});
export type SwimlaneResolvedSpec = z.infer<typeof SwimlaneResolvedSpecSchema>;


export const SwimlaneLayoutLaneSchema = z.object({
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
});
export type SwimlaneLayoutLink = z.infer<typeof SwimlaneLayoutLinkSchema>;


export const SwimlaneLayoutSchema = z.object({
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

