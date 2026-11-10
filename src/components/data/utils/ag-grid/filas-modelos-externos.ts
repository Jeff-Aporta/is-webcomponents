// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/filas/modelos-externos — Fabricas de ModeloFilas para rowModelType
 * infinite, serverSide y viewport. Cada una se registra con
 * `grid.modeloFilas(tipo, crear)`; el host pinta esqueleto cuando `filaEn` es null.
 */
import { CacheBloques } from './filas-cache-bloques.js';
import { aplicarTransaccion } from './filas-transacciones.js';
import type { ColServidor, DatasourceInfinito, DatasourceServidor, DatasourceViewport, ExitoServidor, IdFila, PeticionBloque, RefrescoServidor, ResultadoServidor, RutaServidor, TransaccionServidor } from './filas.schemas.js';
import type { ColumnState, RowData, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { FilaDisplay, GridHost, ModeloFilas } from './contrato.schemas.js';

const TAM_BLOQUE = 100;

function idDeOpcion(grid: GridHost): IdFila {
  const fn = grid.opcion<((p: Record<string, unknown>) => string) | null>('getRowId', null);
  if (typeof fn !== 'function') return null;
  return (data: RowData): string => String(fn({ data, level: 0, parentKeys: [] }));
}

function ordenAg(grid: GridHost): Array<{ colId: string; sort: string }> {
  const estado = grid.estado();
  if (!estado) return [];
  return estado.sortModel.map((s) => ({ colId: s.colId, sort: String(s.dir) }));
}

function nodoDe(grid: GridHost, data: RowData, indice: number, prefijo: string): RowNode {
  const idDe = idDeOpcion(grid);
  return { id: idDe ? idDe(data) : `${prefijo}${indice}`, index: indice, data };
}

/* ── Infinite ─────────────────────────────────────────────────────────── */

export function crearModeloInfinito(grid: GridHost): ModeloFilas & { cache: () => CacheBloques; fijarDatasource: (d: DatasourceInfinito | null) => void } {
  let datasource = grid.opcion<DatasourceInfinito | null>('datasource', null);
  const pedir = (p: PeticionBloque): void => {
    if (!datasource) return p.fallo();
    datasource.getRows({
      startRow: p.startRow,
      endRow: p.endRow,
      sortModel: ordenAg(grid),
      filterModel: grid.estado()?.filterModel ?? {},
      context: grid.opcion('context'),
      successCallback: p.exito,
      failCallback: p.fallo,
    });
  };
  const nuevaCache = (): CacheBloques => new CacheBloques({
    tamBloque: grid.opcion<number>('cacheBlockSize', TAM_BLOQUE),
    maxBloques: grid.opcion<number | null>('maxBlocksInCache', null),
    maxConcurrentes: grid.opcion<number>('maxConcurrentDatasourceRequests', 2),
    desborde: grid.opcion<number>('cacheOverflowSize', 1) * grid.opcion<number>('cacheBlockSize', TAM_BLOQUE),
    inicial: datasource?.rowCount ?? grid.opcion<number>('infiniteInitialRowCount', 1),
    pedir,
    alCambiar: () => grid.pedirRender(),
  });
  let cache = nuevaCache();
  return {
    tipo: 'infinite',
    total: () => cache.total(),
    filaEn(indice: number): FilaDisplay | null {
      const data = cache.fila(indice);
      if (!data) return null;
      return { kind: 'leaf', level: 0, node: nodoDe(grid, data, indice, 'inf-') };
    },
    asegurar: (desde: number, hasta: number) => cache.asegurar(desde, hasta),
    refrescar: () => cache.refrescar(true),
    destruir() {
      cache.destruir();
      datasource?.destroy?.();
    },
    cache: () => cache,
    fijarDatasource(d: DatasourceInfinito | null) {
      cache.destruir();
      datasource = d;
      cache = nuevaCache();
      grid.pedirRender();
    },
  };
}

/* ── Server-side ──────────────────────────────────────────────────────── */

class TiendaServidor {
  ruta: RutaServidor;
  cache: CacheBloques;
  estadoNivel: unknown = null;

  constructor(ruta: RutaServidor, cache: CacheBloques) {
    this.ruta = ruta;
    this.cache = cache;
  }
}

function claveRuta(ruta: RutaServidor): string {
  return ruta.join('\u0001');
}

/** SSRM: una tienda por ruta abierta; el indice de display se resuelve caminando las tiendas abiertas. */
export class ModeloServidor {
  tipo = 'serverSide';
  #grid: GridHost;
  #tiendas = new Map<string, TiendaServidor>();
  #abiertos = new Set<string>();
  #cerrados = new Set<string>();
  #datasource: DatasourceServidor | null;
  #espera: ReturnType<typeof setTimeout> | null = null;
  #diferidas: Array<() => void> = [];

  constructor(grid: GridHost) {
    this.#grid = grid;
    this.#datasource = grid.opcion<DatasourceServidor | null>('serverSideDatasource', null);
  }

  fijarDatasource(d: DatasourceServidor | null): void {
    this.#datasource?.destroy?.();
    this.#datasource = d;
    this.refrescarTodo(true);
  }

  #grupos(): ColServidor[] {
    const estado = this.#grid.estado();
    if (!estado) return [];
    return estado.rowGroupCols.map((id) => this.#colServidor(id));
  }

  #colServidor(id: string): ColServidor {
    const col = this.#grid.columna(id);
    return { id, displayName: col?.headerName ?? id, field: col?.field ?? id, aggFunc: col?.aggFunc ?? undefined };
  }

  #valores(): ColServidor[] {
    const columnas = this.#grid.columnas();
    return columnas.filter((c: ColumnState) => c.aggFunc).map((c: ColumnState) => this.#colServidor(c.colId));
  }

  #tienda(ruta: RutaServidor): TiendaServidor {
    const clave = claveRuta(ruta);
    const previa = this.#tiendas.get(clave);
    if (previa) return previa;
    const tam = this.#grid.opcion<number>('cacheBlockSize', TAM_BLOQUE);
    const cache = new CacheBloques({
      tamBloque: tam,
      maxBloques: this.#grid.opcion<number | null>('maxBlocksInCache', null),
      maxConcurrentes: this.#grid.opcion<number | null>('maxConcurrentDatasourceRequests', 2),
      desborde: tam,
      inicial: this.#grid.opcion<number>('serverSideInitialRowCount', 1),
      pedir: (p) => this.#pedir(ruta, p),
      alCambiar: () => this.#grid.pedirRender(),
    });
    const tienda = new TiendaServidor(ruta, cache);
    this.#tiendas.set(clave, tienda);
    return tienda;
  }

  #pedir(ruta: RutaServidor, p: PeticionBloque): void {
    const espera = this.#grid.opcion<number>('blockLoadDebounceMillis', 0);
    if (!espera) return this.#lanzar(ruta, p);
    this.#diferidas.push(() => this.#lanzar(ruta, p));
    if (this.#espera) clearTimeout(this.#espera);
    this.#espera = setTimeout(() => {
      const lote = this.#diferidas;
      this.#diferidas = [];
      this.#espera = null;
      for (const fn of lote) fn();
    }, espera);
  }

  #lanzar(ruta: RutaServidor, p: PeticionBloque): void {
    const ds = this.#datasource;
    if (!ds) return p.fallo();
    const estado = this.#grid.estado();
    ds.getRows({
      request: {
        startRow: p.startRow,
        endRow: p.endRow,
        rowGroupCols: this.#grupos(),
        valueCols: this.#valores(),
        pivotCols: this.#grid.opcion<string[]>('pivotColIds', []).map((c) => this.#colServidor(c)),
        pivotMode: this.#grid.opcion<boolean>('pivotMode', false),
        groupKeys: ruta,
        filterModel: estado?.filterModel ?? {},
        sortModel: ordenAg(this.#grid),
      },
      parentNode: null,
      context: this.#grid.opcion('context'),
      api: this.#grid.modelo(),
      success: (r: ExitoServidor) => {
        const tienda = this.#tiendas.get(claveRuta(ruta));
        if (tienda) tienda.estadoNivel = r.groupLevelInfo ?? null;
        p.exito(r.rowData, r.rowCount);
        this.#grid.emitir('storeUpdated', { route: ruta });
      },
      fail: p.fallo,
    });
  }

  #esGrupo(ruta: RutaServidor, data: RowData): boolean {
    const fn = this.#grid.opcion<((d: RowData) => boolean) | null>('isServerSideGroup', null);
    if (typeof fn === 'function') return fn(data) === true;
    return ruta.length < this.#grupos().length;
  }

  #claveGrupo(ruta: RutaServidor, data: RowData): string {
    const fn = this.#grid.opcion<((d: RowData) => string) | null>('getServerSideGroupKey', null);
    if (typeof fn === 'function') return String(fn(data));
    const col = this.#grupos()[ruta.length];
    return String(col ? data[col.field] ?? '' : '');
  }

  #idGrupo(ruta: RutaServidor, clave: string): string {
    const grupos = this.#grupos();
    const tramos = [...ruta, clave].map((c, i) => `${grupos[i]?.id ?? i}=${c}`);
    return tramos.join('|');
  }

  estaAbierto(ruta: RutaServidor, data: RowData | null): boolean {
    const clave = claveRuta(ruta);
    if (this.#abiertos.has(clave)) return true;
    if (this.#cerrados.has(clave)) return false;
    const fn = this.#grid.opcion<((p: Record<string, unknown>) => boolean) | null>('isServerSideGroupOpenByDefault', null);
    if (typeof fn === 'function' && data) return fn({ data, rowNode: null, level: ruta.length - 1 }) === true;
    const defecto = this.#grid.opcion<number>('groupDefaultExpanded', 0);
    return defecto === -1 || ruta.length <= defecto;
  }

  fijarAbierto(ruta: RutaServidor, abierto: boolean): void {
    const clave = claveRuta(ruta);
    if (abierto) {
      this.#abiertos.add(clave);
      this.#cerrados.delete(clave);
    } else {
      this.#abiertos.delete(clave);
      this.#cerrados.add(clave);
      if (this.#grid.opcion<boolean>('purgeClosedRowNodes', false)) this.#olvidar(ruta);
    }
    this.#grid.pedirRender();
  }

  /** Alterna por id de grupo. El id se codifica con rutas para que `toggleGroup` del motor sirva. */
  alternarPorId(id: string): void {
    const ruta = id.split('|').map((t) => t.slice(t.indexOf('=') + 1));
    this.fijarAbierto(ruta, !this.estaAbierto(ruta, null));
  }

  #olvidar(ruta: RutaServidor): void {
    const prefijo = claveRuta(ruta);
    for (const [clave, t] of this.#tiendas) {
      if (clave !== prefijo && !clave.startsWith(`${prefijo}\u0001`)) continue;
      t.cache.destruir();
      this.#tiendas.delete(clave);
    }
  }

  /** Numero de filas de display bajo una ruta, sumando subtiendas abiertas. */
  #contar(ruta: RutaServidor): number {
    const t = this.#tienda(ruta);
    let total = t.cache.total();
    if (this.#abiertos.size === 0 && this.#grid.opcion<number>('groupDefaultExpanded', 0) === 0) return total;
    for (const [clave, sub] of this.#tiendas) {
      if (sub === t || sub.ruta.length !== ruta.length + 1) continue;
      if (claveRuta(sub.ruta.slice(0, ruta.length)) !== claveRuta(ruta)) continue;
      if (this.estaAbierto(sub.ruta, null) && clave) total += this.#contar(sub.ruta);
    }
    return total;
  }

  total(): number {
    return this.#contar([]);
  }

  filaEn(indice: number): FilaDisplay | null {
    return this.#buscar([], indice);
  }

  /** Sin grupos en el nivel el indice es directo; con grupos hay que saltar las subtiendas abiertas. */
  #buscar(ruta: RutaServidor, indice: number): FilaDisplay | null {
    const t = this.#tienda(ruta);
    const total = t.cache.total();
    if (!this.#nivelConGrupos(ruta)) return indice < total ? this.#fila(ruta, t, indice) : null;
    let restante = indice;
    for (let i = 0; i < total; i++) {
      if (restante === 0) return this.#fila(ruta, t, i);
      restante--;
      const sub = this.#subAbierta(ruta, t, i);
      if (!sub) continue;
      const n = this.#contar(sub);
      if (restante < n) return this.#buscar(sub, restante);
      restante -= n;
    }
    return null;
  }

  #nivelConGrupos(ruta: RutaServidor): boolean {
    return ruta.length < this.#grupos().length || typeof this.#grid.opcion('isServerSideGroup', null) === 'function';
  }

  #subAbierta(ruta: RutaServidor, t: TiendaServidor, i: number): RutaServidor | null {
    const data = t.cache.fila(i);
    if (!data || !this.#esGrupo(ruta, data)) return null;
    const sub = [...ruta, this.#claveGrupo(ruta, data)];
    return this.estaAbierto(sub, data) ? sub : null;
  }

  #fila(ruta: RutaServidor, t: TiendaServidor, i: number): FilaDisplay | null {
    const data = t.cache.fila(i);
    if (!data) return null;
    if (!this.#esGrupo(ruta, data)) return { kind: 'leaf', level: ruta.length, node: nodoDe(this.#grid, data, i, `ssrm-${claveRuta(ruta)}-`) };
    const clave = this.#claveGrupo(ruta, data);
    const sub = [...ruta, clave];
    const abierto = this.estaAbierto(sub, data);
    if (abierto) this.#tienda(sub);
    const col = this.#grupos()[ruta.length];
    const conteo = this.#grid.opcion<((d: RowData) => number) | null>('getChildCount', null);
    return { kind: 'group', id: this.#idGrupo(ruta, clave), colId: col?.id ?? '', field: col?.field ?? '', value: clave, label: clave || this.#grid.texto('blanks', '(vacío)'), level: ruta.length, count: typeof conteo === 'function' ? conteo(data) : 0, expanded: abierto, agg: data, leafIds: [] };
  }

  /** Pide lo que falte en el rango de display. */
  asegurar(desde: number, hasta: number): void {
    const raiz = this.#tienda([]);
    if (raiz.cache.vacio()) raiz.cache.asegurar(0, 0);
    for (let i = desde; i <= hasta; i++) {
      if (!this.#asegurarIndice([], i)) break;
    }
  }

  #asegurarIndice(ruta: RutaServidor, indice: number): boolean {
    const t = this.#tienda(ruta);
    const total = t.cache.total();
    if (!this.#nivelConGrupos(ruta)) {
      t.cache.asegurar(indice, indice);
      return indice < total;
    }
    let restante = indice;
    for (let i = 0; i < total; i++) {
      t.cache.asegurar(i, i);
      if (restante === 0) return true;
      restante--;
      const sub = this.#subAbierta(ruta, t, i);
      if (!sub) continue;
      const n = this.#contar(sub);
      if (restante < n) return this.#asegurarIndice(sub, restante);
      restante -= n;
    }
    return false;
  }

  refrescarTodo(purgar: boolean): void {
    for (const t of this.#tiendas.values()) t.cache.refrescar(purgar);
    if (purgar) this.#olvidarSubtiendas();
    this.#grid.pedirRender();
  }

  #olvidarSubtiendas(): void {
    for (const [clave, t] of this.#tiendas) {
      if (t.ruta.length) this.#tiendas.delete(clave);
    }
  }

  refrescar(p: RefrescoServidor = {}): void {
    const ruta = p.route ?? [];
    if (!ruta.length) {
      this.refrescarTodo(p.purge === true);
      this.#grid.emitir('storeRefreshed', { route: ruta });
      return;
    }
    this.#tiendas.get(claveRuta(ruta))?.cache.refrescar(p.purge === true);
    this.#grid.emitir('storeRefreshed', { route: ruta });
  }

  reintentar(): void {
    for (const t of this.#tiendas.values()) t.cache.reintentar();
  }

  niveles(): Array<{ route: RutaServidor; rowCount: number; lastRowIndexKnown: boolean; info: unknown; pages: Array<{ startRow: number; endRow: number; state: string }> }> {
    return [...this.#tiendas.values()].map((t) => ({
      route: t.ruta,
      rowCount: t.cache.total(),
      lastRowIndexKnown: t.cache.ultimaConocida(),
      info: t.estadoNivel,
      pages: Object.values(t.cache.estados()).map((e) => ({ startRow: e.startRow, endRow: e.endRow, state: e.pageStatus })),
    }));
  }

  transaccion(tx: TransaccionServidor): ResultadoServidor {
    const t = this.#tiendas.get(claveRuta(tx.route ?? []));
    if (!t) return { status: 'StoreNotFound' };
    if (t.cache.ocupado()) return { status: 'StoreLoading' };
    const r = aplicarTransaccion(t.cache.cargadas(), tx, idDeOpcion(this.#grid));
    t.cache.reemplazarCargadas(r.filas);
    const nodos = (lista: RowData[]): RowNode[] => lista.map((d, i) => nodoDe(this.#grid, d, i, 'ssrm-tx-'));
    return { status: 'Applied', add: nodos(r.add), update: nodos(r.update), remove: nodos(r.remove) };
  }

  fijarDatos(p: { successParams: ExitoServidor; route?: RutaServidor; startRow?: number }): void {
    const t = this.#tienda(p.route ?? []);
    t.cache.escribir(p.startRow ?? 0, p.successParams.rowData);
    if (p.successParams.rowCount != null) t.cache.fijarTotal(p.successParams.rowCount);
  }

  fijarTotal(n: number, conocida = true): void {
    this.#tienda([]).cache.fijarTotal(n, conocida);
  }

  raiz(): CacheBloques {
    return this.#tienda([]).cache;
  }

  destruir(): void {
    if (this.#espera) clearTimeout(this.#espera);
    for (const t of this.#tiendas.values()) t.cache.destruir();
    this.#tiendas.clear();
    this.#datasource?.destroy?.();
  }
}

/* ── Viewport ─────────────────────────────────────────────────────────── */

/** El servidor empuja filas por indice; aqui solo se guardan las de la ventana. */
export class ModeloViewport {
  tipo = 'viewport';
  #grid: GridHost;
  #datasource: DatasourceViewport | null;
  #filas = new Map<number, RowNode>();
  #total = 0;
  #primera = -1;
  #ultima = -1;

  constructor(grid: GridHost) {
    this.#grid = grid;
    this.#datasource = grid.opcion<DatasourceViewport | null>('viewportDatasource', null);
    this.#iniciar();
  }

  #iniciar(): void {
    this.#datasource?.init({
      setRowCount: (n: number, mantener = false) => this.#fijarTotal(n, mantener),
      setRowData: (filas: Record<number, RowData>) => this.#fijarDatos(filas),
      getRow: (i: number) => this.#filas.get(i) ?? null,
    });
  }

  #fijarTotal(n: number, mantener: boolean): void {
    this.#total = n;
    if (!mantener) this.#filas.clear();
    this.#grid.pedirRender();
  }

  #fijarDatos(filas: Record<number, RowData>): void {
    for (const clave of Object.keys(filas)) {
      const i = Number(clave);
      this.#filas.set(i, nodoDe(this.#grid, filas[i] as RowData, i, 'vp-'));
    }
    this.#grid.pedirRender();
  }

  fijarDatasource(d: DatasourceViewport | null): void {
    this.#datasource?.destroy?.();
    this.#datasource = d;
    this.#filas.clear();
    this.#primera = -1;
    this.#ultima = -1;
    this.#iniciar();
  }

  total(): number {
    return this.#total;
  }

  filaEn(i: number): FilaDisplay | null {
    const node = this.#filas.get(i);
    return node ? { kind: 'leaf', level: 0, node } : null;
  }

  /** Redondea a paginas de viewportRowModelPageSize y añade el buffer, como AG Grid. */
  asegurar(desde: number, hasta: number): void {
    const pagina = Math.max(1, this.#grid.opcion<number>('viewportRowModelPageSize', 5));
    const margen = Math.max(0, this.#grid.opcion<number>('viewportRowModelBufferSize', 5));
    const primera = Math.max(0, Math.floor(Math.max(0, desde - margen) / pagina) * pagina);
    const tope = Math.max(0, this.#total - 1);
    const ultima = Math.min(tope, Math.ceil((hasta + margen + 1) / pagina) * pagina - 1);
    if (primera === this.#primera && ultima === this.#ultima) return;
    this.#primera = primera;
    this.#ultima = ultima;
    for (const i of this.#filas.keys()) if (i < primera || i > ultima) this.#filas.delete(i);
    this.#datasource?.setViewportRange(primera, ultima);
  }

  destruir(): void {
    this.#datasource?.destroy?.();
    this.#filas.clear();
  }
}
