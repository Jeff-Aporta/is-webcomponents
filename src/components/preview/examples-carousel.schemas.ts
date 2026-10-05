/**
 * examples-carousel.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ExampleSpecSchema = z.object({
  label: z.string(),
  props: z.record(z.string(), z.unknown()).optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  icon: z.string().optional(),
  swatch: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
});
export type ExampleSpec = z.infer<typeof ExampleSpecSchema>;

