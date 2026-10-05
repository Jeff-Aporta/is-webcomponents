/**
 * state-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const TurtleStateSchema = z.object({
  playing: z.boolean(),
  idx: z.number(),
  total: z.number(),
  replay: z.number(),
});
export type TurtleState = z.infer<typeof TurtleStateSchema>;


export const NodeNodeEntrySchema = z.object({
  n: z.unknown() /* TODO: ref StateLayoutNode */,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type NodeNodeEntry = z.infer<typeof NodeNodeEntrySchema>;


export const EdgeNodeEntrySchema = z.object({
  e: z.unknown() /* TODO: ref StateLayoutTransition */,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type EdgeNodeEntry = z.infer<typeof EdgeNodeEntrySchema>;

