/**
 * iswc-css-vacio.ts — lo que vale `import css from 'iswc:css'` fuera de un build.
 *
 * `iswc:css` es un módulo virtual: el plugin esbuild `cssVirtual` (src/cdn/build/css-virtual.ts) lo sustituye por
 * el CSS compilado del importador y `scripts/serve.mjs` lo sirve desde el staging. Deno no conoce ese esquema: los
 * tests que importan componentes desde `src/` (jsdom, análisis en Node/Deno) fallarían al resolver el especificador.
 * `deno.json` → `imports` apunta `iswc:css`, `iswc:css/host-base` e `iswc:css/scrollbars` aquí: sin build no hay
 * estilos que adoptar, y el molde (`core/iswc-element.ts`) no adopta nada con texto vacío.
 */
export default '';
