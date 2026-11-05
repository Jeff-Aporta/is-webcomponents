/**
 * graph.ts — contratos del grafo publicado: `deps.json` y `exports.json` (plan D5/D9, fase F3).
 */
import { z } from "zod";
import type { Metafile } from "esbuild";

/** `dist/cdn/deps.json`: por tag y por módulo del core, el cierre completo de módulos (rutas relativas a `dist/cdn/`). */
export const DepsJsonSchema = z.object({
  sha: z.string(),
  tags: z.record(z.string(), z.array(z.string())),
  core: z.record(z.string(), z.array(z.string())),
  /** `?v=` de cada entrada de los cierres (no de los chunks): el loader sella con él en orígenes mutables (F4). */
  v: z.record(z.string(), z.string()).optional(),
});
export type DepsJson = z.infer<typeof DepsJsonSchema>;

/** Índice publicado en `dist/cdn/deps.json` (F7): SHA base del build y tag → categoría (`deps/<cat>.json`). */
export const DepsIndiceSchema = z.object({ sha: z.string(), categorias: z.record(z.string(), z.string()) });
export type DepsIndice = z.infer<typeof DepsIndiceSchema>;

/** `deps.json` partido: el índice y una parte por categoría (más `core`), cada una con la forma de `DepsJson`. */
export const DepsPartidoSchema = z.object({ indice: DepsIndiceSchema, partes: z.record(z.string(), DepsJsonSchema) });
export type DepsPartido = z.infer<typeof DepsPartidoSchema>;

/** `dist/cdn/exports.json`: subruta npm → archivo publicado (`./actions/button` → `./dist/cdn/actions/button.min.mjs`). */
export const ExportsJsonSchema = z.record(z.string(), z.string());
export type ExportsJson = z.infer<typeof ExportsJsonSchema>;

export const GrafoOptionsSchema = z.object({
  metafile: z.custom<Metafile>(),
  /** Carpeta de salida absoluta del build (`dist/cdn`). */
  outdir: z.string(),
  /** Carpeta de trabajo de esbuild (las claves del metafile son relativas a ella). */
  cwd: z.string(),
  sha: z.string(),
  /** Tag (`iswc-button`) → ruta publicada (`actions/button.min.mjs`). */
  tags: z.record(z.string(), z.string()),
  /** Nombre del módulo del core (`loader`) → ruta publicada (`core/loader.min.mjs`). */
  core: z.record(z.string(), z.string()),
});
export type GrafoOptions = z.infer<typeof GrafoOptionsSchema>;
