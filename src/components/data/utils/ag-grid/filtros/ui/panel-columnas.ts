/**
 * ui/panel-columnas — Columns Tool Panel: busqueda, seleccion, arbol de grupos, reorden y
 * secciones de agrupacion, valores y pivote, con actualizaciones diferidas opcionales.
 */
import { arbolColumnas, filtrarArbolColumnas, hojasColumna } from '../resumen.js';
import { TEXTOS } from '../textos.js';
import { boton, botonIcono, casilla, crear, fijarCasilla, icono, inputDe, selectDe } from './controles.js';
import type { NodoColumna, SeccionColumnas } from '../filtros.schemas.js';
import type { ColumnState } from '../../../../schemas/datagrid-types.schemas.js';
import type { GridHost } from '../../contrato.schemas.js';

const TIPO_ARRASTRE = 'application/x-is-col-id';
const FUNCIONES_AGREGADO = ['sum', 'min', 'max', 'count', 'avg', 'first', 'last'];


export class PanelColumnas {
  el = crear('div', 'iswc-ag-panel iswc-ag-columnas');
  #grid: GridHost;
  #p: Record<string, unknown>;
  #busca = '';
  #lista = crear('div', 'iswc-ag-columnas__lista');
  #secciones = crear('div', 'iswc-ag-columnas__secciones');
  #todo: HTMLElement | null = null;
  #cerrados = new Set<string>();
  #diseno: NodoColumna[] | null = null;
  #visibles: Record<SeccionColumnas | 'pivoteModo', boolean> = { grupos: true, valores: true, pivotes: true, pivoteModo: true };
  #pendientes: Array<() => void> = [];
  #ocultasPendientes = new Map<string, boolean>();

  constructor(grid: GridHost, parametros: Record<string, unknown> = {}) {
    this.#grid = grid;
    this.#p = parametros;
    this.#visibles.grupos = parametros['suppressRowGroups'] !== true;
    this.#visibles.valores = parametros['suppressValues'] !== true;
    this.#visibles.pivotes = parametros['suppressPivots'] !== true;
    this.#visibles.pivoteModo = parametros['suppressPivotMode'] !== true;
    this.el.append(...this.#cabecera(), this.#lista, this.#secciones);
    const pie = this.#pie();
    if (pie) this.el.append(pie);
    this.refrescar();
  }

  #t(clave: string): string {
    return this.#grid.texto(clave, TEXTOS[clave] ?? clave);
  }

  get #difiere(): boolean {
    return Array.isArray(this.#p['buttons']) && (this.#p['buttons'] as string[]).includes('apply');
  }

  /** Con buttons=['apply'] todo queda pendiente hasta Aplicar. */
  #hacer(fn: () => void): void {
    if (this.#difiere) this.#pendientes.push(fn);
    else fn();
  }

