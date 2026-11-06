/**
 * avanzado — Advanced filter: de texto a modelo, de modelo a texto y evaluacion.
 *
 * Sintaxis: `[Edad] > 23 AND ([Pais] contains "co" OR [Activo] is true)`.
 * Un error devuelve la posicion en el texto y la clave de localeText del mensaje.
 */
import { aFecha, coincideCondicion } from './filtros-condiciones.js';
import type { ColumnaAvanzada, CondicionAvanzada, ContextoValor, GrupoAvanzado, ModeloAvanzado, ParamsFiltro, ResultadoAvanzado, TipoCondicion, TokenAvanzado } from './filtros.schemas.js';

const OPERADORES_TEXTO: Record<string, string> = { contains: 'contains', 'not contains': 'notContains', equals: 'equals', '=': 'equals', 'not equal': 'notEqual', '!=': 'notEqual', 'begins with': 'startsWith', 'ends with': 'endsWith', blank: 'blank', 'not blank': 'notBlank' };
const OPERADORES_ESCALAR: Record<string, string> = { '=': 'equals', '!=': 'notEqual', '>': 'greaterThan', '>=': 'greaterThanOrEqual', '<': 'lessThan', '<=': 'lessThanOrEqual', blank: 'blank', 'not blank': 'notBlank' };
const OPERADORES_BOOLEANO: Record<string, string> = { 'is true': 'true', 'is false': 'false', blank: 'blank', 'not blank': 'notBlank' };
const PALABRAS_OPERADOR = ['not contains', 'not equal', 'not blank', 'begins with', 'ends with', 'is true', 'is false', 'contains', 'equals', 'blank'];

function operadoresDe(tipo: string): Record<string, string> {
  if (tipo === 'number' || tipo === 'date' || tipo === 'dateString') return OPERADORES_ESCALAR;
  if (tipo === 'boolean') return OPERADORES_BOOLEANO;
  return OPERADORES_TEXTO;
}

function tipoModelo(tipo: string): string {
  if (tipo === 'dateString' || tipo === 'dateTime') return 'date';
  if (tipo === 'number' || tipo === 'date' || tipo === 'boolean') return tipo;
  return 'text';
}

function falla(mensaje: string, posicion: number): ResultadoAvanzado {
  return { modelo: null, error: { mensaje, posicion } };
}

/** Lista de tokens o el error. */
function tokenizar(texto: string): TokenAvanzado[] | ResultadoAvanzado {
  const fuera: TokenAvanzado[] = [];
  let i = 0;
  while (i < texto.length) {
    const c = texto[i] as string;
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === '(' || c === ')') { fuera.push({ t: 'par', v: c, pos: i }); i += 1; continue; }
    if (c === '[') {
      const fin = texto.indexOf(']', i);
      if (fin < 0) return falla('advancedFilterValidationInvalidColumn', i);
      fuera.push({ t: 'col', v: texto.slice(i + 1, fin), pos: i });
      i = fin + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let fin = i + 1;
      let valor = '';
      while (fin < texto.length && texto[fin] !== c) {
        if (texto[fin] === '\\' && fin + 1 < texto.length) fin += 1;
        valor += texto[fin];
        fin += 1;
      }
      if (fin >= texto.length) return falla('advancedFilterValidationMissingQuote', i);
      fuera.push({ t: 'texto', v: valor, pos: i });
      i = fin + 1;
      continue;
    }
    const simbolo = /^(>=|<=|!=|>|<|=)/.exec(texto.slice(i));
    if (simbolo) { fuera.push({ t: 'op', v: simbolo[1] as string, pos: i }); i += (simbolo[1] as string).length; continue; }
    const resto = texto.slice(i).toLowerCase();
    const palabra = PALABRAS_OPERADOR.find((p) => resto.startsWith(p) && !/[\w-]/.test(resto[p.length] ?? ' '));
    if (palabra) { fuera.push({ t: 'op', v: palabra, pos: i }); i += palabra.length; continue; }
    const suelta = /^[^\s()]+/.exec(texto.slice(i));
    const v = (suelta as RegExpExecArray)[0];
    fuera.push({ t: 'pal', v, pos: i });
    i += v.length;
  }
  return fuera;
}

