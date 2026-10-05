/**
 * position.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const PlacementSchema = z.union([z.literal('top'), z.literal('top-start'), z.literal('top-end'), z.literal('bottom'), z.literal('bottom-start'), z.literal('bottom-end'), z.literal('left'), z.literal('left-start'), z.literal('left-end'), z.literal('right'), z.literal('right-start'), z.literal('right-end')]);
export type Placement = z.infer<typeof PlacementSchema>;


export const AnchorLikeSchema = z.union([z.unknown() /* TODO: ref Element */, z.object({
  getBoundingClientRect: z.function({ input: [], output: z.unknown() /* TODO: ref DOMRect */ }),
})]);
export type AnchorLike = z.infer<typeof AnchorLikeSchema>;


export const RectSchema = z.object({
  top: z.number(),
  left: z.number(),
  right: z.number(),
  bottom: z.number(),
  width: z.number(),
  height: z.number(),
  x: z.number(),
  y: z.number(),
});
export type Rect = z.infer<typeof RectSchema>;


export const SizeSchema = z.object({
  width: z.number(),
  height: z.number(),
});
export type Size = z.infer<typeof SizeSchema>;


export const CoordsSchema = z.object({
  top: z.number(),
  left: z.number(),
  placement: z.string(),
});
export type Coords = z.infer<typeof CoordsSchema>;


export const BoundarySchema = RectSchema;
export type Boundary = z.infer<typeof BoundarySchema>;


export const ArrowOffsetSchema = z.object({
  top: z.string(),
  left: z.string(),
  right: z.string(),
  bottom: z.string(),
});
export type ArrowOffset = z.infer<typeof ArrowOffsetSchema>;


export const ComputePositionOptsSchema = z.object({
  anchor: AnchorLikeSchema,
  popupEl: z.unknown() /* TODO: ref HTMLElement */,
  placement: z.string().optional(),
  distance: z.number().optional(),
  skidding: z.number().optional(),
  flip: z.boolean().optional(),
  flipFallbackPlacements: z.string().optional(),
  flipFallbackStrategy: z.union([z.literal('best-fit'), z.literal('initial')]).optional(),
  flipPadding: z.number().optional(),
  shift: z.boolean().optional(),
  shiftPadding: z.number().optional(),
  autoSize: z.union([z.literal(''), z.literal('horizontal'), z.literal('vertical'), z.literal('both')]).optional(),
  autoSizePadding: z.number().optional(),
  boundary: z.union([z.literal('viewport'), z.literal('scroll')]).optional(),
  strategy: z.union([z.literal('absolute'), z.literal('fixed')]).optional(),
  arrow: z.boolean().optional(),
  arrowSize: z.number().optional(),
  arrowPadding: z.number().optional(),
  arrowPlacement: z.string().optional(),
});
export type ComputePositionOpts = z.infer<typeof ComputePositionOptsSchema>;


export const ComputePositionResultSchema = z.object({
  top: z.number(),
  left: z.number(),
  viewportTop: z.number(),
  viewportLeft: z.number(),
  placement: z.string(),
  strategy: z.string(),
  availableWidth: z.union([z.number(), z.null()]),
  availableHeight: z.union([z.number(), z.null()]),
  arrow: z.union([ArrowOffsetSchema, z.null()]),
  anchor: RectSchema,
  popupSize: SizeSchema,
});
export type ComputePositionResult = z.infer<typeof ComputePositionResultSchema>;

