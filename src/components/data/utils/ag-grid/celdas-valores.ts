// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/celdas-valores — valueGetter, valueFormatter, valueParser, valueSetter
 * y tipos de dato de celda, con las formas de AG Grid (funcion con params o
 * expresion de texto). Puro: el host puede importarlo en runtime.
 */
import type { Funcion, Definiciones } from './celdas-valores.schemas.js';
import type { ColDefAg, ContextoCelda, GridHost } from './contrato.schemas.js';
import type { ColumnState, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import { evaluarExpresion } from './celdas-expresion.js';
import { aFecha, fmtFecha } from './celdas-formatos.js';
import type { DefinicionTipo, ParamsCelda, TipoDato } from './celdas.schemas.js';

const RE_FECHA_ISO = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const TIPOS_BASE = new Set<string>(['text', 'number', 'boolean', 'date', 'dateString', 'object']);

export function ambitoDe(params: ParamsCelda): Record<string, unknown> {
  return { ...params, x: params.value, ctx: params.context, Math };
}

/** Ejecuta una opcion que puede ser funcion o expresion; cualquier otra forma se devuelve tal cual. */
export function ejecutar(opcion: unknown, params: ParamsCelda): unknown {
  if (typeof opcion === 'function') return (opcion as Funcion)(params);
  if (typeof opcion === 'string') return evaluarExpresion(opcion, ambitoDe(params));
  return opcion;
}

/** El motor deja `texto` vacio para no formatear celdas que no lo usan; aqui se calcula a demanda. */
export function textoDeContexto(ctx: ContextoCelda): string {
  if (ctx.texto || !ctx.node) return ctx.texto;
  return ctx.grid.textoCelda(ctx.col, ctx.node);
}

export function paramsCelda(ctx: ContextoCelda): ParamsCelda {
  const grid = ctx.grid;
  return { value: ctx.value, valueFormatted: textoDeContexto(ctx), data: ctx.data, node: ctx.node, colDef: ctx.def, column: ctx.col, rowIndex: ctx.rowIndex, api: grid.modelo(), context: grid.opcion('context') };
}

export function leerRuta(data: unknown, campo: string, literal = false): unknown {
  if (data == null) return undefined;
  const raiz = data as Record<string, unknown>;
  if (literal || !campo.includes('.')) return raiz[campo];
  let actual: unknown = raiz;
  for (const parte of campo.split('.')) {
    if (actual == null) return undefined;
    actual = (actual as Record<string, unknown>)[parte];
  }
  return actual;
}

function escribirRuta(data: Record<string, unknown>, campo: string, valor: unknown, literal = false): void {
  if (literal || !campo.includes('.')) {
    data[campo] = valor;
    return;
  }
  const partes = campo.split('.');
  const ultima = partes.pop() as string;
  let actual = data;
  for (const parte of partes) {
    if (parte === '__proto__' || parte === 'constructor') return;
    if (actual[parte] == null || typeof actual[parte] !== 'object') actual[parte] = {};
    actual = actual[parte] as Record<string, unknown>;
  }
  if (ultima === '__proto__' || ultima === 'constructor') return;
  actual[ultima] = valor;
}

export function leerValor(def: ColDefAg, params: ParamsCelda): unknown {
  const getter = def['valueGetter'];
  if (getter != null) return ejecutar(getter, params);
  if (def.field == null) return undefined;
  return leerRuta(params.data, def.field, def['suppressFieldDotNotation'] === true);
}

export function inferirTipo(valor: unknown): TipoDato | null {
  if (valor == null) return null;
  if (typeof valor === 'number') return 'number';
  if (typeof valor === 'boolean') return 'boolean';
  if (valor instanceof Date) return 'date';
  if (typeof valor === 'string') return RE_FECHA_ISO.test(valor) ? 'dateString' : 'text';
  return 'object';
}

/** Tipo declarado (`cellDataType`) o inferido, siguiendo `extendsDataType` de `dataTypeDefinitions`. */
export function tipoDe(def: ColDefAg, valor: unknown, definiciones?: Definiciones): TipoDato | null {
  const declarado = def['cellDataType'];
  if (declarado === false) return null;
  if (typeof declarado !== 'string') return inferirTipo(valor);
  let nombre: string | undefined = declarado;
  const vistos = new Set<string>();
  while (nombre != null && !vistos.has(nombre)) {
    if (TIPOS_BASE.has(nombre)) return nombre as TipoDato;
    vistos.add(nombre);
    const definicion: DefinicionTipo | undefined = definiciones?.[nombre];
    if (definicion?.baseDataType && TIPOS_BASE.has(definicion.baseDataType)) return definicion.baseDataType as TipoDato;
    nombre = definicion?.extendsDataType;
  }
  return inferirTipo(valor);
}

function opcionDeTipo(def: ColDefAg, opcion: 'valueFormatter' | 'valueParser', definiciones?: Definiciones): unknown {
  const propia = def[opcion];
  if (propia != null) return propia;
  const declarado = def['cellDataType'];
  if (typeof declarado !== 'string') return undefined;
  return definiciones?.[declarado]?.[opcion];
}

function textoPorTipo(valor: unknown, tipo: TipoDato | null): string {
  if (tipo === 'date' || tipo === 'dateString') {
    if (typeof valor === 'string' && tipo === 'dateString') return valor;
    return fmtFecha(valor, { formato: 'iso' });
  }
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor) : '';
  return String(valor);
}

