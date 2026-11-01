/**
 * menus — Items de Column Menu y Context Menu con claves de AG Grid. El host pinta y abre.
 */
import { resolverMenu } from './resumen.js';
import { TEXTOS } from './textos.js';
import type { MotorFiltros } from './filtros-motor.js';
import type { ItemOrden } from './filtros.schemas.js';
import type { ColumnState, RowNode } from '../../../schemas/datagrid-types.schemas.js';
import type { ContextoMenu, ItemMenu } from '../contrato.schemas.js';

const COLUMNA_DEFECTO = ['sortAscending', 'sortDescending', 'sortAbsoluteAscending', 'sortAbsoluteDescending', 'sortUnSort', 'separator', 'columnFilter', 'separator', 'pinSubMenu', 'valueAggSubMenu', 'autoSizeThis', 'autoSizeAll', 'separator', 'rowGroup', 'rowUnGroup', 'separator', 'resetColumns', 'separator', 'columnChooser', 'expandAll', 'contractAll'];
const CONTEXTO_DEFECTO = ['copy', 'copyWithHeaders', 'copyWithGroupHeaders', 'paste', 'separator', 'export'];
const FUNCIONES = ['sum', 'min', 'max', 'count', 'avg', 'first', 'last'];

/** Metodo de la api publica de la grilla; las otras parcelas lo aportan con `exponer`. */
function api(motor: MotorFiltros): Record<string, unknown> {
  return (motor.grid.el as HTMLElement & { api?: Record<string, unknown> }).api ?? {};
}

function llamar(motor: MotorFiltros, metodo: string, ...args: unknown[]): void {
  const a = api(motor);
  const fn = a[metodo];
  if (typeof fn === 'function') (fn as (...x: unknown[]) => unknown).apply(a, args);
}

function existe(motor: MotorFiltros, metodo: string): boolean {
  return typeof api(motor)[metodo] === 'function';
}

function t(motor: MotorFiltros, clave: string): string {
  return motor.texto(clave, TEXTOS[clave] ?? clave);
}

function fijarOrden(motor: MotorFiltros, col: ColumnState, dir: 'asc' | 'desc' | null, absoluto = false): void {
  const m = motor.grid.modelo();
  if (!m) return;
  const otros = (motor.grid.estado()?.sortModel ?? []).filter((s) => s.colId !== col.colId) as ItemOrden[];
  const item: ItemOrden = absoluto ? { colId: col.colId, dir: dir as 'asc', type: 'absolute' } : { colId: col.colId, dir: dir as 'asc' };
  m.setSortModel(dir ? [...otros, item] : otros);
  motor.grid.recomputar('orden');
  motor.grid.emitir('sortChanged', { source: 'uiColumnSorted', columns: [col] });
}

function itemsOrden(motor: MotorFiltros, col: ColumnState): Record<string, ItemMenu | null> {
  if (!col.sortable) return {};
  const dir = (motor.grid.estado()?.sortModel ?? []).find((s) => s.colId === col.colId);
  const absoluto = motor.grid.defDe(col)['sortAbsolute'] === true || motor.grid.defDe(col)['absoluteSort'] === true;
  const item = (id: string, icono: string, accion: () => void): ItemMenu => ({ id, texto: t(motor, id), icono, accion });
  return {
    sortAscending: item('sortAscending', 'mdi:sort-ascending', () => fijarOrden(motor, col, 'asc')),
    sortDescending: item('sortDescending', 'mdi:sort-descending', () => fijarOrden(motor, col, 'desc')),
    sortAbsoluteAscending: absoluto ? item('sortAbsoluteAscending', 'mdi:sort-numeric-ascending', () => fijarOrden(motor, col, 'asc', true)) : null,
    sortAbsoluteDescending: absoluto ? item('sortAbsoluteDescending', 'mdi:sort-numeric-descending', () => fijarOrden(motor, col, 'desc', true)) : null,
    sortUnSort: dir ? item('sortUnSort', 'mdi:sort-variant-remove', () => fijarOrden(motor, col, null)) : null,
  };
}

function itemPin(motor: MotorFiltros, col: ColumnState): ItemMenu {
  const fijar = (lado: 'left' | 'right' | null): void => motor.grid.modelo()?.pinColumn(col.colId, lado);
  return { id: 'pinSubMenu', texto: t(motor, 'pinColumn'), icono: 'mdi:pin', hijos: [
    { id: 'pinLeft', texto: t(motor, 'pinLeft'), marcado: col.pinned === 'left', accion: () => fijar('left') },
    { id: 'pinRight', texto: t(motor, 'pinRight'), marcado: col.pinned === 'right', accion: () => fijar('right') },
    { id: 'clearPinned', texto: t(motor, 'noPin'), marcado: !col.pinned, accion: () => fijar(null) },
  ] };
}

