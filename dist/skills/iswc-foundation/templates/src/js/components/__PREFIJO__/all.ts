// @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/templates/src/js/components/__PREFIJO__/all.ts
// @contexto INDICE.md · skills/iswc-foundation/SKILL.md
/**
 * all.ts — barril de compatibilidad → `dist/cdn/all.min.js` (todos los componentes en un módulo).
 * La carga normal es el registrador (`__PREFIJO__Loader.min.js`); este bundle es para hosts que
 * quieren un solo <script>. El CSS de cada tag ya viaja dentro de su módulo (`iswc:css`); el kit
 * (`@jeff-aporta/iswc-base/…`) queda externo y lo resuelve el import map del HTML. Sin top-level await.
 */
import '../../../../view/hola/components/__PREFIJO__-hola-mundo.js';
import '../../../../view/hola/components/__PREFIJO__-hola.js';
import './__PREFIJO__-app.js';
