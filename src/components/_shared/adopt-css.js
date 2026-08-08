/** Href del `.css` hermano de un módulo JS.
 *  Conserva el sufijo `.min`: `foo.min.js` → `foo.min.css`, `foo.js` → `foo.css`. */
export function siblingCssHref(moduleUrl) {
  const sibling = new URL(moduleUrl);
  sibling.pathname = sibling.pathname.replace(/\.js$/i, '.css');
  return sibling.href;
}

/** Inyecta el .css hermano del módulo + scrollbars themizados en el ShadowRoot.
 *  Llamar DESPUÉS de rellenar el shadow: `innerHTML = ...` borra los <link>. */
export function adoptCss(shadowRoot, moduleUrl) {
  const base = document.createElement('link');
  base.rel = 'stylesheet';
  base.href = new URL('./host-base.css', import.meta.url).href;

  const scroll = document.createElement('link');
  scroll.rel = 'stylesheet';
  scroll.href = new URL('./scrollbars.css', import.meta.url).href;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = siblingCssHref(moduleUrl);

  shadowRoot.prepend(base, scroll, link);
}
