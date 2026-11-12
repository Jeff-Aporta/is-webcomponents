// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/edicion-seleccion-filas-ctl — Seleccion de filas con `rowSelection`
 * objeto: clic, checkbox, Espacio, Ctrl+A, seleccionar todo y su API.
 */
import { apiPublica, nodoDeFila } from './edicion-apoyo.js';
import * as S from './edicion-seleccion-filas.js';
import type { UniversoFilas } from './edicion-seleccion-filas.schemas.js';
import type { Desinstalar, EventoCelda, GridHost } from './contrato.schemas.js';
import type { RowData, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { AlcanceTodo, GestoFila, OpcionesFilas } from './edicion.schemas.js';

const COLUMNA_CHECK = '__seleccion';

export class SeleccionFilas {
  #grid: GridHost;
  #ancla: string | null = null;

  constructor(grid: GridHost) {
    this.#grid = grid;
  }

  get #opciones(): OpcionesFilas | null {
    const valor = this.#grid.opcion<unknown>('rowSelection');
    return typeof valor === 'object' ? S.leerOpciones(valor) : null;
  }

  get copiaFilas(): boolean {
    return this.#opciones?.copySelectedRows === true;
  }

  get #actual(): Set<string> {
    return this.#grid.estado()?.selection ?? new Set<string>();
  }

  instalar(): Desinstalar {
    return this.#grid.celdaClic((ev) => this.#clic(ev));
  }

  #seleccionable = (id: string): boolean => {
    const fn = this.#opciones?.isRowSelectable;
    if (typeof fn !== 'function') return true;
    const node = this.#grid.nodo(id);
    return node ? fn({ node, data: node.data, api: apiPublica(this.#grid) }) === true : false;
  };

  #universo(): UniversoFilas {
    const modelo = this.#grid.modelo();
    const estado = this.#grid.estado();
    const ids = (lista: RowNode[] | undefined): string[] => (lista ?? []).map((n) => n.id);
    return { todas: ids(modelo?.getAllRows() as RowNode[] | undefined), filtradas: ids(modelo?.getDisplayedRows() as RowNode[] | undefined), pagina: ids(estado?.pageRows) };
  }

  #gesto(id: string, e: MouseEvent | KeyboardEvent): GestoFila {
    return { id, ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, ancla: this.#ancla, ordenados: this.#universo().filtradas };
  }

  /** Aplica el conjunto y avisa por fila y en bloque. */
  aplicar(siguiente: Set<string>, source: string): void {
    const grid = this.#grid;
    const actual = this.#actual;
    const cambiadas = [...siguiente].filter((id) => !actual.has(id)).concat([...actual].filter((id) => !siguiente.has(id)));
    if (!cambiadas.length) return;
    grid.modelo()?.setSelection(siguiente);
    for (const id of cambiadas) {
      const node = grid.nodo(id);
      if (node) grid.emitir('rowSelected', { node, data: node.data, source });
    }
    grid.emitir('selectionChanged', { source, selectedNodes: this.nodosSeleccionados() });
  }

  #clic(ev: EventoCelda): boolean | void {
    const opciones = this.#opciones;
    if (!opciones) return;
    const e = ev.evento as MouseEvent;
    if (ev.colId === COLUMNA_CHECK) {
      if (ev.indice < 0) this.#alternarTodo(opciones);
      else this.#checkFila(ev, e, opciones);
      return true;
    }
    const node = ev.node;
    if (!node) return;
    this.aplicar(S.clicFila(this.#actual, this.#gesto(node.id, e), opciones, this.#seleccionable), 'rowClicked');
    if (!e.shiftKey) this.#ancla = node.id;
  }

  #checkFila(ev: EventoCelda, e: MouseEvent, opciones: OpcionesFilas): void {
    const fila = this.#grid.filaEn(ev.indice);
    if (fila?.kind === 'group' && 'leafIds' in fila) {
      const hojas = fila.leafIds;
      const todas = S.estadoEncabezado(this.#actual, hojas, this.#seleccionable) === 'all';
      const siguiente = todas ? S.quitarTodas(this.#actual, hojas) : S.agregarTodas(this.#actual, hojas, this.#seleccionable);
      this.aplicar(siguiente, 'checkboxSelected');
      return;
    }
    const node = nodoDeFila(fila);
    if (!node) return;
    this.aplicar(S.alternarCheck(this.#actual, this.#gesto(node.id, e), opciones, this.#seleccionable), 'checkboxSelected');
    if (!e.shiftKey) this.#ancla = node.id;
  }

  #alternarTodo(opciones: OpcionesFilas): void {
    const ids = S.idsDeAlcance(opciones.selectAll, this.#universo());
    const todas = S.estadoEncabezado(this.#actual, ids, this.#seleccionable) === 'all';
    this.aplicar(todas ? S.quitarTodas(this.#actual, ids) : S.agregarTodas(this.#actual, ids, this.#seleccionable), 'uiSelectAll');
  }

  /** Espacio sobre una fila. False si no hay seleccion configurada. */
  espacio(node: RowNode, e: KeyboardEvent): boolean {
    const opciones = this.#opciones;
    if (!opciones) return false;
    this.aplicar(S.alternarCheck(this.#actual, this.#gesto(node.id, e), opciones, this.#seleccionable), 'spaceKey');
    if (!e.shiftKey) this.#ancla = node.id;
    return true;
  }

  /** Ctrl+A cuando `ctrlASelectsRows`. */
  ctrlA(): boolean {
    const opciones = this.#opciones;
    if (!opciones?.ctrlASelectsRows || opciones.mode !== 'multiRow') return false;
    this.seleccionarAlcance(opciones.selectAll);
    return true;
  }

  seleccionarAlcance(alcance: AlcanceTodo): void {
    const ids = S.idsDeAlcance(alcance, this.#universo());
    this.aplicar(S.agregarTodas(this.#actual, ids, this.#seleccionable), 'api');
  }

  deseleccionarAlcance(alcance: AlcanceTodo): void {
    this.aplicar(S.quitarTodas(this.#actual, S.idsDeAlcance(alcance, this.#universo())), 'api');
  }

  fijarNodos(nodos: RowNode[], valor: boolean): void {
    const ids = nodos.map((n) => n.id);
    const siguiente = valor ? S.agregarTodas(this.#actual, ids, this.#seleccionable) : S.quitarTodas(this.#actual, ids);
    this.aplicar(siguiente, 'api');
  }

  nodosSeleccionados(): RowNode[] {
    const salida: RowNode[] = [];
    for (const id of this.#actual) {
      const node = this.#grid.nodo(id);
      if (node) salida.push(node);
    }
    return salida;
  }

  filasSeleccionadas(): RowData[] {
    return this.nodosSeleccionados().map((n) => n.data);
  }
}
