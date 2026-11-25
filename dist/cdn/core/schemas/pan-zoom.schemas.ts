// @contexto INDICE.md · src/core/README.md
/**
 * pan-zoom.schemas.ts — contratos del viewport 2D de `core/pan-zoom.ts` (vista, opciones y controlador).
 */
import { z } from 'zod';

const PanZoomViewSchema = z.object({
  scale: z.number(),
  x: z.number(),
  y: z.number(),
});
export type PanZoomView = z.infer<typeof PanZoomViewSchema>;

const PanZoomOptionsSchema = z.object({
  minScale: z.number().optional(),
  maxScale: z.number().optional(),
  zoomFactor: z.number().optional(),
  panThresholdPx: z.number().optional(),
  wheelZooms: z.boolean().optional(),
  onChange: z.function({ input: [z.custom<PanZoomView>(() => true)], output: z.void() }).optional(),
  onPanEnd: z.function({ input: [], output: z.void() }).optional(),
});
export type PanZoomOptions = z.infer<typeof PanZoomOptionsSchema>;

const PanZoomControllerSchema = z.object({
  /** Vista actual (escala + desplazamiento). */
  get view(): typeof PanZoomViewSchema { return PanZoomViewSchema; },
  setView: z.function({ input: [z.custom<Partial<PanZoomView>>()], output: z.void() }),
  zoomBy: z.function({ input: [z.number(), z.number().optional(), z.number().optional()], output: z.void() }),
  reset: z.function({ input: [], output: z.void() }),
  apply: z.function({ input: [], output: z.void() }),
  destroy: z.function({ input: [], output: z.void() }),
});
export type PanZoomController = z.infer<typeof PanZoomControllerSchema>;
