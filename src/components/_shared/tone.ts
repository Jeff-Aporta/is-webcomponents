/**
 * tone.js — Niveles de relleno (atributo `variant`) compartidos.
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

/** Variantes validas, derivadas de la lista: una sola fuente. */
export type Tone = (typeof TONE)[number];

/**
 * Devuelve el tone si es válido, o `fallback` si no.
 */
export function normalizeTone(value: unknown, fallback: Tone = DEFAULT_TONE): Tone {
  if (typeof value !== 'string') return fallback;
  return (TONE as readonly string[]).includes(value) ? (value as Tone) : fallback;
}

/**
 * Setter helper para atributos reflected: acepta cualquier valor y guarda
 * sólo si está en la enum. Espejo de `setEnumAttr` en intent.js.
 *
 *   set color(v) { setEnumToneAttr(this, 'color', normalizeTone(v)); }
 */
export function setEnumToneAttr(el: Element, attr: string, normalized: string | null | undefined): void {
  if (normalized == null || normalized === '') el.removeAttribute(attr);
  else el.setAttribute(attr, normalized);
}