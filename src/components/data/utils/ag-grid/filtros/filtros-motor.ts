/**
 * motor — Estado de los filtros de la grilla y evaluacion de filas.
 *
 * El modelo de columna vive en core (`modelo().setFilter`) con la forma de AG Grid: core
 * lo deja pasar y el transformador de la etapa `filtrar` llama a `aplicar`. Asi el
 * indicador del encabezado y la persistencia siguen funcionando sin cambios.
 */
import { coincideAvanzado } from './avanzado.js';
import { aModeloAg, coincideModelo, condicionActiva, condicionesDe, esCondicional, esLegado } from './condiciones.js';
import { coincideQuick, partesQuick } from './quick.js';
import { coincideSet } from './set.js';
import { ModeloFiltrosSchema } from './filtros.schemas.js';
import type { ActivoFiltro, Condicion, ContextoValor, ModeloAvanzado, ModeloColumna, ModeloFiltros, ModeloMulti, ModeloSet, ParamsFiltro, TipoCondicion, TipoFiltro } from './filtros.schemas.js';
import type { ColumnState, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { GridHost } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';

const TIPOS: Record<string, TipoFiltro> = {
  agTextColumnFilter: 'text', agNumberColumnFilter: 'number', agDateColumnFilter: 'date', agSetColumnFilter: 'set', agMultiColumnFilter: 'multi',
  text: 'text', number: 'number', date: 'date', set: 'set', multi: 'multi',
};
const HIJOS_MULTI_DEFECTO = [{ filter: 'agTextColumnFilter' }, { filter: 'agSetColumnFilter' }];


/** Tipo de filtro de una definicion suelta; false y null = sin filtro. */
function tipoDeDefinicion(filtro: unknown, respaldo: string | null | undefined): TipoFiltro | null {
  if (filtro === false || filtro === null) return null;
  if (typeof filtro === 'string' && TIPOS[filtro]) return TIPOS[filtro] as TipoFiltro;
  return TIPOS[String(respaldo ?? '')] ?? (filtro === undefined ? null : 'text');
}

function esModeloActivo(tipo: TipoFiltro, modelo: unknown, params: ParamsFiltro): boolean {
  if (!modelo) return false;
  if (tipo === 'set') return Array.isArray((modelo as ModeloSet).values);
  if (tipo === 'multi') return ((modelo as ModeloMulti).filterModels ?? []).some(Boolean);
  if (!esCondicional(tipo)) return false;
  return condicionesDe(modelo as ModeloColumna).some((c) => condicionActiva(tipo, c, params));
}

export class MotorFiltros {
  #grid: GridHost;
  #avanzado: ModeloAvanzado | null = null;
  #quick = '';
  #partes: string[] = [];
  #cache = new WeakMap<object, string>();
  /** Lo llaman la UI para repintarse cuando cambia un filtro. */
  alCambiar = new Set<(colIds: string[]) => void>();
  abrirFiltro: ((colId: string, ancla?: Element) => void) | null = null;

  constructor(grid: GridHost) {
    this.#grid = grid;
  }

  get grid(): GridHost { return this.#grid; }

  texto(clave: string, porDefecto: string): string {
    return this.#grid.texto(clave, porDefecto);
  }

  /** Columna por colId o por objeto columna. */
  col(clave: unknown): ColumnState | null {
    if (typeof clave === 'string') return this.#grid.columna(clave);
    const c = clave as { colId?: string; getColId?: () => string } | null;
    const id = c?.getColId?.() ?? c?.colId;
    return id ? this.#grid.columna(id) : null;
  }

  tipoDe(col: ColumnState): TipoFiltro | null {
    const def = this.#grid.defDe(col);
    return tipoDeDefinicion(def['filter'], col.filterType as string | null);
  }

  paramsDe(col: ColumnState): ParamsFiltro {
    const p = this.#grid.defDe(col)['filterParams'];
    return p && typeof p === 'object' ? p as ParamsFiltro : {};
  }

  /** Hijos de un multi filter: { filter, filterParams, display, title }. */
  hijosDe(col: ColumnState): Array<Record<string, unknown>> {
    const lista = this.paramsDe(col)['filters'];
    return Array.isArray(lista) && lista.length ? lista as Array<Record<string, unknown>> : HIJOS_MULTI_DEFECTO;
  }

  tipoHijo(hijo: Record<string, unknown>): TipoFiltro {
    return tipoDeDefinicion(hijo['filter'], 'text') ?? 'text';
  }

  valorFiltro(col: ColumnState, node: RowNode): unknown {
    const propio = this.#grid.defDe(col)['filterValueGetter'];
    if (typeof propio === 'function') return (propio as (p: Record<string, unknown>) => unknown)({ data: node.data, node, column: col, colDef: this.#grid.defDe(col), getValue: (id: string) => this.#valorPorId(id, node) });
    if (typeof propio === 'string') return node.data[propio];
    return this.#grid.valor(col, node);
  }

  #valorPorId(colId: string, node: RowNode): unknown {
    const c = this.#grid.columna(colId);
    return c ? this.#grid.valor(c, node) : node.data[colId];
  }

  ctx(col: ColumnState, node: RowNode): ContextoValor {
    const valor = this.valorFiltro(col, node);
    const texto = typeof valor === 'object' && valor !== null ? this.#grid.textoCelda(col, node) : String(valor ?? '');
    return { valor, texto, data: node.data, node, col, def: this.#grid.defDe(col), ahora: () => new Date() };
  }

  /* ── modelo ─────────────────────────────────────────────────────────── */

  modeloDe(colId: string): ModeloColumna | null {
    const crudo = this.#grid.estado()?.filterModel?.[colId];
    return crudo ? aModeloAg(crudo) : null;
  }

  getFilterModel(): ModeloFiltros {
    const m = this.#grid.estado()?.filterModel ?? {};
    const salida: ModeloFiltros = {};
    for (const [colId, f] of Object.entries(m)) {
      const ag = aModeloAg(f);
      if (ag) salida[colId] = ag;
    }
    return salida;
  }

  /** Reemplaza el modelo completo; null limpia todo. Las columnas sin entrada quedan sin filtro. */
  setFilterModel(modelo: ModeloFiltros | null): void {
    const presentes = Object.entries(modelo ?? {}).filter(([, m]) => m != null);
    const limpio = ModeloFiltrosSchema.parse(Object.fromEntries(presentes));
    const api = this.#grid.modelo();
    if (!api) return;
    const antes = Object.keys(this.#grid.estado()?.filterModel ?? {});
    const nuevos = Object.keys(limpio);
    for (const colId of antes) if (!(colId in limpio)) api.setFilter(colId, null);
    for (const colId of nuevos) api.setFilter(colId, limpio[colId] as never);
    this.avisar([...new Set([...antes, ...nuevos])], 'api');
  }

  setColumna(colId: string, modelo: ModeloColumna | null, origen = 'columnFilter'): void {
    this.#grid.modelo()?.setFilter(colId, (modelo ?? null) as never);
    this.avisar([colId], origen);
  }

  isColumnFilterPresent(): boolean {
    return Object.keys(this.#grid.estado()?.filterModel ?? {}).length > 0;
  }

  isAnyFilterPresent(): boolean {
    return this.isColumnFilterPresent() || this.#avanzado !== null || this.#partes.length > 0 || this.#externoPresente();
  }

  #externoPresente(): boolean {
    const presente = this.#grid.opcion<(() => boolean) | undefined>('isExternalFilterPresent');
    return typeof presente === 'function' && presente() === true;
  }

  /** Recomputa y publica filterChanged. */
  avisar(colIds: string[], origen: string): void {
    this.#grid.recomputar('filtros');
    this.#grid.emitir('filterChanged', { columns: colIds.flatMap((id) => this.col(id) ?? []), source: origen });
    for (const fn of this.alCambiar) fn(colIds);
  }

  /* ── quick ──────────────────────────────────────────────────────────── */

  get quick(): string { return this.#quick; }

  setQuick(texto: string): void {
    const nuevo = String(texto ?? '');
    if (nuevo === this.#quick) return;
    this.#quick = nuevo;
    const parser = this.#grid.opcion<((t: string) => string[]) | undefined>('quickFilterParser');
    this.#partes = partesQuick(nuevo, parser);
    if (this.#grid.opcion('quickFilterText', '') !== nuevo) this.#grid.fijarOpcion('quickFilterText', nuevo);
    this.avisar([], 'quickFilter');
  }

  isQuickPresent(): boolean { return this.#partes.length > 0; }

  resetCacheQuick(): void {
    this.#cache = new WeakMap();
  }

  #textoQuick(node: RowNode): string {
    // Por defecto se cachea por objeto de datos: una transaccion lo invalida sola
    // y con 100.000 filas repetir el texto en cada tecla no es viable.
    const cachear = this.#grid.opcion('cacheQuickFilter') !== false;
    const guardado = cachear ? this.#cache.get(node.data) : undefined;
    if (guardado !== undefined) return guardado;
    const ocultas = this.#grid.opcion('includeHiddenColumnsInQuickFilter') === true;
    const trozos: string[] = [];
    for (const col of this.#grid.columnas()) {
      if (col.hide && !ocultas) continue;
      const propio = this.#grid.defDe(col)['getQuickFilterText'];
      const valor = this.#grid.valor(col, node);
      if (typeof propio === 'function') {
        trozos.push(String((propio as (p: Record<string, unknown>) => unknown)({ value: valor, node, data: node.data, column: col, colDef: this.#grid.defDe(col) }) ?? ''));
        continue;
      }
      trozos.push(String(valor ?? ''), this.#grid.textoCelda(col, node));
    }
    const texto = trozos.join('\n').toUpperCase();
    if (cachear) this.#cache.set(node.data, texto);
    return texto;
  }

  /* ── avanzado ───────────────────────────────────────────────────────── */

  get avanzado(): ModeloAvanzado | null { return this.#avanzado; }

  setAvanzado(modelo: ModeloAvanzado | null): void {
    this.#avanzado = modelo ?? null;
    this.#grid.emitir('advancedFilterChanged', { model: this.#avanzado });
    this.avisar([], 'advancedFilter');
  }

  #contextoAvanzado(node: RowNode): (colId: string) => ContextoValor | null {
    return (colId) => {
      const col = this.#grid.columna(colId);
      return col ? this.ctx(col, node) : null;
    };
  }

  /* ── evaluacion ─────────────────────────────────────────────────────── */

  #pruebaHijo(col: ColumnState, tipo: TipoFiltro, modelo: unknown, params: ParamsFiltro): (node: RowNode) => boolean {
    if (tipo === 'set') return (node) => coincideSet(modelo as ModeloSet, this.valorFiltro(col, node), params);
    if (tipo === 'multi') {
      const hijos = this.hijosDe(col);
      const pruebas = ((modelo as ModeloMulti).filterModels ?? []).flatMap((m, i) => {
        if (!m) return [];
        const hijo = hijos[i] ?? {};
        const t = (m as { filterType?: string }).filterType as TipoFiltro | undefined ?? this.tipoHijo(hijo);
        return [this.#pruebaHijo(col, t, m, (hijo['filterParams'] ?? {}) as ParamsFiltro)];
      });
      return (node) => pruebas.every((p) => p(node));
    }
    const condicional = (esCondicional(tipo) ? tipo : 'text') as TipoCondicion;
    return (node) => coincideModelo(condicional, modelo as ModeloColumna, this.ctx(col, node), params);
  }

  /** Prueba de una columna sin mirar el estado; la usa la UI para contar y `doesFilterPass`. */
  prueba(col: ColumnState, modelo: ModeloColumna): (node: RowNode) => boolean {
    const declarado = (modelo as { filterType?: string }).filterType;
    const tipo = (declarado && TIPOS[declarado]) || this.tipoDe(col) || 'text';
    return this.#pruebaHijo(col, tipo, modelo, this.paramsDe(col));
  }

  #activos(): ActivoFiltro[] {
    const salida: ActivoFiltro[] = [];
    if (this.#grid.opcion('enableAdvancedFilter') === true) return salida;
    for (const [colId, f] of Object.entries(this.#grid.estado()?.filterModel ?? {})) {
      if (esLegado(f)) continue;
      const col = this.#grid.columna(colId);
      if (!col) continue;
      const modelo = aModeloAg(f) as ModeloColumna;
      const tipo = (modelo as { filterType?: string }).filterType as TipoFiltro | undefined ?? this.tipoDe(col) ?? 'text';
      const params = this.paramsDe(col);
      if (esModeloActivo(tipo, modelo, params)) salida.push({ col, prueba: this.#pruebaHijo(col, tipo, modelo, params) });
    }
    return salida;
  }

  /** Etapa `filtrar`: columna + avanzado + quick + externo. */
  aplicar(filas: RowNode[]): RowNode[] {
    const activos = this.#activos();
    const partes = this.#partes;
    const avanzado = this.#avanzado;
    const pasaExterno = this.#externoPresente() ? this.#grid.opcion<(n: RowNode) => boolean>('doesExternalFilterPass') : null;
    if (!activos.length && !partes.length && !avanzado && !pasaExterno) return filas;
    const matcher = this.#grid.opcion<((p: string[], t: string) => boolean) | undefined>('quickFilterMatcher');
    return filas.filter((node) => {
      for (const a of activos) if (!a.prueba(node)) return false;
      if (avanzado && !coincideAvanzado(avanzado, this.#contextoAvanzado(node))) return false;
      if (pasaExterno && !pasaExterno(node)) return false;
      return !partes.length || coincideQuick(partes, this.#textoQuick(node), matcher);
    });
  }

  /** Instancia al estilo de getColumnFilterInstance. */
  instancia(col: ColumnState): Record<string, unknown> {
    const colId = col.colId;
    return {
      getModel: () => this.modeloDe(colId),
      setModel: (m: ModeloColumna | null) => {
        this.setColumna(colId, m, 'api');
        return Promise.resolve();
      },
      isFilterActive: () => this.modeloDe(colId) !== null,
      doesFilterPass: (p: { node: RowNode }) => {
        const m = this.modeloDe(colId);
        return m ? this.prueba(col, m)(p.node) : true;
      },
      getFilterValues: () => ((this.#grid.modelo()?.getAllRows() ?? []) as RowNode[]).map((n) => this.valorFiltro(col, n)),
      getConditions: () => condicionesDe(this.modeloDe(colId)) as Condicion[],
    };
  }
}
