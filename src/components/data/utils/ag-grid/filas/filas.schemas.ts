/**
 * ag-grid/filas/filas.schemas — Tipos de la parcela de modelos de filas y datos.
 *
 * Los datos que entran desde afuera (transacciones, parametros de exportacion,
 * estado de grilla) tienen Zod; lo que lleva funciones o ciclos se declara como
 * tipo plano porque Zod no aporta nada ahi. Modulos de runtime: `import type`.
 */
import { z } from 'zod';
import type { FilterModel, RowData, RowNode, SortModel } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { FilaDisplay } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';

/* ── Arbol de grupos ──────────────────────────────────────────────────── */

export type NivelGrupo = { colId: string; field: string; valor: (n: RowNode) => unknown; clave?: (valor: unknown, n: RowNode) => string; etiqueta: (valor: unknown) => string; };
export type Acumulado = { suma: number; sumaBig: bigint | null; numericos: number; total: number; min: unknown; max: unknown; primero: unknown; ultimo: unknown; vacio: boolean; valores: unknown[] | null; };
export type NodoArbol = { id: string; padre: NodoArbol | null; colId: string; field: string; clave: string; valor: unknown; etiqueta: string; nivel: number; hijos: NodoArbol[]; mapa: Map<string, NodoArbol>; directas: RowNode[]; hojas: RowNode[]; agg: Record<string, unknown>; acum: Map<string, Acumulado>; nodo: RowNode | null; };
type ParamsAgg = { values: unknown[]; rowNode: NodoArbol; colDef?: unknown; column?: unknown; api?: unknown; context?: unknown; };
export type FuncionAgg = (p: ParamsAgg) => unknown;
export type ValorAgg = { colId: string; func: string | FuncionAgg; valor: (n: RowNode) => unknown; colDef?: unknown; column?: unknown; };
export type OpcionesAgg = { funciones?: Record<string, FuncionAgg>; api?: unknown; contexto?: unknown; porGrupo?: (grupo: NodoArbol) => Record<string, unknown> | null | undefined; clavesPivote?: (hoja: RowNode) => string[]; soloPivote?: boolean; idPivote?: (clave: string, colId: string) => string; };
export type CriterioGrupo = { colId: string; dir: 'asc' | 'desc'; comparar?: (a: unknown, b: unknown) => number; };
export type PosicionTotal = 'top' | 'bottom' | null;
export type OpcionesAplanar = { abierto: (g: NodoArbol) => boolean; totalGrupo?: PosicionTotal | ((g: NodoArbol) => PosicionTotal); totalGeneral?: PosicionTotal; ocultarPadresAbiertos?: boolean; ocultarHijoUnico?: boolean | 'leafGroupsOnly'; sinHojas?: boolean; textoTotal?: (g: NodoArbol | null) => string; formatear?: (colId: string, valor: unknown) => string; };

/* ── Pivote ───────────────────────────────────────────────────────────── */

export type ClaveArbol = { clave: string; etiqueta: string; hijos: Map<string, ClaveArbol>; };
export type ColPivote = { colId: string; valor: (n: RowNode) => unknown; etiqueta?: (v: unknown) => string; comparador?: (a: string, b: string) => number; };
export type OpcionesPivote = { maximo?: number; totalesFila?: PosicionTotal; totalesGrupo?: PosicionTotal; quitarNivelValorUnico?: boolean; procesarCol?: (def: DefPivote) => void; procesarGrupo?: (def: GrupoPivote) => void; };
export type DefPivote = { colId: string; field: string; headerName: string; pivotKeys: string[]; pivotValueColumn: string; aggFunc?: unknown; type?: string; [extra: string]: unknown; };
export type GrupoPivote = { groupId: string; headerName: string; pivotKeys: string[]; children: Array<DefPivote | GrupoPivote>; [extra: string]: unknown; };
export type ResultadoPivote = { arbolDefs: Array<DefPivote | GrupoPivote>; planas: DefPivote[]; clavesDe: (hoja: RowNode) => string[]; excedido: boolean; firma: string; };

/* ── Tree data ────────────────────────────────────────────────────────── */

export type OpcionesTree = { rutaDe?: (data: RowData) => string[]; campoHijos?: string; campoPadre?: string; idDe?: (data: RowData) => string; };
export type ResultadoTree = { raiz: NodoArbol; nodos: RowNode[]; };

/* ── Transacciones ────────────────────────────────────────────────────── */

