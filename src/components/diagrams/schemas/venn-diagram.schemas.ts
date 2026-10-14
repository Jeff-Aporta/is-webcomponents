/**
 * venn-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const VennLayoutCircleSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  hue: z.number(),
  cx: z.number(),
  cy: z.number(),
  r: z.number(),
  labelX: z.number(),
  labelY: z.number(),
});
export type VennLayoutCircle = z.infer<typeof VennLayoutCircleSchema>;


export const VennLayoutRegionSchema = z.object({
  id: z.string(),
  sets: z.array(z.string()),
  label: z.string().optional(),
  value: z.number().optional(),
  description: z.string().optional(),
  x: z.number(),
  y: z.number(),
  hues: z.array(z.number()),
});
export type VennLayoutRegion = z.infer<typeof VennLayoutRegionSchema>;


export const CircleNodeEntrySchema = z.object({
  c: VennLayoutCircleSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type CircleNodeEntry = z.infer<typeof CircleNodeEntrySchema>;


export const RegionNodeEntrySchema = z.object({
  r: VennLayoutRegionSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type RegionNodeEntry = z.infer<typeof RegionNodeEntrySchema>;

