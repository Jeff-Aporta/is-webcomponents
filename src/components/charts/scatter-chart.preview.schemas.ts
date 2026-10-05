/**
 * scatter-chart.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ScatterChartLikeSchema = z.object({
  config: z.object({
  data: z.object({
  datasets: z.array(z.object({
  label: z.string(),
  data: z.array(z.object({
  x: z.number(),
  y: z.number(),
})),
})),
}),
}),
});
export type ScatterChartLike = z.infer<typeof ScatterChartLikeSchema>;