  #cabecera(): HTMLElement[] {
    const piezas: HTMLElement[] = [];
    if (this.#visibles.pivoteModo && this.#grid.opcion('pivotPanelShow', undefined) !== 'never' && this.#hayPivote()) {
      piezas.push(casilla(this.#t('pivotMode'), this.#grid.opcion('pivotMode') === true, (m) => this.#grid.fijarOpcion('pivotMode', m)));
    }
    const barra = crear('div', 'iswc-ag-panel__barra');
    if (this.#p['suppressColumnExpandAll'] !== true) barra.append(botonIcono('mdi:unfold-more-horizontal', this.#t('expandAllColumns'), () => this.expandColumnGroups()), botonIcono('mdi:unfold-less-horizontal', this.#t('collapseAllColumns'), () => this.collapseColumnGroups()));
    if (this.#p['suppressColumnSelectAll'] !== true) {
      this.#todo = casilla('', false, (m) => this.#alternarTodo(m));
      this.#todo.setAttribute('aria-label', this.#t('toggleAllColumns'));
      barra.append(this.#todo);
    }
    if (this.#p['suppressColumnFilter'] !== true) {
      barra.append(inputDe({ tipo: 'search', placeholder: this.#t('searchColumnsOoo'), aria: this.#t('searchColumnsOoo'), limpiable: true }, (v) => {
        this.#busca = v;
        this.#pintarLista();
      }));
    }
    if (barra.childElementCount) piezas.push(barra);
    return piezas;
  }

  #hayPivote(): boolean {
    return this.#grid.columnas().some((c) => this.#grid.defDe(c)['enablePivot'] === true);
  }

  #pie(): HTMLElement | null {
    if (!this.#difiere) return null;
    const pie = crear('div', 'iswc-ag-filtro__botones');
    pie.append(boton(this.#t('cancelColumns'), () => this.#descartar()), boton(this.#t('applyColumns'), () => this.#confirmar(), 'filled'));
    return pie;
  }

  #descartar(): void {
    this.#pendientes = [];
    this.#ocultasPendientes.clear();
    this.refrescar();
  }

  #confirmar(): void {
    const lista = this.#pendientes;
    this.#pendientes = [];
    this.#ocultasPendientes.clear();
    for (const fn of lista) fn();
    this.refrescar();
  }

  #arbol(): NodoColumna[] {
    if (this.#diseno) return this.#diseno;
    const cols = this.#grid.columnas().filter((c) => this.#grid.defDe(c)['suppressColumnsToolPanel'] !== true);
    const permitidas = new Set(cols.map((c) => c.colId));
    const defs = this.#grid.opcion<unknown[]>('columnDefs', []);
    const plano = (): NodoColumna[] => cols.map((c) => ({ id: c.colId, etiqueta: c.headerName, colId: c.colId, hijos: [] }));
    const conGrupos = Array.isArray(defs) && defs.some((d) => Array.isArray((d as Record<string, unknown>)['children']));
    return conGrupos ? this.#podar(arbolColumnas(defs), permitidas) : plano();
  }

  #podar(nodos: NodoColumna[], permitidas: Set<string>): NodoColumna[] {
    return nodos.flatMap((n) => {
      if (n.colId !== null) {
        const col = this.#grid.columna(n.colId);
        return permitidas.has(n.colId) && col ? [{ ...n, etiqueta: col.headerName }] : [];
      }
      const hijos = this.#podar(n.hijos, permitidas);
      return hijos.length ? [{ ...n, hijos }] : [];
    });
  }

  #oculta(colId: string): boolean {
    return this.#ocultasPendientes.get(colId) ?? this.#grid.columna(colId)?.hide ?? false;
  }

