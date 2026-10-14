/**
 * 04-tree-flow.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CursorHookSchema = z.function({ input: [], output: z.void() });
export type CursorHook = z.infer<typeof CursorHookSchema>;

