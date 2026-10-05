/**
 * column-groups.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IspColumnSchema = z.object({
  children: z.record(z.string(), IspColumnSchema).optional(),
  caption: z.string().optional(),
  align: z.unknown() /* TODO: ref AlignName */.optional(),
  type: z.string().optional(),
  size: z.number().optional(),
  visible: z.boolean().optional(),
  editable: z.boolean().optional(),
  group: z.boolean().optional(),
  filter: z.boolean().optional(),
  orderby: z.unknown() /* TODO: ref SortDirName */.optional(),
  currency: z.string().optional(),
  decimals: z.number().optional(),
  dateFormat: z.string().optional(),
  format: z.function({ input: [z.unknown()], output: z.string() }).optional(),
  valueGetter: z.function({ input: [z.record(z.string(), z.unknown())], output: z.unknown() }).optional(),
  GetDisplayValue: z.function({ input: [z.record(z.string(), z.unknown())], output: z.promise(z.unknown()) }).optional(),
  GetDisplayText: z.function({ input: [z.record(z.string(), z.unknown())], output: z.string() }).optional(),
});
export type IspColumn = z.infer<typeof IspColumnSchema>;


export const IspColumnDefSchema = z.intersection(z.unknown() /* TODO: ref Omit<...> */, z.object({
  type: z.union([z.unknown() /* TODO: ref ColumnTypeName */, z.literal('currency'), z.literal('dateTime')]).optional(),
  format: z.function({ input: [z.unknown()], output: z.string() }).optional(),
  currency: z.string().optional(),
  decimals: z.number().optional(),
  dateFormat: z.string().optional(),
  sort: z.unknown() /* TODO: ref SortDirName */.optional(),
  GetDisplayValue: z.function({ input: [z.record(z.string(), z.unknown())], output: z.promise(z.unknown()) }).optional(),
  GetDisplayText: z.function({ input: [z.record(z.string(), z.unknown())], output: z.string() }).optional(),
}));
export type IspColumnDef = z.infer<typeof IspColumnDefSchema>;


export const GroupNodeSchema = z.object({
  kind: z.literal('group'),
  groupId: z.string(),
  headerName: z.string(),
  align: z.unknown() /* TODO: ref AlignName */,
  children: z.array(TreeNodeSchema),
});
export type GroupNode = z.infer<typeof GroupNodeSchema>;


export const LeafNodeSchema = z.object({
  kind: z.literal('leaf'),
  colId: z.string(),
  headerName: z.string(),
});
export type LeafNode = z.infer<typeof LeafNodeSchema>;


export const TreeNodeSchema = z.union([GroupNodeSchema, LeafNodeSchema]);
export type TreeNode = z.infer<typeof TreeNodeSchema>;

