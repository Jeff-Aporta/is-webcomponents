/**
 * btn-ref.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const _CatalogLikeSchema = z.object({
  primaryKeys: z.array(z.string()).optional(),
  ColumnsBtnRef: z.union([z.array(z.string()), z.array(z.function({ input: [], output: z.string() }))]).optional(),
  multiSelect: z.boolean().optional(),
  Lista: z.function({ input: [z.object({
  pagina: z.number().optional(),
  qregistros: z.number().optional(),
  filtro: z.object({
  sql: z.string().optional(),
}).optional(),
})], output: z.promise(z.union([z.object({
  datos: z.union([z.array(z.unknown()), z.object({
  /* TODO: member [Symbol.iterator](): Iterator<unknown> */
})]).optional(),
}), z.null(), z.undefined()])) }).optional(),
  refreshGrid: z.function({ input: [], output: z.union([z.promise(z.void()), z.void()]) }).optional(),
});
export type _CatalogLike = z.infer<typeof _CatalogLikeSchema>;


export const _FieldLikeSchema = z.object({
  value: z.unknown().optional(),
  label: z.unknown().optional(),
  name: z.unknown().optional(),
  required: z.unknown().optional(),
  readonly: z.unknown().optional(),
});
export type _FieldLike = z.infer<typeof _FieldLikeSchema>;


export const _DialogLikeSchema = z.object({
  show: z.function({ input: [], output: z.void() }).optional(),
  hide: z.function({ input: [], output: z.void() }).optional(),
});
export type _DialogLike = z.infer<typeof _DialogLikeSchema>;


export const _CatalogElSchema = z.object({
  controller: _CatalogLikeSchema.optional(),
  refreshGrid: z.function({ input: [], output: z.union([z.promise(z.void()), z.void()]) }).optional(),
  selectionData: z.array(z.unknown() /* TODO: ref _RecordLike */).optional(),
});
export type _CatalogEl = z.infer<typeof _CatalogElSchema>;

