// interp.schemas.ts: contratos de tipos de interp.ts.
import type { MacroDict, MacroFn } from './interp.js';

/** Valor de macro. */
export type MacroValue = number | string | boolean | null | MacroValue[] | MacroDict | MacroFn;

/** Función del anfitrión. */
export type Builtin = (args: MacroValue[]) => MacroValue | void;

/** Límites de ejecución. */
export interface MacroLimits { steps?: number; depth?: number; ms?: number; listSize?: number }
