// @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/templates/src/js/components/__PREFIJO__/__PREFIJO__-app.ts
// @contexto INDICE.md · skills/iswc-foundation/SKILL.md
/**
 * <__PREFIJO__-app> — shell de la app: barra (marca + tema) y la vista activa.
 *
 * La app solo conoce el shell de cada vista (SHELLS). Las vistas se cargan por el registrador
 * (`__PREFIJO__Loader.min.mjs`); aquí solo se monta su tag.
 */
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';
import { Componente, html } from '../../base/componente.js';
import type { __CLASE__AppProps } from '../../consts/schemas/componentes.schemas.js';

/** Vista → tag del shell de esa vista (cada vista tiene UN shell). */
const SHELLS: Record<string, string> = { hola: '__PREFIJO__-hola' };

class __CLASE__App extends Componente<__CLASE__AppProps> {
  static tag = '__PREFIJO__-app';
  static css = css;
  static deps = ['iswc-theme-toggle'];

  protected override inicial(): __CLASE__AppProps {
    return { vista: 'hola' };
  }

  protected override pintar(root: ShadowRoot, props: __CLASE__AppProps): void {
    const shell = document.createElement(SHELLS[props.vista] ?? SHELLS.hola!);
    root.append(html`
      <header class="barra" part="barra">
        <strong class="marca">__TITULO__</strong>
        <iswc-theme-toggle scope="root"></iswc-theme-toggle>
      </header>
      <main class="vista" part="vista">${shell}</main>
    `);
  }
}

define(__CLASE__App);
