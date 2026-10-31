/**
 * condiciones — Filtros de texto, numero y fecha: catalogo de opciones, evaluacion y
 * modelos simples o combinados (operator + conditions). Puro: sin DOM ni grid.
 */
import { TEXTOS } from './textos.js';
import type { Condicion, ContextoValor, ModeloColumna, OpcionFiltro, OpcionFiltroDef, OperadorUnion, ParamsFiltro, TipoCondicion, TipoFiltro } from './filtros.schemas.js';

export const OPCIONES_DEFECTO: Record<TipoCondicion, string[]> = {
  text: ['contains', 'notContains', 'equals', 'notEqual', 'startsWith', 'endsWith', 'blank', 'notBlank'],
  number: ['equals', 'notEqual', 'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual', 'inRange', 'blank', 'notBlank'],
  date: ['equals', 'notEqual', 'lessThan', 'greaterThan', 'inRange', 'blank', 'notBlank'],
};

const OPCION_INICIAL: Record<TipoCondicion, string> = { text: 'contains', number: 'equals', date: 'equals' };
const SIN_ENTRADA = new Set(['blank', 'notBlank', 'empty']);
const RANGOS_FECHA = new Set(['today', 'yesterday', 'tomorrow', 'thisWeek', 'lastWeek', 'nextWeek', 'thisMonth', 'lastMonth', 'nextMonth', 'thisQuarter', 'lastQuarter', 'nextQuarter', 'thisYear', 'lastYear', 'nextYear', 'yearToDate', 'last7Days', 'last30Days', 'last90Days', 'last6Months', 'last12Months', 'last24Months']);
const FORMATO_MINUSCULAS = (v: string): string => v.toLowerCase();
const FORMATO_IDENTIDAD = (v: string): string => v;

/** Cuantas entradas pide una opcion integrada: 0, 1 o 2. */
export function entradasDe(clave: string): number {
  if (clave === 'inRange') return 2;
  if (SIN_ENTRADA.has(clave) || RANGOS_FECHA.has(clave)) return 0;
  return 1;
}

/** Normaliza filterOptions (claves o defs propias); lo no resuelto cae a los valores por defecto. */
export function opcionesDe(tipo: TipoCondicion, params: ParamsFiltro = {}, texto: (clave: string, porDefecto: string) => string = (_c, d) => d): OpcionFiltro[] {
  const lista = Array.isArray(params['filterOptions']) && params['filterOptions'].length ? params['filterOptions'] as Array<string | OpcionFiltroDef> : OPCIONES_DEFECTO[tipo];
  return lista.map((o) => {
    if (typeof o === 'string') return { clave: o, etiqueta: texto(o, TEXTOS[o] ?? o), entradas: entradasDe(o) };
    return { clave: o.displayKey, etiqueta: o.displayName ?? o.displayKey, entradas: o.numberOfInputs ?? 1, predicado: o.predicate };
  });
}

/** Opcion con la que nace una condicion vacia: defaultOption, o la inicial si existe, o la primera. */
export function opcionInicial(tipo: TipoCondicion, opciones: OpcionFiltro[], params: ParamsFiltro = {}): string {
  const pedida = params['defaultOption'];
  if (typeof pedida === 'string' && opciones.some((o) => o.clave === pedida)) return pedida;
  if (opciones.some((o) => o.clave === OPCION_INICIAL[tipo])) return OPCION_INICIAL[tipo];
  return opciones[0]?.clave ?? OPCION_INICIAL[tipo];
}

