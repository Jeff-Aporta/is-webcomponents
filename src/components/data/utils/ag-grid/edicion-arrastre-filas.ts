/**
 * ag-grid/edicion/arrastre-filas — Row dragging gestionado y no gestionado,
 * con puntero para que funcione igual con raton y tactil.
 */
import type { Gesto } from './edicion-arrastre-filas.schemas.js';
import { colsVisibles, nodoDeFila, paramsCelda, pxAEm, resolver } from './edicion-apoyo.js';
import { filasAMover, gestionadoDisponible, reordenar } from './edicion-filas-movidas.js';
import type { ContextoCelda, Desinstalar, EventoCelda, GridHost } from './contrato.schemas.js';
import type { RowData, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { SeleccionFilas } from './edicion-seleccion-filas-ctl.js';

const UMBRAL_EM = 0.25;

export class ArrastreFilas {
  #grid: GridHost;
  #filas: SeleccionFilas;
  #gesto: Gesto | null = null;

  constructor(grid: GridHost, filas: SeleccionFilas) {
    this.#grid = grid;
    this.#filas = filas;
  }

  instalar(): Desinstalar {
    const grid = this.#grid;
    const abajo = (e: Event): void => this.#alAsa(e as PointerEvent);
    const mover = (e: Event): void => this.#mover(e as PointerEvent);
    const soltar = (e: Event): void => this.#terminar(e as PointerEvent, false);
    const cancelar = (e: Event): void => this.#terminar(e as PointerEvent, true);
    const tecla = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && this.#gesto) this.#terminar(e, true);
    };
    grid.shadow.addEventListener('pointerdown', abajo, true);
    grid.el.addEventListener('pointermove', mover);
    grid.el.addEventListener('pointerup', soltar);
    grid.el.addEventListener('pointercancel', cancelar);
    grid.el.addEventListener('keydown', tecla);
    const quitar = [
      grid.decorarCelda((ctx) => this.#decorar(ctx)),
      grid.celdaAbajo((ev) => this.#filaEntera(ev)),
    ];
    return () => {
      grid.shadow.removeEventListener('pointerdown', abajo, true);
      grid.el.removeEventListener('pointermove', mover);
      grid.el.removeEventListener('pointerup', soltar);
      grid.el.removeEventListener('pointercancel', cancelar);
      grid.el.removeEventListener('keydown', tecla);
      for (const fn of quitar) fn();
    };
  }

  #disponible(ctx: { col: ContextoCelda['col']; node: RowNode | null; rowIndex: number }): boolean {
    const grid = this.#grid;
    if (!ctx.node || grid.opcion('suppressRowDrag', false)) return false;
    const def = grid.defDe(ctx.col);
    return resolver<boolean>(def['rowDrag'], paramsCelda(grid, ctx.col, ctx.node, ctx.rowIndex)) === true;
  }

  #decorar(ctx: ContextoCelda): { prefijo: string } | void {
    if (!this.#disponible(ctx)) return;
    const titulo = this.#grid.escapar(this.#grid.texto('rowDragRow', 'Mover fila'));
    return { prefijo: `<span class="iswc-ag-arrastre" data-ag-arrastre title="${titulo}" aria-hidden="true"></span>` };
  }

  #gestionado(): boolean {
    const grid = this.#grid;
    if (!grid.opcion('rowDragManaged', false)) return false;
    const estado = grid.estado();
    return gestionadoDisponible({
      ordenado: Boolean(estado?.sortModel.length),
      filtrado: Boolean(estado && (Object.keys(estado.filterModel).length || estado.quickFilter)),
      paginado: Boolean(estado?.pagination),
      modelo: grid.opcion('rowModelType', 'clientSide'),
    });
  }

  #alAsa(e: PointerEvent): void {
    const objetivo = e.composedPath()[0] as Element | undefined;
    if (!objetivo?.closest?.('[data-ag-arrastre]')) return;
    const celda = objetivo.closest<HTMLElement>('[data-row-id]');
    const node = this.#grid.nodo(celda?.dataset['rowId'] ?? '');
    if (!node) return;
    e.stopPropagation();
    e.preventDefault();
    this.#tomar(node, e);
  }

  #filaEntera(ev: EventoCelda): boolean | void {
    const grid = this.#grid;
    if (!grid.opcion('rowDragEntireRow', false) || !ev.node || grid.opcion('suppressRowDrag', false)) return;
    this.#tomar(ev.node, ev.evento as PointerEvent);
  }

  #tomar(node: RowNode, e: PointerEvent): void {
    const grid = this.#grid;
    const multi = grid.opcion('rowDragMultiRow', false);
    const todas = (grid.modelo()?.getAllRows() ?? []) as RowNode[];
    const ids = todas.map((n) => n.id);
    const seleccion = this.#filas.nodosSeleccionados().map((n) => n.id);
    const nodos = filasAMover(node.id, seleccion, multi, ids).flatMap((id) => grid.nodo(id) ?? []);
    this.#gesto = {
      node, nodos, inicioY: e.clientY, activo: false, ultimoId: null, dentro: true,
      datos: todas.map((n) => n.data), claves: ids, movidas: nodos.map((n) => n.id),
      pointerId: e.pointerId, fantasma: null, linea: null, y: e.clientY,
    };
  }

  #detalle(g: Gesto, e: Event, over: RowNode | null, overIndex: number): Record<string, unknown> {
    return { event: e, node: g.node, nodes: g.nodos, overNode: over, overIndex, y: g.y, vDirection: g.y >= g.inicioY ? 'down' : 'up' };
  }

  #arrancar(g: Gesto, e: PointerEvent): void {
    const grid = this.#grid;
    g.activo = true;
    try {
      grid.el.setPointerCapture(g.pointerId);
    } catch {
      /* eventos sinteticos no tienen puntero activo */
    }
    const capa = grid.capa('arrastre');
    const fantasma = document.createElement('div');
    fantasma.className = 'iswc-ag-arrastre-fantasma';
    fantasma.textContent = this.#textoFantasma(g);
    const linea = document.createElement('div');
    linea.className = 'iswc-ag-arrastre-linea';
    capa.append(fantasma, linea);
    g.fantasma = fantasma;
    g.linea = linea;
    grid.emitir('rowDragEnter', this.#detalle(g, e, null, -1));
  }

  #textoFantasma(g: Gesto): string {
    const grid = this.#grid;
    const def = colsVisibles(grid).map((c) => grid.defDe(c)).find((d) => d['rowDrag']);
    const propio = def?.['rowDragText'] ?? grid.opcion('rowDragText');
    if (typeof propio === 'function') return String(propio({ rowNode: g.node, rowNodes: g.nodos, defaultTextValue: '' }, g.nodos.length));
    if (g.nodos.length > 1) return grid.texto('rowDragRows', '{n} filas').replace('{n}', String(g.nodos.length));
    const primera = colsVisibles(grid)[0];
    return primera ? grid.textoCelda(primera, g.node) : '';
  }

  #filaEnPunto(e: PointerEvent): { el: HTMLElement; indice: number; node: RowNode } | null {
    const grid = this.#grid;
    const tocado = grid.shadow.elementFromPoint(e.clientX, e.clientY);
    const el = tocado?.closest<HTMLElement>('[data-row-id]');
    const fila = el?.closest<HTMLElement>('[role="row"]') ?? el;
    if (!fila) return null;
    const id = fila.dataset['rowId'] ?? el?.dataset['rowId'] ?? '';
    const directo = fila.dataset['rowIndex'];
    const total = grid.totalFilas();
    let indice = directo == null ? -1 : Number(directo);
    for (let i = 0; indice < 0 && i < total; i++) {
      if (nodoDeFila(grid.filaEn(i))?.id === id) indice = i;
    }
    const node = nodoDeFila(grid.filaEn(indice));
    return node ? { el: fila, indice, node } : null;
  }

  #mover(e: PointerEvent): void {
    const g = this.#gesto;
    if (!g) return;
    g.y = e.clientY;
    const grid = this.#grid;
    const fuente = parseFloat(getComputedStyle(grid.el).fontSize) || 16;
    if (!g.activo) {
      if (Math.abs(e.clientY - g.inicioY) < UMBRAL_EM * fuente) return;
      this.#arrancar(g, e);
    }
    this.#seguir(g, e);
    const sobre = this.#filaEnPunto(e);
    if (!sobre) {
      if (g.dentro) grid.emitir('rowDragLeave', this.#detalle(g, e, null, -1));
      g.dentro = false;
      return;
    }
    if (!g.dentro) grid.emitir('rowDragEnter', this.#detalle(g, e, sobre.node, sobre.indice));
    g.dentro = true;
    const colId = colsVisibles(grid)[0]?.colId;
    if (colId) grid.asegurarVisible({ indice: sobre.indice, colId });
    grid.emitir('rowDragMove', this.#detalle(g, e, sobre.node, sobre.indice));
    const caja = sobre.el.getBoundingClientRect();
    const despues = e.clientY - caja.top >= caja.height / 2;
    this.#marcarLinea(g, sobre.indice, despues);
    if (sobre.node.id === g.ultimoId) return;
    g.ultimoId = sobre.node.id;
    if (this.#gestionado() && !grid.opcion('suppressMoveWhenRowDragging', false)) this.#moverDatos(g, sobre.indice, despues);
  }

  #seguir(g: Gesto, e: PointerEvent): void {
    const capa = this.#grid.capa('arrastre');
    const caja = capa.getBoundingClientRect();
    if (!g.fantasma) return;
    g.fantasma.style.left = pxAEm(e.clientX - caja.left, capa);
    g.fantasma.style.top = pxAEm(e.clientY - caja.top, capa);
  }

  #marcarLinea(g: Gesto, indice: number, despues: boolean): void {
    const grid = this.#grid;
    const colId = colsVisibles(grid)[0]?.colId;
    const rect = colId ? grid.rectCelda({ indice, colId }) : null;
    if (!rect || !g.linea) return;
    g.linea.style.top = grid.em(rect.arriba + (despues ? rect.alto : 0));
  }

  /** Las claves son la posicion original: los ids automaticos `row-N` cambian al reordenar. */
  #moverDatos(g: Gesto, indice: number, despues: boolean): void {
    const grid = this.#grid;
    const destino = nodoDeFila(grid.filaEn(indice));
    if (!destino) return;
    const actuales = (grid.modelo()?.getAllRows() ?? []) as RowNode[];
    const claveDe = new Map(g.datos.map((d, i) => [d, g.claves[i] as string]));
    const orden = actuales.map((n) => claveDe.get(n.data) ?? n.id);
    const movidas = g.nodos.flatMap((n) => claveDe.get(n.data) ?? []);
    const claveDestino = claveDe.get(destino.data);
    if (claveDestino == null) return;
    const siguiente = reordenar(orden, movidas, claveDestino, despues);
    if (siguiente.every((id, i) => id === orden[i])) return;
    const datoDe = new Map(g.claves.map((c, i) => [c, g.datos[i] as RowData]));
    grid.modelo()?.setRows(siguiente.flatMap((c) => datoDe.get(c) ?? []) as RowData[]);
  }

  #terminar(e: Event, cancelar: boolean): void {
    const g = this.#gesto;
    if (!g) return;
    this.#gesto = null;
    if (!g.activo) return;
    g.fantasma?.remove();
    g.linea?.remove();
    const grid = this.#grid;
    const sobre = e instanceof PointerEvent ? this.#filaEnPunto(e) : null;
    const detalle = this.#detalle(g, e, sobre?.node ?? null, sobre?.indice ?? -1);
    if (cancelar) {
      if (this.#gestionado()) grid.modelo()?.setRows(g.datos);
      grid.emitir('rowDragCancel', detalle);
      return;
    }
    const diferido = this.#gestionado() && grid.opcion('suppressMoveWhenRowDragging', false);
    if (diferido && sobre && e instanceof PointerEvent) {
      const caja = sobre.el.getBoundingClientRect();
      this.#moverDatos(g, sobre.indice, e.clientY - caja.top >= caja.height / 2);
    }
    grid.emitir('rowDragEnd', detalle);
  }
}
