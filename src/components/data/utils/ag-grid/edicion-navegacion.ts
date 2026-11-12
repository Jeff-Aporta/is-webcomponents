// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/edicion-navegacion — A donde va el foco con cada tecla. Puro.
 * Devuelve null cuando no hay movimiento (borde de la grilla).
 */
import type { Direccion, MapaNavegacion, Posicion } from './edicion.schemas.js';

const DELTAS: Record<Direccion, Posicion> = { arriba: { fila: -1, col: 0 }, abajo: { fila: 1, col: 0 }, izquierda: { fila: 0, col: -1 }, derecha: { fila: 0, col: 1 } };

export function direccionDeTecla(tecla: string): Direccion | null {
  if (tecla === 'ArrowUp') return 'arriba';
  if (tecla === 'ArrowDown') return 'abajo';
  if (tecla === 'ArrowLeft') return 'izquierda';
  if (tecla === 'ArrowRight') return 'derecha';
  return null;
}

function dentro(pos: Posicion, mapa: MapaNavegacion): boolean {
  return pos.fila >= 0 && pos.fila < mapa.totalFilas && pos.col >= 0 && pos.col < mapa.totalCols;
}

/** Avanza saltando lo no navegable (`suppressNavigable`). */
export function moverFlecha(pos: Posicion, direccion: Direccion, mapa: MapaNavegacion): Posicion | null {
  const delta = DELTAS[direccion];
  let siguiente = { fila: pos.fila + delta.fila, col: pos.col + delta.col };
  while (dentro(siguiente, mapa)) {
    if (mapa.navegable(siguiente.fila, siguiente.col)) return siguiente;
    siguiente = { fila: siguiente.fila + delta.fila, col: siguiente.col + delta.col };
  }
  return null;
}

/** Ultima celda navegable en esa direccion: Ctrl+flecha y Ctrl+Shift+flecha. */
export function extremo(pos: Posicion, direccion: Direccion, mapa: MapaNavegacion): Posicion | null {
  let actual: Posicion | null = null;
  let siguiente = moverFlecha(pos, direccion, mapa);
  while (siguiente) {
    actual = siguiente;
    siguiente = moverFlecha(siguiente, direccion, mapa);
  }
  return actual;
}

/** Tab: siguiente celda navegable, pasando de fila. Null = sale de la grilla. */
export function tabular(pos: Posicion, atras: boolean, mapa: MapaNavegacion, soloFila = false): Posicion | null {
  const paso = atras ? -1 : 1;
  let { fila, col } = pos;
  for (;;) {
    col += paso;
    if (col < 0 || col >= mapa.totalCols) {
      if (soloFila) return null;
      fila += paso;
      col = atras ? mapa.totalCols - 1 : 0;
    }
    if (fila < 0 || fila >= mapa.totalFilas) return null;
    if (mapa.navegable(fila, col)) return { fila, col };
  }
}

export function porPagina(pos: Posicion, sentido: 1 | -1, filasPorPagina: number, mapa: MapaNavegacion): Posicion | null {
  const destino = Math.max(0, Math.min(mapa.totalFilas - 1, pos.fila + sentido * filasPorPagina));
  if (destino === pos.fila) return null;
  return { fila: destino, col: pos.col };
}

/** Home y End van a la primera y a la ultima fila de la columna enfocada. */
export function filaExtrema(pos: Posicion, final: boolean, mapa: MapaNavegacion): Posicion {
  return { fila: final ? mapa.totalFilas - 1 : 0, col: pos.col };
}
