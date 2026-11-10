// @contexto INDICE.md · src/components/data/README.md
// document.schemas.ts: contratos de tipos de document.ts.
import type { Rect } from './address.schemas.js';
import type { CfRule } from '@jeff-aporta/iswc-base/components/data/schemas/spreadsheet.schemas.js';
import type { ValidationRule } from '@jeff-aporta/iswc-base/components/data/schemas/spreadsheet.schemas.js';
import type { AutoFilter } from '@jeff-aporta/iswc-base/components/data/schemas/spreadsheet.schemas.js';
import type { ChartDef } from '@jeff-aporta/iswc-base/components/data/schemas/spreadsheet.schemas.js';
import type { CellData } from './engine.schemas.js';
import type { Scalar } from './values.schemas.js';
import type { CellStyle } from '@jeff-aporta/iswc-base/components/data/schemas/spreadsheet.schemas.js';
import type { Sheet } from './engine.js';
import type { MacroDef } from '@jeff-aporta/iswc-base/components/data/schemas/spreadsheet.schemas.js';

/** Datos de una hoja que no son celdas. */
export interface SheetExtras {
  colWidths: Map<number, number>; rowHeights: Map<number, number>;
  hiddenRows: Set<number>; hiddenCols: Set<number>; filterHidden: Set<number>;
  merges: Rect[]; freeze: { rows: number; cols: number };
  cf: CfRule[]; validations: ValidationRule[]; filter: AutoFilter | null; charts: ChartDef[];
  tabColor?: string; hidden: boolean; gridlines: boolean;
}

/** Clave de orden. */
export interface SortKey { col: number; desc?: boolean }

/** Partes pegables. */
export interface PasteOptions { mode?: 'all' | 'values' | 'formulas' | 'formats'; transpose?: boolean; move?: boolean }

/** Celda copiada. */
export interface ClipCell { r: number; c: number; cell?: CellData; value: Scalar }

/** Bloque copiado. */
export interface ClipBlock { sheet: number; rect: Rect; cells: ClipCell[]; styles: Map<number, CellStyle> }

/** Cambio de una celda dentro de una transacción. */
export interface CellPatch { sheet: Sheet; key: number; before?: CellData; after?: CellData }

/** Foto del libro para operaciones estructurales. */
export interface Snapshot {
  sheets: { sheet: Sheet; name: string; rows: number; cols: number; cells: Map<number, CellData>; extras: SheetExtras }[];
  names: [string, string][];
  macros: MacroDef[];
}

/** Paso del historial. */
export interface HistoryEntry {
  label: string; cells: CellPatch[];
  meta: Map<Sheet, { before: SheetExtras; after?: SheetExtras }>;
  snapBefore?: Snapshot; snapAfter?: Snapshot;
}
