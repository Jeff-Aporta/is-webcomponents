import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-progress-bar> — Web Component (vanilla).
 *
 * Atributos
 *   value           number 0–100
 *   label           string — aria-label
 *   indeterminate   boolean
 *
 * Slots: default — etiqueta interna
 *
 * role=progressbar
 * CSS Parts: ::part(progress-bar) ::part(indicator) ::part(label)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="progress-bar" class="track" role="progressbar">
      <div part="indicator" class="indicator"></div>
      <span part="label" class="label"><slot></slot></span>
    </div>
  `;

  const OBSERVED = ['value', 'label', 'indeterminate'];

  class IsProgressBar extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #track;
    #indicator;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#track = shadow.querySelector('.track');
      this.#indicator = shadow.querySelector('.indicator');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    get value() {
      const n = parseFloat(this.getAttribute('value'));
      return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
    }
    set value(v) {
      if (v == null || v === '') this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { v == null || v === '' ? this.removeAttribute('label') : this.setAttribute('label', v); }

    get indeterminate() { return this.hasAttribute('indeterminate'); }
    set indeterminate(v) { this.toggleAttribute('indeterminate', !!v); }

    #render() {
      const indet = this.indeterminate;
      const val = this.value;
      const label = this.label.trim();

      this.#track.setAttribute('aria-valuemin', '0');
      this.#track.setAttribute('aria-valuemax', '100');

      if (indet) {
        this.#track.removeAttribute('aria-valuenow');
        this.#track.setAttribute('aria-valuetext', label || 'Loading');
        this.#indicator.style.width = '';
        this.#indicator.classList.add('is-indeterminate');
      } else {
        this.#track.setAttribute('aria-valuenow', String(val));
        this.#track.setAttribute('aria-valuetext', label || `${val}%`);
        this.#indicator.style.width = `${val}%`;
        this.#indicator.classList.remove('is-indeterminate');
      }

      if (label) this.#track.setAttribute('aria-label', label);
      else this.#track.removeAttribute('aria-label');
    }
  }

  if (!customElements.get('is-progress-bar')) {
    customElements.define('is-progress-bar', IsProgressBar);
  }
  if (typeof window !== 'undefined') {
    window.IsProgressBar = IsProgressBar;
  }
})();
