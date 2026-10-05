/**
 * catalog.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const EntradaCatalogoSchema = z.object({
  tag: z.string(),
  titulo: z.string(),
  categoria: z.string(),
  rutaJsonAbsoluta: z.union([z.string(), z.null()]),
  rutaModuloAbsoluta: z.union([z.string(), z.null()]),
  rutaJsonRelativa: z.union([z.string(), z.null()]),
  rutaModuloRelativa: z.union([z.string(), z.null()]),
  tieneJson: z.boolean(),
  tieneModulo: z.boolean(),
  esPagina: z.boolean(),
  tieneBehavior: z.boolean(),
  esModulo: z.boolean(),
  origen: z.string().optional(),
});
export type EntradaCatalogo = z.infer<typeof EntradaCatalogoSchema>;


export const OpcionesEnumeradorSchema = z.object({
  incluirPaginas: z.boolean().optional(),
});
export type OpcionesEnumerador = z.infer<typeof OpcionesEnumeradorSchema>;


export const ManifestItemCrudoSchema = z.object({
  tag: z.string().optional(),
  title: z.string().optional(),
  category: z.string().optional(),
  script: z.string().optional(),
  style: z.string().optional(),
  page: z.string().optional(),
  module: z.boolean().optional(),
  origin: z.string().optional(),
});
export type ManifestItemCrudo = z.infer<typeof ManifestItemCrudoSchema>;


export const CatalogItemCrudoSchema = z.object({
  json: z.string().optional(),
  behavior: z.string().optional(),
  category: z.string().optional(),
});
export type CatalogItemCrudo = z.infer<typeof CatalogItemCrudoSchema>;

