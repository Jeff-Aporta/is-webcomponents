// @contexto INDICE.md · src/components/data/README.md
// lexer.schemas.ts: contratos de tipos de lexer.ts.

/** Tipo de token de macro. */
export type MacroTokenType = 'num' | 'str' | 'id' | 'kw' | 'op' | 'nl' | 'eof';

/** Token de macro. */
export interface MacroToken { type: MacroTokenType; text: string; line: number; col: number }
