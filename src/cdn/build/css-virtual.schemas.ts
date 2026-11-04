/**
 * css-virtual.ts — contratos del import virtual `iswc:css` (plan D6).
 */
import { z } from "zod";

export const CssVirtualOptionsSchema = z.object({
  /** Carpeta absoluta del staging de SCSS→CSS (por defecto `.tmp-scss/src` del kit). */
  staging: z.string().optional(),
  /** Carpeta absoluta de las fuentes que espeja el staging (por defecto `src/` del kit). */
  fuentes: z.string().optional(),
});
export type CssVirtualOptions = z.infer<typeof CssVirtualOptionsSchema>;
