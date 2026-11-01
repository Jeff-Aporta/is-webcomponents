/** Tipos de tipos.ts. */

import type { GridHost as GridHostPublico, RefCelda } from '../contrato.schemas.js';

export type SelectionModeLocal = 'none' | 'single' | 'multiple';

export type GridHost = GridHostPublico & { enfocarSinScroll?: (ref: RefCelda) => void };
