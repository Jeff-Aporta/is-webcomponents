/**
 * reporter.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ReporteJsonSchema = z.object({
  schema: z.literal('iswc-audit/v1'),
  corridaId: z.string(),
  inicio: z.string(),
  fin: z.string(),
  duracionMs: z.number(),
  conteo: z.record(z.unknown() /* TODO: ref Severidad */, z.number()),
  total: z.number(),
  estado: z.object({
  ok: z.number(),
  warning: z.number(),
  fail: z.number(),
}),
  componentes: z.array(ReporteJsonComponenteSchema),
  erroresMotor: z.array(z.unknown() /* TODO: ref Hallazgo */),
});
export type ReporteJson = z.infer<typeof ReporteJsonSchema>;


export const ReporteJsonComponenteSchema = z.object({
  tag: z.string(),
  titulo: z.string(),
  categoria: z.string(),
  estado: z.union([z.literal('ok'), z.literal('warning'), z.literal('fail')]),
  rutaJson: z.string(),
  rutaModulo: z.string().optional(),
  conteo: z.record(z.unknown() /* TODO: ref Severidad */, z.number()),
  hallazgos: z.array(z.unknown() /* TODO: ref Hallazgo */),
  metricas: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});
export type ReporteJsonComponente = z.infer<typeof ReporteJsonComponenteSchema>;

