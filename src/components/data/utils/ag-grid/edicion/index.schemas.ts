/** Tipos de index.ts. */

import type { ColumnState } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

export type InicioEdicion = { rowIndex: number; colKey: string | ColumnState; key?: string; };

export type LecturaValor = { rowNode: RowNode; colKey: string | ColumnState; from?: string; useFormatter?: boolean; };
