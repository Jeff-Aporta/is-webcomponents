/**
 * 00-context.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const _AnyRecordSchema = z.record(z.string(), z.unknown());
export type _AnyRecord = z.infer<typeof _AnyRecordSchema>;


export const _AnyCtxPropsSchema = _AnyRecordSchema;
export type _AnyCtxProps = z.infer<typeof _AnyCtxPropsSchema>;


export const _BAllowedShapeSchema = z.object({
  Crear: z.boolean().optional(),
  Modificar: z.boolean().optional(),
  Eliminar: z.boolean().optional(),
  Visualizar: z.boolean().optional(),
});
export type _BAllowedShape = z.infer<typeof _BAllowedShapeSchema>;


export const _PendingDeleteSnapSchema = z.union([z.object({
  prevVisibleIds: z.array(z.string()),
  prevDeleteIdx: z.number(),
}), z.null()]);
export type _PendingDeleteSnap = z.infer<typeof _PendingDeleteSnapSchema>;


export const _TNodeLikeSchema = z.object({
  flatPath: z.string(),
  /* TODO: member [key: string]: unknown */
});
export type _TNodeLike = z.infer<typeof _TNodeLikeSchema>;


export const _TRecordLikeSchema = z.intersection(_TNodeLikeSchema, z.object({
  iplan: z.string().optional(),
  idrow: z.string().optional(),
}));
export type _TRecordLike = z.infer<typeof _TRecordLikeSchema>;

