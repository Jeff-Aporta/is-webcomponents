/**
 * <__PREFIJO__-app> — shell de la app: barra (marca + tema) y la vista activa.
 *
 * La app solo conoce el shell de cada vista (SHELLS). Las vistas se cargan por el registrador
 * (`__PREFIJO__Loader.min.js`); aquí solo se monta su tag.
 */
import { crearComponente, define, html } from '../../base/componente.js';
import type { __CLASE__AppProps } from '../../consts/schemas/componentes.schemas.js';

/** Vista → tag del shell de esa vista (cada vista tiene UN shell). */
const SHELLS: Record<string, string> = { hola: '__PREFIJO__-hola' };

const __CLASE__App = crearComponente<__CLASE__AppProps>(import.meta.url, '__PREFIJO__-app', { vista: 'hola' }, (root, props) => {
  const shell = document.createElement(SHELLS[props.vista] ?? SHELLS.hola!);
  root.append(html`
    <header class="barra" part="barra">
      <strong class="marca">__TITULO__</strong>
      <iswc-theme-toggle scope="root"></iswc-theme-toggle>
    </header>
    <main class="vista" part="vista">${shell}</main>
  `);
});

define('__PREFIJO__-app', __CLASE__App);
