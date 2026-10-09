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
 * Forma mínima de un `iconify.json` que `<iswc-icon>` sabe leer (contrato completo: `IconifyMapSchema`
 * en `cdn/tools/download-iconify.schemas.ts`).
 */
export const IconMapRefSchema = z.object({
  v: z.literal(1),
  host: z.string().nullable(),
  ruta: z.string().optional(),
  base: z.string(),
  icons: z.record(z.string(), z.array(z.string())),
  /** set → nombre → SVG incrustado: el json trae los íconos y no hace falta pedir cada archivo. */
  svg: z.record(z.string(), z.record(z.string(), z.string())).optional(),
});
export type IconMapRef = z.infer<typeof IconMapRefSchema>;

/** Mapa listo para resolver: bases candidatas de archivo, nombres por set y SVG incrustados por `set:nombre`. */
export const MapaListoSchema = z.object({
  bases: z.array(z.string()),
  icons: z.map(z.string(), z.set(z.string())),
  svg: z.map(z.string(), z.string()),
});
export type MapaListo = z.infer<typeof MapaListoSchema>;

/** Carga perezosa de un mapa (el json se pide la primera vez que se resuelve un ícono). */
export const MapaPerezosoSchema = z.function({ input: [], output: z.promise(MapaListoSchema.nullable()) });
export type MapaPerezoso = z.infer<typeof MapaPerezosoSchema>;

const EntradaColaSchema = z.union([z.string(), IconMapRefSchema]);
/** Cola global `globalThis.__ISWC_ICONS__`: lo registrado y las copias del módulo suscritas. */
export const ColaIconosSchema = z.object({
  items: z.array(EntradaColaSchema),
  oyentes: z.set(z.function({ input: [EntradaColaSchema], output: z.void() })),
  push: z.function({ input: z.tuple([], EntradaColaSchema), output: z.number() }),
});
export type ColaIconos = z.infer<typeof ColaIconosSchema>;
