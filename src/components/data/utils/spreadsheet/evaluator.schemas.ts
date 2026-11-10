// @contexto INDICE.md · src/components/data/README.md
// evaluator.schemas.ts: contratos de tipos de evaluator.ts.
import type { Scalar } from './values.schemas.js';
import type { Node } from './parser.schemas.js';
import type { RefValue } from './values.js';
import type { EvalValue } from './values.schemas.js';

/** Lo que el evaluador necesita del libro. */
export interface EvalHost {
  value(sheet: number, r: number, c: number): Scalar;
  sheetId(name: string): number | null;
  dims(sheet: number): { rows: number; cols: number };
  used(sheet: number): { rows: number; cols: number };
  name(name: string, sheet: number): Node | null;
  spill(sheet: number, r: number, c: number): RefValue | null;
  sheetName(sheet: number): string;
  sheetCount(): number;
  sheetIndex(sheet: number): number;
  isFormula(sheet: number, r: number, c: number): boolean;
  formulaText(sheet: number, r: number, c: number): string | null;
}

/** Variables de LET y LAMBDA. */
export interface Env { vars: Map<string, EvalValue | undefined>; parent: Env | null }

/** Contexto de evaluación. */
export interface Ctx { host: EvalHost; sheet: number; r: number; c: number; env: Env | null; depth: number }
