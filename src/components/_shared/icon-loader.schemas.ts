/**
 * icon-loader.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IconFamilySchema = z.object({
  prefix: z.string(),
  count: z.number(),
});
export type IconFamily = z.infer<typeof IconFamilySchema>;


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
export const PersistidoSchema = z.object({ t: z.number(), s: z.string() });
export type Persistido = z.infer<typeof PersistidoSchema>;
