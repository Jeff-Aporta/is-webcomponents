/**
 * marks-waterfall.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const WaterfallKindSchema = z.union([z.literal('up'), z.literal('down'), z.literal('total')]);
export type WaterfallKind = z.infer<typeof WaterfallKindSchema>;


export const WaterfallBarSchema = z.object({
  index: z.number(),
  start: z.number(),
  end: z.number(),
  kind: WaterfallKindSchema,
});
export type WaterfallBar = z.infer<typeof WaterfallBarSchema>;


export const WaterfallDatasetSchema = z.intersection(z.unknown() /* TODO: ref ChartDataset */, z.object({
  totals: z.array(z.unknown() /* TODO: cannot convert */).optional(),
}));
export type WaterfallDataset = z.infer<typeof WaterfallDatasetSchema>;

