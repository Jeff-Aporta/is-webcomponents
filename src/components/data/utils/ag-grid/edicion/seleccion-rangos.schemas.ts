/** Tipos de seleccion-rangos.ts. */

import type { EjeRelleno } from './schemas/edicion.schemas.js';
import type { Posicion } from './schemas/edicion.schemas.js';
import type { Rango } from './schemas/edicion.schemas.js';

export type OpcionesAsa = { mode?: string; direction?: EjeRelleno; suppressClearOnFillReduction?: boolean; setFillValue?: (p: Record<string, unknown>) => unknown; };

export type OpcionesCelda = { suppressMultiRanges?: boolean; enableHeaderHighlight?: boolean; enableColumnSelection?: boolean; handle?: OpcionesAsa; };

export type Gesto = { ancla: Posicion; modo: 'nuevo' | 'quitar' | 'asa'; ultimo: Posicion; base: Rango | null; };