  #fijarOculta(colIds: string[], ocultar: boolean): void {
    for (const id of colIds) this.#ocultasPendientes.set(id, ocultar);
    this.#hacer(() => {
      for (const id of colIds) this.#grid.modelo()?.hideColumn(id, ocultar);
    });
    if (!this.#difiere) this.#ocultasPendientes.clear();
    this.#pintarLista();
  }

  #alternarTodo(mostrar: boolean): void {
    const visibles = hojasColumna(filtrarArbolColumnas(this.#arbol(), this.#busca));
    this.#fijarOculta(visibles, !mostrar);
  }

  #marcaDe(ids: string[]): boolean | 'mixta' {
    const ocultas = ids.filter((id) => this.#oculta(id)).length;
    if (ocultas === 0) return true;
    return ocultas === ids.length ? false : 'mixta';
  }

  #pintarLista(): void {
    const arbol = filtrarArbolColumnas(this.#arbol(), this.#busca);
    const filas: HTMLElement[] = [];
    this.#pintarNodos(arbol, 0, filas);
    this.#lista.replaceChildren(...filas);
    if (this.#todo) fijarCasilla(this.#todo, this.#marcaDe(hojasColumna(arbol)));
  }

  #pintarNodos(nodos: NodoColumna[], nivel: number, fuera: HTMLElement[]): void {
    for (const n of nodos) {
      fuera.push(this.#fila(n, nivel));
      if (n.colId === null && (!this.#cerrados.has(n.id) || this.#busca)) this.#pintarNodos(n.hijos, nivel + 1, fuera);
    }
  }

  #fila(n: NodoColumna, nivel: number): HTMLElement {
    const fila = crear('div', 'iswc-ag-columnas__fila');
    fila.style.paddingInlineStart = `${nivel * 1.25 + 0.25}em`;
    const ids = n.colId !== null ? [n.colId] : hojasColumna(n.hijos);
    if (n.colId === null) fila.append(this.#plegador(n));
    fila.append(casilla(n.etiqueta, this.#marcaDe(ids), (m) => this.#fijarOculta(ids, !m)));
    if (n.colId !== null) this.#arrastrable(fila, n.colId);
    return fila;
  }

  #plegador(n: NodoColumna): HTMLElement {
    const cerrado = this.#cerrados.has(n.id);
    const b = crear('button', 'iswc-ag-set__plegar');
    b.setAttribute('type', 'button');
    b.setAttribute('aria-expanded', String(!cerrado));
    b.setAttribute('aria-label', n.etiqueta);
    b.append(icono(cerrado ? 'mdi:chevron-right' : 'mdi:chevron-down'));
    b.addEventListener('click', () => {
      if (cerrado) this.#cerrados.delete(n.id);
      else this.#cerrados.add(n.id);
      this.#pintarLista();
    });
    return b;
  }

  #arrastrable(fila: HTMLElement, colId: string): void {
    const def = this.#defDe(colId);
    const puedeMover = this.#p['suppressColumnMove'] !== true && def['suppressMovable'] !== true;
    fila.draggable = puedeMover || def['enableRowGroup'] === true || def['enableValue'] === true || def['enablePivot'] === true;
    fila.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData(TIPO_ARRASTRE, colId);
      e.dataTransfer?.setData('text/plain', colId);
    });
    if (!puedeMover) return;
    fila.addEventListener('dragover', (e) => {
      if (!e.dataTransfer?.types.includes(TIPO_ARRASTRE)) return;
      e.preventDefault();
      fila.classList.add('iswc-ag-sobre');
    });
    fila.addEventListener('dragleave', () => fila.classList.remove('iswc-ag-sobre'));
    fila.addEventListener('drop', (e) => {
      e.preventDefault();
      fila.classList.remove('iswc-ag-sobre');
      const origen = e.dataTransfer?.getData(TIPO_ARRASTRE);
      if (!origen || origen === colId) return;
      const indice = this.#grid.columnas().findIndex((c) => c.colId === colId);
      this.#hacer(() => this.#grid.modelo()?.reorderColumn(origen, indice));
    });
  }

  #defDe(colId: string): Record<string, unknown> {
    const col = this.#grid.columna(colId);
    return col ? this.#grid.defDe(col) : {};
  }

  /* ── secciones ──────────────────────────────────────────────────────── */

  #idsDe(s: SeccionColumnas): string[] {
    if (s === 'grupos') return this.#grid.estado()?.rowGroupCols ?? [];
    const cols = this.#grid.columnas();
    if (s === 'valores') return cols.filter((c) => c.aggFunc).map((c) => c.colId);
    return cols.filter((c) => this.#grid.defDe(c)['pivot'] === true).map((c) => c.colId);
  }

  #admite(s: SeccionColumnas, def: Record<string, unknown>): boolean {
    if (s === 'grupos') return def['enableRowGroup'] === true;
    return def[s === 'valores' ? 'enableValue' : 'enablePivot'] === true;
  }

  #agregar(s: SeccionColumnas, colId: string): void {
    const m = this.#grid.modelo();
    if (s === 'grupos') m?.addRowGroupCol(colId, this.#idsDe('grupos').length);
    else if (s === 'valores') this.#fijarAgregado(colId, String(this.#defDe(colId)['defaultAggFunc'] ?? 'sum'));
    else this.#llamar('addPivotColumns', [[colId]]);
  }

  #quitar(s: SeccionColumnas, colId: string): void {
    if (s === 'grupos') this.#grid.modelo()?.removeRowGroupCol(colId);
    else if (s === 'valores') this.#fijarAgregado(colId, null);
    else this.#llamar('removePivotColumns', [[colId]]);
  }

  #llamar(metodo: string, args: unknown[]): boolean {
    const api = (this.#grid.el as HTMLElement & { api?: Record<string, unknown> }).api;
    const fn = api?.[metodo];
    if (typeof fn !== 'function') return false;
    (fn as (...a: unknown[]) => unknown).apply(api, args);
    return true;
  }

  /** El core no tiene setter de aggFunc: se reescribe la definicion de esa columna. */
  #fijarAgregado(colId: string, fn: string | null): void {
    if (this.#llamar('setColumnAggFunc', [colId, fn])) return;
    const defs = this.#grid.columnas().map((c) => c.colId === colId ? { ...c.def, aggFunc: fn ?? undefined } : c.def);
    this.#grid.modelo()?.setColumnDefs(defs);
  }

  #pintarSecciones(): void {
    const piezas: HTMLElement[] = [];
    const pivote = this.#grid.opcion('pivotMode') === true;
    if (this.#visibles.grupos) piezas.push(this.#seccion('grupos', 'groups', 'rowGroupColumnsEmptyMessage', 'mdi:format-list-group'));
    if (this.#visibles.valores) piezas.push(this.#seccion('valores', 'values', 'valueColumnsEmptyMessage', 'mdi:sigma'));
    if (this.#visibles.pivotes && pivote) piezas.push(this.#seccion('pivotes', 'pivots', 'pivotColumnsEmptyMessage', 'mdi:table-pivot'));
    this.#secciones.replaceChildren(...piezas);
  }

  #seccion(s: SeccionColumnas, titulo: string, vacio: string, nombreIcono: string): HTMLElement {
    const caja = crear('section', 'iswc-ag-seccion');
    const cabeza = crear('div', 'iswc-ag-seccion__titulo');
    cabeza.append(icono(nombreIcono), this.#t(titulo));
    const cuerpo = crear('div', 'iswc-ag-seccion__cuerpo');
    const ids = this.#idsDe(s);
    if (!ids.length) cuerpo.append(crear('div', 'iswc-ag-seccion__vacio', this.#t(vacio)));
    for (const id of ids) cuerpo.append(this.#chip(s, id));
    caja.append(cabeza, cuerpo);
    caja.addEventListener('dragover', (e) => {
      if (!e.dataTransfer?.types.includes(TIPO_ARRASTRE)) return;
      e.preventDefault();
      caja.classList.add('iswc-ag-sobre');
    });
    caja.addEventListener('dragleave', () => caja.classList.remove('iswc-ag-sobre'));
    caja.addEventListener('drop', (e) => {
      e.preventDefault();
      caja.classList.remove('iswc-ag-sobre');
      const colId = e.dataTransfer?.getData(TIPO_ARRASTRE);
      if (colId && this.#admite(s, this.#defDe(colId))) this.#hacer(() => this.#agregar(s, colId));
    });
    return caja;
  }

  #chip(s: SeccionColumnas, colId: string): HTMLElement {
    const col = this.#grid.columna(colId) as ColumnState | null;
    const chip = crear('div', 'iswc-ag-seccion__chip');
    if (s === 'valores' && col) chip.append(this.#selectAgregado(col));
    chip.append(crear('span', 'iswc-ag-seccion__nombre', col?.headerName ?? colId));
    const aria = this.#t(s === 'grupos' ? 'removeRowGroup' : s === 'valores' ? 'removeValue' : 'removePivot');
    chip.append(botonIcono('mdi:close', aria, () => this.#hacer(() => this.#quitar(s, colId))));
    return chip;
  }

  #selectAgregado(col: ColumnState): HTMLElement {
    const permitidas = this.#grid.defDe(col)['allowedAggFuncs'];
    const lista = Array.isArray(permitidas) ? permitidas as string[] : FUNCIONES_AGREGADO;
    return selectDe(lista.map((f) => [f, this.#t(f)]), String(col.aggFunc ?? 'sum'), this.#t('valueAggregation'), (v) => this.#hacer(() => this.#fijarAgregado(col.colId, v)));
  }

  /** Los cambios hechos fuera del panel descartan lo pendiente. */
  refrescar(colIds?: string[]): void {
    if (colIds) return;
    this.#pendientes = [];
    this.#ocultasPendientes.clear();
    this.#pintarLista();
    this.#pintarSecciones();
  }

  /* ── api de instancia ───────────────────────────────────────────────── */

  expandColumnGroups(ids?: string[]): void {
    if (ids) for (const id of ids) this.#cerrados.delete(id);
    else this.#cerrados.clear();
    this.#pintarLista();
  }

  collapseColumnGroups(ids?: string[]): void {
    const todos = (nodos: NodoColumna[]): string[] => nodos.flatMap((n) => n.colId === null ? [n.id, ...todos(n.hijos)] : []);
    for (const id of ids ?? todos(this.#arbol())) this.#cerrados.add(id);
    this.#pintarLista();
  }

  setColumnLayout(defs: unknown[]): void {
    this.#diseno = arbolColumnas(defs);
    this.refrescar();
  }

  setPivotModeSectionVisible(v: boolean): void {
    this.#visibles.pivoteModo = v;
    this.el.replaceChildren(...this.#cabecera(), this.#lista, this.#secciones);
  }

  setRowGroupsSectionVisible(v: boolean): void {
    this.#visibles.grupos = v;
    this.#pintarSecciones();
  }

  setValuesSectionVisible(v: boolean): void {
    this.#visibles.valores = v;
    this.#pintarSecciones();
  }

  setPivotSectionVisible(v: boolean): void {
    this.#visibles.pivotes = v;
    this.#pintarSecciones();
  }
}
