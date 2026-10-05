/**
 * vendor-e2e-config.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ResultadoVendorSchema = z.union([z.literal('ok'), z.literal('skip')]);
export type ResultadoVendor = z.infer<typeof ResultadoVendorSchema>;

