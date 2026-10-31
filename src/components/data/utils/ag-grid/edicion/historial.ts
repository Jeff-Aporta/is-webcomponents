/**
 * ag-grid/edicion/historial — Pilas de deshacer/rehacer con limite de pasos.
 * Cada accion agrupa todas las celdas de una operacion (pegar, rellenar, lote).
 */
import type { AccionHistorial } from './schemas/edicion.schemas.js';

export class Historial {
  #deshacer: AccionHistorial[] = [];
  #rehacer: AccionHistorial[] = [];
  #limite: number;

  constructor(limite: number) {
    this.#limite = Math.max(0, limite);
  }

  get tamanoDeshacer(): number {
    return this.#deshacer.length;
  }

  get tamanoRehacer(): number {
    return this.#rehacer.length;
  }

  /** Una accion nueva invalida lo que se pudiera rehacer. */
  registrar(accion: AccionHistorial): void {
    if (!accion.cambios.length || this.#limite === 0) return;
    this.#deshacer.push(accion);
    if (this.#deshacer.length > this.#limite) this.#deshacer.shift();
    this.#rehacer = [];
  }

  tomarDeshacer(): AccionHistorial | null {
    const accion = this.#deshacer.pop() ?? null;
    if (accion) this.#rehacer.push(accion);
    return accion;
  }

  tomarRehacer(): AccionHistorial | null {
    const accion = this.#rehacer.pop() ?? null;
    if (accion) this.#deshacer.push(accion);
    return accion;
  }

  limpiar(): void {
    this.#deshacer = [];
    this.#rehacer = [];
  }
}
