// @contexto INDICE.md · src/components/overlays/README.md
/**
 * command-palette.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

/** `<iswc-command-palette>` es un elemento DOM con su API pública de apertura. */
const PaletteElSchema = z.intersection(z.custom<HTMLElement>(() => true), z.object({
  open: z.function({ input: [], output: z.void() }),
  close: z.function({ input: [], output: z.void() }),
}));
export type PaletteEl = z.infer<typeof PaletteElSchema>;

const SelectDetailSchema = z.object({
  command: z.object({
  id: z.string(),
}),
});
export type SelectDetail = z.infer<typeof SelectDetailSchema>;

