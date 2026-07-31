import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-stat> — Stat / KPI Card (vanilla, zero dependencies).
 *
 * Bloque para KPI en dashboards: label, número principal, helper text,
 * cambio/trend opcional e icono.
 *
 *   <is-stat label="Ingresos" value="€ 1.249,00" helper="vs mes anterior" trend="+12.5"></is-stat>
 *
 * Atributos
 *   label       string
 *   value       string (texto del número principal; admite formato HTML)
 *   helper      string
 *   trend       string (e.g. "+12.5%" o "-3.2%")
 *   trend-direction up | down | flat   (auto-detect si trend empieza con + o -)
 *   icon        string (iconify id)
 *   variant     brand | neutral | success | warning | danger (default 'neutral')
 *
 * Slots
 *   label       override del label
 *   value       override del valor
 *   helper      override del helper
 *   trend       override del trend
 *   icon        override del icono
 *
 * CSS Parts
 *   ::part(base) ::part(label) ::part(value) ::part(helper) ::part(trend) ::part(icon)
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="stat" part="base">
      <div class="head" part="head">
        <div class="label" part="label"><slot name="label">Label</slot></div>
        <span class="icon" part="icon"><slot name="icon"></slot></span>
      </div>
      <div class="value" part="value"><slot name="value">—</slot></div>
      <div class="foot" part="foot">
        <span class="trend" part="trend"><slot name="trend"></slot></span>
        <span class="helper" part="helper"><slot name="helper"></slot></span>
      </div>
    </div>
  `;

  const OBSERVED = ['label', 'value', 'helper', 'trend', 'trend-direction', 'icon', 'variant'];

  class IsStat extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }
    #mounted = false;
    #root;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector('.stat');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#sync();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#sync();
    }

    #sync() {
      const label = this.getAttribute('label');
      const value = this.getAttribute('value');
      const helper = this.getAttribute('helper');
      const trend = this.getAttribute('trend');
      const variant = this.getAttribute('variant') || 'neutral';
      this.#root.dataset.variant = variant;
      const direction = this.#detectTrendDirection(trend);
      this.#root.dataset.trend = direction;
      // Auto-fill slots si están vacíos
      const setSlot = (slotName, attrVal) => {
        if (!attrVal) return;
        const slot = this.shadowRoot.querySelector(`slot[name="${slotName}"]`);
        if (slot && slot.assignedNodes().length === 0) {
          slot.replaceWith(Object.assign(document.createElement('span'), { textContent: attrVal }));
        }
      };
      setSlot('label', label);
      setSlot('value', value);
      setSlot('helper', helper);
      setSlot('trend', trend);
      // Icon
      const icon = this.getAttribute('icon');
      if (icon) {
        const slot = this.shadowRoot.querySelector('slot[name="icon"]');
        if (slot && slot.assignedNodes().length === 0) {
          const ic = document.createElement('is-icon');
          ic.setAttribute('icon', icon);
          ic.setAttribute('aria-hidden', 'true');
          slot.replaceWith(ic);
        }
      }
    }

    #detectTrendDirection(trend) {
      const explicit = this.getAttribute('trend-direction');
      if (explicit === 'up' || explicit === 'down' || explicit === 'flat') return explicit;
      if (!trend) return 'flat';
      const trimmed = trend.trim();
      if (trimmed.startsWith('+')) return 'up';
      if (trimmed.startsWith('-')) return 'down';
      return 'flat';
    }
  }

  if (!customElements.get('is-stat')) customElements.define('is-stat', IsStat);
  if (typeof window !== 'undefined') window.IsStat = IsStat;
})();
