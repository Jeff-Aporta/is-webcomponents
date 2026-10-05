/**
 * stagehand.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SesionStagehandSchema = z.object({
  baseUrl: z.string(),
  cerrar: z.function({ input: [], output: z.promise(z.void()) }),
  inspeccionarTag: z.function({ input: [z.string(), z.string()], output: z.promise(z.unknown() /* TODO: ref ReportePagina */) }),
  inspeccionarSinBrowser: z.function({ input: [z.string(), z.string()], output: z.promise(z.unknown() /* TODO: ref ReportePagina */) }).optional(),
});
export type SesionStagehand = z.infer<typeof SesionStagehandSchema>;


export const ReportePaginaSchema = z.object({
  tag: z.string(),
  titulo: z.string(),
  url: z.string(),
  duracionMs: z.number(),
  erroresConsola: z.array(z.string()),
  warningsConsola: z.array(z.string()),
  tagsEncontrados: z.array(z.string()),
  demosRenderizados: z.number(),
  demosEsperados: z.number(),
  controlesEsperados: z.number(),
  controlesConectados: z.number(),
  hallazgos: z.array(z.unknown() /* TODO: ref Hallazgo */),
});
export type ReportePagina = z.infer<typeof ReportePaginaSchema>;

