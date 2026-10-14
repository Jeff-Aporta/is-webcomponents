/**
 * ensure-element.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const EnsureElementOptsSchema = z.object({
  href: z.string().optional(),
  load: z.function({ input: [], output: z.promise(z.unknown()) }).optional(),
  timeoutMs: z.number().optional(),
});
export type EnsureElementOpts = z.infer<typeof EnsureElementOptsSchema>;

