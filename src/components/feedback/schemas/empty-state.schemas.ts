// @contexto INDICE.md · src/components/feedback/README.md
/**
 * empty-state.schemas.ts — props de `<iswc-empty-state>`.
 */
import { z } from "zod";

const EmptyStateEstadoSchema = z.enum(["vacio", "cargando", "error"]);

/** `caja` punteada para listas; `tarjeta` con cuerpo propio para una vista entera (sin sesión, sin permiso). */
const EmptyStateVarianteSchema = z.enum(["caja", "tarjeta"]);

export const EmptyStatePropsSchema = z.object({
  icono: z.string(),
  titulo: z.string(),
  texto: z.string(),
  estado: EmptyStateEstadoSchema,
  variante: EmptyStateVarianteSchema,
  /** Título mientras `estado` es `cargando`. */
  textoCargando: z.string(),
});
export type EmptyStateProps = z.infer<typeof EmptyStatePropsSchema>;
