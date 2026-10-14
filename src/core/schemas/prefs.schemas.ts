/**
 * prefs.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const PrefsRootSchema = z.record(z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */);
export type PrefsRoot = z.infer<typeof PrefsRootSchema>;


export const PrefsEntrySchema = z.record(z.string(), z.unknown());
export type PrefsEntry = z.infer<typeof PrefsEntrySchema>;


export const ClearAllPrefsResultSchema = z.object({
  cleared: z.boolean(),
  tags: z.array(z.string()),
});
export type ClearAllPrefsResult = z.infer<typeof ClearAllPrefsResultSchema>;

