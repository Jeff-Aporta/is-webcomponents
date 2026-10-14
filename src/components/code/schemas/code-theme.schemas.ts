/**
 * code-theme.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CodeThemeConfigSchema = z.record(z.string(), z.string());
export type CodeThemeConfig = z.infer<typeof CodeThemeConfigSchema>;

