/**
 * observer.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ObserverTypeSchema = z.union([z.literal('intersection'), z.literal('mutation'), z.literal('resize')]);
export type ObserverType = z.infer<typeof ObserverTypeSchema>;

