/**
 * alias.ts — contratos del alias `@jeff-aporta/iswc-base/<ruta>`.
 */
import { z } from "zod";

export const AliasKitOptionsSchema = z.object({
  /** Carpeta absoluta a la que apunta el alias (por defecto `src/` del kit). */
  raiz: z.string().optional(),
  /** Prefijo del alias, con barra final (por defecto `@jeff-aporta/iswc-base/`). */
  prefijo: z.string().optional(),
});
export type AliasKitOptions = z.infer<typeof AliasKitOptionsSchema>;

/** Traduce la ruta bajo el alias (`core/element.js`) al especificador final, o null para dejarlo igual. */
export type MapeoAlias = (ruta: string) => string | null;
