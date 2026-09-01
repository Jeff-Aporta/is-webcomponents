/**
 * base-sheets.ts — `host-base.css` y `scrollbars.css` como hojas construidas,
 * creadas una sola vez y compartidas por todos los ShadowRoot de la página.
 *
 * Antes cada instancia de cada componente metía dos `<link>` a estas hojas en
 * su shadow, y el build las copiaba a las 14 carpetas de categoría. Para pintar
 * un `<is-tree-view>` eso eran 10 de las 38 peticiones, y ninguna se podía
 * paralelizar: el `href` sólo se conoce cuando el módulo que lo pide ya se
 * ejecutó.
 *
 * Este módulo se publica **externo** (`dist/cdn/_shared/base-sheets.min.js`),
 * igual que `decors`: una petición por página en lugar de dos por carpeta, y
 * una única `CSSStyleSheet` que todos los shadows adoptan por referencia.
 *
 * El build inyecta el CSS con `define`. Sin él —consumo directo de `src/`, sin
 * empaquetar— no hay texto que adoptar y `sheetsBase()` devuelve `null` para
 * que el llamador siga usando `<link>`.
 */

declare const __IS_HOST_BASE_CSS__: string;
declare const __IS_SCROLLBARS_CSS__: string;

/** `true` si el navegador admite hojas construidas y adoptadas. */
export const soportaHojasAdoptadas = (() => {
  try {
    return (
      typeof ShadowRoot !== 'undefined' &&
      'adoptedStyleSheets' in ShadowRoot.prototype &&
      typeof new CSSStyleSheet().replaceSync === 'function'
    );
  } catch {
    return false;
  }
})();

/** Texto incrustado por el build, o `''` cuando se consume `src/` sin empaquetar. */
const textoBase = typeof __IS_HOST_BASE_CSS__ === 'string' ? __IS_HOST_BASE_CSS__ : '';
const textoScroll = typeof __IS_SCROLLBARS_CSS__ === 'string' ? __IS_SCROLLBARS_CSS__ : '';

let hojas: CSSStyleSheet[] | null | undefined;

/**
 * Las dos hojas base, construidas al primer uso y memorizadas.
 *
 * Devuelve `null` cuando el navegador no admite `adoptedStyleSheets` o cuando
 * el build no incrustó el CSS; en ambos casos el llamador debe recurrir a
 * `<link>`, que es el comportamiento anterior.
 */
export function sheetsBase(): CSSStyleSheet[] | null {
  if (hojas !== undefined) return hojas;
  if (!soportaHojasAdoptadas || (!textoBase && !textoScroll)) {
    hojas = null;
    return hojas;
  }
  const construir = (css: string): CSSStyleSheet => {
    const hoja = new CSSStyleSheet();
    hoja.replaceSync(css);
    return hoja;
  };
  // Orden: base y luego scrollbars, el mismo que tenían los `<link>`.
  hojas = [construir(textoBase), construir(textoScroll)];
  return hojas;
}
