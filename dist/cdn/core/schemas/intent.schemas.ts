/**
 * intent.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IntentSchema = z.unknown() /* TODO: cannot convert */;
export type Intent = z.infer<typeof IntentSchema>;

