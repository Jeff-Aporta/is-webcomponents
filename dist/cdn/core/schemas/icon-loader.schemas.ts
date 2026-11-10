// @contexto INDICE.md · src/core/README.md
/**
 * icon-loader.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

/**
 * Familia del catálogo de Iconify (`https://api.iconify.design/collections`), aplanada: `count` es el
 * `total` de la API; `author`/`license` son los nombres; `samples`, los íconos de muestra del set.
 */
const IconFamilySchema = z.object({
  prefix: z.string(),
  count: z.number(),
  name: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  height: z.number().optional(),
  palette: z.boolean().optional(),
  samples: z.array(z.string()).optional(),
});
export type IconFamily = z.infer<typeof IconFamilySchema>;

/** Catálogo persistido en localStorage (`iswc:icon-catalogo:<clave>`): `{ t: <ms de guardado>, d: <datos> }`, mismo TTL que los SVG. */
export interface CatalogoPersistido<T> { t: number; d: T }

/** Datos de un set en el JSON por lotes de la API (`<set>.json?icons=a,b`): solo lo que se usa para armar el SVG. */
export interface LoteIconify { width?: number; height?: number; left?: number; top?: number; icons?: Record<string, { body: string; width?: number; height?: number; left?: number; top?: number }>; aliases?: Record<string, { parent: string; rotate?: number; hFlip?: boolean; vFlip?: boolean }> }

/**
 * Estado en memoria del resolvedor, compartido en `globalThis.__iswcIcons` por todas las copias del
 * módulo: SVG resueltos (`null` = falló, no se reintenta en la página), fetches en vuelo (uno por
 * ícono) e íconos ya avisados como «falta en local».
 */
export interface EstadoIconos {
  svg: Map<string, string | null>;
  enVuelo: Map<string, Promise<string | null>>;
  avisados: Set<string>;
}

/** Formato persistido en localStorage (`iswc:icon:<set>:<nombre>`): `{ t: <ms de guardado>, s: <svg> }` (TTL 15 días). */
const PersistidoSchema = z.object({ t: z.number(), s: z.string() });
export type Persistido = z.infer<typeof PersistidoSchema>;
