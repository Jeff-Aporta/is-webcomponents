/** Tipos de index.ts. */

import type { ColumnState } from '../../../schemas/datagrid-types.schemas.js';
import type { RowNode } from '../../../schemas/datagrid-types.schemas.js';

export type InicioEdicion = { rowIndex: number; colKey: string | ColumnState; key?: string; };

export type LecturaValor = { rowNode: RowNode; colKey: string | ColumnState; from?: string; useFormatter?: boolean; };
