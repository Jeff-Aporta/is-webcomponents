/**
 * bundle-min.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const BundleMinJsOptionsSchema = z.object({
  entry: z.string(),
  outfile: z.string(),
  plugins: z.array(z.unknown() /* TODO: ref Plugin */).optional(),
  banner: z.string().optional(),
  define: z.record(z.string(), z.string()).optional(),
  external: z.array(z.string()).optional(),
  format: z.union([z.literal('esm'), z.literal('iife'), z.literal('cjs')]).optional(),
  target: z.string().optional(),
});
export type BundleMinJsOptions = z.infer<typeof BundleMinJsOptionsSchema>;


export const BundleLoaderOptionsSchema = z.object({
  catalog: z.unknown(),
  hashes: z.record(z.string(), z.string()),
  sha: z.string().optional(),
});
export type BundleLoaderOptions = z.infer<typeof BundleLoaderOptionsSchema>;

