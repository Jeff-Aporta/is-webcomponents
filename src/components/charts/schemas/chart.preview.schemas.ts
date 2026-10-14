/**
 * chart.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IswcChartElementSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.unknown() /* TODO: ref IswcChart */);
export type IswcChartElement = z.infer<typeof IswcChartElementSchema>;

