// @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/templates/view/hola/components/__PREFIJO__-hola.ts
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
 *   - `static deps`: los tags del kit que pinta se piden al loader al conectar (si aún no están).
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, html } from '../../../src/js/base/componente.js';
import type { __CLASE__HolaProps } from '../../../src/js/consts/schemas/componentes.schemas.js';
import { caracteristicas, guionInicio } from '../utils/bienvenida.js';
import './__PREFIJO__-hola-mundo.js';

class __CLASE__Hola extends Componente<__CLASE__HolaProps> {
  static tag = '__PREFIJO__-hola';
  static css = css;
  static deps = ['iswc-button', 'iswc-icon', 'iswc-tag', 'iswc-card', 'iswc-dialog', 'iswc-callout', 'iswc-code'];

  protected override inicial(): __CLASE__HolaProps {
    return { modal: false };
  }

  /** Abrir/cerrar pasan SIEMPRE por el estado (`props.modal`) y avisan una sola vez. */
  #cambiar(abierto: boolean): void {
    if (this.props.modal === abierto) return;
    this.props = { modal: abierto };
    this.emit('__PREFIJO__-hola-modal', { abierto });
  }

  protected override pintar(root: ShadowRoot, props: __CLASE__HolaProps): void {
    const abrir = () => this.#cambiar(true);
    const cerrar = () => this.#cambiar(false);
    root.append(html`
      <section class="hero" part="hero" aria-labelledby="titulo">
        <p class="kicker">__TITULO__ · iswc</p>
        <__PREFIJO__-hola-mundo id="titulo"></__PREFIJO__-hola-mundo>
        <p class="lede">App de web components sobre el kit iswc-base: vanilla, Deno y un estándar común para todas las apps.</p>
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
        <iswc-callout color="brand">
          <strong slot="title">Un componente = 4 archivos</strong>
          <code>.ts</code> (lógica) · <code>.scss</code> (estilos) · <code>.md</code> (ficha) · <code>.json</code> (demo), registrados una vez en <code>kit-tags.ts</code>.
        </iswc-callout>
        <iswc-code lang="bash" readonly value=${guionInicio()}></iswc-code>
        <iswc-button slot="footer" color="brand" id="cerrar-modal" oniswc-click=${cerrar}>Entendido</iswc-button>
      </iswc-dialog>
    `);
  }

  /** Repintado parcial: si solo cambió `modal`, se toca `open` del diálogo y nada más. */
  protected override parcial(props: __CLASE__HolaProps, previos: __CLASE__HolaProps): boolean {
    if (props.modal === previos.modal) return false;
    const dialogo = this.shadow?.querySelector('#modal') as (HTMLElement & { open: boolean }) | null | undefined;
    if (!dialogo) return false;
    dialogo.open = props.modal;
    return true;
  }
}

define(__CLASE__Hola);
