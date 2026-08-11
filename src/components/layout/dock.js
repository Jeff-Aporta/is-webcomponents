import { adoptCss } from '../_shared/adopt-css.js';
import { withStyleAttrs } from '../_shared/style-attrs.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';

/**
 * <is-dock> — Barra tipo macOS. Los hijos se redimensionan al pasar el
 * puntero cerca, simulando la lupa del Dock.
 *
 *   <is-dock>
 *     <is-dock-item label="Inicio"     icon="mdi:home"></is-dock-item>
 *     <is-dock-item label="Buscar"     icon="mdi:magnify"></is-dock-item>
 *     ...
 *   </is-dock>
 *
 * Atributos
 *   position    bottom (default) | top | left | right
 *   max-scale   factor máximo de magnificación (default 1.6)
 *   range       píxeles: la magnificación cae a 0 a esta distancia del item
 *               bajo el cursor (default 110)
 *
 * Custom states: hovering
 * Eventos:
 *   is-select   detail: { item }
 *
 * is-dock-item acepta:
 *   icon, label, href, active (booleano, marca el ítem activo)
 */
(() => {
  const OBSERVED = ['position', 'max-scale', 'range'];

  class IsDock extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    'scale-unit': '--is-dock-scale-unit',
    };

    static get observedAttributes() { return [...OBSERVED, 'scale-unit']; }
    #raf = 0;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root" data-position="bottom">
          <slot></slot>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#root = this.shadowRoot.querySelector('.root');
      this.#root.addEventListener('pointermove', this.#onMove = (e) => this.#updateMagnification(e));
      this.#root.addEventListener('pointerleave', this.#onLeave = () => this.#clearMagnification());
    }

    connectedCallback() {
      super.connectedCallback();
      this.#syncPosition();
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.#raf);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (oldVal === newVal) return;
      if (name === 'position') this.#syncPosition();
    }

    #onMove;
    #onLeave;
    #root;

    #items() {
      const slot = this.shadowRoot.querySelector('slot');
      return (slot?.assignedElements?.() ?? []);
    }

    #syncPosition() {
      const p = this.getAttribute('position') || 'bottom';
      this.#root.dataset.position = ['bottom', 'top', 'left', 'right'].includes(p) ? p : 'bottom';
    }

    #clearMagnification() {
      for (const item of this.#items()) item.style?.removeProperty('--scale');
    }

    #updateMagnification(e) {
      cancelAnimationFrame(this.#raf);
      this.#raf = requestAnimationFrame(() => {
        const max = Number(this.getAttribute('max-scale')) || 1.6;
        const range = Number(this.getAttribute('range')) || 110;
        const pointer = { x: e.clientX, y: e.clientY };
        const items = this.#items();
        let nearest = null; let nearestDist = Infinity;
        for (const item of items) {
          const r = item.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const d = Math.hypot(cx - pointer.x, cy - pointer.y);
          if (d < nearestDist) { nearestDist = d; nearest = item; }
        }
        // cada item: factor según distancia al `nearest`
        for (const item of items) {
          const r = item.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const d = Math.hypot(cx - pointer.x, cy - pointer.y);
          const factor = Math.max(0, 1 - d / range);
          const scale = 1 + (max - 1) * factor;
          item.style?.setProperty('--scale', String(scale.toFixed(3)));
        }
      });
    }
  }

  defineElement('is-dock', IsDock);

  class IsDockItem extends HTMLElement {
    static get observedAttributes() { return ['icon', 'label', 'href', 'active']; }
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <a part="item" class="item" tabindex="0">
          <span class="ico"><slot name="icon"><is-icon></is-icon></slot></span>
          <span class="label" part="label"></span>
        </a>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.addEventListener('click', (e) => {
        if (this.hasAttribute('disabled')) { e.preventDefault(); return; }
        const dock = this.closest('is-dock');
        if (dock) emit(dock, 'is-select', { item: this });
      });
      this.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.dispatchEvent(new Event('click'));
        }
      });
    }
    connectedCallback() {
      const link = this.shadowRoot.querySelector('a');
      const href = this.getAttribute('href');
      if (href) link.setAttribute('href', href);
      else link.removeAttribute('href');
      link.classList.toggle('active', this.hasAttribute('active'));
      const label = this.getAttribute('label');
      if (label) link.setAttribute('aria-label', label);
      const icon = this.getAttribute('icon');
      const slot = this.shadowRoot.querySelector('slot[name="icon"]');
      if (icon && slot) slot.innerHTML = `<is-icon icon="${icon}"></is-icon>`;
      // tooltip arrow via title (simple); una lib rica usaría is-tooltip
      if (label) link.setAttribute('title', label);
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;
      const link = this.shadowRoot.querySelector('a');
      if (!link) return;
      if (name === 'href') newVal ? link.setAttribute('href', newVal) : link.removeAttribute('href');
      if (name === 'label') link.setAttribute('aria-label', newVal || '');
      if (name === 'active') link.classList.toggle('active', !!newVal);
      if (name === 'icon') {
        const slot = this.shadowRoot.querySelector('slot[name="icon"]');
        if (slot && newVal) slot.innerHTML = `<is-icon icon="${newVal}"></is-icon>`;
      }
    }
  }
  defineElement('is-dock-item', IsDockItem);
})();
