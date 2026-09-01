/**
 * Contenedor de tema del kit — misma cascada que is-theme-toggle.
 * Atraviesa Shadow DOM (Element.closest se corta en el shadow root).
 */

export const THEME_SCOPE =
  '[container-theme], .container-theme, .theme-dark, .theme-light, [data-theme]';

/**
 * Sube desde `from` atravesando hosts de shadow hasta hallar un ancestro
 * que matchee THEME_SCOPE. Nunca devuelve `from` (aunque tenga data-theme).
 * @param {Element | null | undefined} from
 * @returns {Element}
 */
export function findThemeContainer(from: Element | null | undefined) {
  let node = from && from.nodeType === 1 ? from : null;
  while (node) {
    const parent = node.parentElement;
    if (parent) {
      const hit = parent.closest(THEME_SCOPE);
      if (hit) return hit;
    }
    const root = node.getRootNode?.();
    if (root instanceof ShadowRoot && root.host) {
      // El host puede llevar data-theme / .theme-*; comprobarlo y seguir subiendo.
      if (root.host.matches(THEME_SCOPE)) return root.host;
      node = root.host;
      continue;
    }
    break;
  }
  return document.documentElement;
}

/** @param {Element | null | undefined} el */
export function readTheme(el: Element | null | undefined) {
  if (!el) return 'dark';
  if (el.classList.contains('theme-light')) return 'light';
  if (el.classList.contains('theme-dark')) return 'dark';
  const dt = el.getAttribute?.('data-theme') || (el as HTMLElement).dataset?.theme;
  return dt === 'light' ? 'light' : 'dark';
}

/**
 * Observa class/data-theme del contenedor + `is-theme-change` (composed).
 * @param {Element} container
 * @param {() => void} onChange
 * @returns {() => void}
 */
export function watchThemeContainer(container: Element, onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(container, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  document.addEventListener('is-theme-change', onChange);
  return () => {
    obs.disconnect();
    document.removeEventListener('is-theme-change', onChange);
  };
}
