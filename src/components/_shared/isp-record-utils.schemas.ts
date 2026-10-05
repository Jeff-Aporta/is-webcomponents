/**
 * isp-record-utils.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IspRecordSchema = z.object({
  getProp: z.function({ input: [z.string()], output: z.unknown() }).optional(),
  setProp: z.function({ input: [z.string(), z.unknown()], output: z.void() }).optional(),
  toJSON: z.function({ input: [z.boolean()], output: z.unknown() }).optional(),
  clone: z.function({ input: [], output: z.unknown() /* TODO: ref IspRecord */ }).optional(),
  f: z.record(z.string(), z.unknown()).optional(),
  /* TODO: member [key: string]: unknown */
});
export type IspRecord = z.infer<typeof IspRecordSchema>;


export const GridRowSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  __record: IspRecordSchema.optional(),
  /* TODO: member [key: string]: unknown */
});
export type GridRow = z.infer<typeof GridRowSchema>;


export const IspColumnDefSchema = z.object({
  caption: z.string().optional(),
  size: z.number().optional(),
  align: z.union([z.literal('left'), z.literal('right'), z.literal('center')]).optional(),
  visible: z.boolean().optional(),
  filter: z.boolean().optional(),
  type: z.union([z.literal('number'), z.literal('currency'), z.literal('date'), z.literal('dateTime'), z.literal('bool'), z.string()]).optional(),
  children: z.record(z.string(), IspColumnDefSchema).optional(),
});
export type IspColumnDef = z.infer<typeof IspColumnDefSchema>;


export const FlatGridColumnSchema = z.object({
  field: z.string(),
  header: z.string(),
  width: z.number().optional(),
  align: z.union([z.literal('left'), z.literal('right'), z.literal('center')]),
  hide: z.boolean(),
  sortable: z.boolean(),
  filter: z.boolean(),
  type: z.union([z.literal('number'), z.literal('date'), z.literal('enum'), z.literal('text')]),
});
export type FlatGridColumn = z.infer<typeof FlatGridColumnSchema>;


export const IspColumnsMapSchema = z.record(z.string(), IspColumnDefSchema);
export type IspColumnsMap = z.infer<typeof IspColumnsMapSchema>;


export const IspControllerSchema = z.object({
  columns: z.array(FlatGridColumnSchema).optional(),
  Columns: IspColumnsMapSchema.optional(),
  /* TODO: member [key: string]: unknown */
});
export type IspController = z.infer<typeof IspControllerSchema>;

