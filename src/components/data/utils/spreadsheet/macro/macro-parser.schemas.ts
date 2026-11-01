// macro-parser.schemas.ts: contratos de tipos de macro-parser.ts.
/** Expresión. */
export type Expr =
  | { k: 'lit'; v: number | string | boolean | null; line: number }
  | { k: 'var'; name: string; line: number }
  | { k: 'list'; items: Expr[]; line: number }
  | { k: 'dict'; items: [string, Expr][]; line: number }
  | { k: 'un'; op: string; x: Expr; line: number }
  | { k: 'bin'; op: string; l: Expr; r: Expr; line: number }
  | { k: 'call'; fn: Expr; args: Expr[]; line: number }
  | { k: 'index'; obj: Expr; key: Expr; line: number };

/** Sentencia. */
export type Stmt =
  | { k: 'let'; name: string; value: Expr; line: number }
  | { k: 'assign'; target: Expr; value: Expr; line: number }
  | { k: 'expr'; x: Expr; line: number }
  | { k: 'if'; cond: Expr; then: Stmt[]; other: Stmt[]; line: number }
  | { k: 'while'; cond: Expr; body: Stmt[]; line: number }
  | { k: 'forRange'; name: string; from: Expr; to: Expr; step: Expr | null; body: Stmt[]; line: number }
  | { k: 'forEach'; name: string; list: Expr; body: Stmt[]; line: number }
  | { k: 'fn'; name: string; params: string[]; body: Stmt[]; line: number }
  | { k: 'return'; x: Expr | null; line: number }
  | { k: 'break'; line: number }
  | { k: 'continue'; line: number };
