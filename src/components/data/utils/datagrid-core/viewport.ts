// @contexto INDICE.md · src/components/data/README.md
import type { ColumnState } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { ColLayout } from "@jeff-aporta/iswc-base/components/data/schemas/datagrid-viewport.schemas.js";
/**
 * datagrid-core/viewport — Matemática de virtualización (filas y columnas).
 *
 * Sin DOM. La capa de render aplica los resultados de estas funciones
 * para decidir qué pintar y dónde colocar cada celda.
 *
 *   - rowWindow(count, rowH, scrollTop, viewportH) → ventana de filas + spacers.
 *   - columnLayout(center, left, right) → posiciones, anchos totales.
 *   - colWindow(layout, scrollLeft, viewportW) → ventana de columnas centrales.
 *   - applyFlex(cols, availableWidth) → reparte flex entre columnas con flex>0.
 */

/**
 * @typedef {Object} RowWindow
 * @property {number} startIndex
 * @property {number} endIndex        exclusivo
 * @property {number} topPad          px antes de la primera fila renderizada
 * @property {number} totalHeight     alto total del cuerpo
 */

/**
 * @typedef {Object} ColLayout
 * @property {number[]} positions     x acumulado por columna (centro)
 * @property {number} totalWidth
 * @property {number} leftWidth
 * @property {number} rightWidth
 */

/**
 * Posiciones y anchos totales del grupo central (las pinned no se virtualizan).
 *
 * @param {ColumnState[]} center
 * @param {ColumnState[]} left
 * @param {ColumnState[]} right
 * @returns {ColLayout}
 */

export function columnLayout(center: ColumnState[], left: ColumnState[], right: ColumnState[]): ColLayout {
  const positions: number[] = [];
  let x = 0;
  for (const c of center) { positions.push(x); x += c.width; }
  const totalWidth = x;
  const leftWidth = left.reduce((s, c) => s + c.width, 0);
  const rightWidth = right.reduce((s, c) => s + c.width, 0);
  return { positions, totalWidth, leftWidth, rightWidth };
}

/**
 * Ventana de columnas centrales visibles según scrollLeft/ancho del viewport.
 *
 * @param {ColLayout} layout
 * @param {number} scrollLeft
 * @param {number} viewportWidth
 * @param {number} [overscan=2]
 * @returns {{start: number, end: number}}
 */
export function colWindow(layout: ColLayout, scrollLeft: number, viewportWidth: number, overscan: number = 2) {
  const { positions, totalWidth } = layout;
  if (!positions.length) return { start: 0, end: 0 };
  let start = 0;
  while (start < positions.length - 1 && positions[start + 1]! <= scrollLeft) start++;
  let end = start;
  const right = scrollLeft + viewportWidth;
  while (end < positions.length && positions[end] < right) end++;
  void totalWidth; // reservado para depuración
  return { start: Math.max(0, start - overscan), end: Math.min(positions.length, end + overscan) };
}

/**
 * Distribuye flex entre columnas con `flex` definido para llenar el ancho disponible.
 * Si no hay ancho disponible, deja width como está.
 *
 * @param {ColumnState[]} cols
 * @param {number} availableWidth
 * @returns {ColumnState[]}
 */
export function applyFlex(cols: ColumnState[], availableWidth: number) {
  const flexCols = cols.filter((c) => !c.hide && c.flex && c.flex > 0);
  if (!flexCols.length) return cols;
  const fixed = cols
    .filter((c) => !c.hide && !(c.flex && c.flex > 0))
    .reduce((s, c) => s + c.width, 0);
  const totalFlex = flexCols.reduce((s, c) => s + (c.flex ?? 0), 0);
  const remaining = Math.max(0, availableWidth - fixed);
  return cols.map((c) => {
    if (!c.flex || c.flex <= 0 || c.hide) return c;
    const w = Math.max(
      c.minWidth,
      Math.min(c.maxWidth, Math.round((remaining * c.flex) / totalFlex)),
    );
    return { ...c, width: w };
  });
}
