/**
 * treemap-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type Rect = z.infer<typeof RectSchema>;


export const RawSpecNodeSchema = z.record(z.string(), z.unknown());
export type RawSpecNode = z.infer<typeof RawSpecNodeSchema>;


export const SpecNodeSchema = z.object({
  id: z.string(),
  parent: z.string().optional(),
  label: z.string(),
  value: z.number(),
  hue: z.number().optional(),
});
export type SpecNode = z.infer<typeof SpecNodeSchema>;


export const TreemapSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  nodes: z.array(SpecNodeSchema),
});
export type TreemapSpec = z.infer<typeof TreemapSpecSchema>;


export const TreemapLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  total: z.number(),
  nodes: z.array(TreemapLayoutNodeSchema),
});
export type TreemapLayout = z.infer<typeof TreemapLayoutSchema>;


export const TreemapLayoutNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  depth: z.number(),
  label: z.string(),
  value: z.number(),
  hue: z.number().optional(),
  lightness: z.number(),
  hasChildren: z.boolean(),
  showLabel: z.boolean(),
  percent: z.number(),
});
export type TreemapLayoutNode = z.infer<typeof TreemapLayoutNodeSchema>;


export const TreemapLayoutOptsSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
});
export type TreemapLayoutOpts = z.infer<typeof TreemapLayoutOptsSchema>;

