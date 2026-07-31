import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-progress-ring> — Web Component (vanilla).
 *
 * Anillo de progreso SVG.
 *
 * Atributos
 *   value   number 0–100
 *   label   string — aria-label / texto central
 *
 * CSS Parts: ::part(progress-ring) ::part(track) ::part(indicator) ::part(label)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="progress-ring" class="ring-wrap" role="progressbar">
      <svg class="svg" viewBox="0 0 36 36" aria-hidden="true">
        <circle part="track" class="track" cx="18" cy="18" r="15.9155"></circle>
        <circle part="indicator" class="indicator" cx="18" cy="18" r="15.9155"></circle>
      </svg>
      <span part="label" class="label"></span>
    </div>
  `;

  const OBSERVED = ['value', 'label'];
  const CIRC = 2 * Math.PI * 15.9155;

  class IsProgressRing extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #wrap;
    #indicator;
    #labelEl;
    #mounted = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#wrap = shadow.querySelector('.ring-wrap');
      this.#indicator = shadow.querySelector('.indicator');
      this.#labelEl = shadow.querySelector('.label');
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

    #render() {
      const val = this.value;
      const label = this.label.trim();
      const offset = CIRC * (1 - val / 100);

      this.#indicator.style.strokeDasharray = `${CIRC}`;
      this.#indicator.style.strokeDashoffset = `${offset}`;

      this.#wrap.setAttribute('aria-valuemin', '0');
      this.#wrap.setAttribute('aria-valuemax', '100');
      this.#wrap.setAttribute('aria-valuenow', String(val));
      this.#wrap.setAttribute('aria-valuetext', label || `${val}%`);

      if (label) {
        this.#wrap.setAttribute('aria-label', label);
        this.#labelEl.textContent = label;
        this.#labelEl.hidden = false;
      } else {
        this.#wrap.removeAttribute('aria-label');
        this.#labelEl.textContent = `${Math.round(val)}%`;
        this.#labelEl.hidden = false;
      }
    }
  }

  if (!customElements.get('is-progress-ring')) {
    customElements.define('is-progress-ring', IsProgressRing);
  }
  if (typeof window !== 'undefined') {
    window.IsProgressRing = IsProgressRing;
  }
})();
