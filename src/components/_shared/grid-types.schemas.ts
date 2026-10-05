/**
 * grid-types.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CellValueSchema = z.unknown();
export type CellValue = z.infer<typeof CellValueSchema>;


export const FilterValueSchema = z.array(z.union([z.string(), z.number(), z.boolean(), z.unknown() /* TODO: cannot convert */]));
export type FilterValue = z.infer<typeof FilterValueSchema>;


export const RowSchema = z.record(z.string(), CellValueSchema);
export type Row = z.infer<typeof RowSchema>;


export const OperatorSchema = z.object({
  /* TODO: member readonly value: string */
  /* TODO: member readonly label: string */
  /* TODO: member readonly input?: boolean */
  /* TODO: member readonly multiple?: boolean */
  /* TODO: member readonly range?: boolean */
  /* TODO: member readonly inputType?: string */
  test: z.function({ input: [z.unknown() /* TODO: ref CellValue */, z.unknown() /* TODO: ref FilterValue */], output: z.boolean() }),
});
export type Operator = z.infer<typeof OperatorSchema>;


export const ColumnDefSchema = z.object({
  /* TODO: member readonly field?: string */
  /* TODO: member readonly type?: string */
  /* TODO: member readonly headerName?: string */
  /* TODO: member readonly description?: string */
  /* TODO: member readonly align?: string */
  /* TODO: member readonly headerAlign?: string */
  /* TODO: member readonly cellClassName?: string | ((params: { value: CellVal */
  /* TODO: member readonly headerClassName?: string */
  /* TODO: member readonly showTooltip?: boolean */
  /* TODO: member readonly width?: number */
  /* TODO: member readonly minWidth?: number */
  /* TODO: member readonly maxWidth?: number */
  /* TODO: member readonly flex?: number */
  /* TODO: member readonly colSpan?: number | ((value: CellValue, row: Row, co */
  /* TODO: member readonly sortable?: boolean */
  /* TODO: member readonly filterable?: boolean */
  /* TODO: member readonly editable?: boolean */
  /* TODO: member readonly resizable?: boolean */
  /* TODO: member readonly hideable?: boolean */
  /* TODO: member readonly groupable?: boolean */
  /* TODO: member readonly aggregable?: boolean */
  /* TODO: member readonly disableColumnMenu?: boolean */
  /* TODO: member readonly system?: boolean */
  /* TODO: member readonly valueGetter?: (value: CellValue, row: Row, col: Col */
  /* TODO: member readonly valueFormatter?: (v: CellValue, row: Row, col: Colu */
  /* TODO: member readonly valueParser?: (v: CellValue, row: Row, col: ColumnD */
  /* TODO: member readonly valueOptions?: readonly CellValue[] */
  /* TODO: member readonly format?: (v: CellValue) => string */
  /* TODO: member readonly comparator?: Comparator */
  /* TODO: member readonly editor?: string */
  /* TODO: member readonly renderCell?: (params: {;    value: CellValue;;    r */
  /* TODO: member readonly renderHeader?: (params: { field: string; colDef: Co */
  /* TODO: member readonly getActions?: (params: { row: Row; id: CellValue; co */
  /* TODO: member readonly preProcessEditCellProps?: (params: {;    props: { v */
  /* TODO: member readonly operators?: readonly Operator[] */
  /* TODO: member readonly filterOperators?: readonly Operator[] */
});
export type ColumnDef = z.infer<typeof ColumnDefSchema>;


export const ComparatorSchema = z.function({ input: [z.unknown() /* TODO: ref CellValue */, z.unknown() /* TODO: ref CellValue */], output: z.number() });
export type Comparator = z.infer<typeof ComparatorSchema>;


export const ColumnTypeSchema = z.object({
  /* TODO: member readonly align: string */
  /* TODO: member readonly headerAlign?: string */
  /* TODO: member readonly comparator?: Comparator */
  /* TODO: member readonly operators?: readonly Operator[] */
  /* TODO: member readonly editor?: string */
  /* TODO: member readonly format?: (v: CellValue) => string */
  /* TODO: member readonly sortable?: boolean */
  /* TODO: member readonly filterable?: boolean */
  /* TODO: member readonly editable?: boolean */
  /* TODO: member readonly resizable?: boolean */
  /* TODO: member readonly hideable?: boolean */
  /* TODO: member readonly disableColumnMenu?: boolean */
  /* TODO: member readonly width?: number */
});
export type ColumnType = z.infer<typeof ColumnTypeSchema>;


export const ColumnTypeNameSchema = z.unknown() /* TODO: cannot convert */;
export type ColumnTypeName = z.infer<typeof ColumnTypeNameSchema>;


export const FilterRuleSchema = z.object({
  /* TODO: member readonly field?: string */
  /* TODO: member readonly operator?: string */
  /* TODO: member readonly value?: CellValue */
});
export type FilterRule = z.infer<typeof FilterRuleSchema>;


export const AggregationFnSchema = z.object({
  /* TODO: member readonly label: string */
  /* TODO: member readonly types: readonly string[] | null */
  apply: z.function({ input: [z.array(z.unknown() /* TODO: cannot convert */), z.string()], output: z.unknown() /* TODO: ref CellValue */ }),
});
export type AggregationFn = z.infer<typeof AggregationFnSchema>;

