/**
 * misc-utils.js — Utilidades numéricas y de texto compartidas.
 *
 * Sustituye copias dispersas en is-slider, is-rating, is-split-panel,
 * is-format, etc.
 */

/**
 * Redondea `n` a 3 decimales y le concatena `unit` si se pasa.
 * Para `unit=''` devuelve sólo el número como string.
 *
 * @param {number} n
 * @param {string} [unit='']
 * @returns {string}
 */
export function tidy(n, unit = '') {
  if (!Number.isFinite(n)) return '';
  const rounded = Math.round(n * 1000) / 1000;
  return unit ? `${rounded}${unit}` : `${rounded}`;
}

/**
 * Clamp numérico inclusivo: devuelve n limitado al rango [min, max].
 *
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampTo(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

/**
 * Comprueba si un valor es un número válido (no NaN, no Infinity).
 * Wrapper sobre `Number.isFinite` para que sea explícito en sitios donde
 * `isFinite` global aceptaría strings (legacy behavior).
 *
 * @param {*} v
 * @returns {boolean}
 */
export function isValidNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}