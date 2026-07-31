import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-fab> — Floating Action Button (vanilla, zero dependencies).
 *
 * Botón flotante de acción principal. Material-like.
 *
 *   <is-fab icon="mdi:plus" position="bottom-end">Crear</is-fab>
 *
 * Atributos
 *   icon        string  — iconify id del icono principal.
 *   position    bottom-end | bottom-start | top-end | top-start | inline (default 'bottom-end')
 *   variant     brand | neutral | custom-color (default 'brand')
 *   size        small | medium | large  (default 'medium')
 *   href        string — si se define, renderiza <a>.
 *   pulse       boolean — animación de pulso para llamar la atención.
 *   extended    boolean — ancho extendido con label.
 *   without-shadow boolean
 *   label       string — texto accesible (y label extendido).
 *
 * Slots
 *   (default)    contenido / label (si extended).
 *   icon         override del icono.
 *
 * Eventos
 *   is-fab-click  detail: { originalEvent }
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <button type="button" class="fab" part="base">
      <span class="icon" part="icon">
        <slot name="icon">
          <is-icon icon="mdi:plus" aria-hidden="true"></is-icon>
        </slot>
      </span>
      <span class="label" part="label"><slot></slot></span>
    </button>
  `;

  const OBSERVED = ['icon', 'position', 'variant', 'size', 'href', 'pulse', 'extended', 'without-shadow', 'label'];
  const VALID_VARIANT = ['brand', 'neutral', 'danger', 'success', 'warning'];
  const VALID_SIZE = ['small', 'medium', 'large'];
  const VALID_POSITION = ['bottom-end', 'bottom-start', 'top-end', 'top-start', 'inline'];

  class IsFab extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #root;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector('.fab');
    }

    connectedCallback() {
      this.#mounted = true;
      this.setAttribute('role', this.hasAttribute('href') ? 'link' : 'button');
      this.#sync();
      this.#root.addEventListener('click', (e) => {
        this.dispatchEvent(new CustomEvent('is-fab-click', {
          detail: { originalEvent: e },
          bubbles: true,
          composed: true,
        }));
      });
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'href') {
        this.setAttribute('role', this.hasAttribute('href') ? 'link' : 'button');
      }
      this.#sync();
    }

    get position() {
      const v = this.getAttribute('position');
      return VALID_POSITION.includes(v) ? v : 'bottom-end';
    }
    set position(v) {
      if (v == null || v === '') this.removeAttribute('position');
      else if (VALID_POSITION.includes(v)) this.setAttribute('position', v);
    }

    get variant() {
      const v = this.getAttribute('variant');
      return VALID_VARIANT.includes(v) ? v : 'brand';
    }
    set variant(v) {
      if (v == null || v === '') this.removeAttribute('variant');
      else if (VALID_VARIANT.includes(v)) this.setAttribute('variant', v);
    }

    get size() {
      const v = this.getAttribute('size');
      return VALID_SIZE.includes(v) ? v : 'medium';
    }
    set size(v) {
      if (v == null || v === '') this.removeAttribute('size');
      else if (VALID_SIZE.includes(v)) this.setAttribute('size', v);
    }

    #sync() {
      const variant = this.variant;
      const size = this.size;
      const position = this.position;
      this.#root.dataset.variant = variant;
      this.#root.dataset.size = size;
      this.dataset.position = position;
      this.#root.classList.toggle('pulse', this.hasAttribute('pulse'));
      this.#root.classList.toggle('extended', this.hasAttribute('extended'));
      this.#root.classList.toggle('no-shadow', this.hasAttribute('without-shadow'));
      // Aplicar icono si no hay slotted icon
      const icon = this.getAttribute('icon');
      if (icon) {
        const slot = this.shadowRoot.querySelector('slot[name="icon"]');
        if (slot && slot.assignedNodes().length === 0) {
          const ic = this.shadowRoot.querySelector('is-icon');
          if (ic) ic.setAttribute('icon', icon);
        }
      }
      // aria-label
      const label = this.getAttribute('label') || this.textContent.trim();
      if (label) this.#root.setAttribute('aria-label', label);
    }
  }

  if (!customElements.get('is-fab')) customElements.define('is-fab', IsFab);
  if (typeof window !== 'undefined') window.IsFab = IsFab;
})();