/** Parser descendente: expresion = termino (AND|OR termino)*. Sin mezclar AND y OR en un nivel sin parentesis, AND liga mas fuerte. */
class Lector {
  #tokens: TokenAvanzado[];
  #i = 0;
  #columnas: ColumnaAvanzada[];
  #largo: number;
  error: ResultadoAvanzado | null = null;

  constructor(tokens: TokenAvanzado[], columnas: ColumnaAvanzada[], largo: number) {
    this.#tokens = tokens;
    this.#columnas = columnas;
    this.#largo = largo;
  }

  get #actual(): TokenAvanzado | undefined { return this.#tokens[this.#i]; }

  #fallar(mensaje: string, pos?: number): null {
    this.error ??= falla(mensaje, pos ?? this.#actual?.pos ?? this.#largo);
    return null;
  }

  #union(): string | null {
    const t = this.#actual;
    if (t?.t !== 'pal') return null;
    const v = t.v.toUpperCase();
    return v === 'AND' || v === 'OR' ? v : null;
  }

  leerTodo(): ModeloAvanzado | null {
    const m = this.#o();
    if (this.error) return null;
    const t = this.#actual;
    if (!t) return m;
    if (t.v === ')') return this.#fallar('advancedFilterValidationExtraEndBracket');
    return this.#fallar('advancedFilterValidationInvalidJoinOperator');
  }

  #o(): ModeloAvanzado | null {
    const partes: ModeloAvanzado[] = [];
    const primero = this.#y();
    if (!primero) return null;
    partes.push(primero);
    while (this.#union() === 'OR') {
      this.#i += 1;
      const otro = this.#y();
      if (!otro) return null;
      partes.push(otro);
    }
    return partes.length === 1 ? primero : { filterType: 'join', type: 'OR', conditions: partes };
  }

  #y(): ModeloAvanzado | null {
    const partes: ModeloAvanzado[] = [];
    const primero = this.#termino();
    if (!primero) return null;
    partes.push(primero);
    while (this.#union() === 'AND') {
      this.#i += 1;
      const otro = this.#termino();
      if (!otro) return null;
      partes.push(otro);
    }
    return partes.length === 1 ? primero : { filterType: 'join', type: 'AND', conditions: partes };
  }

  #termino(): ModeloAvanzado | null {
    const t = this.#actual;
    if (!t) return this.#fallar('advancedFilterValidationMissingCondition');
    if (t.v === '(' && t.t === 'par') {
      this.#i += 1;
      const dentro = this.#o();
      if (!dentro) return null;
      if (this.#actual?.v !== ')') return this.#fallar('advancedFilterValidationMissingEndBracket');
      this.#i += 1;
      return dentro;
    }
    return this.#condicion();
  }

  #condicion(): CondicionAvanzada | null {
    const t = this.#actual as TokenAvanzado;
    if (t.t !== 'col') return this.#fallar('advancedFilterValidationMissingColumn');
    const buscado = t.v.trim().toLowerCase();
    const col = this.#columnas.find((c) => c.nombre.toLowerCase() === buscado) ?? this.#columnas.find((c) => c.colId.toLowerCase() === buscado);
    if (!col) return this.#fallar('advancedFilterValidationInvalidColumn');
    this.#i += 1;
    const op = this.#actual;
    if (!op) return this.#fallar('advancedFilterValidationMissingOption');
    const filterType = tipoModelo(col.tipo);
    const type = operadoresDe(filterType)[op.v.toLowerCase()];
    if (op.t !== 'op' || !type) return this.#fallar('advancedFilterValidationInvalidOption');
    this.#i += 1;
    if (type === 'blank' || type === 'notBlank' || filterType === 'boolean') return { filterType, colId: col.colId, type };
    return this.#conValor(col.colId, filterType, type);
  }

  #conValor(colId: string, filterType: string, type: string): CondicionAvanzada | null {
    const v = this.#actual;
    if (!v || v.t === 'par' || v.t === 'col' || v.t === 'op') return this.#fallar('advancedFilterValidationMissingValue');
    this.#i += 1;
    if (filterType === 'number') {
      const n = Number(v.v);
      if (v.v === '' || !Number.isFinite(n)) return this.#fallar('advancedFilterValidationNotANumber', v.pos);
      return { filterType, colId, type, filter: n };
    }
    if (filterType === 'date' && !aFecha(v.v)) return this.#fallar('advancedFilterValidationInvalidDate', v.pos);
    return { filterType, colId, type, filter: v.v };
  }
}

