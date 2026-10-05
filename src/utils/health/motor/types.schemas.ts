/**
 * types.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SeveridadSchema = z.union([z.literal('fatal'), z.literal('error'), z.literal('warn'), z.literal('info')]);
export type Severidad = z.infer<typeof SeveridadSchema>;


export const CategoriaHallazgoSchema = z.union([z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */, z.literal('visual')]);
export type CategoriaHallazgo = z.infer<typeof CategoriaHallazgoSchema>;


export const HallazgoSchema = z.object({
  categoria: CategoriaHallazgoSchema,
  severidad: SeveridadSchema,
  tag: z.union([z.string(), z.null()]),
  ruta: z.string().optional(),
  mensaje: z.string(),
  detalle: z.unknown().optional(),
  sugerencia: z.string().optional(),
  linea: z.number().optional(),
});
export type Hallazgo = z.infer<typeof HallazgoSchema>;


export const ReporteComponenteSchema = z.object({
  tag: z.string(),
  categoria: z.string(),
  titulo: z.string(),
  rutaJson: z.string(),
  rutaModulo: z.string().optional(),
  hallazgos: z.array(HallazgoSchema),
  metricas: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
  estado: z.union([z.literal('ok'), z.literal('warning'), z.literal('fail')]),
});
export type ReporteComponente = z.infer<typeof ReporteComponenteSchema>;


export const ReporteAuditoriaSchema = z.object({
  motorVersion: z.string(),
  inicio: z.string(),
  fin: z.string(),
  duracionMs: z.number(),
  totalComponentes: z.number(),
  conteo: z.record(SeveridadSchema, z.number()),
  componentes: z.array(ReporteComponenteSchema),
  erroresMotor: z.array(HallazgoSchema),
});
export type ReporteAuditoria = z.infer<typeof ReporteAuditoriaSchema>;


export const PruebaSchema = z.object({
  id: z.string(),
  categoria: CategoriaHallazgoSchema,
  descripcion: z.string(),
  ejecutar: z.function({ input: [z.unknown() /* TODO: ref TInput */, z.unknown() /* TODO: ref ContextoPrueba */], output: z.array(z.union([z.promise(z.array(z.unknown() /* TODO: ref Hallazgo */)), z.unknown() /* TODO: ref Hallazgo */])) }),
});
export type Prueba = z.infer<typeof PruebaSchema>;


export const ContextoPruebaSchema = z.object({
  tag: z.string(),
  categoria: z.string(),
  titulo: z.string(),
  rutaJsonAbsoluta: z.string(),
  definicion: z.unknown(),
  fuenteJson: z.string(),
  page: z.unknown().optional(),
});
export type ContextoPrueba = z.infer<typeof ContextoPruebaSchema>;


export const OpcionesRunnerSchema = z.object({
  solo: z.array(z.string()).optional(),
  categorias: z.array(z.string()).optional(),
  limite: z.number().optional(),
  puerto: z.number().optional(),
  urlBase: z.string().optional(),
  saltarE2E: z.boolean().optional(),
  soloJson: z.boolean().optional(),
  salidaJson: z.string().optional(),
  salidaMarkdown: z.string().optional(),
  verbose: z.boolean().optional(),
  fallarEnFatal: z.boolean().optional(),
});
export type OpcionesRunner = z.infer<typeof OpcionesRunnerSchema>;

