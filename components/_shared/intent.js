/**
 * intent.js — Intenciones semánticas (atributo `color`) compartidas.
 *
 * Un "intent" describe EL SIGNIFICADO del color que aplica el componente,
 * no su apariencia. Ejemplos: success (verde), warning (amarillo), danger
 * (rojo), brand (color de marca), neutral (gris, sin tinte).
 *
 * Default: 'brand' (no 'neutral'). Convención 2026-08 — ver AGENTS.md §6.16.
 *
 * Compartido por: is-button, is-tag, is-badge, is-callout, is-toast,
 * is-toast-item, is-stat, is-fab, is-checkbox, is-radio, is-radio-group,
 * is-rating, is-switch.
 */

export const INTENT = Object.freeze([
  'brand',     // color de marca (default)
  'neutral',   // gris, sin tinte semántico
  'success',   // verde — confirmación / validación OK
  'warning',   // amarillo — atención, no crítico
  'danger',    // rojo — error / acción destructiva
]);

export const DEFAULT_INTENT = 'brand';

/**
 * Devuelve el intent si es válido, o `fallback` si no.
 * Útil en setters para rechazar valores fuera de la enum sin romper el render.
 */
export function normalizeIntent(value, fallback = DEFAULT_INTENT) {
  if (typeof value !== 'string') return fallback;
  return INTENT.includes(value) ? value : fallback;
}

/**
 * Setter helper para atributos reflected: acepta cualquier valor y guarda
 * sólo si está en la enum. Uso típico en componentes con intent:
 *
 *   set color(v) { setEnumAttr(this, 'color', normalizeIntent(v)); }
 */
export function setEnumAttr(el, attr, normalized) {
  if (normalized == null || normalized === '') el.removeAttribute(attr);
  else el.setAttribute(attr, normalized);
}