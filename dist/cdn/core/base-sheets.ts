/**
 * base-sheets.ts — `host-base.css` y `scrollbars.css` como hojas construidas,
 * creadas una sola vez y compartidas por todos los ShadowRoot de la página.
 *
 * Antes cada instancia de cada componente metía dos `<link>` a estas hojas en
 * su shadow, y el build las copiaba a las 14 carpetas de categoría. Para pintar
 * un `<iswc-tree-view>` eso eran 10 de las 38 peticiones, y ninguna se podía
 * paralelizar: el `href` sólo se conoce cuando el módulo que lo pide ya se
 * ejecutó.
 *
 * Este módulo se publica **externo** (`dist/cdn/core/base-sheets.min.mjs`),
 * igual que `decors`: una petición por página en lugar de dos por carpeta, y
 * una única `CSSStyleSheet` que todos los shadows adoptan por referencia.
 *
 * El CSS llega por los módulos virtuales `iswc:css/host-base` e
 * `iswc:css/scrollbars` (plan D6): el plugin `cssVirtual`
 * (src/cdn/build/css-virtual.ts) los resuelve contra `.tmp-scss/src/core/` en
 * cada build, y `scripts/serve.mjs` los sirve igual desde el staging. En Deno sin
 * empaquetar (tests jsdom) el import map de `deno.json` los apunta a un módulo
 * vacío: no hay texto que adoptar y `sheetsBase()` devuelve `null`.
 */
import textoBase from 'iswc:css/host-base';
import textoScroll from 'iswc:css/scrollbars';

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

let hojas: CSSStyleSheet[] | null | undefined;

/** Texto de las dos hojas base, en orden de cascada (base y luego scrollbars). Para el respaldo `<style>`. */
export function textoHojasBase(): string {
  return [textoBase, textoScroll].filter(Boolean).join('\n');
}

/**
 * Las dos hojas base, construidas al primer uso y memorizadas.
 *
 * Devuelve `null` cuando el navegador no admite `adoptedStyleSheets` o cuando
 * no hay CSS incrustado; en ambos casos el llamador recurre a `<style>`.
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
