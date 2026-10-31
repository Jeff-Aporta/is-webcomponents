/** Tipos de api-ag.ts. */

import type { ColumnState, RowData } from '../contrato.js';

export type Colref = string | ColumnState;

export type Tx = { add?: RowData[]; update?: RowData[]; remove?: RowData[]; addIndex?: number };
