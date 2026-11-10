// @contexto INDICE.md · src/components/data/README.md
// interp.ts — intérprete seguro de macros. Sin eval ni new Function: recorre el árbol, sus
// valores viven en Map y arreglos propios, y solo alcanza lo que `builtins` le entrega. Presupuesto
// de pasos, profundidad y tiempo para que una macro no cuelgue la página.
import { MacroError } from './macro-lexer.js';
import { parseMacro } from './macro-parser.js';
import type { Expr, Stmt } from './macro-parser.schemas.js';
import type { MacroValue, Builtin, MacroLimits } from './macro-interp.schemas.js';

/** Diccionario de macro. */
export class MacroDict {
  map = new Map<string, MacroValue>();
}

/** Función definida en la macro. */
export class MacroFn {
  constructor(readonly name: string, readonly params: string[], readonly body: Stmt[], readonly scope: Scope) {}
}



/** Ámbito léxico. */
class Scope {
  vars = new Map<string, MacroValue>();
  constructor(readonly parent: Scope | null) {}

  find(name: string): Scope | null {
    for (let s: Scope | null = this; s; s = s.parent) if (s.vars.has(name)) return s;
    return null;
  }
}

/** Señales de control. */
class BreakSignal {}
class ContinueSignal {}
class ReturnSignal {
  constructor(readonly value: MacroValue) {}
}

const BREAK = new BreakSignal();
const CONTINUE = new ContinueSignal();

/** Texto de un valor. */
export function macroText(v: MacroValue): string {
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'verdadero' : 'falso';
  if (Array.isArray(v)) return `[${v.map(macroText).join(', ')}]`;
  if (v instanceof MacroDict) return `{${[...v.map].map(([k, x]) => `${k}: ${macroText(x)}`).join(', ')}}`;
  if (v instanceof MacroFn) return `función ${v.name}`;
  return String(v);
}

/** Verdad de un valor. */
function truthy(v: MacroValue): boolean {
  if (v === null || v === false || v === 0 || v === '') return false;
  return !(Array.isArray(v) && v.length === 0);
}

/** Intérprete. */
export class MacroInterpreter {
  #builtins: Map<string, Builtin>;
  #steps = 0;
  #maxSteps: number;
  #maxDepth: number;
  #maxItems: number;
  #deadline = 0;
  #msBudget: number;
  #depth = 0;

  constructor(builtins: Map<string, Builtin>, limits: MacroLimits = {}) {
    this.#builtins = builtins;
    this.#maxSteps = limits.steps ?? 2000000;
    this.#maxDepth = limits.depth ?? 128;
    this.#msBudget = limits.ms ?? 10000;
    this.#maxItems = limits.listSize ?? 1000000;
  }

  /** Ejecuta un programa. Devuelve el valor de `retorna` en el nivel superior, si lo hay. */
  run(source: string): MacroValue {
    const program = parseMacro(source);
    this.#steps = 0;
    this.#depth = 0;
    this.#deadline = Date.now() + this.#msBudget;
    const scope = new Scope(null);
    try {
      this.#block(program, scope);
    } catch (e) {
      if (e instanceof ReturnSignal) return e.value;
      if (e === BREAK || e === CONTINUE) throw new MacroError('corta o sigue fuera de un bucle', 0);
      throw e;
    }
    return null;
  }

  #tick(line: number): void {
    if (++this.#steps > this.#maxSteps) throw new MacroError('La macro superó el límite de pasos', line);
    if (this.#steps % 4096 === 0 && Date.now() > this.#deadline) throw new MacroError('La macro superó el límite de tiempo', line);
  }

  #block(list: Stmt[], scope: Scope): void {
    for (const s of list) if (s.k === 'fn') scope.vars.set(s.name, new MacroFn(s.name, s.params, s.body, scope));
    for (const s of list) this.#stmt(s, scope);
  }

