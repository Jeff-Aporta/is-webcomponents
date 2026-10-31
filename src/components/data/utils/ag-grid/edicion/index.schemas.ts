/** Tipos de index.ts. */

import type { ColumnState } from '../contrato.js';
import type { RowNode } from '../contrato.js';

export type InicioEdicion = { rowIndex: number; colKey: string | ColumnState; key?: string; };

export type LecturaValor = { rowNode: RowNode; colKey: string | ColumnState; from?: string; useFormatter?: boolean; };
