/**
 * loader.schemas.ts — lo que la app usa del loader del kit (`globalThis.ISWebComponentsLoader`).
 * La forma canónica completa vive en el kit (`@iswc/loader-schemas`, pineado en deno.json);
 * aquí solo el subconjunto que la app llama, validado en runtime.
 */
import { z } from '../../base/zod.js';

const fn = <T>() => z.custom<T>((v) => typeof v === 'function');

export const LoaderAppSchema = z.object({
  registerApp: fn<(mapa: Record<string, string>, opts?: { installSheets?: boolean }) => unknown>(),
  load: fn<(...tags: string[]) => Promise<unknown>>(),
}).passthrough();
export type LoaderApp = z.infer<typeof LoaderAppSchema>;
