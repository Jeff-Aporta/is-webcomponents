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


export const RouteAvoidOptsSchema = z.object({
  clearance: z.number().optional(),
  fromSide: z.unknown() /* TODO: ref Lado */.optional(),
  toSide: z.unknown() /* TODO: ref Lado */.optional(),
  fromBox: z.unknown() /* TODO: ref Caja */.optional(),
  toBox: z.unknown() /* TODO: ref Caja */.optional(),
  usedSegs: z.array(z.object({
  a: z.unknown() /* TODO: ref Punto */,
  b: z.unknown() /* TODO: ref Punto */,
})).optional(),
  frame: z.unknown() /* TODO: ref Caja */.optional(),
  wrapBoxes: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  _loose: z.boolean().optional(),
  rank: z.number().optional(),
  total: z.number().optional(),
});
export type RouteAvoidOpts = z.infer<typeof RouteAvoidOptsSchema>;

