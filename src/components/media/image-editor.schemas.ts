/**
 * image-editor.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CropRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export type CropRect = z.infer<typeof CropRectSchema>;


export const DragHandleSchema = z.union([z.literal('move'), z.literal('nw'), z.literal('ne'), z.literal('sw'), z.literal('se')]);
export type DragHandle = z.infer<typeof DragHandleSchema>;


export const DragStateSchema = z.object({
  handle: DragHandleSchema,
  startX: z.number(),
  startY: z.number(),
  origRect: CropRectSchema,
  origScreenRect: CropRectSchema,
  aspect: z.union([z.number(), z.null()]),
});
export type DragState = z.infer<typeof DragStateSchema>;

