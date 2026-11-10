// @contexto INDICE.md · src/components/data/README.md
// parser.ts — descenso recursivo con precedencia: de tokens a árbol de fórmula.
import type { Token } from './tokenizer.schemas.js';
import { tokenize } from './tokenizer.js';
import { errorFromCode, ERR } from './values.js';
import type { Node } from './parser.schemas.js';

/** Error de sintaxis. */
class FormulaSyntaxError extends Error {}

const PREC: Record<string, number> = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 };

/** Parser de una fórmula tokenizada. */
class Parser {
  #i = 0;
  #toks: Token[];
  constructor(toks: Token[]) { this.#toks = toks; }

  #peek(): Token | undefined { return this.#toks[this.#i]; }
  #next(): Token | undefined { return this.#toks[this.#i++]; }
  #isOp(t: Token | undefined, ...ops: string[]): boolean { return !!t && t.type === 'op' && ops.includes(t.text); }

  parse(): Node {
    const n = this.#expr(0);
    if (this.#i < this.#toks.length) throw new FormulaSyntaxError(`Sobra «${this.#toks[this.#i].text}»`);
    return n;
  }

  #expr(min: number): Node {
    let left = this.#unary();
    for (;;) {
      const t = this.#peek();
      if (!t || t.type !== 'op') break;
      const p = PREC[t.text];
      if (p === undefined || p < min) break;
      this.#next();
      const right = this.#expr(p + 1);
      left = { t: 'bin', op: t.text, l: left, r: right };
    }
    return left;
  }

  /** Como en Excel, el menos unario liga más que ^: -2^2 = 4. */
  #unary(): Node {
    const t = this.#peek();
    if (this.#isOp(t, '+', '-', '@')) {
      this.#next();
      return { t: 'un', op: t!.text, x: this.#unary() };
    }
    return this.#postfix();
  }

  #postfix(): Node {
    let n = this.#primary();
    for (;;) {
      const t = this.#peek();
      if (this.#isOp(t, '%')) { this.#next(); n = { t: 'pct', x: n }; continue; }
      if (this.#isOp(t, ':')) {
        this.#next();
        n = { t: 'bin', op: ':', l: n, r: this.#primary() };
        continue;
      }
      if (t?.type === 'hash') { this.#next(); n = { t: 'spill', x: n }; continue; }
      return n;
    }
  }

  #primary(): Node {
    const t = this.#next();
    if (!t) throw new FormulaSyntaxError('Fórmula incompleta');
    switch (t.type) {
      case 'num': return { t: 'num', v: Number(t.text) };
      case 'str': return { t: 'str', v: t.text.slice(1, -1).replace(/""/g, '"') };
      case 'bool': return { t: 'bool', v: /^(TRUE|VERDADERO)$/i.test(t.text) };
      case 'err': return { t: 'err', v: errorFromCode(t.text) ?? ERR.VALUE };
      case 'ref': return { t: 'ref', sheet: t.sheet, a: t.a!, b: t.b };
      case 'name': return { t: 'name', name: t.text };
      case 'func': return this.#call(t);
      case 'lp': {
        const n = this.#expr(0);
        if (this.#next()?.type !== 'rp') throw new FormulaSyntaxError('Falta «)»');
        return n;
      }
      case 'lb': return this.#array();
      default: throw new FormulaSyntaxError(`Inesperado «${t.text}»`);
    }
  }

  #call(t: Token): Node {
    this.#next();
    const args: Node[] = [];
    if (this.#peek()?.type === 'rp') { this.#next(); return { t: 'call', name: t.text, args }; }
    for (;;) {
      const p = this.#peek();
      if (p?.type === 'sep') { args.push({ t: 'miss' }); this.#next(); continue; }
      if (p?.type === 'rp') { args.push({ t: 'miss' }); this.#next(); break; }
      args.push(this.#expr(0));
      const e = this.#next();
      if (e?.type === 'rp') break;
      if (e?.type !== 'sep') throw new FormulaSyntaxError('Falta «)»');
    }
    return { t: 'call', name: t.text, args };
  }

  /** En una matriz literal `,` separa columnas y `;` filas. */
  #array(): Node {
    const rows: Node[][] = [[]];
    for (;;) {
      rows[rows.length - 1].push(this.#unary());
      const e = this.#next();
      if (!e) throw new FormulaSyntaxError('Falta «}»');
      if (e.type === 'rb') break;
      if (e.type !== 'sep') throw new FormulaSyntaxError('Matriz mal formada');
      if (e.text === ';') rows.push([]);
    }
    const w = rows[0].length;
    if (rows.some((r) => r.length !== w)) throw new FormulaSyntaxError('Matriz no rectangular');
    return { t: 'arr', rows };
  }
}

const CACHE = new Map<string, Node>();

/** Parsea el cuerpo de una fórmula (sin `=`). Memoriza por texto. */
export function parseFormula(body: string): Node {
  const hit = CACHE.get(body);
  if (hit) return hit;
  const n = new Parser(tokenize(body)).parse();
  if (CACHE.size > 50000) CACHE.clear();
  CACHE.set(body, n);
  return n;
}

/** ¿El texto escrito es una fórmula? */
export function isFormulaText(s: unknown): s is string {
  return typeof s === 'string' && s.length > 1 && s.trimStart().startsWith('=');
}

/** Cuerpo de una fórmula sin el `=`. */
export function formulaBody(s: string): string {
  return s.trimStart().slice(1);
}
