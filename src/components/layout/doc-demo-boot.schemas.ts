/**
 * doc-demo-boot.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const DocDemoBootOptsSchema = z.object({
  defaultTheme: z.string().optional(),
  defaultPalette: z.string().optional(),
});
export type DocDemoBootOpts = z.infer<typeof DocDemoBootOptsSchema>;

