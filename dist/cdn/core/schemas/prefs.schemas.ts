// @contexto INDICE.md · src/core/README.md
/**
 * prefs.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

const PrefsRootSchema = z.record(z.unknown() /* TODO: cannot convert */, z.unknown() /* TODO: cannot convert */);
export type PrefsRoot = z.infer<typeof PrefsRootSchema>;

const PrefsEntrySchema = z.record(z.string(), z.unknown());
export type PrefsEntry = z.infer<typeof PrefsEntrySchema>;

const ClearAllPrefsResultSchema = z.object({
  cleared: z.boolean(),
  tags: z.array(z.string()),
});
export type ClearAllPrefsResult = z.infer<typeof ClearAllPrefsResultSchema>;

// ── scroll-memory.schemas ──
/**
 * scroll-memory.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const RestorePolicySchema = z.union([z.literal('reload'), z.literal('always')]);
export type RestorePolicy = z.infer<typeof RestorePolicySchema>;

const ScrollMemoryOptsSchema = z.object({
  tag: z.string(),
  restorePolicy: RestorePolicySchema.optional(),
});
export type ScrollMemoryOpts = z.infer<typeof ScrollMemoryOptsSchema>;
