/**
 * orden — Sorting: ciclo de clic, multi-orden, comparacion por tipo, orden absoluto y acentos.
 */
import type { ColumnaOrden, DirOrden, ItemOrden, OpcionesClicOrden } from './filtros.schemas.js';

const CICLO: Array<string | null> = ['asc', 'desc', null];
const COLADOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Sin accentedSort se compara por codigo; con accentedSort, por idioma. */
function compararTexto(a: string, b: string, acentos: boolean): number {
  if (acentos) return COLADOR.compare(a, b);
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x === y) return 0;
  return x < y ? -1 : 1;
}

function aTiempo(v: unknown): number {
  const t = v instanceof Date ? v.getTime() : new Date(String(v)).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Compara dos valores segun el tipo; lo nulo va primero. */
export function compararValores(a: unknown, b: unknown, tipo: string, acentos = false): number {
  if (a == null || a === '') return b == null || b === '' ? 0 : -1;
  if (b == null || b === '') return 1;
  if (tipo === 'number' || (typeof a === 'number' && typeof b === 'number')) return Number(a) - Number(b);
  if (tipo === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0);
  if (tipo === 'date' || tipo === 'dateTime' || a instanceof Date) return aTiempo(a) - aTiempo(b);
  return compararTexto(String(a), String(b), acentos);
}

/** Siguiente paso del ciclo sortingOrder. */
export function siguienteDir(actual: DirOrden, orden: Array<string | null> = CICLO): DirOrden {
  const i = orden.indexOf(actual);
  return (orden[(i + 1) % orden.length] ?? null) as DirOrden;
}

/** Modelo tras un clic: sin multi reemplaza; con multi conserva la cadena. */
export function modeloTrasClic(modelo: ItemOrden[], colId: string, opciones: OpcionesClicOrden): ItemOrden[] {
  const actual = modelo.find((s) => s.colId === colId);
  const dir = siguienteDir(actual?.dir ?? null, opciones.orden);
  if (!opciones.multi) return dir ? [{ colId, dir }] : [];
  if (!dir) return modelo.filter((s) => s.colId !== colId);
  if (actual) return modelo.map((s) => s.colId === colId ? { ...s, dir } : s);
  return [...modelo, { colId, dir }];
}

/** ¿El clic acumula en la cadena? shift por defecto; ctrl con multiSortKey='ctrl'. */
export function esClicMulti(evento: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }, opciones: { multiSortKey?: unknown; suppressMultiSort?: unknown; alwaysMultiSort?: unknown }): boolean {
  if (opciones.suppressMultiSort === true) return false;
  const tecla = opciones.multiSortKey === 'ctrl' ? evento.ctrlKey === true || evento.metaKey === true : evento.shiftKey === true;
  if (opciones.alwaysMultiSort === true) return !tecla;
  return tecla;
}

/** Orden inicial desde los colDefs: sort/initialSort y sortIndex/initialSortIndex. */
export function ordenInicial(defs: Array<Record<string, unknown>>): ItemOrden[] {
  const conOrden = defs.flatMap((d, i) => {
    const dir = d['sort'] ?? d['initialSort'];
    if (dir !== 'asc' && dir !== 'desc') return [];
    const indice = d['sortIndex'] ?? d['initialSortIndex'];
    return [{ colId: String(d['colId'] ?? d['field'] ?? ''), dir: dir as 'asc' | 'desc', indice: typeof indice === 'number' ? indice : Number.MAX_SAFE_INTEGER, i }];
  });
  conOrden.sort((a, b) => a.indice - b.indice || a.i - b.i);
  return conOrden.map(({ colId, dir }) => ({ colId, dir }));
}

/** Orden estable; el comparador propio recibe (a, b, nodoA, nodoB, esDesc) y el absoluto usa magnitudes. */
export function ordenarFilas<T>(filas: T[], modelo: ItemOrden[], columnas: Map<string, ColumnaOrden>, acentos = false): T[] {
  const activos = modelo.flatMap((s) => {
    const col = columnas.get(s.colId);
    return col ? [{ col, desc: s.dir === 'desc', abs: s.type === 'absolute' }] : [];
  });
  if (!activos.length) return filas;
  const indexadas = filas.map((fila, i) => ({ fila, i }));
  indexadas.sort((x, y) => {
    for (const { col, desc, abs } of activos) {
      const va = col.valor(x.fila);
      const vb = col.valor(y.fila);
      const ax = abs && typeof va === 'number' ? Math.abs(va) : va;
      const ay = abs && typeof vb === 'number' ? Math.abs(vb) : vb;
      const c = col.comparador && !abs ? col.comparador(ax, ay, x.fila, y.fila, desc) : compararValores(ax, ay, col.tipo, acentos);
      if (c !== 0) return desc ? -c : c;
    }
    return x.i - y.i;
  });
  return indexadas.map((e) => e.fila);
}
