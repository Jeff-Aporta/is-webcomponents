/**
 * diagram-edge-style.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const EdgeWithHueSchema = z.object({
  hue: z.number().optional(),
  /* TODO: member [key: string]: unknown */
});
export type EdgeWithHue = z.infer<typeof EdgeWithHueSchema>;



/** Caja con color propio (emisor / receptor de la paleta W60). */
export const ColoredSchema = z.object({
  id: z.string(),
  color: z.string().optional(),
});
export type Colored = z.infer<typeof ColoredSchema>;

/** Arista con color propio. */
export const EdgedSchema = z.object({
  from: z.string(),
  to: z.string(),
  color: z.string().optional(),
});
export type Edged = z.infer<typeof EdgedSchema>;
