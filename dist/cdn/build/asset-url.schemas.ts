/**
 * asset-url.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const LoaderGlobalSchema = z.object({
  ISWebComponentsLoader: z.object({
  assetUrl: z.function({ input: [z.string()], output: z.string() }).optional(),
}).optional(),
});
export type LoaderGlobal = z.infer<typeof LoaderGlobalSchema>;

