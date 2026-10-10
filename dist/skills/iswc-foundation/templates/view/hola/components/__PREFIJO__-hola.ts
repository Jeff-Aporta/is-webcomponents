/**
 * <__PREFIJO__-hola> — pantalla de bienvenida (shell de la vista `hola`).
 *
 * Portada hecha solo con piezas del kit (`iswc-*`) y el título `<__PREFIJO__-hola-mundo>`. El botón
 * «Ver cómo está hecha» abre un modal (`iswc-dialog`) con lo esencial del estándar.
 *
 * Patrones que muestra:
 *   - Datos desde `../utils/bienvenida.ts` (dominio sin DOM): el componente solo pinta.
 *   - `props.modal` abre/cierra el modal con REPINTADO PARCIAL (solo `open`), sin rehacer el shadow.
 *   - Abrir y cerrar pasan por el estado: botón y «Entendido» cambian `modal`; Esc o clic fuera llegan
 *     como `iswc-hide` del kit y hacen lo mismo. Cada cambio se avisa una vez con
 *     `__PREFIJO__-hola-modal { abierto }`. (Cambiar `open` desde código no emite `iswc-hide`.)
 */
import { crearComponente, define, emitir, html } from '../../../src/js/base/componente.js';
import type { __CLASE__HolaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import { caracteristicas, guionInicio } from '../utils/bienvenida.js';
import './__PREFIJO__-hola-mundo.js';

type Host = HTMLElement & { props: Partial<__CLASE__HolaProps> };

const __CLASE__Hola = crearComponente<__CLASE__HolaProps>(
  import.meta.url,
  '__PREFIJO__-hola',
  { modal: false },
  (root, props, host) => {
    // Abrir/cerrar pasan SIEMPRE por el estado (`props.modal`) y avisan una sola vez. Se lee el estado
    // vivo del host: el `props` de este render queda viejo tras un repintado parcial.
    const cambiar = (abierto: boolean) => {
      if ((host as Host).props.modal === abierto) return;
      (host as Host).props = { modal: abierto };
      emitir(host, '__PREFIJO__-hola-modal', { abierto });
    };
    const abrir = () => cambiar(true);
    const cerrar = () => cambiar(false);
    root.append(html`
      <section class="hero" part="hero" aria-labelledby="titulo">
        <p class="kicker">__TITULO__ · iswc</p>
        <__PREFIJO__-hola-mundo id="titulo"></__PREFIJO__-hola-mundo>
        <p class="lede">App de web components sobre el kit iswc-root: vanilla, Deno y un estándar común para todas las apps.</p>
        <div class="acciones">
          <iswc-button id="abrir-modal" color="brand" variant="filled" oniswc-click=${abrir}>
            Ver cómo está hecha
            <iswc-icon slot="end" icon="mdi:arrow-right"></iswc-icon>
          </iswc-button>
        </div>
        <div class="chips">
          <iswc-tag color="brand">Vanilla</iswc-tag>
          <iswc-tag>Deno</iswc-tag>
          <iswc-tag color="success">Zod</iswc-tag>
          <iswc-tag color="warning">SCSS</iswc-tag>
        </div>
      </section>
      <div class="tarjetas" part="tarjetas">
        ${caracteristicas().map((c) => html`
          <iswc-card variant="outlined">
            <strong slot="header"><iswc-icon icon=${c.icono}></iswc-icon> ${c.titulo}</strong>
            <p>${c.texto}</p>
          </iswc-card>
        `)}
      </div>
      <iswc-dialog id="modal" label="Cómo está hecha" backdrop-variant="basic" light-dismiss ?open=${props.modal} oniswc-hide=${cerrar}>
        <iswc-callout tone="info">
          <strong slot="title">Un componente = 4 archivos</strong>
          <code>.ts</code> (lógica) · <code>.scss</code> (estilos) · <code>.md</code> (ficha) · <code>.json</code> (demo), registrados una vez en <code>kit-tags.ts</code>.
        </iswc-callout>
        <iswc-code lang="bash" readonly value=${guionInicio()}></iswc-code>
        <iswc-button slot="footer" color="brand" id="cerrar-modal" oniswc-click=${cerrar}>Entendido</iswc-button>
      </iswc-dialog>
    `);
  },
  // Repintado parcial: si solo cambió `modal`, se toca `open` del diálogo y nada más.
  (root, props, previos) => {
    if (props.modal === previos.modal) return false;
    const dialogo = root.querySelector('#modal') as (HTMLElement & { open: boolean }) | null;
    if (!dialogo) return false;
    dialogo.open = props.modal;
    return true;
  },
);

define('__PREFIJO__-hola', __CLASE__Hola);
