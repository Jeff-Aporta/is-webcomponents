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

