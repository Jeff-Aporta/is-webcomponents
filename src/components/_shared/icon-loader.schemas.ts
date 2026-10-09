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


/** Mapa de íconos de la app listo para resolver: carpeta de los SVG y ids `set:nombre` que tiene. */
export const MapaListoSchema = z.object({
  base: z.string(),
  ids: z.set(z.string()),
});
export type MapaListo = z.infer<typeof MapaListoSchema>;

/** Carga perezosa de un mapa (el json se pide la primera vez que se resuelve un ícono). */
export const MapaPerezosoSchema = z.function({ input: [], output: z.promise(MapaListoSchema.nullable()) });
export type MapaPerezoso = z.infer<typeof MapaPerezosoSchema>;

/** Cola global `globalThis.__ISWC_ICONS__`: URLs de `iconify.json` registradas y las copias del módulo suscritas. */
export const ColaIconosSchema = z.object({
  items: z.array(z.string()),
  oyentes: z.set(z.function({ input: [z.string()], output: z.void() })),
  push: z.function({ input: z.tuple([], z.string()), output: z.number() }),
});
export type ColaIconos = z.infer<typeof ColaIconosSchema>;
