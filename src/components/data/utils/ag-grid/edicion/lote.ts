/**
 * ag-grid/edicion/lote — Valores pendientes de un batch edit. Puro.
 * Conserva el orden de escritura y una sola entrada por celda.
 */
import type { Pendiente } from './schemas/edicion.schemas.js';

function clave(nodoId: string, colId: string): string {
  return `${nodoId}\u0000${colId}`;
}

export class Lote {
  #pendientes = new Map<string, Pendiente>();

  get vacio(): boolean {
    return this.#pendientes.size === 0;
  }

  poner(nodoId: string, colId: string, valor: unknown): void {
    this.#pendientes.set(clave(nodoId, colId), { nodoId, colId, valor });
  }

  /** `undefined` significa sin pendiente: un pendiente con valor null existe. */
  leer(nodoId: string, colId: string): Pendiente | undefined {
    return this.#pendientes.get(clave(nodoId, colId));
  }

  quitar(nodoId: string, colId: string): void {
    this.#pendientes.delete(clave(nodoId, colId));
  }

  tieneFila(nodoId: string): boolean {
    return this.lista().some((p) => p.nodoId === nodoId);
  }

  lista(): Pendiente[] {
    return [...this.#pendientes.values()];
  }

  filas(): string[] {
    return [...new Set(this.lista().map((p) => p.nodoId))];
  }

  vaciar(): void {
    this.#pendientes.clear();
  }
}
