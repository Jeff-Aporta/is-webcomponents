// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * journey-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const JourneyPhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
});
export type JourneyPhase = z.infer<typeof JourneyPhaseSchema>;

const JourneyStepSchema = z.object({
  id: z.string(),
  phase: z.string(),
  label: z.string(),
  score: z.number().optional(),
  actor: z.string().optional(),
  description: z.string().optional(),
});
export type JourneyStep = z.infer<typeof JourneyStepSchema>;

const JourneyScaleSchema = z.object({
  min: z.number(),
  max: z.number(),
});

const JourneySpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  scale: JourneyScaleSchema,
  phases: z.array(JourneyPhaseSchema),
  steps: z.array(JourneyStepSchema),
});
export type JourneySpec = z.infer<typeof JourneySpecSchema>;

const JourneyPlotRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type JourneyPlotRect = z.infer<typeof JourneyPlotRectSchema>;

export const JourneyLayoutStepSchema = z.object({
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
export type JourneyLayoutStep = z.infer<typeof JourneyLayoutStepSchema>;

const JourneyLayoutPhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type JourneyLayoutPhase = z.infer<typeof JourneyLayoutPhaseSchema>;

const JourneyLayoutGridLineSchema = z.object({
  value: z.number(),
  y: z.number(),
  x1: z.number(),
  x2: z.number(),
  labelX: z.number(),
});
export type JourneyLayoutGridLine = z.infer<typeof JourneyLayoutGridLineSchema>;

const JourneyLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  plot: JourneyPlotRectSchema,
  phases: z.array(JourneyLayoutPhaseSchema),
  steps: z.array(JourneyLayoutStepSchema),
  line: z.string(),
  gridLines: z.array(JourneyLayoutGridLineSchema),
  scale: JourneyScaleSchema,
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
});
export type JourneyLayout = z.infer<typeof JourneyLayoutSchema>;

