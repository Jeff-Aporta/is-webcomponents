import { withStyleAttrs } from '@jeff-aporta/iswc-base/core/attrs.js';
import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
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
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span part="indicator" class="indicator"></span>
  `;

  const OBSERVED = ['effect'];
  const VALID_EFFECT = ['none', 'sheen', 'pulse'];

  class IswcSkeleton extends withStyleAttrs(IswcElement) {
    static tag = 'iswc-skeleton';
    static css = css;

    static observed = [...OBSERVED, 'color', 'sheen-color'];

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
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
      if (!this.hasAttribute('aria-label')) {
        this.setAttribute('aria-label', 'Cargando contenido');
      }
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
