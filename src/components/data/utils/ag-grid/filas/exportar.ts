/**
 * ag-grid/filas/exportar — De la grilla a TablaExport, y de ahi a CSV o XLSX.
 *
 * Una sola ruta para los dos formatos: `tablaDe` resuelve columnas, filas y
 * callbacks de AG Grid; los escritores puros no saben de la grilla.
 */
import { csvABlob, tablaACsv } from './exportar-csv.js';
import { crearEstilos, entradasLibro, hojaAXml, libroABlob, libroABlobComprimido, nombreHoja } from './exportar-excel.js';
import type { ColExport, DuenoExport, FnExport, FilaCruda, EstiloExcel, FilaExport, FilaLibre, HojaExcel, ParamsExport, TablaExport } from './filas.schemas.js';
import type { ColumnState, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { FilaDisplay, FilaExtra, GridHost } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';

const ID_AUTO = 'ag-Grid-AutoColumn';
const ANCHO_AUTO = 200;

function funcionDe(params: ParamsExport, nombre: string): FnExport | null {
  const f = params[nombre];
  return typeof f === 'function' ? (f as FnExport) : null;
}

function columnasDe(grid: GridHost, params: ParamsExport): ColumnState[] {
  const todas = grid.columnas();
  if (params.columnKeys?.length) return params.columnKeys.flatMap((id) => todas.filter((c) => c.colId === id));
  const base = params.allColumns ? todas : todas.filter((c) => !c.hide);
  const orden = (c: ColumnState): number => (c.pinned === 'left' ? 0 : c.pinned === 'right' ? 2 : 1);
  return base.slice().sort((a, b) => orden(a) - orden(b));
}

function colExport(grid: GridHost, c: ColumnState, params: ParamsExport): ColExport {
  const def = grid.defDe(c);
  const proc = funcionDe(params, 'processHeaderCallback');
  const encabezado = proc ? String(proc({ column: c, api: grid.modelo(), context: grid.opcion('context') }) ?? '') : c.headerName;
  const clase = typeof def['cellClass'] === 'string' ? def['cellClass'] as string : undefined;
  const claseEncabezado = typeof def['headerClass'] === 'string' ? def['headerClass'] as string : undefined;
  return { colId: c.colId, encabezado, ancho: c.width, tipo: String(c.type), fijada: c.pinned === 'left', clase, claseEncabezado };
}

function usaFormato(grid: GridHost, c: ColumnState): boolean {
  return grid.defDe(c)['useValueFormatterForExport'] !== false;
}

function celda(grid: GridHost, c: ColumnState, node: RowNode, tipo: string, proc: FnExport | null, indice: number): [unknown, string] {
  const valor = grid.valor(c, node);
  if (proc) {
    const r = proc({ value: valor, node, column: c, api: grid.modelo(), context: grid.opcion('context'), type: tipo, accumulatedRowIndex: indice });
    return [r, r == null ? '' : String(r)];
  }
  const texto = usaFormato(grid, c) ? grid.textoCelda(c, node) : valor == null ? '' : String(valor);
  return [typeof valor === 'number' || typeof valor === 'boolean' || valor instanceof Date ? valor : texto, texto];
}

function celdaAgg(c: ColumnState, agg: Record<string, unknown>): [unknown, string] {
  const v = agg[c.colId];
  return [v ?? null, v == null ? '' : String(v)];
}

/** Traduce el arbol de cabeceras de pivote y las filas a la tabla comun. */
export function tablaDe(grid: GridHost, dueno: DuenoExport, entrada: ParamsExport, tipo: 'csv' | 'excel'): TablaExport {
  const predeterminado = grid.opcion<ParamsExport>(tipo === 'csv' ? 'defaultCsvExportParams' : 'defaultExcelExportParams', {});
  const params: ParamsExport = { ...predeterminado, ...entrada };
  const columnas = columnasDe(grid, params);
  const filas = dueno.filasExport(params);
  const hayGrupos = filas.some((f) => f.kind === 'group');
  const salida = columnas.map((c) => colExport(grid, c, params));
  const colsTabla: ColExport[] = hayGrupos ? [{ colId: ID_AUTO, encabezado: grid.texto('group', 'Grupo'), ancho: ANCHO_AUTO, tipo: 'text', fijada: true }, ...salida] : salida;
  const filasTabla = recorrer(grid, dueno, filas, columnas, hayGrupos, params, tipo);
  return { columnas: colsTabla, filas: filasTabla, antes: params['prependContent'] ?? params['customHeader'], despues: params['appendContent'] ?? params['customFooter'] };
}

function recorrer(grid: GridHost, dueno: DuenoExport, filas: readonly FilaDisplay[], columnas: readonly ColumnState[], hayGrupos: boolean, params: ParamsExport, tipo: string): FilaExport[] {
  const procCelda = funcionDe(params, 'processCellCallback');
  const procGrupo = funcionDe(params, 'processRowGroupCallback');
  const saltar = funcionDe(params, 'shouldRowBeSkipped');
  const seleccion = params.onlySelected || params.onlySelectedAllPages ? grid.estado()?.selection ?? new Set<string>() : null;
  const expandir = params.rowGroupExpandState ?? 'expanded';
  const contexto = grid.opcion('context');
  const api = grid.modelo();
  const salida: FilaExport[] = [];
  const ruta: string[] = [];
  let nivelCerrado = Infinity;
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i] as FilaCruda;
    if (f.level <= nivelCerrado) nivelCerrado = Infinity;
    const oculta = expandir === 'collapsed' ? f.level > 0 : f.level > nivelCerrado;
    if (f.kind === 'detalle') continue;
    if (f.kind === 'group') {
      const id = String(f.id);
      ruta.length = f.level;
      ruta.push(String(f.label));
      if (f.nodo) {
        if (seleccion && !seleccion.has(f.nodo.id)) continue;
        salida.push(filaHoja(grid, f.nodo, columnas, `-> ${ruta.join(' -> ')}`, f.level, oculta, tipo, procCelda, salida.length));
        continue;
      }
      if (expandir === 'match' && nivelCerrado === Infinity && !dueno.abiertoPorId(id)) nivelCerrado = f.level;
      if (params.skipRowGroups) continue;
      if (seleccion && !seleccion.has(id)) continue;
      const etiqueta = procGrupo ? String(procGrupo({ node: f, api, context: contexto }) ?? '') : `-> ${ruta.join(' -> ')}`;
      salida.push(filaAgregada('grupo', f.level, etiqueta, f.agg ?? {}, columnas, oculta));
      continue;
    }
    if (f.kind === 'total') {
      if (seleccion) continue;
      salida.push(filaAgregada('total', f.level, String(f.etiqueta ?? ''), f.agg ?? {}, columnas, oculta));
      continue;
    }
    const node = f.node as RowNode | undefined;
    if (!node) continue;
    if (seleccion && !seleccion.has(node.id)) continue;
    if (saltar?.({ node, api, context: contexto })) continue;
    salida.push(filaHoja(grid, node, columnas, hayGrupos ? '' : null, f.level, oculta, tipo, procCelda, salida.length));
  }
  return salida;
}

