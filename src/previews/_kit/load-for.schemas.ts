/**
 * src/previews/_kit/load-for.schemas.ts — Tipos del helper `loadFor`.
 *
 * Phase W56. Vivir en `*.schemas.ts` cumple el guardián W54 (no type/
 * interface top-level en `*.ts` plain). Los tipos se re-exportan desde
 * `load-for.ts` para el consumo.
 */
import { z } from "zod";

export const LoadForResultSchema = z.object({
  /** Tags nuevos que el loader descargó. */
  loaded: z.array(z.string()),
  /** Tags que ya estaban en el registry del loader. */
  skipped: z.array(z.string()),
  /** `true` si el `def` declaraba `loads` no vacío. */
  requested: z.boolean(),
});
export type LoadForResult = z.infer<typeof LoadForResultSchema>;

/** Forma mínima del loader que necesitamos (tipada estructuralmente). */
export interface LoaderLike {
  load: (...ids: string[]) => Promise<{ loaded?: string[]; skipped?: string[] }>;
}
