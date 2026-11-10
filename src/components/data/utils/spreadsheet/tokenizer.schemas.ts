// @contexto INDICE.md · src/components/data/README.md
// tokenizer.schemas.ts: contratos de tipos de tokenizer.ts.
/** Extremo de una referencia. r o c valen -1 en filas o columnas completas. */
export interface RefEnd { r: number; c: number; ra: boolean; ca: boolean }

/** Tipos de token. */
export type TokenType = 'num' | 'str' | 'bool' | 'err' | 'ref' | 'func' | 'name' | 'op' | 'lp' | 'rp' | 'lb' | 'rb' | 'sep' | 'hash' | 'bad';

/** Token con su tramo en el texto. */
export interface Token { type: TokenType; text: string; pos: number; end: number; sheet?: string; a?: RefEnd; b?: RefEnd }
