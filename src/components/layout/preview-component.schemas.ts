/**
 * preview-component.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const DrawerElSchema = z.object({
  show: z.function({ input: [], output: z.void() }).optional(),
  hide: z.function({ input: [], output: z.void() }).optional(),
});
export type DrawerEl = z.infer<typeof DrawerElSchema>;

