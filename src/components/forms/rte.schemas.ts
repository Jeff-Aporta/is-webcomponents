/**
 * rte.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const RteCommandDefSchema = z.object({
  icon: z.string().optional(),
  title: z.string().optional(),
  run: z.function({ input: [z.unknown() /* TODO: ref HTMLElement */], output: z.void() }),
});
export type RteCommandDef = z.infer<typeof RteCommandDefSchema>;

