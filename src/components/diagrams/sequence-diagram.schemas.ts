/**
 * sequence-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
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


export const MsgNodeSchema = z.object({
  m: z.unknown() /* TODO: ref SequenceLayoutMessage */,
  g: z.unknown() /* TODO: ref SVGGElement */,
  path: z.unknown() /* TODO: ref SVGPathElement */,
  arrow: z.unknown() /* TODO: ref SVGElement */,
  dot: z.unknown() /* TODO: ref SVGCircleElement */,
  labelNode: z.union([z.unknown() /* TODO: ref SVGElement */, z.null()]),
});
export type MsgNode = z.infer<typeof MsgNodeSchema>;


export const LifelineNodeSchema = z.object({
  x: z.number(),
  line: z.unknown() /* TODO: ref SVGLineElement */,
});
export type LifelineNode = z.infer<typeof LifelineNodeSchema>;


export const ActorNodeSchema = z.object({
  x: z.number(),
  g: z.unknown() /* TODO: ref SVGGElement */,
  rect: z.unknown() /* TODO: ref SVGRectElement */,
});
export type ActorNode = z.infer<typeof ActorNodeSchema>;

