// @vendor 2026-10-13T15:51:18.306Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/templates/src/js/components/__PREFIJO__/all.ts
/**
 * all.ts — barril de compatibilidad → `dist/cdn/all.min.js` (todos los componentes en un módulo).
 * La carga normal es el registrador (`__PREFIJO__Loader.min.js`); este bundle es para hosts que
 * quieren un solo <script>. Fija la raíz de hojas: cada tag busca su CSS en su carpeta (kit-tags).
 */
import { setCssBase } from '../../base/componente.js';

setCssBase(new URL('./', import.meta.url).href);

await import('../../../../view/hola/components/__PREFIJO__-hola-mundo.js');
await import('../../../../view/hola/components/__PREFIJO__-hola.js');
await import('./__PREFIJO__-app.js');
