/** Inyecta el .css hermano del módulo + scrollbars themizados en el ShadowRoot.
 *  Llamar DESPUÉS de rellenar el shadow: `innerHTML = ...` borra los <link>. */
export function adoptCss(shadowRoot, moduleUrl) {
  const sibling = new URL(moduleUrl);
  sibling.pathname = sibling.pathname.replace(/\.js$/i, '.css');

  const scroll = document.createElement('link');
  scroll.rel = 'stylesheet';
  scroll.href = new URL('./scrollbars.css', import.meta.url).href;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = sibling.href;

  shadowRoot.prepend(scroll, link);
}
