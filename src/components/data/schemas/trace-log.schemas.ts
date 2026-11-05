/**
 * trace-log.schemas.ts — props de `<iswc-trace-log>`.
 */
import { z } from "zod";

const TraceNivelSchema = z.enum(["debug", "info", "warn", "error"]);
export type TraceNivel = z.infer<typeof TraceNivelSchema>;

/** Un paso del proceso: `ms` desde el inicio, nivel, etapa, mensaje y, si los hay, su duración y sus datos. */
const TraceEventoSchema = z.object({
  seq: z.number().int().nonnegative(),
  ts: z.string(),
  ms: z.number().int().nonnegative(),
  nivel: TraceNivelSchema,
  etapa: z.string().min(1),
  mensaje: z.string(),
  dur: z.number().int().nonnegative().optional(),
  datos: z.record(z.string(), z.json()).optional(),
});
export type TraceEvento = z.infer<typeof TraceEventoSchema>;

const TraceFiltroSchema = z.enum(["todo", "info", "warn", "error"]);
export type TraceFiltro = z.infer<typeof TraceFiltroSchema>;

/** Textos visibles; cada clave reemplaza la de por defecto. */
const TraceTextosSchema = z.object({
  evento: z.string(),
  eventos: z.string(),
  aviso: z.string(),
  avisos: z.string(),
  error: z.string(),
  errores: z.string(),
  enVivo: z.string(),
  filtrar: z.string(),
  todo: z.string(),
  info: z.string(),
  warn: z.string(),
  soloErrores: z.string(),
  copiar: z.string(),
  listado: z.string(),
  datos: z.string(),
  vacio: z.string(),
});
export type TraceTextos = z.infer<typeof TraceTextosSchema>;

export const TraceLogPropsSchema = z.object({
  eventos: z.array(TraceEventoSchema),
  /** Título de la cabecera. */
  titulo: z.string(),
  filtro: TraceFiltroSchema,
  /** Nace desplegada. */
  abierto: z.boolean(),
  /** El proceso sigue en curso: despliega la traza y marca el último paso. */
  enVivo: z.boolean(),
  textos: TraceTextosSchema.partial(),
});
export type TraceLogProps = z.infer<typeof TraceLogPropsSchema>;
