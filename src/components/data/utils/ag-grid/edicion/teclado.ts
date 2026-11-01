/**
 * ag-grid/edicion/teclado — Teclado de la grilla fuera de un editor: navegacion,
 * extension de rangos, atajos de edicion y seleccion.
 */
import { colsVisibles } from './apoyo.js';
import { mapaNavegacion } from './apoyo.js';
import { nodoDeFila } from './apoyo.js';
import { paramsCelda } from './apoyo.js';
import { posDeRef } from './apoyo.js';
import { refDePos } from './apoyo.js';
import { resolver } from './apoyo.js';
import { direccionDeTecla } from './navegacion.js';
import { extremo } from './navegacion.js';
import { filaExtrema } from './navegacion.js';
import { moverFlecha } from './navegacion.js';
import { porPagina } from './navegacion.js';
import { tabular } from './navegacion.js';
import { normalizar } from './rangos.js';
import { esImprimible } from './valores.js';
import type { Desinstalar } from '../contrato.schemas.js';
import type { GridHost } from '../contrato.schemas.js';
import type { RefCelda } from '../contrato.schemas.js';
import type { Escritor } from './escritor.js';
import type { Direccion } from './schemas/edicion.schemas.js';
import type { MapaNavegacion } from './schemas/edicion.schemas.js';
import type { Posicion } from './schemas/edicion.schemas.js';
import type { SeleccionFilas } from './seleccion-filas-ctl.js';
import type { SeleccionRangos } from './seleccion-rangos.js';
import type { SesionEdicion } from './sesion.js';

const FILAS_POR_PAGINA = 10;

export class Teclado {
  #grid: GridHost;
  #sesion: SesionEdicion;
  #rangos: SeleccionRangos;
  #filas: SeleccionFilas;
  #escritor: Escritor;
  /** Esquina movil de Shift+flechas; el foco queda quieto como ancla. */
  #extremoRango: Posicion | null = null;

  constructor(grid: GridHost, sesion: SesionEdicion, rangos: SeleccionRangos, filas: SeleccionFilas, escritor: Escritor) {
    this.#grid = grid;
    this.#sesion = sesion;
    this.#rangos = rangos;
    this.#filas = filas;
    this.#escritor = escritor;
  }

  instalar(): Desinstalar {
    return this.#grid.teclado((e, foco) => this.#tecla(e, foco));
  }

