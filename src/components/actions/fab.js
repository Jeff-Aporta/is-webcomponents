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
 *   color     brand | neutral | custom-color (default 'brand')
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

  const OBSERVED = ['icon', 'position', 'color', 'href', 'pulse', 'extended', 'without-shadow', 'label'];
  const VALID_COLOR = ['brand', 'neutral', 'danger', 'success', 'warning'];
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

    get color() {
      const v = this.getAttribute('color');
      return VALID_COLOR.includes(v) ? v : 'brand';
    }
    set color(v) {
      if (v == null || v === '') this.removeAttribute('color');
      else if (VALID_COLOR.includes(v)) this.setAttribute('color', v);
    }

    #sync() {
      const color = this.color;
      const position = this.position;
      this.#root.dataset.color = color;
      this.dataset.position = position;
      if (!this.hasAttribute('position')) this.setAttribute('position', position);
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

      // Con `extended` hay que PINTAR el texto: el slot por defecto solo
      // muestra contenido slotted, asi que `<is-fab extended label="X">` sin
      // hijos salia con la pildora vacia. El atributo pasa a ser el fallback
      // del slot (si el usuario slotea contenido, ese gana).
      const slot = this.#root.querySelector('.label slot');
      if (slot) {
        const slotted = slot.assignedNodes({ flatten: true })
          .some((n) => (n.textContent || '').trim());
        slot.textContent = slotted ? '' : (this.getAttribute('label') || '');
      }
    }
  }

  if (!customElements.get('is-fab')) customElements.define('is-fab', IsFab);
  if (typeof window !== 'undefined') window.IsFab = IsFab;
})();
