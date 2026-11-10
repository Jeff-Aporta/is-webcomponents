// @contexto INDICE.md · src/components/data/README.md
// values.schemas.ts: contratos de tipos de values.ts.
import type { CellError, RefValue, LambdaValue } from './values.ts';

/** Código de error de celda. */
export type ErrorCode = '#REF!' | '#DIV/0!' | '#VALUE!' | '#NAME?' | '#N/A' | '#NUM!' | '#NULL!' | '#SPILL!' | '#CALC!' | '#CYCLE!';

/** Valor de una celda. null es celda vacía. */
export type Scalar = number | string | boolean | null | CellError;

/** Matriz rectangular (fila, columna). */
export type Matrix = Scalar[][];

/** Resultado de evaluar una expresión. */
export type EvalValue = Scalar | Matrix | RefValue | LambdaValue;
