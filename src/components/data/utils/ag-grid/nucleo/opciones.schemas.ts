/** Tipos de opciones.ts. */

import type { ColDefAg } from '../contrato.js';

export type DefAplanada = ColDefAg & { __grupos?: GrupoCabecera[] };

export type GrupoCabecera = { id: string; headerName: string; marryChildren?: boolean; headerClass?: string; };
