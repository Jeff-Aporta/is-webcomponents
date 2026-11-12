// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * diagram-base.schemas.ts — la base que comparten todos los diagramas.
 *
 * Tema, grupos, lados de caja, variantes de arista y sobrescrituras de estilo: los
 * primitivos con los que el resto de familias arma su modelo.
 */
import { z } from 'zod';

const DiagramThemeSchema = z.object({
  text: z.string(),
  muted: z.string(),
  grid: z.string(),
  panel: z.string(),
  border: z.string(),
  accent: z.string(),
  altFill: z.string(),
  altBorder: z.string(),
  chipFill: z.string(),
  chipFillSoft: z.string(),
  dotText: z.string(),
});
export type DiagramTheme = z.infer<typeof DiagramThemeSchema>;

export const DiagramGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number().optional(),
  parent: z.string().optional(),
});
export type DiagramGroup = z.infer<typeof DiagramGroupSchema>;

export const BoxSideSchema = z.union([z.literal('left'), z.literal('right'), z.literal('top'), z.literal('bottom'), z.literal('auto')]);
export type BoxSide = z.infer<typeof BoxSideSchema>;

export const EdgeVariantSchema = z.union([z.literal('default'), z.literal('emphasis'), z.literal('security'), z.literal('dashed')]);
export type EdgeVariant = z.infer<typeof EdgeVariantSchema>;

export const NodeStyleOverrideSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  paddingX: z.number().optional(),
  paddingY: z.number().optional(),
  marginX: z.number().optional(),
  marginY: z.number().optional(),
  radius: z.number().optional(),
  opacity: z.number().optional(),
});
export type NodeStyleOverride = z.infer<typeof NodeStyleOverrideSchema>;

export const EdgeStyleOverrideSchema = z.object({
  width: z.number().optional(),
});
export type EdgeStyleOverride = z.infer<typeof EdgeStyleOverrideSchema>;
/** Detalle del evento `iswc-render`: el SVG pintado y, si la hay, la disposicion. */
export type DiagramRenderDetail = { layout?: unknown; svg: SVGElement };

/** Detalle del evento `iswc-open-viewer`: el payload del diagrama que se abre. */
export type DiagramViewerDetail = { payload: unknown };

/** Detalle del evento `iswc-turtle-state`: el estado de la animacion paso a paso. */
export type DiagramTurtleDetail = { playing: boolean; idx: number; total: number; replay: number };

/** Detalle del evento `iswc-toggle-group`: el grupo que se pliega o despliega. */
export type DiagramToggleDetail = { id: string | undefined };