  #tecla(e: KeyboardEvent, foco: RefCelda | null): boolean | void {
    const grid = this.#grid;
    if (this.#sesion.activa) {
      this.#sesion.tecla(e);
      return true;
    }
    if (!foco) return;
    const col = grid.columna(foco.colId);
    const node = nodoDeFila(grid.filaEn(foco.indice));
    if (col) {
      const params = paramsCelda(grid, col, node, foco.indice);
      const suprimir = grid.defDe(col)['suppressKeyboardEvent'];
      if (typeof suprimir === 'function' && resolver<boolean>(suprimir, { ...params, event: e, editing: false }) === true) return true;
    }
    const hecho = this.#atajo(e, foco) || this.#navegar(e, foco) || this.#editar(e, foco);
    if (hecho) e.preventDefault();
    return hecho || undefined;
  }

  #atajo(e: KeyboardEvent, foco: RefCelda): boolean {
    if (!(e.ctrlKey || e.metaKey)) return this.#sinCtrl(e, foco);
    const letra = e.key.toLowerCase();
    if (letra === 'z' && e.shiftKey) return this.#hacer(() => this.#escritor.rehacer());
    if (letra === 'z') return this.#hacer(() => this.#escritor.deshacer());
    if (letra === 'y') return this.#hacer(() => this.#escritor.rehacer());
    if (letra === 'd') return this.#rangos.rellenarAbajo();
    if (letra === 'a') return this.#ctrlA();
    return false;
  }

  #hacer(fn: () => void): boolean {
    if (!this.#grid.opcion('undoRedoCellEditing', false)) return false;
    fn();
    return true;
  }

  #ctrlA(): boolean {
    if (this.#filas.ctrlA()) return true;
    if (!this.#rangos.activo) return false;
    const mapa = mapaNavegacion(this.#grid);
    this.#rangos.fijar([{ filaDesde: 0, filaHasta: mapa.totalFilas - 1, colDesde: 0, colHasta: mapa.totalCols - 1 }]);
    return true;
  }

  #sinCtrl(e: KeyboardEvent, foco: RefCelda): boolean {
    const node = nodoDeFila(this.#grid.filaEn(foco.indice));
    if (e.key === ' ' && node && this.#filas.espacio(node, e)) return true;
    if (e.key === 'Delete' && this.#rangos.rangos.length) return this.#rangos.borrarSeleccion();
    if (e.key === 'Escape' && this.#rangos.rangos.length) {
      this.#rangos.limpiar();
      return true;
    }
    return false;
  }

  /* ── Navegacion ────────────────────────────────────────────────────── */

  #irA(pos: Posicion | null): boolean {
    const grid = this.#grid;
    if (!pos) return false;
    const ref = refDePos(grid, pos);
    if (!ref) return false;
    this.#extremoRango = null;
    this.#rangos.limpiar();
    grid.enfocar(ref);
    grid.asegurarVisible(ref);
    return true;
  }

  #extender(desde: Posicion, hasta: Posicion | null): boolean {
    if (!hasta) return false;
    const conservados = this.#rangos.rangos.slice(0, -1);
    this.#extremoRango = hasta;
    this.#rangos.fijar([...conservados, normalizar(desde, hasta)]);
    const ref = refDePos(this.#grid, hasta);
    if (ref) this.#grid.asegurarVisible(ref);
    return true;
  }

  /** `navigateToNextCell` puede redirigir o cancelar. */
  #conCallback(pos: Posicion, siguiente: Posicion | null, tecla: string): Posicion | null {
    const grid = this.#grid;
    const fn = grid.opcion<unknown>('navigateToNextCell');
    if (typeof fn !== 'function') return siguiente;
    const cols = colsVisibles(grid);
    const publica = (p: Posicion | null): unknown => (p ? { rowIndex: p.fila, column: cols[p.col] } : null);
    const salida = fn({ key: tecla, previousCellPosition: publica(pos), nextCellPosition: publica(siguiente) });
    if (!salida) return null;
    const col = cols.findIndex((c) => c === salida.column || c.colId === salida.column?.colId);
    return col >= 0 ? { fila: salida.rowIndex, col } : null;
  }

  #flecha(e: KeyboardEvent, pos: Posicion, direccion: Direccion, mapa: MapaNavegacion): boolean {
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.shiftKey && this.#rangos.activo) {
      const desde = this.#extremoRango ?? pos;
      const hasta = ctrl ? extremo(desde, direccion, mapa) : moverFlecha(desde, direccion, mapa);
      return this.#extender(pos, hasta);
    }
    const siguiente = ctrl ? extremo(pos, direccion, mapa) : moverFlecha(pos, direccion, mapa);
    return this.#irA(this.#conCallback(pos, siguiente, e.key));
  }

  /** Tab con destino propio, `tabToNextCell`, o null para que el foco salga de la grilla. */
  tabular(pos: Posicion, atras: boolean): Posicion | null {
    const grid = this.#grid;
    const siguiente = tabular(pos, atras, mapaNavegacion(grid));
    const fn = grid.opcion<unknown>('tabToNextCell');
    if (typeof fn !== 'function') return siguiente;
    const cols = colsVisibles(grid);
    const publica = (p: Posicion | null): unknown => (p ? { rowIndex: p.fila, column: cols[p.col] } : null);
    const salida = fn({ backwards: atras, previousCellPosition: publica(pos), nextCellPosition: publica(siguiente) });
    if (!salida) return null;
    const col = cols.findIndex((c) => c === salida.column || c.colId === salida.column?.colId);
    return col >= 0 ? { fila: salida.rowIndex, col } : null;
  }

  #navegar(e: KeyboardEvent, foco: RefCelda): boolean {
    const grid = this.#grid;
    const pos = posDeRef(grid, foco);
    if (!pos) return false;
    const mapa = mapaNavegacion(grid);
    const direccion = direccionDeTecla(e.key);
    if (direccion) return this.#flecha(e, pos, direccion, mapa);
    if (e.key === 'Tab') return this.#irA(this.tabular(pos, e.shiftKey));
    if (e.key === 'PageDown' || e.key === 'PageUp') return this.#irA(porPagina(pos, e.key === 'PageDown' ? 1 : -1, this.#filasPorPagina(foco), mapa));
    if (e.key === 'Home' || e.key === 'End') return this.#irA(filaExtrema(pos, e.key === 'End', mapa));
    return false;
  }

  #filasPorPagina(foco: RefCelda): number {
    const alto = this.#grid.celdaDe(foco)?.offsetHeight;
    const ventana = this.#grid.el.clientHeight;
    if (!alto || !ventana) return FILAS_POR_PAGINA;
    return Math.max(1, Math.floor(ventana / alto) - 1);
  }

  /* ── Edicion ───────────────────────────────────────────────────────── */

  #editar(e: KeyboardEvent, foco: RefCelda): boolean {
    const grid = this.#grid;
    const fila = grid.filaEn(foco.indice);
    if (e.key === 'Enter') return this.#enter(e, foco, fila?.kind === 'group' ? fila.id : null);
    if (e.key === 'F2') return this.#sesion.iniciar(foco, { tecla: 'F2' });
    if (e.key === 'Backspace' || e.key === 'Delete') return this.#sesion.iniciar(foco, { tecla: e.key });
    if (esImprimible(e)) return this.#sesion.iniciar(foco, { tecla: e.key, caracter: e.key });
    return false;
  }

  #enter(e: KeyboardEvent, foco: RefCelda, grupo: string | null): boolean {
    const grid = this.#grid;
    if (grupo) {
      grid.modelo()?.toggleGroup(grupo);
      return true;
    }
    if (grid.opcion('enterNavigatesVertically', false)) {
      const pos = posDeRef(grid, foco);
      return this.#irA(pos ? moverFlecha(pos, e.shiftKey ? 'arriba' : 'abajo', mapaNavegacion(grid)) : null);
    }
    return this.#sesion.iniciar(foco, { tecla: 'Enter' });
  }
}
