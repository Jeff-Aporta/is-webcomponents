/**
 * ag-grid/celdas/alturas — getRowHeight, setRowHeight, resetRowHeights y autoHeight.
 *
 * El alto por fila se cachea: AG llama a `getRowHeight` una vez por fila y de
 * nuevo solo tras `resetRowHeights`. `autoHeight` mide nada mas lo pintado, despues
 * del evento `pintado`; un alto sin cambio no vuelve a notificar y asi no hay bucle.
 */

import type { GridHost, FilaDisplay } from '../contrato.js';

const TOLERANCIA = 0.5;

export class AlturasFilas {
  #grid: GridHost;
  #vistas = new Map<string, number>();
  #manuales = new Map<string, number>();
  #cuadro: number | null = null;

  constructor(grid: GridHost) {
    this.#grid = grid;
  }

  #alFijar(id: string, unidades: number): void {
    const previo = this.#vistas.get(id);
    if (previo != null && Math.abs(previo - unidades) < TOLERANCIA) return;
    this.#vistas.set(id, unidades);
    this.#grid.alturaFila(id, unidades);
  }

  /** Recorre filas sin alto conocido. Sin `getRowHeight` no toca nada. */
  aplicar(): void {
    const grid = this.#grid;
    const calcular = grid.opcion<unknown>('getRowHeight');
    if (typeof calcular !== 'function') return;
    const api = grid.modelo();
    const context = grid.opcion('context');
    const total = grid.totalFilas();
    for (let i = 0; i < total; i++) {
      const fila = grid.filaEn(i);
      if (!fila) continue;
      const id = this.#idDe(fila);
      if (this.#manuales.has(id) || this.#vistas.has(id)) continue;
      const node = 'node' in fila ? fila.node : undefined;
      const alto = calcular({ node, data: node?.data, api, context });
      if (typeof alto === 'number' && alto > 0) this.#alFijar(id, alto);
    }
  }

  #idDe(fila: FilaDisplay): string {
    if ('node' in fila && fila.node) return fila.node.id;
    return 'id' in fila ? fila.id : '';
  }

  /** `node.setRowHeight(alto)`; null vuelve al alto calculado o al de la grilla. */
  fijar(id: string, alto: number | null): void {
    if (alto == null) {
      this.#manuales.delete(id);
      this.#vistas.delete(id);
      this.aplicar();
      return;
    }
    this.#manuales.set(id, alto);
    this.#alFijar(id, alto);
  }

  reiniciar(): void {
    this.#vistas.clear();
    for (const [id, alto] of this.#manuales) this.#vistas.set(id, alto);
    this.aplicar();
    this.#grid.recomputar('alturas');
  }

  #columnasAuto(): string[] {
    const grid = this.#grid;
    return grid.columnas().filter((c) => !c.hide && grid.defDe(c)['autoHeight'] === true).map((c) => c.colId);
  }

  /** Mide en el siguiente cuadro, agrupando varios `pintado` seguidos. */
  programarMedicion(): void {
    if (this.#cuadro != null || !this.#columnasAuto().length) return;
    this.#cuadro = requestAnimationFrame(() => {
      this.#cuadro = null;
      this.medir();
    });
  }

  medir(): void {
    const columnas = this.#columnasAuto();
    if (!columnas.length) return;
    const raiz = this.#grid.shadow;
    const escala = 16 / (Number.parseFloat(getComputedStyle(this.#grid.el).fontSize) || 16);
    const filas = raiz.querySelectorAll<HTMLElement>('[role="row"][data-row-id]');
    for (const fila of filas) {
      const id = fila.dataset['rowId'];
      if (id == null || this.#manuales.has(id)) continue;
      let alto = 0;
      for (const colId of columnas) {
        const celda = fila.querySelector<HTMLElement>(`[data-col-id="${CSS.escape(colId)}"]`);
        const contenido = celda?.firstElementChild as HTMLElement | null | undefined;
        if (celda) alto = Math.max(alto, Math.max(celda.scrollHeight, contenido?.offsetHeight ?? 0));
      }
      if (alto > 0) this.#alFijar(id, alto * escala);
    }
  }

  destruir(): void {
    if (this.#cuadro != null) cancelAnimationFrame(this.#cuadro);
    this.#cuadro = null;
  }
}
