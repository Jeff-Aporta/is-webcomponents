// @contexto INDICE.md · src/cdn/loader.md
/**
 * loader-capas.schemas.ts — contrato entre el núcleo del loader (capa 1, `loader.ts`) y sus módulos de capa 2
 * (`loader-sheets`, `loader-store`, `loader-mirrors`, `loader-pages`, `loader-ref`, `loader-hashes`), plan D7 / F4.
 *
 * El núcleo arma UN contexto (`LoaderCtx`) y se lo pasa a cada función de capa 2: así los módulos de capa 2 no
 * importan el núcleo (no hay ciclo) ni duplican su estado.
 */
import { z } from "zod";
import { MirrorSchema, PageModuleKindSchema, type LoaderState } from "./loader.schemas.js";

const HrefFnSchema = z.function({ input: [z.string()], output: z.string() });
const CargaFnSchema = z.function({ input: [z.string()], output: z.promise(z.void()) });

const LoaderCtxSchema = z.object({
  /** Estado mutable del loader (host, pin, espejos, query, alias de página). */
  state: z.custom<LoaderState>(),
  /** Carpeta del loader (`…/dist/cdn/core/`). */
  selfBase: z.string(),
  /** Raíz del kit junto al loader (`…/dist/cdn/`). */
  cdnRoot: z.string(),
  /** Cadena canónica de espejos (jsDelivr → githack → Pages). */
  mirrorsDefault: z.array(MirrorSchema),
  /** Mapa de hashes vivo (`ruta` → `?v=`): el embebido más lo que llega en diferido. */
  hashes: z.record(z.string(), z.string()),
  /** Raíz del camino feliz (host o `self`), o `null` si solo quedan espejos. */
  raizPrimaria: z.function({ input: [], output: z.string().nullable() }),
  /** Pin para los espejos: `state.ref` o, si falta, la API de GitHub (`loader-ref`). */
  ref: z.function({ input: [], output: z.promise(z.string()) }),
  assetHref: z.function({ input: [z.string(), z.string()], output: z.string() }),
  routeHref: HrefFnSchema,
  importOnce: CargaFnSchema,
  loadClassicOnce: CargaFnSchema,
  injectStylesheet: CargaFnSchema,
  injectCdnStylesheet: z.function({ input: [z.string()], output: z.promise(z.string()) }),
  /** Tipo de carga por extensión (D2): `.js` → clásico; `.mjs` o sin extensión → módulo. */
  tipoDe: z.function({ input: [z.string()], output: PageModuleKindSchema }),
  /** Deja listo el mapa diferido de `asset-hashes.json` (solo orígenes mutables). */
  cargarHashes: z.function({ input: [], output: z.promise(z.void()) }),
});
export type LoaderCtx = z.infer<typeof LoaderCtxSchema>;

/** `dist/cdn/deps.json` visto por el loader: cierre por tag y `?v=` de las entradas (orígenes mutables). */
const DepsLoaderSchema = z.object({ sha: z.string().optional(), tags: z.record(z.string(), z.array(z.string())), v: z.record(z.string(), z.string()).optional() });
export type DepsLoader = z.infer<typeof DepsLoaderSchema>;
