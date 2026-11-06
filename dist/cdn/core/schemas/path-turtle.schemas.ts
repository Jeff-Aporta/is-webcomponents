/**
 * path-turtle.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const TurtleMessageSchema = z.object({
  step: z.union([z.string(), z.number()]),
  path: z.string(),
  color: z.string().optional(),
  groupHue: z.number().optional(),
  log: z.string().optional(),
  /* TODO: member [key: string]: unknown */
});
export type TurtleMessage = z.infer<typeof TurtleMessageSchema>;

const TurtleThemeSchema = z.object({
  accent: z.string(),
  /* TODO: member [key: string]: unknown */
});
export type TurtleTheme = z.infer<typeof TurtleThemeSchema>;

const TurtlePhaseSchema = z.union([z.literal('idle'), z.literal('playing'), z.literal('between'), z.literal('waiting'), z.literal('paused'), z.literal('done')]);

const TurtleStateSchema = z.object({
  idx: z.number(),
  elapsed: z.number(),
  autoElapsed: z.number(),
  phase: TurtlePhaseSchema,
  lastTs: z.number(),
  gapStart: z.number(),
  lastPct: z.number(),
});
export type TurtleState = z.infer<typeof TurtleStateSchema>;

const TurtleReportSchema = z.object({
  playing: z.boolean(),
  idx: z.number(),
  total: z.number(),
  replay: z.number(),
});
export type TurtleReport = z.infer<typeof TurtleReportSchema>;

const TurtleDataOptsSchema = z.object({
  messages: z.array(TurtleMessageSchema).optional(),
  theme: TurtleThemeSchema,
  viewW: z.number().optional(),
  viewH: z.number().optional(),
  autoLoop: z.boolean().optional(),
  onState: z.function({ input: [TurtleReportSchema], output: z.void() }).optional(),
});
export type TurtleDataOpts = z.infer<typeof TurtleDataOptsSchema>;

const TurtleMeasureSchema = z.object({
  m: TurtleMessageSchema,
  len: z.number(),
  dur: z.number(),
});
export type TurtleMeasure = z.infer<typeof TurtleMeasureSchema>;

