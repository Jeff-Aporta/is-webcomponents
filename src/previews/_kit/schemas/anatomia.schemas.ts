/**
 * anatomia.schemas.ts — parte de la anatomía en el estándar `iswc-preview/v1`.
 */
import { z } from "zod";

/** `scss`: URL de la fuente de estilos del componente; la galería la deriva de su `.json` si falta. */
export const ZAnatomia = z.object({ scss: z.string().min(1).optional() }).strict();
export type Anatomia = z.infer<typeof ZAnatomia>;
