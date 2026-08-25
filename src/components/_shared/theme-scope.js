/**
 * Contenedor de tema del kit — misma cascada que is-theme-toggle.
 * [container-theme] | .container-theme | .theme-* | [data-theme] → <html>
 */

export const THEME_SCOPE =
  '[container-theme], .container-theme, .theme-dark, .theme-light, [data-theme]';

/** @param {Element | null | undefined} from */
export function findThemeContainer(from) {
  const el = from && typeof from.closest === 'function' ? from.closest(THEME_SCOPE) : null;
  return el || document.documentElement;
}

/** @param {Element | null | undefined} el */
export function readTheme(el) {
  if (!el) return 'dark';
  if (el.classList.contains('theme-light')) return 'light';
  if (el.classList.contains('theme-dark')) return 'dark';
  const dt = el.getAttribute?.('data-theme') || el.dataset?.theme;
  return dt === 'light' ? 'light' : 'dark';
}

/**
 * Observa class/data-theme del contenedor. Devuelve disconnect().
 * @param {Element} container
 * @param {() => void} onChange
 */
export function watchThemeContainer(container, onChange) {
  const obs = new MutationObserver(onChange);
  obs.observe(container, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  return () => obs.disconnect();
}
