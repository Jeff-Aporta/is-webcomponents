// @contexto INDICE.md · src/components/layout/README.md
/**
 * page-header.schemas.ts — props de `<iswc-page-header>`.
 */
import { z } from "zod";

export const PageHeaderPropsSchema = z.object({
  titulo: z.string(),
  subtitulo: z.string(),
  /** Ícono Iconify (`mdi:home`) junto al título. */
  icono: z.string(),
});
export type PageHeaderProps = z.infer<typeof PageHeaderPropsSchema>;
