// @contexto INDICE.md · src/components/charts/README.md
/**
 * marks-waterfall.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import { ChartDatasetSchema } from './chart.schemas.js';

const WaterfallKindSchema = z.union([z.literal('up'), z.literal('down'), z.literal('total')]);

const WaterfallBarSchema = z.object({
  index: z.number(),
  start: z.number(),
  end: z.number(),
  kind: WaterfallKindSchema,
});
export type WaterfallBar = z.infer<typeof WaterfallBarSchema>;

const WaterfallDatasetSchema = z.intersection(ChartDatasetSchema, z.object({
  totals: z.array(z.number()).optional(),
}));
export type WaterfallDataset = z.infer<typeof WaterfallDatasetSchema>;

