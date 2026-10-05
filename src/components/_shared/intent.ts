/**
 * intent.js — Intenciones semánticas (atributo `color`) compartidas.
 *
 * Un "intent" describe EL SIGNIFICADO del color que aplica el componente,
 * no su apariencia. Ejemplos: success (verde), warning (amarillo), danger
 * (rojo), brand (color de marca), neutral (gris muted), text (foreground
 * del tema — plain/outlined legibles: Editar, Descargar…).
 *
 * Default: 'brand' (no 'neutral'). Convención 2026-08 — ver LLM.md §6.16.
 *
 * Compartido por: iswc-button, iswc-tag, iswc-badge, iswc-callout, iswc-toast,
 * iswc-toast-item, iswc-stat, iswc-fab, iswc-checkbox, iswc-radio, iswc-radio-group,
 * iswc-rating, iswc-switch.
 *
 * CDN: reexportado en `helpers/ui.min.js` (`IswcUi.INTENT`, `ensureDefaultColor`, …).
 */

export const INTENT = Object.freeze([
  'brand',     // color de marca (default)
  'neutral',   // gris #888, sin tinte semántico (muted)
  'text',      // foreground del tema (--iswc-text)
  'success',   // verde — confirmación / validación OK
  'warning',   // amarillo — atención, no crítico
  'danger',    // rojo — error / acción destructiva
  'info',      // azul informativo
  'error',     // rojo de error (alias semántico de danger en varios CE)
]);

export const DEFAULT_INTENT = 'brand';

/** Los valores validos de intencion, derivados de la lista: una sola fuente. */
export type Intent = (typeof INTENT)[number];

/**
 * Devuelve el intent si es válido, o `fallback` si no.
 * Útil en setters para rechazar valores fuera de la enum sin romper el render.
 */
export function normalizeIntent(value: unknown, fallback: Intent = DEFAULT_INTENT): Intent {
  if (typeof value !== 'string') return fallback;
  return (INTENT as readonly string[]).includes(value) ? (value as Intent) : fallback;
}

/**
 * Setter helper para atributos reflected: acepta cualquier valor y guarda
 * sólo si está en la enum. Uso típico en componentes con intent:
 *
 *   set color(v) { setEnumAttr(this, 'color', normalizeIntent(v)); }
 */
export function setEnumAttr(el: Element, attr: string, normalized: string | null | undefined): void {
  if (normalized == null || normalized === '') el.removeAttribute(attr);
  else el.setAttribute(attr, normalized);
}

/**
 * Garantiza `color` con default de kit (`brand`) si el consumer no lo puso.
 * Misma regla que button/switch: sin atributo → brand; con valor → se respeta
 * (tras normalizar). Apps CDN: `IswcUi.ensureDefaultColor(el)`.
 */
export function ensureDefaultColor(
  el: Element,
  fallback: Intent = DEFAULT_INTENT,
): Intent {
  if (!el.hasAttribute('color')) {
    el.setAttribute('color', fallback);
    return fallback;
  }
  const next = normalizeIntent(el.getAttribute('color'), fallback);
  if (el.getAttribute('color') !== next) el.setAttribute('color', next);
  return next;
}