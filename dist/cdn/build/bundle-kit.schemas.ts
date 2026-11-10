// @contexto INDICE.md · src/cdn/build/README.md
/**
 * bundle-kit.ts — contratos del build único con splitting (plan D5, fase F3).
 */
import { z } from "zod";
import type { Metafile, Plugin } from "esbuild";

/** Una entrada del build: fuente absoluta y ruta publicada sin extensión (`actions/button.min`). */
export const EntradaKitSchema = z.object({ in: z.string(), out: z.string() });
export type EntradaKit = z.infer<typeof EntradaKitSchema>;

/** Lo mínimo del manifest que el build necesita: tag y categoría de publicación. */
export const ItemManifestKitSchema = z.object({ tag: z.string(), category: z.string() });
export type ItemManifestKit = z.infer<typeof ItemManifestKitSchema>;

/** Catálogo que el loader recibe por `define` (`__IS_LOADER_CATALOG__`): tag → carpeta y archivo. */
export const CatalogoLoaderSchema = z.object({
  aliases: z.record(z.string(), z.string()),
  categories: z.record(z.string(), z.array(z.string())),
  tags: z.record(z.string(), z.object({ category: z.string(), file: z.string() })),
});
export type CatalogoLoader = z.infer<typeof CatalogoLoaderSchema>;

/** Banner por archivo publicado (ruta relativa a `outdir`, p. ej. `actions/button.min.mjs`); `null` = sin banner. */
export const BannerKitSchema = z.custom<(salida: string) => string | null>((v) => typeof v === 'function');
export type BannerKit = z.infer<typeof BannerKitSchema>;

export const BundleKitOptionsSchema = z.object({
  /** Entradas del build (componentes, core, loader, lib). */
  entradas: z.array(EntradaKitSchema),
  /** Carpeta de salida absoluta (`dist/cdn`). */
  outdir: z.string(),
  /** Staging de SCSS→CSS para `iswc:css` (por defecto el del kit). */
  staging: z.string().optional(),
  /** SHA del build: `__IS_BUILD_SHA__` del loader. */
  sha: z.string().optional(),
  /** Catálogo del loader: `__IS_LOADER_CATALOG__`. */
  catalogo: CatalogoLoaderSchema.optional(),
  /** Carpeta absoluta de `src/ai` (sus módulos quedan externos, en `lib/ai/`). */
  aiRoot: z.string().optional(),
  banner: BannerKitSchema.optional(),
  target: z.string().optional(),
  /** Plugins extra, detrás de los del kit. */
  plugins: z.array(z.custom<Plugin>()).optional(),
});
export type BundleKitOptions = z.infer<typeof BundleKitOptionsSchema>;

/** Resultado: el metafile de esbuild y las rutas escritas (relativas a `outdir`). */
export const BundleKitResultSchema = z.object({
  metafile: z.custom<Metafile>(),
  archivos: z.array(z.string()),
});
export type BundleKitResult = z.infer<typeof BundleKitResultSchema>;
