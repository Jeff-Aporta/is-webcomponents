/**
 * flowchart.ts — Zod schemas para los tipos extraídos de este módulo.
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
  n: z.unknown() /* TODO: ref FlowLayoutNode */,
  g: z.unknown() /* TODO: ref SVGGElement */,
  box: z.unknown() /* TODO: ref SVGPathElement */,
});
export type NodeNodeEntry = z.infer<typeof NodeNodeEntrySchema>;


export const EdgeNodeEntrySchema = z.object({
  e: z.unknown() /* TODO: ref FlowLayoutEdge */,
  g: z.unknown() /* TODO: ref SVGGElement */,
  path: z.unknown() /* TODO: ref SVGPathElement */,
});
export type EdgeNodeEntry = z.infer<typeof EdgeNodeEntrySchema>;



/** Tinta del texto de un nodo (insoft o clásico). */
export const FlowInkSchema = z.object({
  text: z.string(),
  muted: z.string(),
  font: z.string(),
  fontSize: z.number(),
  fontWeight: z.number(),
});
export type FlowInk = z.infer<typeof FlowInkSchema>;
