import type { Ambito, Nodo, Token } from './expresion.schemas.js';
/**
 * ag-grid/celdas/expresion — Expresiones de texto de los colDef ('x > 10', 'data.a + data.b').
 *
 * Interprete propio en lugar de `new Function`: funciona con CSP estricta y las
 * columnas que llegan por JSON no pueden ejecutar codigo arbitrario. Cubre
 * aritmetica, comparacion, logica, ternario, literales, miembros y llamadas a
 * metodos; no hay asignacion ni acceso a `constructor`/`__proto__`/`prototype`.
 * Cada texto se compila una vez a un arbol de closures.
 */


const PROHIBIDOS = new Set(['constructor', '__proto__', 'prototype', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__']);
const OPERADORES = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '+', '-', '*', '/', '%', '<', '>', '!', '?', ':', '(', ')', '[', ']', '.', ','];
const LITERALES: Record<string, unknown> = { true: true, false: false, null: null, undefined };
const PRECEDENCIA: Record<string, number> = { '||': 2, '??': 2, '&&': 3, '==': 4, '!=': 4, '===': 4, '!==': 4, '<': 5, '<=': 5, '>': 5, '>=': 5, '+': 6, '-': 6, '*': 7, '/': 7, '%': 7 };

function tokenizar(fuente: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < fuente.length) {
    const c = fuente[i] as string;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(fuente[i + 1] ?? ''))) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(fuente.slice(i));
      const texto = m?.[0] ?? c;
      tokens.push({ tipo: 'num', valor: texto });
      i += texto.length;
      continue;
    }
    if (c === '"' || c === "'") {
      let texto = '';
      let j = i + 1;
      while (j < fuente.length && fuente[j] !== c) {
        if (fuente[j] === '\\') j++;
        texto += fuente[j] ?? '';
        j++;
      }
      if (j >= fuente.length) throw new SyntaxError('cadena sin cerrar');
      tokens.push({ tipo: 'str', valor: texto });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      const m = /^[\w$]+/.exec(fuente.slice(i));
      const texto = m?.[0] ?? c;
      tokens.push({ tipo: 'id', valor: texto });
      i += texto.length;
      continue;
    }
    const op = OPERADORES.find((o) => fuente.startsWith(o, i));
    if (!op) throw new SyntaxError(`caracter inesperado: ${c}`);
    tokens.push({ tipo: 'op', valor: op });
    i += op.length;
  }
  tokens.push({ tipo: 'fin', valor: '' });
  return tokens;
}

function miembroSeguro(nombre: unknown): string {
  const clave = String(nombre);
  if (PROHIBIDOS.has(clave)) throw new TypeError(`miembro no permitido: ${clave}`);
  return clave;
}

function binario(op: string, izq: Nodo, der: Nodo): Nodo {
  switch (op) {
    case '&&': return (a) => izq(a) && der(a);
    case '||': return (a) => izq(a) || der(a);
    case '??': return (a) => izq(a) ?? der(a);
    case '==': return (a) => izq(a) == der(a);
    case '!=': return (a) => izq(a) != der(a);
    case '===': return (a) => izq(a) === der(a);
    case '!==': return (a) => izq(a) !== der(a);
    case '<': return (a) => (izq(a) as number) < (der(a) as number);
    case '<=': return (a) => (izq(a) as number) <= (der(a) as number);
    case '>': return (a) => (izq(a) as number) > (der(a) as number);
    case '>=': return (a) => (izq(a) as number) >= (der(a) as number);
    case '+': return (a) => (izq(a) as number) + (der(a) as number);
    case '-': return (a) => (izq(a) as number) - (der(a) as number);
    case '*': return (a) => (izq(a) as number) * (der(a) as number);
    case '/': return (a) => (izq(a) as number) / (der(a) as number);
    default: return (a) => (izq(a) as number) % (der(a) as number);
  }
}

class Analizador {
  #tokens: Token[];
  #pos = 0;

  constructor(tokens: Token[]) {
    this.#tokens = tokens;
  }

  analizar(): Nodo {
    const nodo = this.#ternario();
    if (this.#actual().tipo !== 'fin') throw new SyntaxError(`sobra: ${this.#actual().valor}`);
    return nodo;
  }

  #actual(): Token {
    return this.#tokens[this.#pos] as Token;
  }

