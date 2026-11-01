// find.schemas.ts: contratos de tipos de find.ts.
import type { Sheet } from './engine.js';

/** Opciones de búsqueda. */
export interface FindOptions { matchCase?: boolean; wholeCell?: boolean; inFormulas?: boolean; allSheets?: boolean; regex?: boolean }

/** Coincidencia. */
export interface FindHit { sheet: Sheet; r: number; c: number; text: string }
