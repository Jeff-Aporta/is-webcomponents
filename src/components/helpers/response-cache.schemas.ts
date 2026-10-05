/**
 * response-cache.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CreateResponseCacheOptsSchema = z.object({
  dbName: z.string().optional(),
  storeName: z.string().optional(),
  ttlMs: z.number().optional(),
  timeoutMs: z.number().optional(),
});
export type CreateResponseCacheOpts = z.infer<typeof CreateResponseCacheOptsSchema>;


export const ClaveDeInputSchema = z.object({
  app: z.string().optional(),
  metodo: z.string().optional(),
  ruta: z.string().optional(),
  cuerpo: z.unknown().optional(),
  quien: z.string().optional(),
  user: z.string().optional(),
  method: z.string().optional(),
  path: z.string().optional(),
  body: z.unknown().optional(),
});
export type ClaveDeInput = z.infer<typeof ClaveDeInputSchema>;


export const CachedRowSchema = z.object({
  clave: z.string(),
  datos: z.unknown() /* TODO: ref T */,
  texto: z.string(),
  guardadoEn: z.number(),
});
export type CachedRow = z.infer<typeof CachedRowSchema>;


export const VivoAvisoSchema = z.object({
  origen: z.union([z.literal('cache'), z.literal('red')]),
  cambio: z.boolean(),
});
export type VivoAviso = z.infer<typeof VivoAvisoSchema>;


export const VivoOptsSchema = z.object({
  key: z.string(),
  pintar: z.function({ input: [z.unknown() /* TODO: ref T */, z.unknown() /* TODO: ref VivoAviso */], output: z.void() }).optional(),
  onCached: z.function({ input: [z.unknown() /* TODO: ref T */, z.unknown() /* TODO: ref VivoAviso */], output: z.void() }).optional(),
  onError: z.function({ input: [z.unknown()], output: z.void() }).optional(),
});
export type VivoOpts = z.infer<typeof VivoOptsSchema>;


export const ResponseCacheSchema = z.object({
  dbName: z.string(),
  storeName: z.string(),
  ttlMs: z.number(),
  canonico: z.unknown() /* TODO: cannot convert */,
  claveDe: z.function({ input: [z.unknown() /* TODO: ref ClaveDeInput */], output: z.string() }),
  leer: z.unknown() /* TODO: cannot convert */,
  guardar: z.unknown() /* TODO: cannot convert */,
  borrar: z.function({ input: [z.string()], output: z.promise(z.void()) }),
  invalidar: z.unknown() /* TODO: cannot convert */,
  vaciar: z.function({ input: [], output: z.promise(z.void()) }),
  vivo: z.unknown() /* TODO: cannot convert */,
});
export type ResponseCache = z.infer<typeof ResponseCacheSchema>;

