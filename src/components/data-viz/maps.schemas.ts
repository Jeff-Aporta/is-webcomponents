/**
 * maps.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ViewportSchema = z.object({
  minLon: z.number(),
  minLat: z.number(),
  maxLon: z.number(),
  maxLat: z.number(),
});
export type Viewport = z.infer<typeof ViewportSchema>;


export const DragStateSchema = z.object({
  x: z.number(),
  y: z.number(),
  start: ViewportSchema,
});
export type DragState = z.infer<typeof DragStateSchema>;


export const TileCfgSchema = z.object({
  tileUrl: z.string().optional(),
  bbox: z.string().optional(),
  zoom: z.number().optional(),
  center: z.string().optional(),
  attribution: z.string().optional(),
});
export type TileCfg = z.infer<typeof TileCfgSchema>;

