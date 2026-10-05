/**
 * marks-cartesian.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const MarksDatasetSchema = z.intersection(z.unknown() /* TODO: ref ChartDataset */, z.object({
  curve: z.string().optional(),
  stepped: z.boolean().optional(),
  tension: z.number().optional(),
  borderColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  borderWidth: z.number().optional(),
  borderRadius: z.number().optional(),
  pointRadius: z.number().optional(),
  fill: z.union([z.boolean(), z.string(), z.number()]).optional(),
  __i: z.number().optional(),
}));
export type MarksDataset = z.infer<typeof MarksDatasetSchema>;


export const ProjectedPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  value: z.number(),
  index: z.number(),
});
export type ProjectedPoint = z.infer<typeof ProjectedPointSchema>;


export const XYPointSchema = z.object({
  x: z.number().optional(),
  y: z.number(),
  r: z.number().optional(),
});
export type XYPoint = z.infer<typeof XYPointSchema>;


export const CurveKindSchema = z.union([z.literal('linear'), z.literal('natural'), z.literal('step')]);
export type CurveKind = z.infer<typeof CurveKindSchema>;

