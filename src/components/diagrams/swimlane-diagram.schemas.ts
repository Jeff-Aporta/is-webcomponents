/**
 * swimlane-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const StepKindSchema = z.union([z.literal('process'), z.literal('decision'), z.literal('start'), z.literal('end')]);
export type StepKind = z.infer<typeof StepKindSchema>;


export const SwLayoutStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: StepKindSchema,
  lane: z.string(),
  description: z.string().optional(),
  hue: z.number().optional(),
  column: z.number(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  overflow: z.union([z.literal('grow'), z.literal('ellipsis'), z.literal('shrink')]).optional(),
});
export type SwLayoutStep = z.infer<typeof SwLayoutStepSchema>;


export const SwLayoutLinkSchema = z.object({
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
  labelW: z.number().optional(),
  hue: z.number().optional(),
});
export type SwLayoutLink = z.infer<typeof SwLayoutLinkSchema>;


export const SwLayoutLaneSchema = z.object({
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
export type SwLayoutLane = z.infer<typeof SwLayoutLaneSchema>;


export const SwLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  lanes: z.array(SwLayoutLaneSchema),
  steps: z.array(SwLayoutStepSchema),
  links: z.array(SwLayoutLinkSchema),
  columns: z.number(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
});
export type SwLayout = z.infer<typeof SwLayoutSchema>;


export const StepEntrySchema = z.object({
  s: SwLayoutStepSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type StepEntry = z.infer<typeof StepEntrySchema>;


export const LinkEntrySchema = z.object({
  l: SwLayoutLinkSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type LinkEntry = z.infer<typeof LinkEntrySchema>;

