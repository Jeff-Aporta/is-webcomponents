/** Tipos de arrastre-filas.ts. */

import type { RowData } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

export type Gesto = { node: RowNode; nodos: RowNode[]; inicioY: number; activo: boolean; ultimoId: string | null; dentro: boolean; datos: RowData[]; claves: string[]; movidas: string[]; pointerId: number; fantasma: HTMLElement | null; linea: HTMLElement | null; y: number; };
