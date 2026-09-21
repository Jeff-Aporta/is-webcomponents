import { adoptCss, defineElement } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';


/**
 * <is-skeleton> — Web Component (vanilla).
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

  class IsSkeleton extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    color: { prop: '--is-skeleton-color', onlyColorValues: true },
    'sheen-color': { prop: '--is-skeleton-sheen', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'color', 'sheen-color']; }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
    }

    connectedCallback(): void {
      super.connectedCallback();
      if (!this.hasAttribute('effect')) this.setAttribute('effect', 'sheen');
      // g07 (Cat 31): exponer el estado de carga a los lectores de pantalla.
      // role=status + aria-busy=true + aria-live=polite avisa al SR de que
      // hay contenido pendiente. aria-label describe la acción esperada
      // para que el usuario sepa qué se está cargando.
      this.setAttribute('role', 'status');
      this.setAttribute('aria-busy', 'true');
      this.setAttribute('aria-live', 'polite');
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

  defineElement('is-skeleton', IsSkeleton, 'IsSkeleton');
})();
