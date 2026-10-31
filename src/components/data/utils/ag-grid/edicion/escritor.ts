/**
 * ag-grid/edicion/escritor — Punto unico de escritura de celdas: batch edit,
 * readOnlyEdit y undo/redo pasan por aqui, venga de un editor, pegar o rellenar.
 */
import { paramsCelda } from './apoyo.js';
import { Historial } from './historial.js';
import { Lote } from './lote.js';
import type { ColumnState } from '../contrato.js';
import type { Desinstalar } from '../contrato.js';
import type { GridHost } from '../contrato.js';
import type { RowNode } from '../contrato.js';
import type { AccionHistorial } from './schemas/edicion.schemas.js';
import type { CambioCelda } from './schemas/edicion.schemas.js';

const LIMITE_POR_DEFECTO = 10;
const EVENTOS_QUE_LIMPIAN = ['rowDataUpdated', 'sortChanged', 'filterChanged', 'columnRowGroupChanged'];

export class Escritor {
  #grid: GridHost;
  #lote = new Lote();
  #enLote = false;
  #historial = new Historial(LIMITE_POR_DEFECTO);
  #limite = LIMITE_POR_DEFECTO;
  #transaccion: CambioCelda[] | null = null;
  #interno = 0;
  #soloDatos = false;

  constructor(grid: GridHost) {
    this.#grid = grid;
  }

  instalar(): Desinstalar {
    const grid = this.#grid;
    const limpiar = (): void => {
      if (!this.#interno) this.#historial.limpiar();
    };
    const quitar = EVENTOS_QUE_LIMPIAN.map((evento) => grid.on(evento, limpiar));
    quitar.push(grid.fuenteValor((col, node) => this.#pendiente(col, node)));
    quitar.push(grid.decorarCelda(({ col, node }) => {
      if (!node || !this.#lote.leer(node.id, col.colId)) return;
      return { clase: 'iswc-ag-cell-batch-edit' };
    }));
    return () => {
      for (const fn of quitar) fn();
    };
  }

  #pendiente(col: ColumnState, node: RowNode): { valor: unknown } | undefined {
    if (this.#soloDatos) return undefined;
    const pendiente = this.#lote.leer(node.id, col.colId);
    return pendiente ? { valor: pendiente.valor } : undefined;
  }

  get enLote(): boolean {
    return this.#enLote;
  }

  /** Valor que ve el usuario, con pendientes del lote incluidos. */
  valorVisible(col: ColumnState, node: RowNode): unknown {
    const pendiente = this.#pendiente(col, node);
    return pendiente ? pendiente.valor : this.#grid.valor(col, node);
  }

  /** Valor confirmado, ignorando pendientes: `grid.valor` los incluye para pintar. */
  valorDatos(col: ColumnState, node: RowNode): unknown {
    this.#soloDatos = true;
    const valor = this.#grid.valor(col, node);
    this.#soloDatos = false;
    return valor;
  }

  /** Devuelve true si el valor quedo escrito o pendiente. */
  escribir(node: RowNode, colId: string, valor: unknown, origen: string): boolean {
    if (this.#enLote && origen !== 'data') {
      this.#lote.poner(node.id, colId, valor);
      this.#grid.refrescarCeldas([node.id], [colId]);
      return true;
    }
    return this.#aplicar(node, colId, valor, origen);
  }

  #aplicar(node: RowNode, colId: string, valor: unknown, origen: string): boolean {
    const grid = this.#grid;
    const col = grid.columna(colId);
    if (!col) return false;
    const antes = this.valorDatos(col, node);
    if (grid.opcion('readOnlyEdit', false)) {
      grid.emitir('cellEditRequest', { ...paramsCelda(grid, col, node, node.index), oldValue: antes, newValue: valor, source: origen });
      return false;
    }
    this.#interno++;
    const cambio = grid.fijarValor(node, colId, valor, origen);
    this.#interno--;
    if (!cambio) return false;
    const registro = { nodoId: node.id, colId, antes, despues: grid.valor(col, grid.nodo(node.id) ?? node) };
    if (this.#transaccion) this.#transaccion.push(registro);
    else this.#registrar([registro]);
    return true;
  }

  #pila(): Historial {
    const limite = this.#grid.opcion('undoRedoCellEditingLimit', LIMITE_POR_DEFECTO);
    if (limite !== this.#limite) {
      this.#limite = limite;
      this.#historial = new Historial(limite);
    }
    return this.#historial;
  }

  #registrar(cambios: CambioCelda[]): void {
    if (!this.#grid.opcion('undoRedoCellEditing', false)) return;
    this.#pila().registrar({ cambios });
  }

  /** Todo lo escrito dentro de `fn` cuenta como una sola accion de deshacer. */
  agrupar<T>(fn: () => T): T {
    if (this.#transaccion) return fn();
    this.#transaccion = [];
    try {
      return fn();
    } finally {
      const cambios = this.#transaccion;
      this.#transaccion = null;
      this.#registrar(cambios);
    }
  }

  /* ── Deshacer ──────────────────────────────────────────────────────── */

  #repetir(accion: AccionHistorial | null, campo: 'antes' | 'despues', origen: string): boolean {
    if (!accion) return false;
    this.#interno++;
    const cambios = campo === 'antes' ? [...accion.cambios].reverse() : accion.cambios;
    for (const cambio of cambios) {
      const node = this.#grid.nodo(cambio.nodoId);
      if (node) this.#grid.fijarValor(node, cambio.colId, cambio[campo], origen);
    }
    this.#interno--;
    return true;
  }

  deshacer(): void {
    this.#grid.emitir('undoStarted', { source: 'api' });
    const operationPerformed = this.#repetir(this.#pila().tomarDeshacer(), 'antes', 'undo');
    this.#grid.emitir('undoEnded', { source: 'api', operationPerformed });
  }

  rehacer(): void {
    this.#grid.emitir('redoStarted', { source: 'api' });
    const operationPerformed = this.#repetir(this.#pila().tomarRehacer(), 'despues', 'redo');
    this.#grid.emitir('redoEnded', { source: 'api', operationPerformed });
  }

  get tamanoDeshacer(): number {
    return this.#pila().tamanoDeshacer;
  }

  get tamanoRehacer(): number {
    return this.#pila().tamanoRehacer;
  }

  /* ── Lote ──────────────────────────────────────────────────────────── */

  iniciarLote(): void {
    if (this.#enLote) return;
    this.#enLote = true;
    this.#grid.emitir('batchEditingStarted', {});
  }

  confirmarLote(): void {
    if (!this.#enLote) return;
    const grid = this.#grid;
    const pendientes = this.#lote.lista();
    const filas = this.#lote.filas();
    this.#enLote = false;
    this.#lote.vaciar();
    this.agrupar(() => {
      for (const { nodoId, colId, valor } of pendientes) {
        const node = grid.nodo(nodoId);
        if (node) this.#aplicar(node, colId, valor, 'batch');
      }
    });
    for (const id of filas) {
      const node = grid.nodo(id);
      if (node) grid.emitir('rowValueChanged', { node, data: node.data, rowIndex: node.index });
    }
    grid.emitir('batchEditingStopped', { changes: pendientes });
    grid.refrescarCeldas(filas);
  }

  cancelarLote(): void {
    if (!this.#enLote) return;
    const filas = this.#lote.filas();
    this.#enLote = false;
    this.#lote.vaciar();
    this.#grid.emitir('batchEditingStopped', { changes: [] });
    this.#grid.refrescarCeldas(filas);
  }
}
