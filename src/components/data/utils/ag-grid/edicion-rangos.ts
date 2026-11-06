/**
 * ag-grid/edicion/rangos — Aritmetica pura de rangos rectangulares de celdas.
 * Sin DOM: filas y columnas son indices de display.
 */
import type { Posicion, Rango } from './edicion.schemas.js';

export function normalizar(a: Posicion, b: Posicion): Rango {
  const filaDesde = Math.min(a.fila, b.fila);
  const filaHasta = Math.max(a.fila, b.fila);
  const colDesde = Math.min(a.col, b.col);
  const colHasta = Math.max(a.col, b.col);
  return { filaDesde, filaHasta, colDesde, colHasta };
}

export function celda(pos: Posicion): Rango {
  return normalizar(pos, pos);
}

export function contiene(r: Rango, pos: Posicion): boolean {
  if (pos.fila < r.filaDesde || pos.fila > r.filaHasta) return false;
  return pos.col >= r.colDesde && pos.col <= r.colHasta;
}

export function enAlguno(rangos: Rango[], pos: Posicion): boolean {
  return rangos.some((r) => contiene(r, pos));
}

export function cuantasCeldas(r: Rango): number {
  return (r.filaHasta - r.filaDesde + 1) * (r.colHasta - r.colDesde + 1);
}

export function esCeldaUnica(r: Rango): boolean {
  return cuantasCeldas(r) === 1;
}

export function interseccion(a: Rango, b: Rango): Rango | null {
  const filaDesde = Math.max(a.filaDesde, b.filaDesde);
  const filaHasta = Math.min(a.filaHasta, b.filaHasta);
  const colDesde = Math.max(a.colDesde, b.colDesde);
  const colHasta = Math.min(a.colHasta, b.colHasta);
  if (filaDesde > filaHasta || colDesde > colHasta) return null;
  return { filaDesde, filaHasta, colDesde, colHasta };
}

/** Quita `quitar` de `r`. Como los rangos son rectangulares, puede partirlo hasta en cuatro. */
export function restar(r: Rango, quitar: Rango): Rango[] {
  const corte = interseccion(r, quitar);
  if (!corte) return [r];
  const salida: Rango[] = [];
  if (corte.filaDesde > r.filaDesde) salida.push({ ...r, filaHasta: corte.filaDesde - 1 });
  if (corte.filaHasta < r.filaHasta) salida.push({ ...r, filaDesde: corte.filaHasta + 1 });
  if (corte.colDesde > r.colDesde) salida.push({ ...r, filaDesde: corte.filaDesde, filaHasta: corte.filaHasta, colHasta: corte.colDesde - 1 });
  if (corte.colHasta < r.colHasta) salida.push({ ...r, filaDesde: corte.filaDesde, filaHasta: corte.filaHasta, colDesde: corte.colHasta + 1 });
  return salida;
}

export function restarDeLista(rangos: Rango[], quitar: Rango): Rango[] {
  return rangos.flatMap((r) => restar(r, quitar));
}

/** Recorre las celdas del rango por filas, de arriba a abajo y de izquierda a derecha. */
export function* celdas(r: Rango): Generator<Posicion> {
  for (let fila = r.filaDesde; fila <= r.filaHasta; fila++) {
    for (let col = r.colDesde; col <= r.colHasta; col++) yield { fila, col };
  }
}

/** Celdas unicas de varios rangos, aunque se solapen. */
export function celdasDeLista(rangos: Rango[]): Posicion[] {
  const vistas = new Set<string>();
  const salida: Posicion[] = [];
  for (const r of rangos) {
    for (const pos of celdas(r)) {
      const clave = `${pos.fila}:${pos.col}`;
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      salida.push(pos);
    }
  }
  return salida;
}

/** Recorta el rango a la grilla actual; null si queda fuera (filas filtradas, columnas ocultas). */
export function recortar(r: Rango, totalFilas: number, totalCols: number): Rango | null {
  return interseccion(r, { filaDesde: 0, filaHasta: totalFilas - 1, colDesde: 0, colHasta: totalCols - 1 });
}

/** Rango de columna completa, usado por la seleccion desde el encabezado. */
export function deColumnas(colA: number, colB: number, totalFilas: number): Rango {
  return normalizar({ fila: 0, col: colA }, { fila: Math.max(0, totalFilas - 1), col: colB });
}
