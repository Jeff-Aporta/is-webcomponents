/**
 * component-pack.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ClusterColumnSchema = z.object({
  items: z.array(z.unknown() /* TODO: ref Componente */),
});
export type ClusterColumn = z.infer<typeof ClusterColumnSchema>;


export const GroupConvSchema = z.object({
  xs: z.array(z.number()),
  ys: z.array(z.number()),
  occ: z.array(z.array(z.boolean())),
});
export type GroupConv = z.infer<typeof GroupConvSchema>;


