/**
 * prefs-clear.schemas.ts — tipos de `<iswc-prefs-clear>`.
 */
import { z } from 'zod';

/** Alcance de la limpieza: `prefs` (config de la app + memoria de los is-*), `cache` (+ Cache Storage, IndexedDB, sesión) o `all` (+ todo el localStorage). */
export const PrefsClearScopeSchema = z.enum(['prefs', 'cache', 'all']);
export type PrefsClearScope = z.infer<typeof PrefsClearScopeSchema>;

/** Detalle del evento `iswc-prefs-clear`: qué se borró y si la página se recarga. */
export const PrefsClearDetailSchema = z.object({
  tags: z.array(z.string()),
  appCfg: z.array(z.string()),
  reloaded: z.boolean(),
  scope: PrefsClearScopeSchema,
  caches: z.array(z.string()),
  bases: z.array(z.string()),
});
export type PrefsClearDetail = z.infer<typeof PrefsClearDetailSchema>;
