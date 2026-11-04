/** Tipos de tipos.ts. */

import type { GridHost as GridHostPublico, RefCelda } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';

export type SelectionModeLocal = 'none' | 'single' | 'multiple';

export type GridHost = GridHostPublico & { enfocarSinScroll?: (ref: RefCelda) => void };
