import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { ElementBase } from '../_shared/element-base.js';

/**
 * <is-gauge> — Medidor circular de porcentaje (vanilla, zero dependencies).
 *
 * Medidor semicircular o completo de 0..100 (o arbitrary min/max).
 *
 *   <is-gauge value="67" label="Conversión"></is-gauge>
 *
 * Atributos
 *   value       number  (0..100)
 *   min         number
 *   max         number
 *   label       string
 *   unit        string  (e.g. "%")
 *   thickness   number  (px)
 *   color     brand | success | warning | danger (default 'brand')
 *   half        boolean — semicírculo.
 *   format      string  — Intl.NumberFormat format string. e.g. "0.0".
 *   show-value  boolean (default true)
 *
 * Eventos
 *   is-gauge-change  detail: { value, percent }
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="gauge" part="base">
      <svg viewBox="0 0 100 100" part="svg" preserveAspectRatio="xMidYMid meet">
        <circle class="track" part="track" cx="50" cy="50" r="44" />
        <circle class="fill" part="fill" cx="50" cy="50" r="44" />
      </svg>
      <div class="content" part="content">
        <div class="value" part="value"></div>
        <div class="label" part="label"></div>
      </div>
    </div>
  `;

  const OBSERVED = ['value', 'min', 'max', 'label', 'unit', 'thickness', 'color', 'half', 'format', 'show-value'];

  class IsGauge extends ElementBase {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    'track-color': { prop: '--is-gauge-track-color', onlyColorValues: true },
    };

    static get observedAttributes() { return [...OBSERVED, 'track-color']; }
    #svg;
    #circle;
    #track;
    #valueEl;
    #labelEl;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#svg = shadow.querySelector('svg');
      this.#circle = shadow.querySelector('.fill');
      this.#track = shadow.querySelector('.track');
      this.#valueEl = shadow.querySelector('.value');
      this.#labelEl = shadow.querySelector('.label');
    }

    onConnected() {
      this.#render();
    }

    onAttributeChanged(name, oldVal, newVal) {
      this.#render();
    }

    #render() {
      const value = this.#num(this.getAttribute('value') || 0);
      const min = this.#num(this.getAttribute('min') || 0);
      const max = this.#num(this.getAttribute('max') || 100);
      const label = this.getAttribute('label') || '';
      const unit = this.getAttribute('unit') || '';
      const variant = this.getAttribute('color') || 'brand';
      const half = this.hasAttribute('half');
      const format = this.getAttribute('format');
      const showValue = this.hasAttribute('show-value') || !this.hasAttribute('show-value');
      const thickness = parseFloat(this.getAttribute('thickness') || '0') || undefined;

      const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
      const radius = 44;
      const circumference = 2 * Math.PI * radius;
      const arc = half ? circumference / 2 : circumference;
      const offset = arc - (percent / 100) * arc;

      this.#svg.setAttribute('viewBox', half ? '0 0 100 55' : '0 0 100 100');
      this.#svg.dataset.half = half ? 'true' : 'false';
      this.#circle.setAttribute('r', String(radius));
      this.#circle.setAttribute('cx', '50');
      this.#circle.setAttribute('cy', '50');
      this.#circle.setAttribute('stroke-dasharray', String(arc));
      this.#circle.setAttribute('stroke-dashoffset', String(offset));
      this.#circle.setAttribute('transform', half ? 'rotate(-90 50 50) translate(0 0)' : 'rotate(-90 50 50)');
      this.#track.setAttribute('r', String(radius));
      this.#track.setAttribute('cx', '50');
      this.#track.setAttribute('cy', '50');
      this.#track.setAttribute('stroke-dasharray', String(arc));

      // tamaño
      if (thickness) {
        this.#circle.style.strokeWidth = String(thickness);
        this.#track.style.strokeWidth = String(thickness);
      } else {
        this.#circle.style.removeProperty('stroke-width');
        this.#track.style.removeProperty('stroke-width');
      }

      this.#svg.dataset.color = variant;

      // Value y label
      if (showValue) {
        const formatted = format ? this.#formatNumber(value, format) : this.#formatNumber(value, '0');
        this.#valueEl.textContent = `${formatted}${unit}`;
      } else {
        this.#valueEl.textContent = '';
      }
      this.#labelEl.textContent = label;
    }

    #formatNumber(value, format) {
      try {
        return new Intl.NumberFormat(undefined, {
          minimumFractionDigits: format.split('.')[1]?.length || 0,
          maximumFractionDigits: format.split('.')[1]?.length || 0,
        }).format(value);
      } catch {
        return String(value);
      }
    }

    #num(v) {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    }
  }

  defineElement('is-gauge', IsGauge, 'IsGauge');
})();
