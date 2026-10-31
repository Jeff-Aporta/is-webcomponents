/** nucleo/tipos — Vista interna del contrato: lo que el nucleo necesita ademas del GridHost publico. */

import type { GridHost } from './tipos.schemas.js';
export type * from './tipos.schemas.js';
import type { GridHost as GridHostPublico, RefCelda } from '../contrato.js';

export type { EventoCelda, ManejadorCelda, ManejadorTeclado, RefCelda, RowNode } from '../contrato.js';
