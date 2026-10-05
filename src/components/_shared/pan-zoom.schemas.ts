/**
 * pan-zoom.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const PanZoomViewSchema = z.object({
  scale: z.number(),
  x: z.number(),
  y: z.number(),
});
export type PanZoomView = z.infer<typeof PanZoomViewSchema>;


export const PanZoomOptionsSchema = z.object({
  minScale: z.number().optional(),
  maxScale: z.number().optional(),
  zoomFactor: z.number().optional(),
  panThresholdPx: z.number().optional(),
  wheelZooms: z.boolean().optional(),
  onChange: z.function({ input: [z.unknown() /* TODO: ref PanZoomView */], output: z.void() }).optional(),
  onPanEnd: z.function({ input: [], output: z.void() }).optional(),
});
export type PanZoomOptions = z.infer<typeof PanZoomOptionsSchema>;


export const PanZoomControllerSchema = z.object({
  /* TODO: parse fail readonly view: PanZoomView */
  setView: z.function({ input: [z.unknown() /* TODO: ref PanZoomView */], output: z.void() }),
  zoomBy: z.function({ input: [z.number(), z.number(), z.number()], output: z.void() }),
  reset: z.function({ input: [], output: z.void() }),
  apply: z.function({ input: [], output: z.void() }),
  destroy: z.function({ input: [], output: z.void() }),
});
export type PanZoomController = z.infer<typeof PanZoomControllerSchema>;

