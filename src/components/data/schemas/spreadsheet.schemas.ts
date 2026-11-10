// @contexto INDICE.md · src/components/data/README.md
/**
 * spreadsheet.schemas.ts — contrato de datos de <iswc-spreadsheet>: documento persistible
 * (`iswc-spreadsheet/v1`), estilos, reglas y detalles de eventos.
 *
 * Los tipos del árbol de fórmulas viven en utils/spreadsheet/parser.ts porque son internos
 * y recursivos; aquí solo está lo que cruza la frontera del componente.
 */
import { z } from 'zod';

const BorderSideSchema = z.object({ style: z.enum(['thin', 'medium', 'thick', 'dashed', 'dotted', 'double']), color: z.string().optional() });
export type BorderSide = z.infer<typeof BorderSideSchema>;

const CellStyleSchema = z.object({
  bold: z.boolean(), italic: z.boolean(), underline: z.boolean(), strike: z.boolean(),
  color: z.string(), bg: z.string(), font: z.string(), size: z.number(),
  align: z.enum(['left', 'center', 'right']), valign: z.enum(['top', 'middle', 'bottom']),
  wrap: z.boolean(), indent: z.number(), numFmt: z.string(),
  borderTop: BorderSideSchema, borderRight: BorderSideSchema, borderBottom: BorderSideSchema, borderLeft: BorderSideSchema,
}).partial();
export type CellStyle = z.infer<typeof CellStyleSchema>;

const CellDocSchema = z.object({
  v: z.union([z.number(), z.string(), z.boolean()]).optional(),
  f: z.string().optional(),
  s: CellStyleSchema.optional(),
  c: z.string().optional(),
  l: z.string().optional(),
});
export type CellDoc = z.infer<typeof CellDocSchema>;

const CfStyleSchema = z.object({ color: z.string(), bg: z.string(), bold: z.boolean(), italic: z.boolean() }).partial();
export type CfStyle = z.infer<typeof CfStyleSchema>;

const CfRuleSchema = z.object({
  id: z.string(),
  range: z.string(),
  type: z.enum(['cell', 'text', 'formula', 'top', 'bottom', 'aboveAverage', 'belowAverage', 'duplicate', 'unique', 'blank', 'colorScale', 'dataBar', 'iconSet']),
  op: z.enum(['gt', 'lt', 'gte', 'lte', 'eq', 'ne', 'between']).optional(),
  a: z.string().optional(),
  b: z.string().optional(),
  rank: z.number().optional(),
  colors: z.array(z.string()).optional(),
  icons: z.enum(['arrows', 'dots', 'flags']).optional(),
  style: CfStyleSchema.optional(),
  stop: z.boolean().optional(),
});
export type CfRule = z.infer<typeof CfRuleSchema>;

const ValidationRuleSchema = z.object({
  id: z.string(),
  range: z.string(),
  type: z.enum(['list', 'whole', 'decimal', 'date', 'textLength', 'custom']),
  op: z.enum(['between', 'notBetween', 'eq', 'ne', 'gt', 'lt', 'gte', 'lte']).optional(),
  a: z.string().optional(),
  b: z.string().optional(),
  allowBlank: z.boolean().optional(),
  severity: z.enum(['stop', 'warning', 'info']).optional(),
  message: z.string().optional(),
  prompt: z.string().optional(),
});
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

const FilterColumnSchema = z.object({
  values: z.array(z.string()).optional(),
  op: z.enum(['contains', 'notContains', 'eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'begins', 'ends', 'blank', 'notBlank']).optional(),
  a: z.string().optional(),
});
export type FilterColumn = z.infer<typeof FilterColumnSchema>;

const AutoFilterSchema = z.object({ range: z.string(), columns: z.record(z.string(), FilterColumnSchema) });
export type AutoFilter = z.infer<typeof AutoFilterSchema>;

const ChartDefSchema = z.object({
  id: z.string(),
  type: z.enum(['bar', 'line', 'pie', 'doughnut', 'scatter', 'radar']),
  range: z.string(),
  title: z.string().optional(),
  x: z.number(), y: z.number(), w: z.number(), h: z.number(),
  horizontal: z.boolean().optional(),
  stacked: z.boolean().optional(),
});
export type ChartDef = z.infer<typeof ChartDefSchema>;

const SheetDocSchema = z.object({
  name: z.string(),
  rows: z.number().optional(),
  cols: z.number().optional(),
  cells: z.record(z.string(), CellDocSchema).optional(),
  colWidths: z.record(z.string(), z.number()).optional(),
  rowHeights: z.record(z.string(), z.number()).optional(),
  hiddenRows: z.array(z.number()).optional(),
  hiddenCols: z.array(z.number()).optional(),
  merges: z.array(z.string()).optional(),
  freeze: z.object({ rows: z.number(), cols: z.number() }).optional(),
  cf: z.array(CfRuleSchema).optional(),
  validations: z.array(ValidationRuleSchema).optional(),
  filter: AutoFilterSchema.optional(),
  charts: z.array(ChartDefSchema).optional(),
  tabColor: z.string().optional(),
  hidden: z.boolean().optional(),
  gridlines: z.boolean().optional(),
});
export type SheetDoc = z.infer<typeof SheetDocSchema>;

const MacroDefSchema = z.object({ name: z.string(), code: z.string(), shortcut: z.string().optional(), button: z.boolean().optional() });
export type MacroDef = z.infer<typeof MacroDefSchema>;

const NameDocSchema = z.object({ name: z.string(), ref: z.string() });

const WorkbookDocSchema = z.object({
  $schema: z.literal('iswc-spreadsheet/v1').optional(),
  sheets: z.array(SheetDocSchema).min(1),
  names: z.array(NameDocSchema).optional(),
  macros: z.array(MacroDefSchema).optional(),
  active: z.number().optional(),
});
export type WorkbookDoc = z.infer<typeof WorkbookDocSchema>;

const SpreadsheetChangeDetailSchema = z.object({
  row: z.number(), col: z.number(), raw: z.union([z.string(), z.number()]), value: z.union([z.string(), z.number()]),
  sheet: z.string().optional(), cells: z.number().optional(),
});
export type SpreadsheetChangeDetail = z.infer<typeof SpreadsheetChangeDetailSchema>;

const SpreadsheetSelectDetailSchema = z.object({
  row: z.number(), col: z.number(), value: z.union([z.string(), z.number()]),
  range: z.string().optional(), sheet: z.string().optional(),
});
export type SpreadsheetSelectDetail = z.infer<typeof SpreadsheetSelectDetailSchema>;

/** Valida un documento externo. Devuelve el documento o null si no cumple el contrato. */
export function parseWorkbookDoc(input: unknown): WorkbookDoc | null {
  const r = WorkbookDocSchema.safeParse(input);
  return r.success ? r.data : null;
}
