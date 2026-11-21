// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * diagram-astar.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';
import type {
  CostGrid as CoreCostGrid,
  ForbiddenRegion as CoreForbiddenRegion,
} from '@jeff-aporta/iswc-base/core/schemas/diagram-grid.schemas.js';

const GridPointSchema = z.object({
  col: z.number(),
  row: z.number(),
});
export type GridPoint = z.infer<typeof GridPointSchema>;

const PixelPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type PixelPoint = z.infer<typeof PixelPointSchema>;

/** Region que el router no puede atravesar (rect o poligono). */
const ForbiddenRegionSchema = z.object({
  id: z.string(),
  kind: z.union([z.literal('rect'), z.literal('poly')]),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  points: z.array(z.tuple([z.number(), z.number()])).optional(),
  color: z.string().optional(),
  label: z.string().optional(),
});

/**
 * Rejilla de costos del motor: la misma que produce `makeCostGrid` en
 * `core/diagram-grid.ts` (esa es la fuente de verdad; aqui se reexporta).
 */
export type CostGrid = CoreCostGrid;
/** Region que el router no puede atravesar (la del motor). */
type ForbiddenRegion = CoreForbiddenRegion;

const RouteOptsSchema = z.object({
  turnCost: z.number().optional(),
  waypoints: z.array(GridPointSchema).optional(),
  forbiddenRegions: z.array(ForbiddenRegionSchema).optional(),
});
export type RouteOpts = z.infer<typeof RouteOptsSchema>;

const SequenceRouteSchema = z.object({
  path: z.string(),
  arrowTipX: z.number(),
  arrowTipY: z.number(),
  arrowDir: z.number(),
  points: z.array(GridPointSchema),
});
export type SequenceRoute = z.infer<typeof SequenceRouteSchema>;
