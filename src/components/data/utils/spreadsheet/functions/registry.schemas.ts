// registry.schemas.ts: contratos de tipos de registry.ts.
import type { EvalValue } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/values.schemas.js';
import type { Ctx } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/evaluator.schemas.js';
import type { Node } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/parser.schemas.js';

/** Función evaluada con argumentos ya calculados. undefined marca argumento omitido. */
export type Fn = (args: EvalValue[], ctx: Ctx) => EvalValue;

/** Función que decide qué argumentos evaluar. */
export type LazyFn = (nodes: Node[], ctx: Ctx) => EvalValue;

/** Definición de función. */
export interface FnDef { name: string; sig: string; desc: string; cat: string; min: number; max: number; fn?: Fn; lazy?: LazyFn; volatile?: boolean }
