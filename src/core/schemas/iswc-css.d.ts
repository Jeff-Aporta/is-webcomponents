/**
 * iswc-css.d.ts — el import virtual `iswc:css` (plan D6) para tsc.
 *
 *   import css from 'iswc:css';                 // el .css compilado hermano del módulo que importa
 *   import base from 'iswc:css/host-base';      // hojas comunes de src/core (host-base, scrollbars)
 *
 * El texto lo pone el plugin esbuild `cssVirtual` (src/cdn/build/css-virtual.ts) o `scripts/serve.mjs`;
 * en Deno sin empaquetar lo resuelve el import map de `deno.json` a `core/iswc-css-vacio.ts` (`''`).
 */
declare module 'iswc:css' {
  const css: string;
  export default css;
}

declare module 'iswc:css/*' {
  const css: string;
  export default css;
}
