/**
 * btn-ref.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const _BtnRefLikeSchema = z.object({
  controller: z.unknown().optional(),
  multi: z.boolean().optional(),
});
export type _BtnRefLike = z.infer<typeof _BtnRefLikeSchema>;


export const _SelectedDetailSchema = z.object({
  value: z.string().optional(),
});
export type _SelectedDetail = z.infer<typeof _SelectedDetailSchema>;

