// @contexto INDICE.md · src/core/README.md
/**
 * prefs.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

/** Entrada individual: objeto plano `{ clave: valor }`. */
const PrefsEntrySchema = z.record(z.string(), z.unknown());
export type PrefsEntry = z.infer<typeof PrefsEntrySchema>;

/**
 * Forma del root de prefs: `tag -> clave -> entrada`.
 *
 * El valor de cada entrada es libre (`unknown`): cada componente guarda en su
 * slot lo que necesita (un scroll, un snapshot de grid, un flag…).
 */
const PrefsRootSchema = z.record(z.string(), z.record(z.string(), PrefsEntrySchema));
export type PrefsRoot = z.infer<typeof PrefsRootSchema>;

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