function itemAgregado(motor: MotorFiltros, col: ColumnState): ItemMenu | null {
  const def = motor.grid.defDe(col);
  if (def['enableValue'] !== true) return null;
  const permitidas = Array.isArray(def['allowedAggFuncs']) ? def['allowedAggFuncs'] as string[] : FUNCIONES;
  const hijos = permitidas.map((f) => ({ id: f, texto: t(motor, f), marcado: col.aggFunc === f, accion: () => llamar(motor, 'setColumnAggFunc', col.colId, col.aggFunc === f ? null : f) }));
  return { id: 'valueAggSubMenu', texto: t(motor, 'valueAggregation'), icono: 'mdi:sigma', hijos };
}

function integradosColumna(motor: MotorFiltros, ctx: ContextoMenu, chooser: (col: ColumnState) => void): Record<string, ItemMenu | null> {
  const grid = motor.grid;
  const col = ctx.col as ColumnState;
  const estado = grid.estado();
  const agrupada = estado?.rowGroupCols.includes(col.colId) ?? false;
  const hayGrupos = (estado?.rowGroupCols.length ?? 0) > 0;
  return {
    ...itemsOrden(motor, col),
    columnFilter: motor.tipoDe(col) ? { id: 'columnFilter', texto: t(motor, 'columnFilter'), icono: 'mdi:filter-outline', accion: () => motor.abrirFiltro?.(col.colId) } : null,
    columnChooser: { id: 'columnChooser', texto: t(motor, 'columnChooser'), icono: 'mdi:view-column-outline', accion: () => chooser(col) },
    pinSubMenu: itemPin(motor, col),
    valueAggSubMenu: itemAgregado(motor, col),
    autoSizeThis: { id: 'autoSizeThis', texto: t(motor, 'autosizeThisColumn'), icono: 'mdi:arrow-expand-horizontal', accion: () => grid.modelo()?.autosizeColumn(col.colId) },
    autoSizeAll: { id: 'autoSizeAll', texto: t(motor, 'autosizeAllColumns'), accion: () => grid.columnas().forEach((c) => grid.modelo()?.autosizeColumn(c.colId)) },
    rowGroup: col.enableRowGroup && !agrupada ? { id: 'rowGroup', texto: `${t(motor, 'groupBy')} ${col.headerName}`, icono: 'mdi:group', accion: () => grid.modelo()?.addRowGroupCol(col.colId, estado?.rowGroupCols.length ?? 0) } : null,
    rowUnGroup: agrupada ? { id: 'rowUnGroup', texto: `${t(motor, 'ungroupBy')} ${col.headerName}`, icono: 'mdi:ungroup', accion: () => grid.modelo()?.removeRowGroupCol(col.colId) } : null,
    resetColumns: { id: 'resetColumns', texto: t(motor, 'resetColumns'), deshabilitado: !existe(motor, 'resetColumnState'), accion: () => llamar(motor, 'resetColumnState') },
    expandAll: hayGrupos ? { id: 'expandAll', texto: t(motor, 'expandAll'), accion: () => grid.modelo()?.expandAllGroups() } : null,
    contractAll: hayGrupos ? { id: 'contractAll', texto: t(motor, 'collapseAll'), accion: () => grid.modelo()?.collapseAllGroups() } : null,
  };
}

function itemApi(motor: MotorFiltros, id: string, icono: string, metodo: string, atajo?: string, ...args: unknown[]): ItemMenu {
  return { id, texto: t(motor, id), icono, atajo, deshabilitado: !existe(motor, metodo), accion: () => llamar(motor, metodo, ...args) };
}

