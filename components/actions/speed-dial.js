import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-speed-dial> — FAB que despliega un abanico de acciones.
 *
 * Cada acción es un <is-speed-dial-action> hijo con icon + label. El dial
 * hereda del FAB de la marca (radius, shadow, accent) pero evita tener que
 * registrar otro elemento raíz solo para eso.
 *
 * Atributos
 *   icon          nombre iconify del FAB (default mdi:plus)
 *   label         aria-label del trigger
 *   direction     up (default) | down | left | right
 *   open          boolean — controlado, refleja estado
 *   distance      espacio entre trigger y acciones (default .25rem)
 *
 * Slots
 *   default    <is-speed-dial-action>…
 *
 * Eventos
 *   is-toggle  detail: { open }
 *   is-select  detail: { action }   — cuando se elige una acción
 *
 * Cada <is-speed-dial-action> acepta:
 *   icon, label, variant (brand|neutral|success|warning|danger), href, disabled
 *   El clic dispara is-select y, si no está disabled ni tiene href, cierra el dial.
 */
(() => {
  const OBSERVED = ['icon', 'label', 'direction', 'open', 'distance'];

  const DIRECTIONS = ['up', 'down', 'left', 'right'];

  class IsSpeedDial extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mo;
    #mounted = false;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root" data-direction="up" hidden>
          <div part="actions" class="actions">
            <slot></slot>
          </div>
          <button part="trigger" class="trigger" type="button" aria-expanded="false" aria-label="Abrir acciones">
            <span class="icon-wrap"><slot name="icon"><is-icon icon="mdi:plus"></is-icon></slot></span>
          </button>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#trigger = this.shadowRoot.querySelector('.trigger');
      this.#trigger.addEventListener('click', () => this.toggle());
      this.#onDocPointerDown = (e) => {
        if (!this.isOpen) return;
        if (e.composedPath().includes(this)) return;
        this.close();
      };
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncDirection();
      this.#syncIcon();
      this.#mountActions();
      if (this.hasAttribute('open')) this.open();
      document.addEventListener('pointerdown', this.#onDocPointerDown, true);
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#mo?.disconnect();
      document.removeEventListener('pointerdown', this.#onDocPointerDown, true);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal || !this.#mounted) return;
      if (name === 'direction') this.#syncDirection();
      if (name === 'icon') this.#syncIcon();
      if (name === 'open') {
        if (this.hasAttribute('open')) this.open();
        else this.close();
      }
    }

    get isOpen() { return this.#trigger.getAttribute('aria-expanded') === 'true'; }

    open() {
      this.#trigger.setAttribute('aria-expanded', 'true');
      this.shadowRoot.querySelector('.root').hidden = false;
      this.setAttribute('open', '');
      this.#mountActions();
      this.dispatchEvent(new CustomEvent('is-toggle', { bubbles: true, composed: true, detail: { open: true } }));
    }

    close() {
      this.#trigger.setAttribute('aria-expanded', 'false');
      this.shadowRoot.querySelector('.root').hidden = true;
      this.removeAttribute('open');
      this.dispatchEvent(new CustomEvent('is-toggle', { bubbles: true, composed: true, detail: { open: false } }));
    }

    toggle() { this.isOpen ? this.close() : this.open(); }

    #syncDirection() {
      const d = this.getAttribute('direction') || 'up';
      const dir = DIRECTIONS.includes(d) ? d : 'up';
      this.shadowRoot.querySelector('.root').dataset.direction = dir;
    }

    #syncIcon() {
      const icon = this.getAttribute('icon');
      const slot = this.shadowRoot.querySelector('slot[name="icon"]');
      if (slot && icon) {
        // reescribir el default del slot con un is-icon nuevo
        slot.innerHTML = `<is-icon icon="${icon}"></is-icon>`;
      }
    }

    #mountActions() {
      const slot = this.shadowRoot.querySelector('slot');
      const actions = slot?.assignedElements?.() ?? [];
      const observer = new MutationObserver(() => this.#toggleActionBindings());
      this.#mo?.disconnect();
      this.#mo = observer;
      observer.observe(this, { childList: true });
      this.#toggleActionBindings();
      // stagger delay por índice
      actions.forEach((a, i) => {
        a.style.setProperty('--i', String(i));
      });
    }

    #toggleActionBindings() {
      const actions = [...(this.shadowRoot.querySelector('slot')?.assignedElements?.() ?? [])];
      for (const a of actions) {
        if (a.__bound) continue;
        a.__bound = true;
        a.addEventListener('click', (e) => {
          if (a.hasAttribute('disabled')) { e.preventDefault(); return; }
          this.dispatchEvent(new CustomEvent('is-select', { bubbles: true, composed: true, detail: { action: a } }));
          if (!a.hasAttribute('href')) this.close();
        });
      }
    }

    #trigger;
    #onDocPointerDown;
  }

  if (!customElements.get('is-speed-dial')) customElements.define('is-speed-dial', IsSpeedDial);

  // Acción individual — patrón primario: <button> extendido.
  class IsSpeedDialAction extends HTMLElement {
    static get observedAttributes() { return ['icon', 'label', 'variant', 'href', 'disabled']; }
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <a part="action" class="action" role="menuitem" tabindex="-1">
          <span class="label"><slot></slot></span>
          <span class="ico"><slot name="icon"><is-icon icon="mdi:star-outline"></is-icon></slot></span>
        </a>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
    }
    connectedCallback() {
      const link = this.shadowRoot.querySelector('a');
      const href = this.getAttribute('href');
      if (href) link.setAttribute('href', href);
      const label = this.getAttribute('label');
      if (label) link.setAttribute('aria-label', label);
      const variant = this.getAttribute('variant') || 'brand';
      link.dataset.variant = variant;
      link.tabIndex = this.hasAttribute('disabled') ? -1 : 0;
      // Por defecto se cierra el dial al elegir; si tiene href, no intercepta.
      if (href) link.addEventListener('click', (e) => e.stopPropagation());
      if (this.hasAttribute('disabled')) link.classList.add('is-disabled');
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;
      const link = this.shadowRoot.querySelector('a');
      if (!link) return;
      if (name === 'href') link.setAttribute('href', newVal || '#');
      if (name === 'label') link.setAttribute('aria-label', newVal || '');
      if (name === 'variant') link.dataset.variant = newVal || 'brand';
      if (name === 'disabled') {
        link.classList.toggle('is-disabled', !!newVal);
        link.tabIndex = newVal ? -1 : 0;
      }
    }
  }
  if (!customElements.get('is-speed-dial-action')) customElements.define('is-speed-dial-action', IsSpeedDialAction);
})();
