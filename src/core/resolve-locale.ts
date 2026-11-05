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

const FALLBACK_LOCALE = 'es';

/**
 * @param {string | null | undefined} [explicit]  Valor del atributo `locale` u override.
 * @returns {string} Locale BCP 47 usable por Intl.*
 */
export function resolveLocale(explicit: string | null | undefined) {
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

