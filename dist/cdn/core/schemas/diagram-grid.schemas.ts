// @contexto INDICE.md · src/core/README.md
/**
 * diagram-grid.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const GridRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type GridRect = z.infer<typeof GridRectSchema>;

const GridPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type GridPoint = z.infer<typeof GridPointSchema>;

/**
 * Región prohibida (rect o polígono). Va ANTES de `CostGridSchema` porque el
 * registro de la rejilla lo referencia.
 */
const ForbiddenRegionSchema = z.object({
  id: z.string(),
  kind: z.union([z.literal('rect'), z.literal('poly')]),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  /** Vértices del polígono: pares `[x, y]`. */
  points: z.array(z.tuple([z.number(), z.number()])).optional(),
  color: z.string().optional(),
  label: z.string().optional(),
});
export type ForbiddenRegion = z.infer<typeof ForbiddenRegionSchema>;

const CostGridSchema = z.object({
  cols: z.number(),
  rows: z.number(),
  grid: z.number(),
  /** Costes por celda: `Infinity` = celda bloqueada. */
  cost: z.custom<Float64Array>(),
  forbidden: z.map(z.string(), ForbiddenRegionSchema).optional(),
});
export type CostGrid = z.infer<typeof CostGridSchema>;

const ExclusionZoneSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string().optional(),
});
export type ExclusionZone = z.infer<typeof ExclusionZoneSchema>;

const DiagramSideSchema = z.union([z.literal('top'), z.literal('bottom'), z.literal('left'), z.literal('right')]);
export type DiagramSide = z.infer<typeof DiagramSideSchema>;

