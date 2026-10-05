/**
 * resize-observer.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ResizeObserverEntryLikeSchema = z.object({
  contentBoxSize: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  borderBoxSize: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  contentRect: z.object({
  width: z.number(),
  height: z.number(),
}).optional(),
});
export type ResizeObserverEntryLike = z.infer<typeof ResizeObserverEntryLikeSchema>;


export const ResizeDetailSchema = z.object({
  entries: z.array(z.unknown() /* TODO: cannot convert */).optional(),
});
export type ResizeDetail = z.infer<typeof ResizeDetailSchema>;


export const BoxSizeSchema = z.object({
  w: z.union([z.number(), z.null()]),
  h: z.union([z.number(), z.null()]),
});
export type BoxSize = z.infer<typeof BoxSizeSchema>;