export function formatearValor(def: ColDefAg, valor: unknown, params: ParamsCelda, definiciones?: Definiciones): string {
  const formateador = opcionDeTipo(def, 'valueFormatter', definiciones);
  if (formateador != null) {
    const texto = ejecutar(formateador, { ...params, value: valor });
    return texto == null ? '' : String(texto);
  }
  if (valor == null || valor === '') return '';
  const referencia = def['refData'] as Record<string, unknown> | undefined;
  if (referencia) return String(referencia[String(valor)] ?? valor);
  return textoPorTipo(valor, tipoDe(def, valor, definiciones));
}

function parsearPorTipo(texto: unknown, tipo: TipoDato | null): unknown {
  if (texto == null || texto === '') return null;
  if (typeof texto !== 'string') return texto;
  if (tipo === 'number') {
    const n = Number.parseFloat(texto);
    return Number.isNaN(n) ? null : n;
  }
  if (tipo === 'boolean') {
    const t = texto.trim().toLowerCase();
    if (t === 'true') return true;
    return t === 'false' ? false : null;
  }
  if (tipo === 'date') return aFecha(texto);
  return texto;
}

/** Texto del editor al valor del dato. `params.oldValue` fija el tipo si no esta declarado. */
export function parsearValor(def: ColDefAg, texto: unknown, params: ParamsCelda, definiciones?: Definiciones): unknown {
  const parser = opcionDeTipo(def, 'valueParser', definiciones);
  if (parser != null) return ejecutar(parser, { ...params, newValue: texto, oldValue: params.value });
  return parsearPorTipo(texto, tipoDe(def, params.value, definiciones));
}

/** Escribe en `data` y devuelve si cambio. Respeta `valueSetter` (funcion que devuelve boolean, o expresion). */
export function escribirValor(def: ColDefAg, nuevo: unknown, params: ParamsCelda): boolean {
  const setter = def['valueSetter'];
  const viejo = params.value;
  if (setter != null) return ejecutar(setter, { ...params, oldValue: viejo, newValue: nuevo }) !== false;
  if (Object.is(viejo, nuevo) || def.field == null || params.data == null) return false;
  escribirRuta(params.data as Record<string, unknown>, def.field, nuevo, def['suppressFieldDotNotation'] === true);
  return true;
}

/** Lectores para `nucleo.fijarLectores`: `grid.valor` y `grid.textoCelda` con las formas de AG. */
export function lectores(grid: GridHost): { valor: (col: ColumnState, node: RowNode) => unknown; texto: (col: ColumnState, node: RowNode) => string } {
  const params = (col: ColumnState, node: RowNode, def: ColDefAg): ParamsCelda => ({ value: undefined, data: node.data, node, colDef: def, column: col, rowIndex: node.index, api: grid.modelo(), context: grid.opcion('context') });
  const valor = (col: ColumnState, node: RowNode): unknown => {
    const def = grid.defDe(col);
    // Camino directo: construir params por lectura pesa con 100.000 filas.
    if (def['valueGetter'] == null && !col.field.includes('.')) return node.data[col.field];
    return leerValor(def, params(col, node, def));
  };
  const texto = (col: ColumnState, node: RowNode): string => {
    const def = grid.defDe(col);
    const v = leerValor(def, params(col, node, def));
    return formatearValor(def, v, { ...params(col, node, def), value: v }, grid.opcion<Definiciones | undefined>('dataTypeDefinitions'));
  };
  return { valor, texto };
}

/** Copia y exportacion: `useValueFormatterForExport: false` entrega el valor crudo. */
export function textoExportacion(def: ColDefAg, valor: unknown, params: ParamsCelda): unknown {
  return def['useValueFormatterForExport'] === false ? valor : formatearValor(def, valor, params);
}