function integradosContexto(motor: MotorFiltros): Record<string, ItemMenu | null> {
  const hayGrupos = (motor.grid.estado()?.rowGroupCols.length ?? 0) > 0;
  const exportar: ItemMenu = { id: 'export', texto: t(motor, 'export'), icono: 'mdi:export-variant', hijos: [itemApi(motor, 'csvExport', 'mdi:file-delimited-outline', 'exportDataAsCsv'), itemApi(motor, 'excelExport', 'mdi:file-excel-outline', 'exportDataAsExcel'), itemApi(motor, 'pdfExport', 'mdi:file-pdf-box', 'exportDataAsPdf')] };
  return {
    copy: itemApi(motor, 'copy', 'mdi:content-copy', 'copySelectedRangeToClipboard', 'Ctrl+C'),
    copyWithHeaders: itemApi(motor, 'copyWithHeaders', 'mdi:content-copy', 'copySelectedRangeToClipboard', undefined, { includeHeaders: true }),
    copyWithGroupHeaders: itemApi(motor, 'copyWithGroupHeaders', 'mdi:content-copy', 'copySelectedRangeToClipboard', undefined, { includeHeaders: true, includeGroupHeaders: true }),
    cut: itemApi(motor, 'cut', 'mdi:content-cut', 'cutToClipboard', 'Ctrl+X'),
    paste: itemApi(motor, 'paste', 'mdi:content-paste', 'pasteFromClipboard', 'Ctrl+V'),
    export: exportar, csvExport: exportar.hijos?.[0] ?? null, excelExport: exportar.hijos?.[1] ?? null, pdfExport: exportar.hijos?.[2] ?? null,
    autoSizeAll: { id: 'autoSizeAll', texto: t(motor, 'autosizeAllColumns'), accion: () => motor.grid.columnas().forEach((c) => motor.grid.modelo()?.autosizeColumn(c.colId)) },
    resetColumns: { id: 'resetColumns', texto: t(motor, 'resetColumns'), deshabilitado: !existe(motor, 'resetColumnState'), accion: () => llamar(motor, 'resetColumnState') },
    expandAll: hayGrupos ? { id: 'expandAll', texto: t(motor, 'expandAll'), accion: () => motor.grid.modelo()?.expandAllGroups() } : null,
    contractAll: hayGrupos ? { id: 'contractAll', texto: t(motor, 'collapseAll'), accion: () => motor.grid.modelo()?.collapseAllGroups() } : null,
  };
}

function paramsMenu(motor: MotorFiltros, ctx: ContextoMenu, defecto: string[]): Record<string, unknown> {
  const col = ctx.col;
  return { column: col, colDef: col ? motor.grid.defDe(col) : null, node: ctx.node, value: ctx.value, api: api(motor), defaultItems: defecto, data: (ctx.node as RowNode | null)?.data };
}

/** Prioridad: colDef.columnMenuItems → getColumnMenuItems → colDef.mainMenuItems → getMainMenuItems. */
function listaColumna(motor: MotorFiltros, ctx: ContextoMenu): unknown[] {
  const def = ctx.col ? motor.grid.defDe(ctx.col) : {};
  const fuentes = [def['columnMenuItems'], motor.grid.opcion('getColumnMenuItems'), def['mainMenuItems'], motor.grid.opcion('getMainMenuItems')];
  const f = fuentes.find((x) => x != null);
  if (Array.isArray(f)) return f;
  if (typeof f === 'function') return (f as (p: unknown) => unknown[])(paramsMenu(motor, ctx, COLUMNA_DEFECTO));
  return COLUMNA_DEFECTO;
}

function listaContexto(motor: MotorFiltros, ctx: ContextoMenu): unknown[] {
  const def = ctx.col ? motor.grid.defDe(ctx.col) : {};
  const f = def['contextMenuItems'] ?? motor.grid.opcion('getContextMenuItems');
  const hayGrupos = (motor.grid.estado()?.rowGroupCols.length ?? 0) > 0;
  const defecto = hayGrupos ? [...CONTEXTO_DEFECTO, 'separator', 'expandAll', 'contractAll'] : CONTEXTO_DEFECTO;
  if (Array.isArray(f)) return f;
  if (typeof f === 'function') return (f as (p: unknown) => unknown[])(paramsMenu(motor, ctx, defecto));
  return defecto;
}

/** Proveedor para `grid.menu`. */
export function proveedorMenu(motor: MotorFiltros, chooser: (col: ColumnState) => void): (ctx: ContextoMenu) => ItemMenu[] {
  return (ctx) => {
    if (ctx.tipo === 'contexto') {
      if (motor.grid.opcion('suppressContextMenu') === true) return [];
      return resolverMenu(listaContexto(motor, ctx), integradosContexto(motor));
    }
    if (!ctx.col) return [];
    return resolverMenu(listaColumna(motor, ctx), integradosColumna(motor, ctx, chooser));
  };
}
