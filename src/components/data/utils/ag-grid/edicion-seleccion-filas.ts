// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/edicion-seleccion-filas — Reglas puras de la seleccion de filas.
 * Conjuntos de ids; el controlador decide de donde salen y a quien avisa.
 */
import type { Seleccionable, UniversoFilas } from './edicion-seleccion-filas.schemas.js';
import type { AlcanceTodo, GestoFila, OpcionesFilas } from './edicion.schemas.js';

function comoObjeto(valor: unknown): Record<string, unknown> {
  if (valor === 'single') return { mode: 'singleRow' };
  if (valor === 'multiple') return { mode: 'multiRow' };
  if (valor && typeof valor === 'object') return valor as Record<string, unknown>;
  return {};
}

/** Null si no hay seleccion de filas configurada. */
export function leerOpciones(valor: unknown): OpcionesFilas | null {
  const o = comoObjeto(valor);
  if (o['mode'] !== 'singleRow' && o['mode'] !== 'multiRow') return null;
  const clic = o['enableClickSelection'];
  const enableClickSelection = clic === 'enableSelection' || clic === 'enableDeselection' ? clic : clic === true;
  const alcance = o['selectAll'];
  const selectAll = alcance === 'filtered' || alcance === 'currentPage' ? alcance : 'all';
  return {
    mode: o['mode'],
    checkboxes: o['checkboxes'] ?? true,
    headerCheckbox: o['headerCheckbox'] !== false,
    enableClickSelection,
    enableSelectionWithoutKeys: o['enableSelectionWithoutKeys'] === true,
    hideDisabledCheckboxes: o['hideDisabledCheckboxes'] === true,
    selectAll,
    copySelectedRows: o['copySelectedRows'] === true,
    ctrlASelectsRows: o['ctrlASelectsRows'] === true,
    isRowSelectable: o['isRowSelectable'],
  };
}

function tramo(gesto: GestoFila): string[] {
  const a = gesto.ancla == null ? -1 : gesto.ordenados.indexOf(gesto.ancla);
  const b = gesto.ordenados.indexOf(gesto.id);
  if (b < 0) return [];
  if (a < 0) return [gesto.id];
  return gesto.ordenados.slice(Math.min(a, b), Math.max(a, b) + 1);
}

function alternar(actual: Set<string>, id: string, opciones: OpcionesFilas): Set<string> {
  const seleccionar = !actual.has(id);
  if (seleccionar && opciones.enableClickSelection === 'enableDeselection') return actual;
  if (!seleccionar && opciones.enableClickSelection === 'enableSelection') return actual;
  const siguiente = opciones.mode === 'singleRow' ? new Set<string>() : new Set(actual);
  if (seleccionar) siguiente.add(id);
  else siguiente.delete(id);
  return siguiente;
}

/** Clic sobre la fila, sin pasar por el checkbox. */
export function clicFila(actual: Set<string>, gesto: GestoFila, opciones: OpcionesFilas, seleccionable: Seleccionable): Set<string> {
  if (opciones.enableClickSelection === false) return actual;
  if (!seleccionable(gesto.id)) return actual;
  const multi = opciones.mode === 'multiRow';
  if (gesto.shift && multi) {
    const base = gesto.ctrl ? new Set(actual) : new Set<string>();
    for (const id of tramo(gesto)) if (seleccionable(id)) base.add(id);
    return base;
  }
  if (gesto.ctrl || opciones.enableSelectionWithoutKeys) return alternar(actual, gesto.id, opciones);
  if (actual.has(gesto.id) && actual.size === 1) return alternar(actual, gesto.id, opciones);
  if (opciones.enableClickSelection === 'enableDeselection') return actual;
  return new Set([gesto.id]);
}

/** Checkbox y Espacio: nunca quitan otras filas en multiRow. */
export function alternarCheck(actual: Set<string>, gesto: GestoFila, opciones: OpcionesFilas, seleccionable: Seleccionable): Set<string> {
  if (!seleccionable(gesto.id)) return actual;
  const siguiente = opciones.mode === 'multiRow' ? new Set(actual) : new Set<string>();
  if (gesto.shift && opciones.mode === 'multiRow') {
    for (const id of tramo(gesto)) if (seleccionable(id)) siguiente.add(id);
    return siguiente;
  }
  if (actual.has(gesto.id)) siguiente.delete(gesto.id);
  else siguiente.add(gesto.id);
  return siguiente;
}


export function idsDeAlcance(alcance: AlcanceTodo, universo: UniversoFilas): string[] {
  if (alcance === 'filtered') return universo.filtradas;
  if (alcance === 'currentPage') return universo.pagina;
  return universo.todas;
}

export function agregarTodas(actual: Set<string>, ids: string[], seleccionable: Seleccionable): Set<string> {
  const siguiente = new Set(actual);
  for (const id of ids) if (seleccionable(id)) siguiente.add(id);
  return siguiente;
}

export function quitarTodas(actual: Set<string>, ids: string[]): Set<string> {
  const siguiente = new Set(actual);
  for (const id of ids) siguiente.delete(id);
  return siguiente;
}

export function estadoEncabezado(actual: Set<string>, ids: string[], seleccionable: Seleccionable): 'all' | 'some' | 'none' {
  const candidatas = ids.filter(seleccionable);
  const marcadas = candidatas.filter((id) => actual.has(id)).length;
  if (marcadas === 0) return 'none';
  return marcadas === candidatas.length ? 'all' : 'some';
}
