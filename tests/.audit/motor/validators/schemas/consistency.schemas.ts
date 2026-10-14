/**
 * consistency.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const MetaComponenteSchema = z.object({
  ruta: z.string(),
  atributosObservados: z.set(z.string()),
  propsPublicas: z.set(z.string()),
  defineCustomElement: z.boolean(),
  guardIdempotente: z.boolean(),
  slots: z.set(z.string()),
  heredaBase: z.boolean(),
});
export type MetaComponente = z.infer<typeof MetaComponenteSchema>;


export const OpcionesConsistenciaSchema = z.object({
  esModulo: z.boolean().optional(),
});
export type OpcionesConsistencia = z.infer<typeof OpcionesConsistenciaSchema>;

