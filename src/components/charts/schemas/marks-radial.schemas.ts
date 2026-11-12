// @contexto INDICE.md · src/components/charts/README.md
/**
 * marks-radial.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import { ChartDatasetSchema } from './chart.schemas.js';

const RadialDatasetSchema = z.intersection(ChartDatasetSchema, z.object({
  backgroundColor: z.array(z.union([z.string(), z.string()])).optional(),
  borderColor: z.string().optional(),
  __i: z.number().optional(),
}));
export type RadialDataset = z.infer<typeof RadialDatasetSchema>;

const SliceSchema = z.object({
  value: z.number(),
  index: z.number(),
  label: z.string(),
});
export type Slice = z.infer<typeof SliceSchema>;