const TransaccionSchema = z.object({
  add: z.array(z.record(z.string(), z.unknown())).nullish(),
  addIndex: z.number().int().min(0).nullish(),
  update: z.array(z.record(z.string(), z.unknown())).nullish(),
  remove: z.array(z.record(z.string(), z.unknown())).nullish(),
});
export type Transaccion = z.infer<typeof TransaccionSchema>;
export type IdFila = ((d: RowData) => string) | null;
export type ResultadoTransaccion = { filas: RowData[]; add: RowData[]; update: RowData[]; remove: RowData[]; };
export type ResultadoNodos = { add: RowNode[]; update: RowNode[]; remove: RowNode[]; };
export type TicketAsincrono = { tx: Transaccion; callback?: (res: ResultadoNodos) => void; };

/* ── Modelos externos ─────────────────────────────────────────────────── */

export type EstadoBloque = 'needsLoading' | 'loading' | 'loaded' | 'failed';
export type BloqueCache = { id: number; estado: EstadoBloque; filas: RowData[]; desde: number; toque: number; version: number; };
export type PeticionBloque = { startRow: number; endRow: number; exito: (filas: RowData[], ultima?: number | null) => void; fallo: () => void; };
export type OpcionesCache = { tamBloque: number; maxBloques?: number | null; maxConcurrentes?: number | null; desborde: number; inicial: number; cargarBloques?: boolean; pedir: (p: PeticionBloque) => void; alCambiar: () => void; };
type RespuestaInfinita = { startRow: number; endRow: number; sortModel: unknown[]; filterModel: unknown; context: unknown; successCallback: (filas: RowData[], ultima?: number | null) => void; failCallback: () => void; };
export type DatasourceInfinito = { getRows: (p: RespuestaInfinita) => void; destroy?: () => void; rowCount?: number; };
export type ColServidor = { id: string; displayName: string; field: string; aggFunc?: unknown; };
type PeticionServidor = { startRow: number; endRow: number; rowGroupCols: ColServidor[]; valueCols: ColServidor[]; pivotCols: ColServidor[]; pivotMode: boolean; groupKeys: string[]; filterModel: unknown; sortModel: unknown[]; };
export type ExitoServidor = { rowData: RowData[]; rowCount?: number | null; groupLevelInfo?: unknown; pivotResultFields?: string[]; };
type ParamsServidor = { request: PeticionServidor; parentNode: unknown; context: unknown; api: unknown; success: (r: ExitoServidor) => void; fail: () => void; };
export type DatasourceServidor = { getRows: (p: ParamsServidor) => void; destroy?: () => void; };
export type RutaServidor = string[];
export type RefrescoServidor = { route?: RutaServidor; purge?: boolean; };
export type TransaccionServidor = Transaccion & { route?: RutaServidor; };
export type ResultadoServidor = { status: 'Applied' | 'StoreNotFound' | 'StoreLoading' | 'StoreWaitingToLoad' | 'StoreLoadingFailed' | 'Cancelled'; add?: RowNode[]; update?: RowNode[]; remove?: RowNode[]; };
type ParamsViewport = { setRowCount: (n: number, mantener?: boolean) => void; setRowData: (filas: Record<number, RowData>) => void; getRow: (i: number) => RowNode | null; };
export type DatasourceViewport = { init: (p: ParamsViewport) => void; setViewportRange: (primera: number, ultima: number) => void; destroy?: () => void; };

/* ── Exportacion ──────────────────────────────────────────────────────── */

