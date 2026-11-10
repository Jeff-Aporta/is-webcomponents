// @contexto INDICE.md · src/components/data/README.md
/** Tipos de tooltips.ts. */
import type { ParamsCelda } from './celdas.schemas.js';

export type Funcion = (params: ParamsCelda) => unknown;

export type Reloj = { programar: (fn: () => void, ms: number) => unknown; cancelar: (id: unknown) => void };

export type Fase = 'oculto' | 'esperando' | 'visible';
