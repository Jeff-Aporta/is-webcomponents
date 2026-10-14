/**
 * venn-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const VennSetSchema = z.object({
  id: z.string(),
  label: z.string(),
  hue: z.number(),
  description: z.string().optional(),
});
export type VennSet = z.infer<typeof VennSetSchema>;


export const VennRegionSchema = z.object({
  id: z.string(),
  sets: z.array(z.string()),
  label: z.string().optional(),
  value: z.number().optional(),
  description: z.string().optional(),
});
export type VennRegion = z.infer<typeof VennRegionSchema>;


export const VennSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  sets: z.array(VennSetSchema),
  regions: z.array(VennRegionSchema),
});
export type VennSpec = z.infer<typeof VennSpecSchema>;


export const VennJsonOutSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  sets: z.array(z.object({
  id: z.string(),
  label: z.string(),
  hue: z.number(),
  desc: z.string().optional(),
})),
  regions: z.array(z.object({
  sets: z.array(z.string()),
  label: z.string().optional(),
  value: z.number().optional(),
  desc: z.string().optional(),
})).optional(),
});
export type VennJsonOut = z.infer<typeof VennJsonOutSchema>;


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
  x: z.number(),
  y: z.number(),
  hues: z.array(z.number()),
});
export type VennLayoutRegion = z.infer<typeof VennLayoutRegionSchema>;


export const VennLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  circles: z.array(VennLayoutCircleSchema),
  regions: z.array(VennLayoutRegionSchema),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
});
export type VennLayout = z.infer<typeof VennLayoutSchema>;