const ParamsExportSchema = z.looseObject({
  fileName: z.string().optional(),
  sheetName: z.string().optional(),
  columnSeparator: z.string().optional(),
  suppressQuotes: z.boolean().optional(),
  skipColumnHeaders: z.boolean().optional(),
  skipColumnGroupHeaders: z.boolean().optional(),
  skipRowGroups: z.boolean().optional(),
  allColumns: z.boolean().optional(),
  columnKeys: z.array(z.string()).optional(),
  onlySelected: z.boolean().optional(),
  onlySelectedAllPages: z.boolean().optional(),
  exportedRows: z.union([z.literal('filteredAndSorted'), z.literal('all')]).optional(),
  rowGroupExpandState: z.union([z.literal('expanded'), z.literal('collapsed'), z.literal('match')]).optional(),
  suppressRowOutline: z.boolean().optional(),
  freezeRows: z.union([z.number(), z.literal('headers')]).optional(),
  freezeColumns: z.union([z.number(), z.literal('pinned')]).optional(),
  columnWidth: z.number().optional(),
  rowHeight: z.number().optional(),
  headerRowHeight: z.number().optional(),
  exportAsExcelTable: z.boolean().optional(),
  author: z.string().optional(),
  fontSize: z.number().optional(),
});
export type ParamsExport = z.infer<typeof ParamsExportSchema>;
type TipoFilaExport = 'hoja' | 'grupo' | 'total';
export type ColExport = { colId: string; encabezado: string; ancho: number; tipo: string; fijada: boolean; clase?: string; claseEncabezado?: string; };
export type FilaExport = { tipo: TipoFilaExport; nivel: number; valores: unknown[]; textos: string[]; contraida: boolean; };
export type CeldaLibre = { data?: { value?: unknown; type?: string } | null; styleId?: string; mergeAcross?: number; };
export type FilaLibre = { cells: CeldaLibre[]; };
export type TablaExport = { columnas: ColExport[]; filas: FilaExport[]; antes?: unknown; despues?: unknown; };
export type HojaExcel = { nombre: string; columnas: ColExport[]; filas: FilaExport[]; antes: FilaLibre[]; despues: FilaLibre[]; opciones: ParamsExport; };
export type EstiloExcel = { id: string; font?: { bold?: boolean; italic?: boolean; size?: number; color?: string; fontName?: string }; interior?: { color?: string; pattern?: string }; alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean }; numberFormat?: { format?: string }; };
export type EntradaZip = { nombre: string; datos: Uint8Array; };

/* ── Estado de grilla ─────────────────────────────────────────────────── */

export const EstadoGrillaSchema = z.looseObject({
  aggregation: z.object({ aggregationModel: z.array(z.object({ colId: z.string(), aggFunc: z.unknown() })) }).optional(),
  columnOrder: z.object({ orderedColIds: z.array(z.string()) }).optional(),
  columnPinning: z.object({ leftColIds: z.array(z.string()), rightColIds: z.array(z.string()) }).optional(),
  columnSizing: z.object({ columnSizingModel: z.array(z.object({ colId: z.string(), width: z.number().optional(), flex: z.number().nullish() })) }).optional(),
  columnVisibility: z.object({ hiddenColIds: z.array(z.string()) }).optional(),
  filter: z.looseObject({ filterModel: z.record(z.string(), z.unknown()).optional(), quickFilter: z.string().optional() }).optional(),
  pagination: z.object({ page: z.number().optional(), pageSize: z.number().optional() }).optional(),
  pivot: z.object({ pivotMode: z.boolean(), pivotColIds: z.array(z.string()) }).optional(),
  rowGroup: z.object({ groupColIds: z.array(z.string()) }).optional(),
  rowGroupExpansion: z.object({ expandedRowGroupIds: z.array(z.string()), collapsedRowGroupIds: z.array(z.string()).optional() }).optional(),
  rowSelection: z.array(z.string()).optional(),
  scroll: z.object({ top: z.number(), left: z.number() }).optional(),
  sideBar: z.unknown().optional(),
  sort: z.object({ sortModel: z.array(z.object({ colId: z.string(), sort: z.string() })) }).optional(),
  focusedCell: z.object({ colId: z.string(), rowIndex: z.number(), rowPinned: z.string().nullish() }).optional(),
  version: z.string().optional(),
});
export type EstadoGrilla = z.infer<typeof EstadoGrillaSchema>;

/* ── Maestro-detalle ──────────────────────────────────────────────────── */

export type FnExport = (p: Record<string, unknown>) => unknown;
export type FilaCruda = FilaDisplay & { id?: string; node?: RowNode; nodo?: RowNode | null; agg?: Record<string, unknown>; label?: string; etiqueta?: string; };
export type DuenoExport = { filasExport: (p: ParamsExport) => FilaDisplay[]; abiertoPorId: (id: string) => boolean; };
export type EnlacesPanel = { grupos: () => string[]; fijarGrupos: (ids: string[]) => void; valores: () => string[]; fijarValores: (ids: string[]) => void; pivotes: () => string[]; fijarPivotes: (ids: string[]) => void; modoPivote: () => boolean; fijarModoPivote: (v: boolean) => void; };
export type LecturaPipeline = { rowGroupCols: string[]; expandedGroups: Set<string>; sortModel: SortModel; filterModel: FilterModel; };
export type InfoSintetica = { id: string; agg: Record<string, unknown>; etiqueta: string; nivel: number; expandible: boolean; abierto: boolean; real: boolean; total: boolean; };
export type ArbolVigente = { raiz: NodoArbol; pivote: ResultadoPivote | null; };
export type InfoDetalle = { id: string; api: unknown; el: HTMLElement | null; };
export type ParamsDetalle = { node: RowNode; data: RowData; successCallback: (filas: RowData[]) => void; };
