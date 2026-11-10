// @contexto INDICE.md · src/components/data/README.md
// parser.ts — del texto de una macro a su árbol. Solo datos: nada de este árbol se ejecuta como
// código del anfitrión.
import { lexMacro, MacroError } from './macro-lexer.js';
import type { MacroToken } from './macro-lexer.schemas.js';
import type { Expr, Stmt } from './macro-parser.schemas.js';

const LEVELS: string[][] = [['or'], ['and'], ['==', '!=', '<', '<=', '>', '>='], ['&'], ['+', '-'], ['*', '/', '%']];

/** Parser de macros. */
class Parser {
  #t: MacroToken[];
  #i = 0;

  constructor(tokens: MacroToken[]) {
    this.#t = tokens;
  }

  #peek(): MacroToken { return this.#t[this.#i]; }
  #next(): MacroToken { return this.#t[this.#i++]; }
  #is(text: string, type?: string): boolean {
    const t = this.#peek();
    return t.text === text && (type ? t.type === type : t.type === 'op' || t.type === 'kw');
  }
  #accept(text: string): boolean {
    if (!this.#is(text)) return false;
    this.#i++;
    return true;
  }
  #expect(text: string): void {
    if (!this.#accept(text)) throw new MacroError(`Se esperaba «${text}» y llegó «${this.#peek().text.replace('\n', 'fin de línea')}»`, this.#peek().line);
  }
  #skipLines(): void { while (this.#peek().type === 'nl') this.#i++; }
  #id(): string {
    const t = this.#next();
    if (t.type !== 'id') throw new MacroError(`Se esperaba un nombre y llegó «${t.text}»`, t.line);
    return t.text;
  }

  program(): Stmt[] {
    const out: Stmt[] = [];
    this.#skipLines();
    while (this.#peek().type !== 'eof') {
      out.push(this.#stmt());
      this.#endOfStmt();
    }
    return out;
  }

  #endOfStmt(): void {
    const t = this.#peek();
    if (t.type === 'nl') { this.#skipLines(); return; }
    if (t.type === 'eof' || t.text === '}') return;
    throw new MacroError(`Sobra «${t.text}»`, t.line);
  }

  #block(): Stmt[] {
    this.#skipLines();
    this.#expect('{');
    this.#skipLines();
    const out: Stmt[] = [];
    while (!this.#is('}')) {
      if (this.#peek().type === 'eof') throw new MacroError('Falta «}»', this.#peek().line);
      out.push(this.#stmt());
      this.#endOfStmt();
    }
    this.#next();
    return out;
  }

  #stmt(): Stmt {
    const t = this.#peek();
    const line = t.line;
    if (t.type === 'kw') {
      switch (t.text) {
        case 'let': {
          this.#next();
          const name = this.#id();
          this.#expect('=');
          return { k: 'let', name, value: this.#expr(0), line };
        }
        case 'if': this.#next(); return this.#ifRest(line);
        case 'while': {
          this.#next();
          const cond = this.#expr(0);
          return { k: 'while', cond, body: this.#block(), line };
        }
        case 'for': {
          this.#next();
          const name = this.#id();
          this.#expect('in');
          const from = this.#expr(0);
          if (this.#accept('..')) {
            const to = this.#expr(0);
            const step = this.#accept('step') ? this.#expr(0) : null;
            return { k: 'forRange', name, from, to, step, body: this.#block(), line };
          }
          return { k: 'forEach', name, list: from, body: this.#block(), line };
        }
        case 'function': {
          this.#next();
          const name = this.#id();
          this.#expect('(');
          const params: string[] = [];
          while (!this.#is(')')) {
            params.push(this.#id());
            if (!this.#accept(',')) break;
          }
          this.#expect(')');
          return { k: 'fn', name, params, body: this.#block(), line };
        }
        case 'return': {
          this.#next();
          const p = this.#peek();
          if (p.type === 'nl' || p.type === 'eof' || p.text === '}') return { k: 'return', x: null, line };
          return { k: 'return', x: this.#expr(0), line };
        }
        case 'break': this.#next(); return { k: 'break', line };
        case 'continue': this.#next(); return { k: 'continue', line };
        default:
      }
    }
    const x = this.#expr(0);
    for (const op of ['=', '+=', '-=']) {
      if (!this.#accept(op)) continue;
      if (x.k !== 'var' && x.k !== 'index') throw new MacroError('Solo se puede asignar a una variable o elemento', line);
      const right = this.#expr(0);
      return { k: 'assign', target: x, value: op === '=' ? right : { k: 'bin', op: op[0], l: x, r: right, line }, line };
    }
    return { k: 'expr', x, line };
  }

  #ifRest(line: number): Stmt {
    const cond = this.#expr(0);
    const then = this.#block();
    let other: Stmt[] = [];
    const save = this.#i;
    this.#skipLines();
    if (this.#accept('else')) {
      if (this.#accept('if')) other = [this.#ifRest(this.#peek().line)];
      else other = this.#block();
    } else this.#i = save;
    return { k: 'if', cond, then, other, line };
  }

  #expr(level: number): Expr {
    if (level >= LEVELS.length) return this.#unary();
    let left = this.#expr(level + 1);
    for (;;) {
      const t = this.#peek();
      if (!LEVELS[level].includes(t.text) || t.type === 'str' || t.type === 'id') return left;
      this.#next();
      left = { k: 'bin', op: t.text, l: left, r: this.#expr(level + 1), line: t.line };
    }
  }

  #unary(): Expr {
    const t = this.#peek();
    if (t.text === 'not' && t.type === 'kw') {
      this.#next();
      return { k: 'un', op: 'not', x: this.#unary(), line: t.line };
    }
    if (t.text === '-' && t.type === 'op') {
      this.#next();
      return { k: 'un', op: '-', x: this.#unary(), line: t.line };
    }
    return this.#power();
  }

  #power(): Expr {
    const base = this.#postfix();
    const t = this.#peek();
    if (t.text === '^' && t.type === 'op') {
      this.#next();
      return { k: 'bin', op: '^', l: base, r: this.#unary(), line: t.line };
    }
    return base;
  }

  #postfix(): Expr {
    let x = this.#primary();
    for (;;) {
      const t = this.#peek();
      if (t.type !== 'op') return x;
      if (t.text === '(') {
        this.#next();
        const args: Expr[] = [];
        this.#skipLines();
        while (!this.#is(')')) {
          args.push(this.#expr(0));
          this.#skipLines();
          if (!this.#accept(',')) break;
          this.#skipLines();
        }
        this.#expect(')');
        x = { k: 'call', fn: x, args, line: t.line };
      } else if (t.text === '[') {
        this.#next();
        const key = this.#expr(0);
        this.#expect(']');
        x = { k: 'index', obj: x, key, line: t.line };
      } else if (t.text === '.') {
        this.#next();
        x = { k: 'index', obj: x, key: { k: 'lit', v: this.#id(), line: t.line }, line: t.line };
      } else return x;
    }
  }

  #primary(): Expr {
    const t = this.#next();
    const line = t.line;
    if (t.type === 'num') return { k: 'lit', v: Number(t.text), line };
    if (t.type === 'str') return { k: 'lit', v: t.text, line };
    if (t.type === 'id') return { k: 'var', name: t.text, line };
    if (t.type === 'kw') {
      if (t.text === 'true') return { k: 'lit', v: true, line };
      if (t.text === 'false') return { k: 'lit', v: false, line };
      if (t.text === 'null') return { k: 'lit', v: null, line };
    }
    if (t.text === '(' && t.type === 'op') {
      const x = this.#expr(0);
      this.#expect(')');
      return x;
    }
    if (t.text === '[' && t.type === 'op') {
      const items: Expr[] = [];
      this.#skipLines();
      while (!this.#is(']')) {
        items.push(this.#expr(0));
        this.#skipLines();
        if (!this.#accept(',')) break;
        this.#skipLines();
      }
      this.#expect(']');
      return { k: 'list', items, line };
    }
    if (t.text === '{' && t.type === 'op') {
      const items: [string, Expr][] = [];
      this.#skipLines();
      while (!this.#is('}')) {
        const key = this.#next();
        if (key.type !== 'id' && key.type !== 'str') throw new MacroError('Clave de diccionario no válida', key.line);
        this.#expect(':');
        items.push([key.text, this.#expr(0)]);
        this.#skipLines();
        if (!this.#accept(',')) break;
        this.#skipLines();
      }
      this.#expect('}');
      return { k: 'dict', items, line };
    }
    throw new MacroError(`Inesperado «${t.text.replace('\n', 'fin de línea')}»`, line);
  }
}

/** Parsea un programa de macro. Lanza MacroError. */
export function parseMacro(src: string): Stmt[] {
  return new Parser(lexMacro(src)).program();
}