  #esOp(valor: string): boolean {
    const t = this.#actual();
    return t.tipo === 'op' && t.valor === valor;
  }

  #tomarOp(valor: string): boolean {
    if (!this.#esOp(valor)) return false;
    this.#pos++;
    return true;
  }

  #exigirOp(valor: string): void {
    if (!this.#tomarOp(valor)) throw new SyntaxError(`se esperaba ${valor}`);
  }

  #ternario(): Nodo {
    const condicion = this.#binaria(2);
    if (!this.#tomarOp('?')) return condicion;
    const si = this.#ternario();
    this.#exigirOp(':');
    const no = this.#ternario();
    return (a) => (condicion(a) ? si(a) : no(a));
  }

  #binaria(minimo: number): Nodo {
    let izq = this.#unaria();
    for (;;) {
      const t = this.#actual();
      const nivel = t.tipo === 'op' ? PRECEDENCIA[t.valor] : undefined;
      if (nivel == null || nivel < minimo) return izq;
      this.#pos++;
      izq = binario(t.valor, izq, this.#binaria(nivel + 1));
    }
  }

  #unaria(): Nodo {
    if (this.#tomarOp('!')) {
      const n = this.#unaria();
      return (a) => !n(a);
    }
    if (this.#tomarOp('-')) {
      const n = this.#unaria();
      return (a) => -(n(a) as number);
    }
    if (this.#tomarOp('+')) {
      const n = this.#unaria();
      return (a) => +(n(a) as number);
    }
    return this.#postfija();
  }

  #postfija(): Nodo {
    let base = this.#primaria();
    for (;;) {
      if (this.#esOp('.') || this.#esOp('?.')) {
        const opcional = this.#esOp('?.');
        this.#pos++;
        const t = this.#actual();
        if (t.tipo !== 'id') throw new SyntaxError('se esperaba un nombre');
        this.#pos++;
        base = this.#miembro(base, () => t.valor, opcional);
        continue;
      }
      if (this.#tomarOp('[')) {
        const clave = this.#ternario();
        this.#exigirOp(']');
        base = this.#miembro(base, clave, false);
        continue;
      }
      return base;
    }
  }

  #miembro(objeto: Nodo, clave: Nodo, opcional: boolean): Nodo {
    if (!this.#esOp('(')) {
      return (a) => {
        const o = objeto(a) as Record<string, unknown> | null | undefined;
        const k = miembroSeguro(clave(a));
        if (o == null) {
          if (opcional) return undefined;
          throw new TypeError(`sin valor al leer ${k}`);
        }
        return o[k];
      };
    }
    const args = this.#argumentos();
    return (a) => {
      const o = objeto(a) as Record<string, unknown> | null | undefined;
      const k = miembroSeguro(clave(a));
      if (o == null) {
        if (opcional) return undefined;
        throw new TypeError(`sin valor al llamar ${k}`);
      }
      const metodo = o[k];
      if (typeof metodo !== 'function') throw new TypeError(`${k} no es funcion`);
      return Reflect.apply(metodo, o, args.map((n) => n(a)));
    };
  }

  #argumentos(): Nodo[] {
    this.#exigirOp('(');
    const args: Nodo[] = [];
    if (this.#tomarOp(')')) return args;
    do {
      args.push(this.#ternario());
    } while (this.#tomarOp(','));
    this.#exigirOp(')');
    return args;
  }

  #primaria(): Nodo {
    const t = this.#actual();
    this.#pos++;
    if (t.tipo === 'num') {
      const n = Number(t.valor);
      return () => n;
    }
    if (t.tipo === 'str') return () => t.valor;
    if (t.tipo === 'id') return this.#identificador(t.valor);
    if (t.tipo === 'op' && t.valor === '(') {
      const n = this.#ternario();
      this.#exigirOp(')');
      return n;
    }
    throw new SyntaxError(`inesperado: ${t.valor || 'fin'}`);
  }

  #identificador(nombre: string): Nodo {
    if (Object.hasOwn(LITERALES, nombre)) {
      const literal = LITERALES[nombre];
      return () => literal;
    }
    miembroSeguro(nombre);
    if (!this.#esOp('(')) return (a) => a[nombre];
    const args = this.#argumentos();
    return (a) => {
      const f = a[nombre];
      if (typeof f !== 'function') throw new TypeError(`${nombre} no es funcion`);
      return Reflect.apply(f, undefined, args.map((n) => n(a)));
    };
  }
}

const cache = new Map<string, Nodo | null>();
const avisados = new Set<string>();

function avisar(fuente: string, error: unknown): void {
  if (avisados.has(fuente)) return;
  avisados.add(fuente);
  console.warn(`[iswc-ag-grid] expresion invalida: ${fuente}`, error);
}

export function compilarExpresion(fuente: string): Nodo {
  return new Analizador(tokenizar(fuente)).analizar();
}

/** Evalua `fuente`; un error de sintaxis o de ejecucion devuelve undefined (se avisa una sola vez). */
export function evaluarExpresion(fuente: string, ambito: Ambito): unknown {
  let nodo = cache.get(fuente);
  if (nodo === undefined) {
    try {
      nodo = compilarExpresion(fuente);
    } catch (error) {
      nodo = null;
      avisar(fuente, error);
    }
    cache.set(fuente, nodo);
  }
  if (nodo === null) return undefined;
  try {
    return nodo(ambito);
  } catch (error) {
    avisar(fuente, error);
    return undefined;
  }
}
