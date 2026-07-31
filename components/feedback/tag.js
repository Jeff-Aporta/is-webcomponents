import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';

/**
 * <is-tag> — Web Component (vanilla).
 *
 * Similar a is-badge; default appearance filled-outlined, variant neutral.
 * Escala con font-size del contexto (métricas en em).
 *
 * Atributos
 *   variant       brand | neutral | success | warning | danger (default neutral)
 *   appearance    accent | filled | outlined | filled-outlined (default filled-outlined)
 *   pill          boolean
 *   with-remove   boolean — muestra botón de quitar
 *   remove-label  string — aria-label del botón (default Quitar)
 *
 * Eventos
 *   is-remove  — click en botón quitar (bubbles, composed)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <span part="tag" class="tag">
      <span part="start" class="prefix"><slot name="start"></slot></span>
      <span part="label" class="label"><slot></slot></span>
      <span part="end" class="suffix"><slot name="end"></slot></span>
      <button type="button" part="remove-button" class="remove" hidden aria-label="Quitar">
        <is-icon icon="mdi:close" aria-hidden="true"></is-icon>
      </button>
    </span>
  `;

  const OBSERVED = ['variant', 'appearance', 'pill', 'with-remove', 'remove-label'];
  const VALID_VARIANT = ['brand', 'neutral', 'success', 'warning', 'danger'];
  const VALID_APPEARANCE = ['accent', 'filled', 'outlined', 'filled-outlined'];

  class IsTag extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #remove;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#remove = shadow.querySelector('.remove');
      this.#remove.addEventListener('click', this.#onRemove);
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('variant')) this.setAttribute('variant', 'neutral');
      if (!this.hasAttribute('appearance')) this.setAttribute('appearance', 'filled-outlined');
      this.#syncRemove();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'variant' && newVal && !VALID_VARIANT.includes(newVal)) {
        this.setAttribute('variant', 'neutral');
      }
      if (name === 'appearance' && newVal && !VALID_APPEARANCE.includes(newVal)) {
        this.setAttribute('appearance', 'filled-outlined');
      }
      if (name === 'with-remove' || name === 'remove-label') this.#syncRemove();
    }

    get withRemove() { return this.hasAttribute('with-remove'); }
    set withRemove(v) { this.toggleAttribute('with-remove', !!v); }

    #syncRemove() {
      this.#remove.hidden = !this.withRemove;
      this.#remove.setAttribute('aria-label', this.getAttribute('remove-label') || 'Quitar');
    }

    #onRemove = (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('is-remove', { bubbles: true, composed: true }));
    };
  }

  if (!customElements.get('is-tag')) {
    customElements.define('is-tag', IsTag);
  }
  if (typeof window !== 'undefined') {
    window.IsTag = IsTag;
  }
})();
