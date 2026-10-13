// @vendor 2026-10-13T13:41:30.061Z Jeff-Aporta/is-webcomponents@local dist/cdn/skills/iswc-foundation/templates/view/hola/components/all.ts
/** all.ts — barril de la vista `hola` → `dist/cdn/view/hola/components/all.min.js`. Hijos antes que el shell. */
import { setCssBase } from '../../../src/js/base/componente.js';

setCssBase(new URL('../../../', import.meta.url).href);

await import('./__PREFIJO__-hola-mundo.js');
await import('./__PREFIJO__-hola.js');
