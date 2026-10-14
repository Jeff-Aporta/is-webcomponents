/**
 * popover.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const FloatingElementSchema = z.object({
  active: z.boolean(),
  placement: z.string(),
  distance: z.number(),
  skidding: z.number(),
  arrow: z.boolean(),
  strategy: z.string(),
  flip: z.boolean(),
  shift: z.boolean(),
  autoSize: z.union([z.string(), z.boolean()]),
  boundary: z.string(),
  flipFallbackPlacements: z.string(),
  flipFallbackStrategy: z.string(),
  flipPadding: z.number(),
  shiftPadding: z.number(),
  autoSizePadding: z.number(),
  hoverBridge: z.boolean(),
  anchor: z.unknown(),
  reposition: z.function({ input: [], output: z.void() }),
});
export type FloatingElement = z.infer<typeof FloatingElementSchema>;