/** Interpreta el texto del input. Texto vacio = sin filtro. */
export function parsearAvanzado(texto: string, columnas: ColumnaAvanzada[]): ResultadoAvanzado {
  if (!texto.trim()) return { modelo: null, error: null };
  const tokens = tokenizar(texto);
  if (!Array.isArray(tokens)) return tokens;
  const lector = new Lector(tokens, columnas, texto.length);
  const modelo = lector.leerTodo();
  return lector.error ?? { modelo, error: null };
}

function operadorTexto(c: CondicionAvanzada): string {
  const mapa = operadoresDe(c.filterType);
  return Object.entries(mapa).find(([, v]) => v === c.type)?.[0] ?? c.type;
}

function condicionTexto(c: CondicionAvanzada, columnas: ColumnaAvanzada[]): string {
  const nombre = columnas.find((x) => x.colId === c.colId)?.nombre ?? c.colId;
  const base = `[${nombre}] ${operadorTexto(c)}`;
  if (c.filter == null) return base;
  if (c.filterType === 'number') return `${base} ${String(c.filter)}`;
  return `${base} "${String(c.filter).replace(/["\\]/g, '\\$&')}"`;
}

/** Vuelve a escribir el modelo como texto. */
export function avanzadoATexto(modelo: ModeloAvanzado | null, columnas: ColumnaAvanzada[], anidado = false): string {
  if (!modelo) return '';
  if (modelo.filterType !== 'join') return condicionTexto(modelo as CondicionAvanzada, columnas);
  const g = modelo as GrupoAvanzado;
  const partes = g.conditions.map((c) => avanzadoATexto(c, columnas, true));
  const texto = partes.join(` ${g.type} `);
  return anidado && partes.length > 1 ? `(${texto})` : texto;
}

function coincideBooleano(c: CondicionAvanzada, v: unknown): boolean {
  if (c.type === 'blank') return v == null || v === '';
  if (c.type === 'notBlank') return v != null && v !== '';
  const b = v === true || v === 'true' || v === 1;
  return c.type === 'true' ? b : !b && v != null && v !== '';
}

/** Evalua el arbol; `contexto(colId)` da el valor de la fila, null si la columna ya no existe. */
export function coincideAvanzado(modelo: ModeloAvanzado, contexto: (colId: string) => ContextoValor | null, paramsDe: (colId: string) => ParamsFiltro = () => ({})): boolean {
  if (modelo.filterType === 'join') {
    const g = modelo as GrupoAvanzado;
    const prueba = (c: ModeloAvanzado): boolean => coincideAvanzado(c, contexto, paramsDe);
    return g.type === 'OR' ? g.conditions.some(prueba) : g.conditions.every(prueba);
  }
  const c = modelo as CondicionAvanzada;
  const ctx = contexto(c.colId);
  if (!ctx) return true;
  if (c.filterType === 'boolean') return coincideBooleano(c, ctx.valor);
  const tipo: TipoCondicion = c.filterType === 'number' || c.filterType === 'date' ? c.filterType : 'text';
  const inclusivo: ParamsFiltro = { ...paramsDe(c.colId), inRangeInclusive: true };
  const condicion = tipo === 'date' ? { type: c.type, dateFrom: c.filter as string | null, dateTo: c.filterTo as string | null } : { type: c.type, filter: c.filter, filterTo: c.filterTo };
  return coincideCondicion(tipo, condicion, ctx, inclusivo);
}
