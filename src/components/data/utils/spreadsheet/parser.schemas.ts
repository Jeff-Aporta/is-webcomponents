// parser.schemas.ts: contratos de tipos de parser.ts.
import type { CellError } from './values.js';
import type { RefEnd } from './tokenizer.schemas.js';

/** Nodo del árbol de una fórmula. */
export type Node =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'err'; v: CellError }
  | { t: 'ref'; sheet?: string; a: RefEnd; b?: RefEnd }
  | { t: 'name'; name: string }
  | { t: 'call'; name: string; args: Node[] }
  | { t: 'un'; op: string; x: Node }
  | { t: 'pct'; x: Node }
  | { t: 'bin'; op: string; l: Node; r: Node }
  | { t: 'arr'; rows: Node[][] }
  | { t: 'spill'; x: Node }
  | { t: 'miss' };
