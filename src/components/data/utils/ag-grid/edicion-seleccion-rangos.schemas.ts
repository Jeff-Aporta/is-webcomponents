// @contexto INDICE.md · src/components/data/README.md
/** Tipos de seleccion-rangos.ts. */
import type { EjeRelleno, Posicion, Rango } from './edicion.schemas.js';

export type OpcionesAsa = { mode?: string; direction?: EjeRelleno; suppressClearOnFillReduction?: boolean; setFillValue?: (p: Record<string, unknown>) => unknown; };

export type OpcionesCelda = { suppressMultiRanges?: boolean; enableHeaderHighlight?: boolean; enableColumnSelection?: boolean; handle?: OpcionesAsa; };

export type Gesto = { ancla: Posicion; modo: 'nuevo' | 'quitar' | 'asa'; ultimo: Posicion; base: Rango | null; };
