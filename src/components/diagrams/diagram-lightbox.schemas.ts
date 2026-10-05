/**
 * diagram-lightbox.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const TurtleStateDetailSchema = z.object({
  playing: z.boolean(),
  replay: z.number(),
  idx: z.number(),
  total: z.number(),
});
export type TurtleStateDetail = z.infer<typeof TurtleStateDetailSchema>;


export const ToggleGroupDetailSchema = z.object({
  id: z.string(),
});
export type ToggleGroupDetail = z.infer<typeof ToggleGroupDetailSchema>;


export const TurtleApiSchema = z.object({
  play: z.function({ input: [], output: z.void() }),
  pause: z.function({ input: [], output: z.void() }),
  stop: z.function({ input: [], output: z.void() }),
  next: z.function({ input: [], output: z.void() }),
  prev: z.function({ input: [], output: z.void() }),
});
export type TurtleApi = z.infer<typeof TurtleApiSchema>;


export const DiagramHostSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  payload: z.unknown(),
  hiddenGroups: z.set(z.string()).optional(),
  turtle: z.union([TurtleApiSchema, z.null()]).optional(),
}));
export type DiagramHost = z.infer<typeof DiagramHostSchema>;

