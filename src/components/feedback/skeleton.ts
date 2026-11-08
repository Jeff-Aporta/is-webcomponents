import { withStyleAttrs } from '@jeff-aporta/iswc-base/core/attrs.js';
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';
import css from 'iswc:css';


/**
 * <iswc-skeleton> — Web Component (vanilla).
 *
 * Placeholder de carga.
 *
 * Atributos
 *   effect  none | sheen | pulse (default sheen)
 *
 * CSS Parts: ::part(indicator)
 * CSS vars: --color, --sheen-color
 */

(() => {
  registrarTerminos('es', { cargandoContenido: 'Cargando contenido' });

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span part="indicator" class="indicator"></span>
  `;

  const OBSERVED = ['effect'];
  const VALID_EFFECT = ['none', 'sheen', 'pulse'];

  class IswcSkeleton extends withStyleAttrs(IswcReactive) {
    /** El `aria-label` que puso el propio componente (uno del consumidor no se toca). */
    #etiqueta = '';

    static tag = 'iswc-skeleton';
    static css = css;

    static observed = [...OBSERVED, 'color', 'sheen-color'];

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    /** `aria-label` por defecto en el idioma heredado; repinta al cambiar `lang`. */
    override actualizado(): void {
      const actual = this.getAttribute('aria-label');
      if (actual !== null && actual !== this.#etiqueta) return;
      this.#etiqueta = this.t('cargandoContenido');
      this.setAttribute('aria-label', this.#etiqueta);
    }

    connectedCallback(): void {
      super.connectedCallback();
      if (!this.hasAttribute('effect')) this.setAttribute('effect', 'sheen');
      // g07 (Cat 31): exponer el estado de carga a los lectores de pantalla.
      // role=status + aria-busy=true + aria-live=polite avisa al SR de que
      // hay contenido pendiente. aria-label describe la acción esperada
      // para que el usuario sepa qué se está cargando.
      if (!this.hasAttribute('role')) this.setAttribute('role', 'status');
      this.setAttribute('aria-busy', 'true');
      if (!this.hasAttribute('aria-live')) this.setAttribute('aria-live', 'polite');
      // Compatibilidad: el indicador interno sigue siendo decorativo.
      const indicator = this.shadowRoot?.querySelector('[part="indicator"]');
      indicator?.setAttribute('aria-hidden', 'true');
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (oldVal === newVal) return;
      if (name === 'effect' && newVal && !VALID_EFFECT.includes(newVal)) {
        this.setAttribute('effect', 'sheen');
      }
    }
  }

  define(IswcSkeleton, 'IswcSkeleton');
})();
