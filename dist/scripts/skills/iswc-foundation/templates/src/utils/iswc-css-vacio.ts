// @contexto INDICE.md · skills/iswc-foundation/SKILL.md
/**
 * iswc-css-vacio.ts — `import css from 'iswc:css'` en Deno sin build (typecheck, pruebas): el import map de
 * `deno.json` resuelve `iswc:css` aquí y el componente queda sin CSS propio. En el navegador el texto lo incrusta
 * `src/utils/build.ts` (el `.css` compilado hermano del módulo, desde `.tmp-scss/`).
 */
const css: string = '';

export default css;
