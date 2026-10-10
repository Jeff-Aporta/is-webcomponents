/**
 * <__PREFIJO__-hola-mundo> — el componente más simple posible: un título «Hola mundo».
 *
 * Es la referencia mínima del estándar: un componente = 4 archivos hermanos (este .ts, su .scss, su
 * .md y su .json), registrado UNA vez en `src/js/kit-tags.ts` (VIEW_TAGS.hola) y en la galería
 * (`view/demo/manifest.json`). Sin props, sin atributos, sin eventos.
 */
import { crearComponente, define, html } from '../../../src/js/base/componente.js';

const __CLASE__HolaMundo = crearComponente(import.meta.url, '__PREFIJO__-hola-mundo', {}, (root) => {
  root.append(html`<h1 class="titulo" part="titulo">Hola mundo</h1>`);
});

define('__PREFIJO__-hola-mundo', __CLASE__HolaMundo);
