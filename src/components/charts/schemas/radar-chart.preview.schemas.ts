/**
 * radar-chart.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const RadarChartLikeSchema = z.object({
  config: z.object({
  data: z.object({
  labels: z.array(z.string()),
  datasets: z.array(z.object({
  label: z.string(),
  data: z.array(z.number()),
  fill: z.boolean(),
})),
}),
}),
});
export type RadarChartLike = z.infer<typeof RadarChartLikeSchema>;

