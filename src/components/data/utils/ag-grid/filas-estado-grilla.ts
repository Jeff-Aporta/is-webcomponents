// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/filas-estado-grilla — getState/setState con la forma de AG Grid. Pura.
 *
 * `leerEstado` fotografia el GridState del motor. `fusionarEstado` calcula lo
 * que `loadState` del motor debe recibir, para aplicar todo con un solo notify
 * (un setter por campo recalcularia el pipeline completo muchas veces). Las
 * columnas se pasan como objetos: JSON perderia valueGetter y formatters.
 */
import { EstadoGrillaSchema } from './filas.schemas.js';
import type { EstadoGrilla } from './filas.schemas.js';
import type { ColumnState, GridState } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

export function leerEstado(s: GridState, extra: Partial<EstadoGrilla> = {}): EstadoGrilla {
  const columnas = s.columns;
  const izquierda = columnas.filter((c) => c.pinned === 'left').map((c) => c.colId);
  const derecha = columnas.filter((c) => c.pinned === 'right').map((c) => c.colId);
  const ocultas = columnas.filter((c) => c.hide).map((c) => c.colId);
  const estado: EstadoGrilla = {
    version: '1',
    columnOrder: { orderedColIds: columnas.map((c) => c.colId) },
    columnPinning: { leftColIds: izquierda, rightColIds: derecha },
    columnSizing: { columnSizingModel: columnas.map((c) => ({ colId: c.colId, width: c.width, flex: c.flex ?? null })) },
    columnVisibility: { hiddenColIds: ocultas },
    pagination: { page: s.page, pageSize: s.pageSize },
    rowSelection: [...s.selection],
    ...extra,
  };
  if (s.sortModel.length) estado.sort = { sortModel: s.sortModel.map((m) => ({ colId: m.colId, sort: String(m.dir) })) };
  if (Object.keys(s.filterModel).length || s.quickFilter) estado.filter = { filterModel: s.filterModel, quickFilter: s.quickFilter };
  if (s.rowGroupCols.length) estado.rowGroup = { groupColIds: s.rowGroupCols };
  return estado;
}

/** Devuelve el estado valido o null. Lo persistido puede venir de otra version. */
export function validarEstado(entrada: unknown): EstadoGrilla | null {
  const r = EstadoGrillaSchema.safeParse(entrada);
  return r.success ? r.data : null;
}

function reordenar(columnas: readonly ColumnState[], orden: readonly string[]): ColumnState[] {
  const pos = new Map(orden.map((id, i) => [id, i]));
  const conocidas = columnas.filter((c) => pos.has(c.colId)).sort((a, b) => (pos.get(a.colId) as number) - (pos.get(b.colId) as number));
  const nuevas = columnas.filter((c) => !pos.has(c.colId));
  return [...conocidas, ...nuevas];
}

function ajustarColumnas(columnas: readonly ColumnState[], e: EstadoGrilla): ColumnState[] {
  const izquierda = new Set(e.columnPinning?.leftColIds ?? []);
  const derecha = new Set(e.columnPinning?.rightColIds ?? []);
  const ocultas = new Set(e.columnVisibility?.hiddenColIds ?? []);
  const anchos = new Map((e.columnSizing?.columnSizingModel ?? []).map((m) => [m.colId, m]));
  const base = columnas.map((c) => {
    const copia = { ...c };
    if (e.columnPinning) copia.pinned = izquierda.has(c.colId) ? 'left' : derecha.has(c.colId) ? 'right' : null;
    if (e.columnVisibility) copia.hide = ocultas.has(c.colId);
    const ancho = anchos.get(c.colId);
    if (ancho?.width != null) copia.width = ancho.width;
    if (ancho?.flex != null) copia.flex = ancho.flex;
    return copia;
  });
  return e.columnOrder ? reordenar(base, e.columnOrder.orderedColIds) : base;
}

/** Quita lo que `propertiesToIgnore` pide conservar. */
export function omitirPropiedades(e: EstadoGrilla, ignorar: readonly string[] = []): EstadoGrilla {
  const copia: Record<string, unknown> = { ...e };
  for (const clave of ignorar) delete copia[clave];
  return copia as EstadoGrilla;
}

/** Objeto para `GridApi.loadState`. Solo incluye lo que `e` trae. */
export function fusionarEstado(columnas: readonly ColumnState[], e: EstadoGrilla): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (e.columnOrder || e.columnPinning || e.columnSizing || e.columnVisibility) out['columns'] = ajustarColumnas(columnas, e);
  if (e.sort) out['sortModel'] = e.sort.sortModel.map((m) => ({ colId: m.colId, dir: m.sort }));
  if (e.filter?.filterModel) out['filterModel'] = e.filter.filterModel;
  if (e.filter?.quickFilter !== undefined) out['quickFilter'] = e.filter.quickFilter;
  if (e.pagination?.page !== undefined) out['page'] = e.pagination.page;
  if (e.pagination?.pageSize !== undefined) out['pageSize'] = e.pagination.pageSize;
  if (e.rowGroup) out['rowGroupCols'] = e.rowGroup.groupColIds;
  if (e.rowGroupExpansion) out['expandedGroups'] = e.rowGroupExpansion.expandedRowGroupIds;
  return out;
}
