/**
 * marks-radial.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const RadialDatasetSchema = z.intersection(z.unknown() /* TODO: ref ChartDataset */, z.object({
  backgroundColor: z.array(z.union([z.string(), z.string()])).optional(),
  borderColor: z.string().optional(),
  __i: z.number().optional(),
}));
export type RadialDataset = z.infer<typeof RadialDatasetSchema>;


export const SliceSchema = z.object({
  value: z.number(),
  index: z.number(),
  label: z.string(),
});
export type Slice = z.infer<typeof SliceSchema>;

