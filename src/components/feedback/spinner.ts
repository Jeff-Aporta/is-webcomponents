import { withStyleAttrs } from '@jeff-aporta/iswc-base/core/attrs.js';
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';
import css from 'iswc:css';


/**
 * <iswc-spinner> — Web Component (vanilla).
 *
 * Indicador de carga animado (anillo via border).
 * role=status en el host; respeta prefers-reduced-motion.
 *
 * CSS Parts: ::part(spinner)
 * CSS vars: --iswc-spinner-track-width, --iswc-spinner-track-color, --iswc-spinner-color, --iswc-spinner-speed
 */

(() => {
  registrarTerminos('es', { estadoCargando: 'Cargando' });

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span part="spinner" class="spinner" aria-hidden="true"></span>
  `;

  class IswcSpinner extends withStyleAttrs(IswcReactive) {
    /** El `aria-label` que puso el propio componente (uno del consumidor no se toca). */
    #etiqueta = '';

    static tag = 'iswc-spinner';
    static css = css;

    static observed = [];

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    /** `aria-label` por defecto en el idioma heredado; repinta al cambiar `lang`. */
    override actualizado(): void {
      const actual = this.getAttribute('aria-label');
      if (actual !== null && actual !== this.#etiqueta) return;
      this.#etiqueta = this.t('estadoCargando');
      this.setAttribute('aria-label', this.#etiqueta);
    }

    connectedCallback(): void {
      super.connectedCallback();
      if (!this.hasAttribute('role')) this.setAttribute('role', 'status');
      if (!this.hasAttribute('aria-live')) this.setAttribute('aria-live', 'polite');
    }
  }

  define(IswcSpinner, 'IswcSpinner');
})();
