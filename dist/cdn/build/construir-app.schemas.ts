// @contexto INDICE.md · src/cdn/build/README.md
/**
 * construir-app.ts — contratos del conversor TS → `.mjs` de las apps (F10, ADR «conversor construirApp»).
 */
import { z } from "zod";

/** Una página de la app: el HTML que recibe el bloque `iswc:precarga` y qué cierres precarga. */
export const PaginaAppSchema = z.object({
  /** HTML relativo a `raiz` (`index.html`, `view/hola/index.html`). Debe llevar las marcas `iswc:precarga`. */
  archivo: z.string(),
  /** Tags `iswc-*` del kit cuyo cierre (de `deps.json` del pin) se precarga; los del lote van por el lote. */
  kit: z.array(z.string()).optional(),
  /** Tags de la app (claves de `tags`) o fuentes relativas a `raiz` (`src/js/arranque.ts`) cuyo cierre se precarga. */
  app: z.array(z.string()).optional(),
});
export type PaginaApp = z.infer<typeof PaginaAppSchema>;

/** Lote ESM del armazón: los tags del kit en UN módulo de la app, armado desde el pin publicado. */
export const LoteAppSchema = z.object({
  tags: z.array(z.string()),
  /** Nombre dentro de `salida` (por defecto `kit-lote.min.mjs`). */
  archivo: z.string().optional(),
});
export type LoteApp = z.infer<typeof LoteAppSchema>;

export const ConstruirAppOptsSchema = z.object({
  /** Carpeta absoluta de la app (la que tiene `deno.json`). */
  raiz: z.string(),
  /** Prefijo de sus tags (`av`, `erp`): nombra el registrador `<prefijo>Loader.min.mjs`. */
  prefijo: z.string(),
  /** Carpetas (relativas a `raiz`) cuyos `.ts` son entradas. Por defecto `src/js` y `view`. */
  entradas: z.array(z.string()).optional(),
  /** Carpeta de salida relativa a `raiz`. Por defecto `dist/cdn`. */
  salida: z.string().optional(),
  /** SHA de 40 hex del kit. Por defecto el de `src/js/iswc.ts` (URL del loader pineada). */
  pin: z.string().optional(),
  /** `dist/cdn/` del kit con barra final. Por defecto jsDelivr al pin (`…/gh/<repo>@<pin>/dist/cdn/`). */
  cdn: z.string().optional(),
  /** Repo del kit en GitHub. Por defecto `Jeff-Aporta/is-webcomponents`. */
  repo: z.string().optional(),
  /** Entradas clásicas (IIFE) relativas a `raiz` (`src/js/boot.ts` → `<salida>/boot.js`). */
  planos: z.array(z.string()).optional(),
  /** Constantes de build (`define` de esbuild). */
  define: z.record(z.string(), z.string()).optional(),
  /** Sella `?v=` (Pages, carpeta local). Por defecto: `deno.json` → `iswc.host` no es una URL inmutable. */
  origenMutable: z.boolean().optional(),
  /** Páginas con bloque de precarga. Por defecto `index.html` y `view/**\/*.html` que lleven las marcas. */
  html: z.array(z.union([z.string(), PaginaAppSchema])).optional(),
  /** Tag de la app → fuente relativa a `raiz` (`av-app` → `src/js/components/av/av-app.ts`): registrador y deps. */
  tags: z.record(z.string(), z.string()).optional(),
  /** Especificadores que quedan externos y resuelve el import map (`zod` siempre). */
  externos: z.array(z.string()).optional(),
  /** Entradas extra del import map del bloque (`@avatar/vendor` → URL). */
  importMap: z.record(z.string(), z.string()).optional(),
  /** URLs extra con `modulepreload` en el bloque (destinos del import map que la página usa al arrancar). */
  precargas: z.array(z.string()).optional(),
  lote: LoteAppSchema.optional(),
  /** `deps.json` del kit vendorizado (relativo a `raiz`). Por defecto `src/vendor/iswc-base/deps.json`; si falta, se baja del pin. */
  depsKit: z.string().optional(),
  /** Staging SCSS → CSS relativo a `raiz` (espejo de la raíz). Por defecto `.tmp-scss`. */
  staging: z.string().optional(),
});
export type ConstruirAppOpts = z.infer<typeof ConstruirAppOptsSchema>;

/** Lo que devuelve `construirApp`: qué salió y qué tocó. */
export const InformeBuildSchema = z.object({
  entradas: z.number(),
  chunks: z.number(),
  /** Bytes de los `.mjs` y `.js` escritos. */
  bytes: z.number(),
  /** Rutas escritas, relativas a `salida`. */
  archivos: z.array(z.string()),
  /** HTML reescritos (relativos a `raiz`); vacío si ya estaban al día. */
  html: z.array(z.string()),
  /** Tags registrados (de la app y del lote). */
  tags: z.array(z.string()),
  /** Tags de la app sin `.md` hermano. */
  tagsSinMd: z.array(z.string()),
  origenMutable: z.boolean(),
});
export type InformeBuild = z.infer<typeof InformeBuildSchema>;
