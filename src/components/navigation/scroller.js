import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';

/**
 * <is-scroller> — Web Component (vanilla, zero dependencies).
 *
 * Añade scroll horizontal con botones cuando el contenido del slot desborda.
 *
 * Atributos:
 *   orientation            horizontal | vertical | both  (default 'horizontal')
 *   without-scroll-buttons boolean                       (default false)
 *
 * Slots:
 *   (default)               contenido a scrollear.
 *   scroll-button-start     override del botón prev.
 *   scroll-button-end       override del botón next.
 *
 * CSS Parts:
 *   ::part(base)            contenedor scroller.
 *   ::part(viewport)        viewport real (overflow:auto).
 *   ::part(scroll-button)   botones prev/next.
 *
 * Eventos:
 *   is-scroll-start    detail: { direction: -1 }
 *   is-scroll-end      detail: { direction: +1 }
 *   is-scroll-overflow detail: { overflowing: boolean }
 *   is-scroll-position detail: { scrollLeft, scrollTop }
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="scroller" part="base" data-orientation="horizontal">
      <button type="button" class="scroll-btn scroll-start" part="scroll-button" tabindex="-1" aria-label="Anterior">
        <slot name="scroll-button-start">
          <is-icon icon="mdi:chevron-left" aria-hidden="true"></is-icon>
        </slot>
      </button>
      <div class="viewport" part="viewport">
        <slot></slot>
      </div>
      <button type="button" class="scroll-btn scroll-end" part="scroll-button" tabindex="-1" aria-label="Siguiente">
        <slot name="scroll-button-end">
          <is-icon icon="mdi:chevron-right" aria-hidden="true"></is-icon>
        </slot>
      </button>
    </div>
  `;

  const OBSERVED = ['orientation', 'without-scroll-buttons'];

  class IsScroller extends ElementBase {
    static get observedAttributes() { return OBSERVED; }

    #scroller;
    #viewport;
    #btnStart;
    #btnEnd;
    #ro;
    #onScroll;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#scroller = shadow.querySelector('.scroller');
      this.#viewport = shadow.querySelector('.viewport');
      this.#btnStart = shadow.querySelector('.scroll-start');
      this.#btnEnd = shadow.querySelector('.scroll-end');
      this.#onScroll = () => this.#syncOverflow();
      this.#btnStart.addEventListener('click', () => this.#scrollBy(-1));
      this.#btnEnd.addEventListener('click', () => this.#scrollBy(1));
    }

    onConnected() {
      if (!this.hasAttribute('orientation')) this.setAttribute('orientation', 'horizontal');
      this.#ro = new ResizeObserver(this.#syncOverflow);
      this.#ro.observe(this.#viewport);
      this.#viewport.addEventListener('scroll', this.#onScroll, { passive: true });
      requestAnimationFrame(() => this.#syncOverflow());
    }

    onDisconnected() {
      this.#ro?.disconnect();
      this.#viewport.removeEventListener('scroll', this.#onScroll);
    }

    onAttributeChanged(name, oldVal, newVal) {
      if (name === 'orientation') this.#syncOrientation();
      if (name === 'without-scroll-buttons') this.#syncOverflow();
    }

    get orientation() {
      const v = this.getAttribute('orientation');
      return v === 'vertical' || v === 'both' ? v : 'horizontal';
    }
    set orientation(v) {
      if (v == null || v === '') this.removeAttribute('orientation');
      else this.setAttribute('orientation', v);
    }

    // API pública
    scrollTo(options) { this.#viewport.scrollTo(options); }
    scrollBy(options) { this.#viewport.scrollBy(options); }
    getViewport() { return this.#viewport; }

    // ---- private ----

    #syncOrientation() {
      const o = this.orientation;
      this.#scroller.dataset.orientation = o;
      this.#btnStart.hidden = false;
      this.#btnEnd.hidden = false;
      this.#syncOverflow();
    }

    #scrollBy(direction) {
      const o = this.orientation;
      const horiz = o === 'horizontal' || o === 'both';
      const vert = o === 'vertical' || o === 'both';
      const dx = horiz ? direction * 120 : 0;
      const dy = vert ? direction * 120 : 0;
      this.#viewport.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
      emit(this, direction < 0 ? 'is-scroll-start' : 'is-scroll-end', { direction });
    }

    #syncOverflow = () => {
      if (this.hasAttribute('without-scroll-buttons')) {
        this.#btnStart.hidden = true;
        this.#btnEnd.hidden = true;
        return;
      }
      const o = this.orientation;
      const horiz = o === 'horizontal' || o === 'both';
      const vert = o === 'vertical' || o === 'both';
      const sl = this.#viewport.scrollLeft;
      const st = this.#viewport.scrollTop;
      const sm = horiz ? this.#viewport.scrollWidth - this.#viewport.clientWidth - sl : 0;
      const sm2 = vert ? this.#viewport.scrollHeight - this.#viewport.clientHeight - st : 0;
      const overflow = (horiz && sm > 1) || (vert && sm2 > 1);
      this.#btnStart.hidden = !overflow;
      this.#btnEnd.hidden = !overflow;
      emit(this, 'is-scroll-overflow', { overflowing: overflow });
      emit(this, 'is-scroll-position', { scrollLeft: sl, scrollTop: st });
    };
  }

  defineElement('is-scroller', IsScroller, 'IsScroller');
})();
