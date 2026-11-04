/** Tipos de opciones.ts. */

import type { ColDefAg } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';

export type DefAplanada = ColDefAg & { __grupos?: GrupoCabecera[] };

export type GrupoCabecera = { id: string; headerName: string; marryChildren?: boolean; headerClass?: string; };
