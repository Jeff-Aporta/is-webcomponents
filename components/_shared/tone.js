/**
 * tone.js — Niveles de relleno (atributo `appearance`) compartidos.
 *
 * Un "tone" describe EL GRADO DE PESO VISUAL: outlined (sin relleno, sólo
 * borde), filled (relleno sólido), plain (texto plano), accent (borde +
 * acento lateral), filled-outlined (combinación).
 *
 * Compartido por: is-tag, is-badge, is-card, is-callout, is-details.
 *
 * Diferencia con intent.js: el intent define QUÉ color aplica; el tone
 * define CUÁNTO PESO VISUAL tiene ese color.
 */

export const TONE = Object.freeze([
  'accent',           // borde + acento lateral (sidebar TOC, callout admonition)
  'filled',           // relleno sólido
  'outlined',         // sin relleno, sólo borde
  'filled-outlined',  // relleno + borde (caso intermedio)
  'plain',            // texto plano sin borde ni fondo
]);

export const DEFAULT_TONE = 'filled';

/**
 * Devuelve el tone si es válido, o `fallback` si no.
 */
export function normalizeTone(value, fallback = DEFAULT_TONE) {
  if (typeof value !== 'string') return fallback;
  return TONE.includes(value) ? value : fallback;
}

/**
 * Setter helper para atributos reflected: acepta cualquier valor y guarda
 * sólo si está en la enum. Espejo de `setEnumAttr` en intent.js.
 *
 *   set appearance(v) { setEnumToneAttr(this, 'appearance', normalizeTone(v)); }
 */
export function setEnumToneAttr(el, attr, normalized) {
  if (normalized == null || normalized === '') el.removeAttribute(attr);
  else el.setAttribute(attr, normalized);
}