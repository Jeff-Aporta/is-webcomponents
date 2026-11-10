// @contexto INDICE.md · src/components/navigation/README.md
/**
 * pagination.schemas.ts — tipos de `<iswc-pagination>`.
 */
import { z } from "zod";

/** Textos para lectores de pantalla; `{n}` y `{total}` se reemplazan. */
export const PaginationTextosSchema = z.object({
  pagina: z.string(),
  irA: z.string(),
  resumen: z.string(),
  izquierda: z.string(),
  derecha: z.string(),
  tamano: z.string(),
});
export type PaginationTextos = z.infer<typeof PaginationTextosSchema>;

const PaginationChangeDetailSchema = z.object({ page: z.number() });
export type PaginationChangeDetail = z.infer<typeof PaginationChangeDetailSchema>;

const PaginationSizeDetailSchema = z.object({ pageSize: z.number() });
export type PaginationSizeDetail = z.infer<typeof PaginationSizeDetailSchema>;
