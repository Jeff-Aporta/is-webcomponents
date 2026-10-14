/**
 * command-palette.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const PaletteElSchema = z.object({
  open: z.function({ input: [], output: z.void() }),
  close: z.function({ input: [], output: z.void() }),
});
export type PaletteEl = z.infer<typeof PaletteElSchema>;


export const SelectDetailSchema = z.object({
  command: z.object({
  id: z.string(),
}),
});
export type SelectDetail = z.infer<typeof SelectDetailSchema>;

