// @contexto INDICE.md · src/cdn/loader.md
/**
 * plugin.schemas.ts — contratos de `iswcLoader.loadPlugin` (capa 2 `loader-plugin`) y del manifiesto `plugin.json`
 * que cada app publica en su `dist/cdn/` (`iswc-plugin/v1`).
 *
 * El enrutador (iswc-base) solo necesita tres datos de una app: repo, SHA y prefijo. Con ellos importa el loader PROPIO de la
 * app (`<prefijo>Loader.min.mjs`, generado por su build con las mismas optimizaciones del kit) y le delega el registro de
 * sus tags: el kit no conoce rutas ni archivos de la app. El `plugin.json` ya no lo lee el enrutador: es metadato para
 * herramientas (catálogo, `deno task shas`, documentación) y para quien quiera listar los tags sin cargar nada.
 */
import { z } from "zod";

/** SHA de commit completo: un plugin siempre va pineado (nunca `main`, rama ni SHA corto). */
const SHA40_PLUGIN = /^[0-9a-f]{40}$/;

/** Prefijo de tags de una app: minúsculas, dígitos y el guion final (`crm-`, `iswd-`). `iswc-` es del kit. */
const PREFIJO_PLUGIN = /^[a-z][a-z0-9]*-$/;

/** Lo que pide el consumidor. */
export const PluginOptsSchema = z.object({
  /** Nombre estable de la app (`crm`, `diagrams`): clave del plugin y alias de import map (`@diagrams/`). */
  app: z.string().regex(/^[a-z][a-z0-9-]*$/),
  /** `dueño/repo` de GitHub (jsDelivr `gh/<repo>@<sha>/…`). */
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  /** Commit de 40 hex que fija el plugin. */
  sha: z.string().regex(SHA40_PLUGIN),
  /** Prefijo de los tags de la app, con el guion final. */
  prefijo: z.string().regex(PREFIJO_PLUGIN),
  /** Tags a cargar de inmediato; sin él solo se registran (los pide `load`, `ensure` o el autoloader). */
  tags: z.array(z.string()).optional(),
  /** Carpeta publicada de la app dentro del repo (por defecto `dist/cdn/`). */
  ruta: z.string().optional(),
  /** Raíz absoluta alterna (desarrollo y pruebas: Pages de la app, `localhost`). Sustituye a jsDelivr y githack. */
  host: z.string().optional(),
});
export type PluginOpts = z.infer<typeof PluginOptsSchema>;

/** Un tag del manifiesto: ruta del módulo (relativa al manifiesto, con `?v=` si el origen es mutable) y hojas opcionales. */
const PluginTagSchema = z.union([
  z.string().min(1),
  z.object({ href: z.string().min(1), css: z.array(z.string()).optional() }),
]);

/** `dist/cdn/plugin.json` de una app. */
export const PluginManifestSchema = z.object({
  schema: z.literal("iswc-plugin/v1"),
  app: z.string(),
  repo: z.string(),
  prefijo: z.string().regex(PREFIJO_PLUGIN),
  titulo: z.string().optional(),
  /** Versión de la app (informativa). */
  version: z.string().optional(),
  /** Loader de la app (`<prefijo>Loader.min.mjs`): lo importa el enrutador. */
  loader: z.string().optional(),
  /** Kit con el que se construyó (informativo: el plugin importa el kit por alias del import map de la página). */
  kit: z.object({ repo: z.string(), sha: z.string() }).optional(),
  /** Tag → módulo. Todo tag debe empezar por `prefijo`. */
  tags: z.record(z.string(), PluginTagSchema),
  /** Tag → cierre de chunks (rutas relativas al manifiesto) para `modulepreload`. */
  deps: z.record(z.string(), z.array(z.string())).optional(),
  /** Paletas que publica la app: cada una es `palettes/<nombre>.json` junto al manifiesto (`cargarPlugin`, tipo paletas). */
  paletas: z.array(z.object({ nombre: z.string(), ruta: z.string() })).optional(),
  /** Módulos de herramientas de la app (`cargarPlugin`, tipo herramientas): ruta relativa al manifiesto. */
  herramientas: z.array(z.object({ nombre: z.string(), ruta: z.string() })).optional(),
  /** Vista → tags (informativo). */
  vistas: z.record(z.string(), z.array(z.string())).optional(),
  /** Momento del build (ISO). */
  build: z.string().optional(),
});

/** Lo que resuelve `loadPlugin` y lista `getPlugins()`. */
export const PluginInfoSchema = z.object({
  app: z.string(),
  repo: z.string(),
  sha: z.string(),
  prefijo: z.string(),
  /** Raíz publicada (con barra final) de donde se importó el loader de la app. */
  raiz: z.string(),
  /** Tags registrados. */
  tags: z.array(z.string()),
  /** Entrada de import map para diseñar con imports (`{ "@crm/": "<raiz>" }`). */
  alias: z.record(z.string(), z.string()),
});
export type PluginInfo = z.infer<typeof PluginInfoSchema>;

/** Un plugin en curso o ya cargado (lo que recuerda la capa 2 por app). */
export type PluginActivo = { opts: PluginOpts; promesa: Promise<PluginInfo> };

/** Contexto mínimo que la capa 2 recibe del núcleo (sin ciclo con `loader.ts`). */
export type PluginCtx = { routeHref(href: string): string };

/** Importa el loader de la app (una raíz tras otra): lo inyecta el núcleo y las pruebas. */
export type PluginImportar = (url: string) => Promise<unknown>;

/** La parte del loader que usa la capa 2. */
export type PluginLoaderApi = {
  registerApp(
    map: Record<string, { href: string; css?: string[]; type?: "module" | "classic" }>,
    opts?: { installSheets?: boolean; deps?: Record<string, string[]> },
  ): unknown;
  getAppComponents(): Record<string, { href: string }>;
  load(...ids: string[]): Promise<unknown>;
};
