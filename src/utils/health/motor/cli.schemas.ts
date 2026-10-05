/**
 * cli.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ArgSpecSchema = z.object({
  nombre: z.string(),
  descripcion: z.string(),
  tipo: z.union([z.literal('string'), z.literal('boolean'), z.literal('number')]),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});
export type ArgSpec = z.infer<typeof ArgSpecSchema>;

