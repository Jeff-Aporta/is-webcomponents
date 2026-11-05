/**
 * misc-utils.js — Utilidades numéricas y de texto compartidas.
 *
 * Sustituye copias dispersas en iswc-slider, iswc-rating, iswc-split-panel,
 * iswc-format, etc.
 */

/**
 * Redondea `n` a los decimales que tenga `step`.
 *
 * OJO: no es lo mismo que `tidy(n, unit)` de arriba, aunque el nombre se le
 * parezca. `tidy` redondea SIEMPRE a 3 decimales y concatena una unidad de
 * texto (`'12.5px'`); esto mira cuántos decimales trae el step y redondea a
 * esos, devolviendo un número. `<iswc-slider step="0.01">` necesita 2
 * decimales, no 3, y necesita el valor como número para seguir sumando.
 *
 * Existía duplicado —con el nombre `tidy`, que es justo el de la otra
 * función— en `iswc-slider` e `iswc-rating`.
 *
 * @param {number} n
 * @param {number|string} step
 * @returns {number}
 */
export function tidyToStep(n: number, step: number|string) {
  const decimals = (String(step).split('.')[1] || '').length;
  if (!decimals) return n;
  return Number(n.toFixed(Math.min(20, decimals)));
}

/**
 * Clamp numérico inclusivo: devuelve n limitado al rango [min, max].
 *
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampTo(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

