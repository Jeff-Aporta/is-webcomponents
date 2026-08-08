/**
 * resolve-locale.js — locale BCP 47 para componentes Intl del kit.
 *
 * Orden (sin attr `locale`):
 *   1. `document.documentElement.lang` — la app/página lo fija (idealmente
 *      desde el sistema al boot; ver `applyDocumentLocaleFromSystem`)
 *   2. idioma del sistema (`navigator.language`)
 *   3. fallback `'es'`
 *
 * Con attr `locale` ese valor gana siempre.
 */

export const FALLBACK_LOCALE = 'es';

/**
 * @param {string | null | undefined} [explicit]  Valor del atributo `locale` u override.
 * @returns {string} Locale BCP 47 usable por Intl.*
 */
export function resolveLocale(explicit) {
  const fromAttr = explicit != null ? String(explicit).trim() : '';
  if (fromAttr) return fromAttr;

  const fromDoc = typeof document !== 'undefined'
    ? String(document.documentElement?.lang || '').trim()
    : '';
  if (fromDoc) return fromDoc;

  const fromNav = typeof navigator !== 'undefined'
    ? String(navigator.language || navigator.languages?.[0] || '').trim()
    : '';
  if (fromNav) return fromNav;

  return FALLBACK_LOCALE;
}

/**
 * Si `<html lang>` está vacío, lo rellena con el sistema (o `es`).
 * Las apps ContaPyme pueden fijar `lang="es"` a propósito para forzar español.
 */
export function applyDocumentLocaleFromSystem() {
  if (typeof document === 'undefined') return;
  const current = String(document.documentElement.lang || '').trim();
  if (current) return;
  const sys = typeof navigator !== 'undefined'
    ? String(navigator.language || navigator.languages?.[0] || '').trim()
    : '';
  document.documentElement.lang = sys || FALLBACK_LOCALE;
}
