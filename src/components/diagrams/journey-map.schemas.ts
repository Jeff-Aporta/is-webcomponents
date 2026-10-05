/**
 * journey-map.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const JnLayoutStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  phase: z.string(),
  actor: z.string().optional(),
  description: z.string().optional(),
  score: z.number().optional(),
  hue: z.number().optional(),
  cx: z.number(),
  cy: z.number(),
  labelY: z.number(),
  actorY: z.number(),
  hasScore: z.boolean(),
});
export type JnLayoutStep = z.infer<typeof JnLayoutStepSchema>;


export const JnLayoutPhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  overflow: z.union([z.literal('grow'), z.literal('ellipsis'), z.literal('shrink')]).optional(),
});
export type JnLayoutPhase = z.infer<typeof JnLayoutPhaseSchema>;


export const JnLayoutGridLineSchema = z.object({
  value: z.number(),
  y: z.number(),
  x1: z.number(),
  x2: z.number(),
  labelX: z.number(),
});
export type JnLayoutGridLine = z.infer<typeof JnLayoutGridLineSchema>;


export const JnLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  plot: z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
}),
  phases: z.array(JnLayoutPhaseSchema),
  steps: z.array(JnLayoutStepSchema),
  line: z.string(),
  gridLines: z.array(JnLayoutGridLineSchema),
  scale: z.object({
  min: z.number(),
  max: z.number(),
}),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
});
export type JnLayout = z.infer<typeof JnLayoutSchema>;


export const StepEntrySchema = z.object({
  s: JnLayoutStepSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type StepEntry = z.infer<typeof StepEntrySchema>;

