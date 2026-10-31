/** Tipos de expresion.ts. */

export type Ambito = Record<string, unknown>;

export type Nodo = (ambito: Ambito) => unknown;

export type Token = { tipo: 'num' | 'str' | 'id' | 'op' | 'fin'; valor: string };
