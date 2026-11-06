/** Tipos de valores.ts. */
import type { DefinicionTipo, ParamsCelda } from './celdas.schemas.js';

export type Funcion = (params: ParamsCelda) => unknown;

export type Definiciones = Record<string, DefinicionTipo>;
