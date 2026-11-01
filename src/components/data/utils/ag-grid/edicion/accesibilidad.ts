/**
 * ag-grid/edicion/accesibilidad — Region viva para anuncios y atributos ARIA
 * del contenedor que dependen de las opciones: rol y multiseleccion.
 */
import { leerOpciones } from './seleccion-filas.js';
import type { Desinstalar } from '../contrato.schemas.js';
import type { GridHost } from '../contrato.schemas.js';

const SELECTOR_GRILLA = '[role="grid"], [role="treegrid"]';

export class Accesibilidad {
  #grid: GridHost;
  #vivo: HTMLElement;
  #propias = new Map<string, string | null>();

  constructor(grid: GridHost) {
    this.#grid = grid;
    this.#vivo = document.createElement('div');
    this.#vivo.className = 'iswc-ag-solo-lector';
    this.#vivo.setAttribute('role', 'status');
    this.#vivo.setAttribute('aria-live', 'polite');
  }

  instalar(): Desinstalar {
    const grid = this.#grid;
    grid.shadow.append(this.#vivo);
    const quitar = grid.on('pintado', () => this.#sincronizar());
    return () => {
      quitar();
      this.#vivo.remove();
    };
  }

  anunciar(texto: string): void {
    this.#vivo.textContent = texto;
  }

  /** `setGridAriaProperty`: null quita el atributo. */
  fijarAtributo(nombre: string, valor: string | null): void {
    this.#propias.set(`aria-${nombre}`, valor);
    this.#sincronizar();
  }

  #sincronizar(): void {
    const grid = this.#grid;
    const raiz = grid.shadow.querySelector(SELECTOR_GRILLA);
    if (!raiz) return;
    const arbol = Boolean(grid.estado()?.rowGroupCols.length) || grid.opcion('treeData', false);
    raiz.setAttribute('role', arbol ? 'treegrid' : 'grid');
    const opciones = leerOpciones(grid.opcion('rowSelection'));
    raiz.setAttribute('aria-multiselectable', opciones?.mode === 'multiRow' ? 'true' : 'false');
    for (const [nombre, valor] of this.#propias) {
      if (valor == null) raiz.removeAttribute(nombre);
      else raiz.setAttribute(nombre, valor);
    }
  }
}