  #loopBody(body: Stmt[], scope: Scope): boolean {
    try {
      this.#block(body, new Scope(scope));
    } catch (e) {
      if (e === BREAK) return false;
      if (e !== CONTINUE) throw e;
    }
    return true;
  }

  #stmt(s: Stmt, scope: Scope): void {
    this.#tick(s.line);
    switch (s.k) {
      case 'let': scope.vars.set(s.name, this.#value(s.value, scope)); return;
      case 'assign': this.#assign(s.target, this.#value(s.value, scope), scope, s.line); return;
      case 'expr': this.#value(s.x, scope); return;
      case 'fn': return;
      case 'if':
        this.#block(truthy(this.#value(s.cond, scope)) ? s.then : s.other, new Scope(scope));
        return;
      case 'while':
        while (truthy(this.#value(s.cond, scope))) {
          this.#tick(s.line);
          if (!this.#loopBody(s.body, scope)) break;
        }
        return;
      case 'forRange': {
        const from = this.#number(this.#value(s.from, scope), s.line);
        const to = this.#number(this.#value(s.to, scope), s.line);
        const step = s.step ? this.#number(this.#value(s.step, scope), s.line) : from <= to ? 1 : -1;
        if (step === 0) throw new MacroError('El paso no puede ser cero', s.line);
        const inner = new Scope(scope);
        for (let i = from; step > 0 ? i <= to : i >= to; i += step) {
          this.#tick(s.line);
          inner.vars.set(s.name, i);
          if (!this.#loopBody(s.body, inner)) break;
        }
        return;
      }
      case 'forEach': {
        const list = this.#value(s.list, scope);
        const items = Array.isArray(list) ? list : typeof list === 'string' ? [...list] : list instanceof MacroDict ? [...list.map.keys()] : null;
        if (!items) throw new MacroError('Solo se recorren listas, textos o diccionarios', s.line);
        const inner = new Scope(scope);
        for (const item of [...items]) {
          this.#tick(s.line);
          inner.vars.set(s.name, item);
          if (!this.#loopBody(s.body, inner)) break;
        }
        return;
      }
      case 'return': throw new ReturnSignal(s.x ? this.#value(s.x, scope) : null);
      case 'break': throw BREAK;
      case 'continue': throw CONTINUE;
    }
  }

  #assign(target: Expr, value: MacroValue, scope: Scope, line: number): void {
    if (target.k === 'var') {
      (scope.find(target.name) ?? scope).vars.set(target.name, value);
      return;
    }
    if (target.k !== 'index') throw new MacroError('Asignación no válida', line);
    const obj = this.#value(target.obj, scope);
    const key = this.#value(target.key, scope);
    if (obj instanceof MacroDict) { obj.map.set(String(key), value); return; }
    if (Array.isArray(obj) && typeof key === 'number') {
      if (key < 0 || key > obj.length || key > this.#maxItems) throw new MacroError('Índice fuera de la lista', line);
      obj[key] = value;
      return;
    }
    throw new MacroError('Solo se asigna en listas y diccionarios', line);
  }

  #number(v: MacroValue, line: number): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === null) return 0;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
    throw new MacroError(`«${macroText(v)}» no es un número`, line);
  }

  #value(x: Expr, scope: Scope): MacroValue {
    this.#tick(x.line);
    switch (x.k) {
      case 'lit': return x.v;
      case 'var': {
        const s = scope.find(x.name);
        if (s) return s.vars.get(x.name) as MacroValue;
        if (this.#builtins.has(x.name)) return x.name;
        throw new MacroError(`«${x.name}» no está definido`, x.line);
      }
      case 'list': return x.items.map((i) => this.#value(i, scope));
      case 'dict': {
        const d = new MacroDict();
        for (const [k, v] of x.items) d.map.set(k, this.#value(v, scope));
        return d;
      }
      case 'un': {
        const v = this.#value(x.x, scope);
        return x.op === 'not' ? !truthy(v) : -this.#number(v, x.line);
      }
      case 'bin': return this.#binary(x, scope);
      case 'index': return this.#index(x, scope);
      case 'call': return this.#call(x, scope);
    }
  }

  #binary(x: Extract<Expr, { k: 'bin' }>, scope: Scope): MacroValue {
    if (x.op === 'and') {
      const l = this.#value(x.l, scope);
      return truthy(l) ? this.#value(x.r, scope) : l;
    }
    if (x.op === 'or') {
      const l = this.#value(x.l, scope);
      return truthy(l) ? l : this.#value(x.r, scope);
    }
    const l = this.#value(x.l, scope);
    const r = this.#value(x.r, scope);
    const n = (v: MacroValue): number => this.#number(v, x.line);
    switch (x.op) {
      case '&': return macroText(l) + macroText(r);
      case '+': {
        if (typeof l === 'string' || typeof r === 'string') return macroText(l) + macroText(r);
        if (Array.isArray(l) && Array.isArray(r)) return [...l, ...r];
        return n(l) + n(r);
      }
      case '-': return n(l) - n(r);
      case '*': return n(l) * n(r);
      case '/': {
        if (n(r) === 0) throw new MacroError('División por cero', x.line);
        return n(l) / n(r);
      }
      case '%': {
        if (n(r) === 0) throw new MacroError('División por cero', x.line);
        return n(l) % n(r);
      }
      case '^': return n(l) ** n(r);
      case '==': return this.#equal(l, r);
      case '!=': return !this.#equal(l, r);
      default: {
        const d = typeof l === 'string' && typeof r === 'string' ? l.localeCompare(r) : n(l) - n(r);
        return x.op === '<' ? d < 0 : x.op === '<=' ? d <= 0 : x.op === '>' ? d > 0 : d >= 0;
      }
    }
  }

  #equal(a: MacroValue, b: MacroValue): boolean {
    if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase();
    return a === b;
  }

  #index(x: Extract<Expr, { k: 'index' }>, scope: Scope): MacroValue {
    const obj = this.#value(x.obj, scope);
    const key = this.#value(x.key, scope);
    if (obj instanceof MacroDict) return obj.map.get(String(key)) ?? null;
    if (Array.isArray(obj) && typeof key === 'number') return obj[key] ?? null;
    if (typeof obj === 'string' && typeof key === 'number') return obj[key] ?? null;
    throw new MacroError(`No se puede leer «${macroText(key)}» de ese valor`, x.line);
  }

  #call(x: Extract<Expr, { k: 'call' }>, scope: Scope): MacroValue {
    const args = x.args.map((a) => this.#value(a, scope));
    if (x.fn.k === 'var') {
      const local = scope.find(x.fn.name);
      if (!local) {
        const b = this.#builtins.get(x.fn.name);
        if (!b) throw new MacroError(`La función «${x.fn.name}» no existe`, x.line);
        try {
          return b(args) ?? null;
        } catch (e) {
          if (e instanceof MacroError) throw e;
          throw new MacroError(e instanceof Error ? e.message : String(e), x.line);
        }
      }
    }
    const fn = this.#value(x.fn, scope);
    if (!(fn instanceof MacroFn)) throw new MacroError('Eso no es una función', x.line);
    if (++this.#depth > this.#maxDepth) throw new MacroError('Demasiadas llamadas anidadas', x.line);
    const inner = new Scope(fn.scope);
    fn.params.forEach((p, i) => inner.vars.set(p, args[i] ?? null));
    try {
      this.#block(fn.body, inner);
      return null;
    } catch (e) {
      if (e instanceof ReturnSignal) return e.value;
      throw e;
    } finally {
      this.#depth--;
    }
  }
}
