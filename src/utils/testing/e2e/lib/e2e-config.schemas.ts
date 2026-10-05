/**
 * e2e-config.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const EstadoE2ESchema = z.union([z.literal('success'), z.literal('error'), z.literal('warn'), z.literal('run'), z.literal('info')]);
export type EstadoE2E = z.infer<typeof EstadoE2ESchema>;

