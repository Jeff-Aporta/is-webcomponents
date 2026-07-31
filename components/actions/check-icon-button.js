import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';

/**
 * <is-check-icon-button> — botón icon-only con dos estados (unchecked / checked).
 *
 * Muestra un solo icono a la vez según `checked`. Similar a un toggle/switch visual.
 *
 * Atributos
 *   checked         boolean reflected
 *   icon            Iconify id cuando unchecked (ej. mdi:play)
 *   checked-icon    Iconify id cuando checked (ej. mdi:pause)
 *   label           aria-label unchecked
 *   checked-label   aria-label checked (fallback: label)
 *   appearance      "plain" → compacto y hereda color (chrome oscura: vídeo)
 *   disabled        boolean
 *
 * Events (bubbles, composed)
 *   is-change  { checked: boolean }  — tras cada toggle
 *
 * CSS Parts: ::part(button) ::part(icon)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <button part="button" class="btn" type="button" tabindex="-1" aria-hidden="true">
      <is-icon part="icon" class="ico" aria-hidden="true"></is-icon>
    </button>
  `;

  const OBSERVED = ['checked', 'icon', 'checked-icon', 'label', 'checked-label', 'disabled'];

  class IsCheckIconButton extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #btn;
    #ico;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#btn = shadow.querySelector('.btn');
      this.#ico = shadow.querySelector('.ico');
      // El control accesible es el host, no el <button> interno: escuchar aquí
      // hace que el click del usuario (que burbujea) y `el.click()` coincidan.
      this.addEventListener('click', this.#onClick);
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
      this.addEventListener('keydown', this.#onKeydown);
      this.#render();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.removeEventListener('keydown', this.#onKeydown);
    }

    attributeChangedCallback(_n, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    get checked() { return this.hasAttribute('checked'); }
    set checked(v) { this.toggleAttribute('checked', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get icon() { return this.getAttribute('icon') ?? ''; }
    set icon(v) { v == null || v === '' ? this.removeAttribute('icon') : this.setAttribute('icon', v); }

    get checkedIcon() { return this.getAttribute('checked-icon') ?? ''; }
    set checkedIcon(v) {
      v == null || v === '' ? this.removeAttribute('checked-icon') : this.setAttribute('checked-icon', v);
    }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { v == null || v === '' ? this.removeAttribute('label') : this.setAttribute('label', v); }

    get checkedLabel() { return this.getAttribute('checked-label') ?? ''; }
    set checkedLabel(v) {
      v == null || v === '' ? this.removeAttribute('checked-label') : this.setAttribute('checked-label', v);
    }

    toggle(force) {
      if (typeof force === 'boolean') this.checked = force;
      else this.checked = !this.checked;
      this.#emit();
    }

    #onClick = (e) => {
      if (this.disabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.checked = !this.checked;
      this.#emit();
    };

    #onKeydown = (e) => {
      if (this.disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.checked = !this.checked;
        this.#emit();
      }
    };

    #emit() {
      this.dispatchEvent(new CustomEvent('is-change', {
        bubbles: true,
        composed: true,
        detail: { checked: this.checked },
      }));
    }

    #render() {
      const on = this.checked;
      const icon = (on ? this.checkedIcon : this.icon) || this.icon || this.checkedIcon;
      const label = on
        ? (this.checkedLabel || this.label || '')
        : (this.label || this.checkedLabel || '');

      if (icon) this.#ico.setAttribute('icon', icon);
      else this.#ico.removeAttribute('icon');

      this.#btn.disabled = this.disabled;
      this.setAttribute('aria-pressed', String(on));
      if (label) this.setAttribute('aria-label', label);
      else this.removeAttribute('aria-label');
      this.setAttribute('tabindex', this.disabled ? '-1' : '0');
    }
  }

  if (!customElements.get('is-check-icon-button')) {
    customElements.define('is-check-icon-button', IsCheckIconButton);
  }
  if (typeof window !== 'undefined') window.IsCheckIconButton = IsCheckIconButton;
})();
