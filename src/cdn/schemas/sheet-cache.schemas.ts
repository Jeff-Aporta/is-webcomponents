/**
 * sheet-cache.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SheetCacheOptsSchema = z.object({
  cacheName: z.string().optional(),
  globalKey: z.string().optional(),
  patchPrepend: z.boolean().optional(),
});
export type SheetCacheOpts = z.infer<typeof SheetCacheOptsSchema>;


export const SheetCacheManifestOptsSchema = z.object({
  base: z.string().optional(),
  key: z.string().optional(),
});
export type SheetCacheManifestOpts = z.infer<typeof SheetCacheManifestOptsSchema>;


export const SheetCacheApiSchema = z.object({
  cacheName: z.string(),
  hojas: z.map(z.string(), z.unknown() /* TODO: ref CSSStyleSheet */),
  cargas: z.map(z.string(), z.promise(z.union([z.unknown() /* TODO: ref CSSStyleSheet */, z.null()]))),
  descargar: z.function({ input: [z.string()], output: z.promise(z.union([z.unknown() /* TODO: ref CSSStyleSheet */, z.null()])) }),
  calentar: z.function({ input: [z.array(z.string())], output: z.promise(z.unknown()) }),
  calentarDesdeCache: z.function({ input: [], output: z.promise(z.unknown()) }),
  calentarDesdeManifiesto: z.function({ input: [z.string(), z.unknown() /* TODO: ref SheetCacheManifestOpts */], output: z.promise(z.unknown()) }),
});
export type SheetCacheApi = z.infer<typeof SheetCacheApiSchema>;