function filaHoja(grid: GridHost, node: RowNode, columnas: readonly ColumnState[], primera: string | null, nivel: number, oculta: boolean, tipo: string, proc: FnExport | null, indice: number): FilaExport {
  const valores: unknown[] = primera === null ? [] : [primera || null];
  const textos: string[] = primera === null ? [] : [primera];
  for (const c of columnas) {
    const [v, t] = celda(grid, c, node, tipo, proc, indice);
    valores.push(v);
    textos.push(t);
  }
  return { tipo: 'hoja', nivel, valores, textos, contraida: oculta };
}

function filaAgregada(tipo: 'grupo' | 'total', nivel: number, etiqueta: string, agg: Record<string, unknown>, columnas: readonly ColumnState[], oculta: boolean): FilaExport {
  const valores: unknown[] = [etiqueta];
  const textos: string[] = [etiqueta];
  for (const c of columnas) {
    const [v, t] = celdaAgg(c, agg);
    valores.push(v);
    textos.push(t);
  }
  return { tipo, nivel, valores, textos, contraida: oculta };
}

/* ── Descarga ─────────────────────────────────────────────────────────── */

export function descargar(grid: GridHost, blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = grid.el.ownerDocument.createElement('a');
  a.href = url;
  a.download = nombre;
  a.hidden = true;
  grid.shadow.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function nombreArchivo(params: ParamsExport, extension: string): string {
  const base = params.fileName ?? 'export';
  return base.endsWith(`.${extension}`) ? base : `${base}.${extension}`;
}

/* ── API por formato ──────────────────────────────────────────────────── */

export function datosCsv(grid: GridHost, dueno: DuenoExport, params: ParamsExport = {}): string {
  const fusion = { ...grid.opcion<ParamsExport>('defaultCsvExportParams', {}), ...params };
  return tablaACsv(tablaDe(grid, dueno, params, 'csv'), fusion);
}

export function exportarCsv(grid: GridHost, dueno: DuenoExport, params: ParamsExport = {}): void {
  if (grid.opcion<boolean>('suppressCsvExport', false)) return;
  const fusion = { ...grid.opcion<ParamsExport>('defaultCsvExportParams', {}), ...params };
  descargar(grid, csvABlob(datosCsv(grid, dueno, params)), nombreArchivo(fusion, 'csv'));
}

/** Traduce un `prependContent` a filas libres. Texto suelto = una celda. */
function filasLibres(v: unknown): FilaLibre[] {
  if (v == null || v === '') return [];
  if (typeof v === 'string') return v.split(/\r?\n/).map((t) => ({ cells: [{ data: { value: t, type: 'String' } }] }));
  return Array.isArray(v) ? v as FilaLibre[] : [];
}

function hojaDe(grid: GridHost, dueno: DuenoExport, params: ParamsExport, indice: number): HojaExcel {
  const fusion = { ...grid.opcion<ParamsExport>('defaultExcelExportParams', {}), ...params };
  const tabla = tablaDe(grid, dueno, params, 'excel');
  return { nombre: nombreHoja(fusion.sheetName, indice), columnas: tabla.columnas, filas: tabla.filas, antes: filasLibres(tabla.antes), despues: filasLibres(tabla.despues), opciones: fusion };
}

/** Exportacion XLSX con el mismo estilo del libro para todas sus hojas. */
export class ExportadorExcel {
  #grid: GridHost;
  #dueno: DuenoExport;
  #nombres = new Map<string, string>();

  constructor(grid: GridHost, dueno: DuenoExport) {
    this.#grid = grid;
    this.#dueno = dueno;
  }

  #estilos(params: ParamsExport): { xml: string; indice: Map<string, number> } {
    return crearEstilos(this.#grid.opcion<EstiloExcel[]>('excelStyles', []), params.fontSize ?? 11);
  }

  datosHoja(params: ParamsExport = {}): string {
    const hoja = hojaDe(this.#grid, this.#dueno, params, this.#nombres.size);
    const xml = hojaAXml(hoja, this.#estilos(params).indice);
    this.#nombres.set(xml, hoja.nombre);
    return xml;
  }

  #entradas(params: ParamsExport, hojas: readonly string[]) {
    const nombres = hojas.map((xml, i) => this.#nombres.get(xml) ?? nombreHoja(undefined, i));
    return entradasLibro(nombres, hojas, this.#estilos(params).xml, params.author);
  }

  /** Sincrono, como en AG Grid: sale sin comprimir. */
  blob(params: ParamsExport = {}): Blob {
    return libroABlob(this.#entradas(params, [this.datosHoja(params)]));
  }

  async comprimido(params: ParamsExport = {}): Promise<Blob> {
    return await libroABlobComprimido(this.#entradas(params, [this.datosHoja(params)]));
  }

  variasHojas(params: ParamsExport & { data?: string[] }): Blob {
    const blob = libroABlob(this.#entradas(params, params.data ?? []));
    this.#nombres.clear();
    return blob;
  }

  async exportar(params: ParamsExport = {}): Promise<void> {
    if (this.#grid.opcion<boolean>('suppressExcelExport', false)) return;
    const fusion = { ...this.#grid.opcion<ParamsExport>('defaultExcelExportParams', {}), ...params };
    descargar(this.#grid, await this.comprimido(fusion), nombreArchivo(fusion, 'xlsx'));
    this.#nombres.clear();
  }

  exportarVarias(params: ParamsExport & { data?: string[] }): void {
    const nombre = nombreArchivo(params, 'xlsx');
    descargar(this.#grid, this.variasHojas(params), nombre);
  }
}
