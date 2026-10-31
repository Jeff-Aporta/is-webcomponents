/**
 * ag-grid/edicion/apoyo — Lecturas comunes de los controladores sobre el host.
 */
import type { Parametros } from './apoyo.schemas.js';
export type * from './apoyo.schemas.js';
import type { ColDefAg } from '../contrato.js';
import type { ColumnState } from '../contrato.js';
import type { FilaDisplay } from '../contrato.js';
import type { GridHost } from '../contrato.js';
import type { RefCelda } from '../contrato.js';
import type { RowNode } from '../contrato.js';
import type { MapaNavegacion } from './schemas/edicion.schemas.js';
import type { Posicion } from './schemas/edicion.schemas.js';
import type { TextosValidacion } from './schemas/edicion.schemas.js';


export function nodoDeFila(fila: FilaDisplay | null): RowNode | null {
  if (!fila || fila.kind === 'group') return null;
  if (!('node' in fila)) return null;
  return fila.node ?? null;
}

export function colsVisibles(grid: GridHost): ColumnState[] {
  return grid.columnas().filter((c) => !c.hide);
}

export function apiPublica(grid: GridHost): unknown {
  return (grid.el as HTMLElement & { api?: unknown }).api;
}

export function paramsCelda(grid: GridHost, col: ColumnState, node: RowNode | null, indice: number): Parametros {
  const value = node ? grid.valor(col, node) : undefined;
  const colDef = grid.defDe(col);
  return { api: apiPublica(grid), context: grid.opcion('context'), node, data: node?.data ?? null, column: col, colDef, value, rowIndex: indice };
}

/** Opcion que AG Grid acepta como valor fijo o como callback con params. */
export function resolver<T>(valor: unknown, params: Parametros): T {
  return (typeof valor === 'function' ? valor(params) : valor) as T;
}

export function esEditable(grid: GridHost, col: ColumnState, node: RowNode | null, indice: number): boolean {
  if (!node) return false;
  const def = grid.defDe(col);
  return resolver<boolean>(def['editable'], paramsCelda(grid, col, node, indice)) === true;
}

export function posDeRef(grid: GridHost, ref: RefCelda): Posicion | null {
  const col = colsVisibles(grid).findIndex((c) => c.colId === ref.colId);
  if (col < 0) return null;
  return { fila: ref.indice, col };
}

export function refDePos(grid: GridHost, pos: Posicion): RefCelda | null {
  const col = colsVisibles(grid)[pos.col];
  return col ? { indice: pos.fila, colId: col.colId } : null;
}

export function mapaNavegacion(grid: GridHost): MapaNavegacion {
  const cols = colsVisibles(grid);
  const navegable = (fila: number, c: number): boolean => {
    const col = cols[c];
    if (!col) return false;
    const def = grid.defDe(col);
    const valor = def['suppressNavigable'];
    if (valor == null) return true;
    const node = nodoDeFila(grid.filaEn(fila));
    return resolver<boolean>(valor, paramsCelda(grid, col, node, fila)) !== true;
  };
  return { totalFilas: grid.totalFilas(), totalCols: cols.length, navegable };
}

export function textosValidacion(grid: GridHost): TextosValidacion {
  return {
    muyLargo: grid.texto('editorMuyLargo', 'Maximo {n} caracteres'),
    menorQue: grid.texto('editorMenorQue', 'Debe ser como maximo {n}'),
    mayorQue: grid.texto('editorMayorQue', 'Debe ser como minimo {n}'),
    noNumero: grid.texto('editorNoNumero', 'No es un numero'),
    noFecha: grid.texto('editorNoFecha', 'No es una fecha'),
  };
}

/** Valor nulo de una celda borrada: con valueParser, el parser recibe cadena vacia. */
export function valorBorrado(def: ColDefAg, params: Parametros): unknown {
  const parser = def['valueParser'];
  if (typeof parser !== 'function') return null;
  return parser({ ...params, oldValue: params['value'], newValue: '' });
}

/** Devuelve el foco real al viewport: el teclado de la grilla escucha ahi. */
export function enfocarGrilla(grid: GridHost): void {
  grid.shadow.querySelector<HTMLElement>('[role="grid"], [role="treegrid"]')?.focus({ preventScroll: true });
}

/** Lleva px medidos a em del elemento: los estilos nunca salen en px. */
export function pxAEm(px: number, el: Element): string {
  const base = parseFloat(getComputedStyle(el).fontSize) || 16;
  return `${px / base}em`;
}