/** Fecha local a medianoche. 'YYYY-MM-DD[ hh:mm:ss]' se lee en hora local, no UTC. */
export function aFecha(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(typeof v === 'number' ? v : String(v));
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 'YYYY-MM-DD' local. */
export function fechaIso(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function sumarDias(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function rangoMeses(anio: number, mesInicial: number, meses: number): [Date, Date] {
  return [new Date(anio, mesInicial, 1), new Date(anio, mesInicial + meses, 0)];
}

/** Rango inclusivo [desde, hasta] de un rango relativo; la semana empieza en lunes. */
export function rangoRelativo(clave: string, ahora: Date): [Date, Date] | null {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const lunes = sumarDias(hoy, -((hoy.getDay() + 6) % 7));
  const trimestre = Math.floor(mes / 3) * 3;
  const atras = /^last(\d+)Days$/.exec(clave);
  if (atras) return [sumarDias(hoy, -Number(atras[1]) + 1), hoy];
  const mesesAtras = /^last(\d+)Months$/.exec(clave);
  if (mesesAtras) return [new Date(anio, mes - Number(mesesAtras[1]), hoy.getDate()), hoy];
  switch (clave) {
    case 'today': return [hoy, hoy];
    case 'yesterday': return [sumarDias(hoy, -1), sumarDias(hoy, -1)];
    case 'tomorrow': return [sumarDias(hoy, 1), sumarDias(hoy, 1)];
    case 'thisWeek': return [lunes, sumarDias(lunes, 6)];
    case 'lastWeek': return [sumarDias(lunes, -7), sumarDias(lunes, -1)];
    case 'nextWeek': return [sumarDias(lunes, 7), sumarDias(lunes, 13)];
    case 'thisMonth': return rangoMeses(anio, mes, 1);
    case 'lastMonth': return rangoMeses(anio, mes - 1, 1);
    case 'nextMonth': return rangoMeses(anio, mes + 1, 1);
    case 'thisQuarter': return rangoMeses(anio, trimestre, 3);
    case 'lastQuarter': return rangoMeses(anio, trimestre - 3, 3);
    case 'nextQuarter': return rangoMeses(anio, trimestre + 3, 3);
    case 'thisYear': return rangoMeses(anio, 0, 12);
    case 'lastYear': return rangoMeses(anio - 1, 0, 12);
    case 'nextYear': return rangoMeses(anio + 1, 0, 12);
    case 'yearToDate': return [new Date(anio, 0, 1), hoy];
    default: return null;
  }
}

function esVacio(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  return typeof v === 'number' && Number.isNaN(v);
}

function aNumero(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Valor de la condicion ya en su tipo; [desde, hasta]. */
function valoresDe(tipo: TipoCondicion, c: Condicion): [unknown, unknown] {
  if (tipo === 'date') return [c.dateFrom ?? c.filter ?? null, c.dateTo ?? c.filterTo ?? null];
  return [c.filter ?? null, c.filterTo ?? null];
}

function buscarOpcion(tipo: TipoCondicion, clave: string, params: ParamsFiltro): OpcionFiltro | undefined {
  const propias = Array.isArray(params['filterOptions']) ? params['filterOptions'] as Array<string | OpcionFiltroDef> : [];
  const def = propias.find((o) => typeof o !== 'string' && o.displayKey === clave) as OpcionFiltroDef | undefined;
  if (!def) return undefined;
  return { clave, etiqueta: def.displayName ?? clave, entradas: def.numberOfInputs ?? 1, predicado: def.predicate };
}

/** ¿La condicion filtra algo? blank y los rangos relativos no piden valor; `empty` nunca filtra. */
export function condicionActiva(tipo: TipoCondicion, c: Condicion | null | undefined, params: ParamsFiltro = {}): boolean {
  if (!c || !c.type || c.type === 'empty') return false;
  const propia = buscarOpcion(tipo, c.type, params);
  const entradas = propia ? propia.entradas : entradasDe(c.type);
  if (entradas === 0) return true;
  const [a, b] = valoresDe(tipo, c);
  if (entradas === 2) return !esVacio(a) && !esVacio(b);
  return !esVacio(a);
}

function comparaEscalar(op: string, cmp: number, cmpHasta: number | null, inclusivo: boolean): boolean {
  switch (op) {
    case 'equals': return cmp === 0;
    case 'notEqual': return cmp !== 0;
    case 'greaterThan': return cmp > 0;
    case 'greaterThanOrEqual': return cmp >= 0;
    case 'lessThan': return cmp < 0;
    case 'lessThanOrEqual': return cmp <= 0;
    case 'inRange': {
      if (cmpHasta === null) return inclusivo ? cmp >= 0 : cmp > 0;
      return inclusivo ? cmp >= 0 && cmpHasta <= 0 : cmp > 0 && cmpHasta < 0;
    }
    default: return true;
  }
}

/** includeBlanksIn* de number/date: las celdas vacias se excluyen salvo que el operador las incluya. */
function vacioIncluido(op: string, params: ParamsFiltro): boolean {
  if (op === 'blank') return true;
  if (op === 'notBlank') return false;
  const banderas: Record<string, string> = { equals: 'includeBlanksInEquals', notEqual: 'includeBlanksInNotEqual', lessThan: 'includeBlanksInLessThan', lessThanOrEqual: 'includeBlanksInLessThan', greaterThan: 'includeBlanksInGreaterThan', greaterThanOrEqual: 'includeBlanksInGreaterThan', inRange: 'includeBlanksInRange' };
  const bandera = banderas[op];
  return bandera ? params[bandera] === true : false;
}

function coincideTexto(c: Condicion, ctx: ContextoValor, params: ParamsFiltro): boolean {
  const op = c.type ?? '';
  const crudo = ctx.valor;
  if (op === 'blank') return esVacio(crudo);
  if (op === 'notBlank') return !esVacio(crudo);
  if (crudo == null) return op === 'notEqual' || op === 'notContains';
  const original = typeof crudo === 'object' ? ctx.texto : String(crudo);
  const propio = params['textFormatter'] as ((v: string) => string | null) | undefined;
  const formato = propio ?? (params['caseSensitive'] === true ? FORMATO_IDENTIDAD : FORMATO_MINUSCULAS);
  const valor = formato(original) ?? '';
  const filtro = formato(String(c.filter ?? '')) ?? '';
  const emparejar = params['textMatcher'] as ((p: Record<string, unknown>) => boolean) | undefined;
  if (emparejar) return emparejar({ filterOption: op, value: valor, filterText: filtro, data: ctx.data, node: ctx.node, colDef: ctx.def, column: ctx.col, source: 'columnFilter' });
  switch (op) {
    case 'contains': return valor.includes(filtro);
    case 'notContains': return !valor.includes(filtro);
    case 'equals': return valor === filtro;
    case 'notEqual': return valor !== filtro;
    case 'startsWith': return valor.startsWith(filtro);
    case 'endsWith': return valor.endsWith(filtro);
    default: return true;
  }
}

function coincideNumero(c: Condicion, ctx: ContextoValor, params: ParamsFiltro): boolean {
  const op = c.type ?? '';
  const n = aNumero(ctx.valor);
  if (n === null) return vacioIncluido(op, params);
  if (op === 'blank') return false;
  if (op === 'notBlank') return true;
  const a = aNumero(c.filter);
  if (a === null) return true;
  const b = aNumero(c.filterTo);
  return comparaEscalar(op, n - a, b === null ? null : n - b, params['inRangeInclusive'] === true);
}

function coincideFecha(c: Condicion, ctx: ContextoValor, params: ParamsFiltro): boolean {
  const op = c.type ?? '';
  const comparador = params['comparator'] as ((filtro: Date, celda: unknown) => number) | undefined;
  const fechaCelda = comparador ? null : aFecha(ctx.valor);
  const vacia = comparador ? esVacio(ctx.valor) : fechaCelda === null;
  if (vacia) return vacioIncluido(op, params);
  if (op === 'blank') return false;
  if (op === 'notBlank') return true;
  const relativo = rangoRelativo(op, ctx.ahora());
  const [a, b] = relativo ?? valoresDe('date', c).map(aFecha) as [Date | null, Date | null];
  if (!a) return true;
  const contra = (f: Date): number => comparador ? comparador(f, ctx.valor) : (fechaCelda as Date).getTime() - f.getTime();
  const cmpHasta = b ? contra(b) : null;
  if (relativo) return contra(a) >= 0 && (cmpHasta ?? 0) <= 0;
  return comparaEscalar(op, contra(a), cmpHasta, params['inRangeInclusive'] === true);
}

function valorPredicado(tipo: TipoCondicion, ctx: ContextoValor): unknown {
  if (tipo === 'number') return aNumero(ctx.valor);
  if (tipo === 'date') return aFecha(ctx.valor);
  return ctx.valor;
}

/** Evalua una condicion simple. Una condicion inactiva no filtra. */
export function coincideCondicion(tipo: TipoCondicion, c: Condicion, ctx: ContextoValor, params: ParamsFiltro = {}): boolean {
  if (!condicionActiva(tipo, c, params)) return true;
  const propia = buscarOpcion(tipo, c.type ?? '', params);
  if (propia?.predicado) {
    const crudos = valoresDe(tipo, c).slice(0, propia.entradas);
    const valores = tipo === 'date' ? crudos.map(aFecha) : crudos;
    return propia.predicado(valores, valorPredicado(tipo, ctx));
  }
  if (tipo === 'number') return coincideNumero(c, ctx, params);
  if (tipo === 'date') return coincideFecha(c, ctx, params);
  return coincideTexto(c, ctx, params);
}

/** Condiciones de un modelo: combinado, combinado legado (condition1/2) o simple. */
export function condicionesDe(modelo: ModeloColumna | null | undefined): Condicion[] {
  if (!modelo) return [];
  const m = modelo as Record<string, unknown>;
  if (Array.isArray(m['conditions'])) return m['conditions'] as Condicion[];
  if (m['condition1']) return [m['condition1'], m['condition2']].filter(Boolean) as Condicion[];
  return [m as Condicion];
}

/** Evalua un modelo simple o combinado. */
export function coincideModelo(tipo: TipoCondicion, modelo: ModeloColumna, ctx: ContextoValor, params: ParamsFiltro = {}): boolean {
  const conds = condicionesDe(modelo).filter((c) => condicionActiva(tipo, c, params));
  if (!conds.length) return true;
  const o = (modelo as { operator?: string }).operator === 'OR';
  return o ? conds.some((c) => coincideCondicion(tipo, c, ctx, params)) : conds.every((c) => coincideCondicion(tipo, c, ctx, params));
}

/** Arma el modelo: una sola condicion activa queda simple (como AG Grid), varias se combinan. */
export function combinarCondiciones(tipo: TipoCondicion, condiciones: Condicion[], operador: OperadorUnion, params: ParamsFiltro = {}): ModeloColumna | null {
  const activas = condiciones.filter((c) => condicionActiva(tipo, c, params)).map((c) => ({ ...c, filterType: tipo }));
  if (!activas.length) return null;
  if (activas.length === 1) return activas[0] as Condicion;
  return { filterType: tipo, operator: operador, conditions: activas };
}

const LEGADO_NUMERO: Record<string, string> = { eq: 'equals', neq: 'notEqual', gt: 'greaterThan', gte: 'greaterThanOrEqual', lt: 'lessThan', lte: 'lessThanOrEqual', before: 'lessThan', after: 'greaterThan' };

/** ¿Es la forma legada del core ({ type:'text', op, value })? Esa la evalua el core. */
export function esLegado(modelo: unknown): boolean {
  const m = modelo as { type?: unknown; filterType?: unknown } | null;
  if (!m || m.filterType !== undefined) return false;
  return m.type === 'text' || m.type === 'number' || m.type === 'date' || m.type === 'set' || m.type === 'combined';
}

/** Pasa del modelo legado del core al de AG Grid; lo que ya esta en AG Grid se devuelve igual. */
export function aModeloAg(modelo: unknown): ModeloColumna | null {
  if (!modelo) return null;
  if (!esLegado(modelo)) return modelo as ModeloColumna;
  const m = modelo as Record<string, unknown>;
  const tipo = m['type'] as string;
  if (tipo === 'set') return { filterType: 'set', values: m['values'] as string[] };
  if (tipo === 'combined') {
    const conditions = (m['conditions'] as unknown[]).map(aModeloAg) as Condicion[];
    return { filterType: conditions[0]?.filterType, operator: m['op'] as OperadorUnion, conditions };
  }
  const op = String(m['op'] ?? '');
  const type = LEGADO_NUMERO[op] ?? op;
  if (tipo === 'date') return { filterType: 'date', type, dateFrom: (m['value'] as string) || null, dateTo: (m['to'] as string) || null };
  if (tipo === 'number') return { filterType: 'number', type, filter: m['value'] as number | null, filterTo: (m['to'] as number | null | undefined) ?? null };
  return { filterType: 'text', type, filter: m['value'] as string };
}

/** Texto corto del modelo para filtros flotantes y etiquetas. */
export function resumenCondicion(tipo: TipoCondicion, c: Condicion, etiqueta: (clave: string) => string): string {
  const entradas = entradasDe(c.type ?? '');
  if (entradas === 0) return etiqueta(c.type ?? '');
  const [a, b] = valoresDe(tipo, c);
  if (entradas === 2) return `${String(a ?? '')}-${String(b ?? '')}`;
  return String(a ?? '');
}

/** Tipo condicional de un tipo de filtro; set, multi y boolean no son condicionales. */
export function esCondicional(tipo: TipoFiltro): tipo is TipoCondicion {
  return tipo === 'text' || tipo === 'number' || tipo === 'date';
}
