/**
 * er-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ClusterBoxSchema = z.object({
  key: z.number(),
  nodes: z.array(z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  layer: z.number(),
  order: z.number(),
})),
  padTop: z.number(),
  padLado: z.number(),
  w: z.number(),
  h: z.number(),
});
export type ClusterBox = z.infer<typeof ClusterBoxSchema>;


export const ClusterRawSchema = z.object({
  id: z.union([z.string(), z.null()]),
  name: z.string(),
  hue: z.union([z.number(), z.undefined()]),
  ids: z.array(z.string()),
  boxed: z.boolean(),
  parentId: z.string().optional(),
  depth: z.number(),
});
export type ClusterRaw = z.infer<typeof ClusterRawSchema>;

