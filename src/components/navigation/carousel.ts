import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <is-carousel> + <is-carousel-item> — Web Components (vanilla, zero dependencies).
 *
 * Carrusel tipo slides con paginación, autoplay, loop, navegación prev/next,
 * indicadores y soporte para swipe en touch.
 *
 *   <is-carousel autoplay loop>
 *     <is-carousel-item>…</is-carousel-item>
 *     <is-carousel-item>…</is-carousel-item>
 *     <is-carousel-item>…</is-carousel-item>
 *   </is-carousel>
 *
 * Atributos <is-carousel>
 *   active             number (0-indexed)
 *   loop               boolean                  (default false)
 *   autoplay           number (ms)              (default 0 — desactivado)
 *   without-controls   boolean                  (oculta prev/next)
 *   without-indicators boolean                  (oculta indicators)
 *   vertical           boolean                  (slides verticales)
 *   slides-per-page    number                   (default 1)
 *   aspect-ratio       string                   (CSS, e.g. "16/9")
 *
 * Atributos <is-carousel-item>
 *   label              string (accesibilidad)
 *   disabled           boolean
 *
 * Slots
 *   <is-carousel>
 *     (default)    items.
 *     prev-icon    override del icono prev.
 *     next-icon    override del icono next.
 *   <is-carousel-item>
 *     (default)   contenido del slide.
 *
 * Eventos
 *   is-carousel-change detail: { from, to, item }
 *   is-carousel-pause  detail: { reason: 'user' | 'auto' | 'visibility' }
 *   is-carousel-play   detail: {}
 *   is-carousel-slide-end (cuando termina swipe)
 *
 * CSS Parts
 *   is-carousel: ::part(base) ::part(viewport) ::part(track) ::part(indicators) ::part(controls)
 *   is-carousel-item: ::part(base)
 */
(() => {
  const TG_TEMPLATE = document.createElement('template');
  TG_TEMPLATE.innerHTML = /* html */ `
    <div class="carousel" part="base">
      <div class="viewport" part="viewport" tabindex="0">
        <div class="track" part="track"><slot></slot></div>
      </div>
      <div class="indicators" part="indicators" role="tablist" aria-label="Indicadores"></div>
      <button type="button" class="ctrl prev" part="controls" tabindex="-1" aria-label="Anterior">
        <slot name="prev-icon">
          <is-icon icon="mdi:chevron-left" aria-hidden="true"></is-icon>
        </slot>
      </button>
      <button type="button" class="ctrl next" part="controls" tabindex="-1" aria-label="Siguiente">
        <slot name="next-icon">
          <is-icon icon="mdi:chevron-right" aria-hidden="true"></is-icon>
        </slot>
      </button>
    </div>
  `;

  const TG_OBSERVED = ['active', 'loop', 'autoplay', 'without-controls', 'without-indicators', 'vertical', 'slides-per-page', 'aspect-ratio'];

  class IsCarousel extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    'control-bg': { prop: '--is-carousel-control-bg', onlyColorValues: true },
    'control-color': { prop: '--is-carousel-control-text', onlyColorValues: true },
    'control-border': { prop: '--is-carousel-control-border', onlyColorValues: true },
    'indicator-color': { prop: '--is-carousel-indicator', onlyColorValues: true },
    'indicator-active': { prop: '--is-carousel-indicator-active', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...TG_OBSERVED, ...IsCarousel.styleAttrNames]; }

    #scroller!: HTMLElement;
    #track!: HTMLElement;
    #indicators!: HTMLElement;
    #btnPrev!: HTMLElement;
    #btnNext!: HTMLElement;
    #autoplayTimer = null;
    #touchStartX = 0;
    #touchStartY = 0;
    #touchDX = 0;
    #touchDY = 0;
    #visibilityHandler;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TG_TEMPLATE.content.cloneNode(true));
      this.#scroller = shadow.querySelector<HTMLElement>('.viewport')!;
      this.#track = shadow.querySelector<HTMLElement>('.track')!;
      this.#indicators = shadow.querySelector<HTMLElement>('.indicators')!;
      this.#btnPrev = shadow.querySelector<HTMLElement>('.prev')!;
      this.#btnNext = shadow.querySelector<HTMLElement>('.next')!;
      this.#btnPrev.addEventListener('click', () => this.prev());
      this.#btnNext.addEventListener('click', () => this.next());
      this.#scroller.addEventListener('scroll', () => {
        this.#onScroll();
      }, { passive: true });
      this.#scroller.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && !this.vertical) { e.preventDefault(); this.prev(); }
        else if (e.key === 'ArrowRight' && !this.vertical) { e.preventDefault(); this.next(); }
        else if (e.key === 'ArrowUp' && this.vertical) { e.preventDefault(); this.prev(); }
        else if (e.key === 'ArrowDown' && this.vertical) { e.preventDefault(); this.next(); }
      });
      // Touch swipe
      this.#scroller.addEventListener('touchstart', (e) => {
        this.#touchStartX = e.touches[0].clientX;
        this.#touchStartY = e.touches[0].clientY;
        this.#touchDX = 0;
        this.#touchDY = 0;
      }, { passive: true });
      this.#scroller.addEventListener('touchmove', (e) => {
        this.#touchDX = e.touches[0].clientX - this.#touchStartX;
        this.#touchDY = e.touches[0].clientY - this.#touchStartY;
      }, { passive: true });
      this.#scroller.addEventListener('touchend', () => {
        const dx = this.#touchDX;
        const dy = this.#touchDY;
        if (this.vertical) {
          if (dy < -40) this.next();
          else if (dy > 40) this.prev();
        } else {
          if (dx < -40) this.next();
          else if (dx > 40) this.prev();
        }
        emit(this, 'is-carousel-slide-end');
      });
      // Pause autoplay on hover
      this.addEventListener('mouseenter', () => this.#pause('user'));
      this.addEventListener('mouseleave', () => this.#play());
      this.addEventListener('focusin', () => this.#pause('user'));
      this.addEventListener('focusout', () => this.#play());
    }

    onConnected() {
      if (!this.hasAttribute('slides-per-page')) this.setAttribute('slides-per-page', '1');
      this.#visibilityHandler = () => {
        if (document.hidden) this.#pause('visibility');
        else this.#play();
      };
      document.addEventListener('visibilitychange', this.#visibilityHandler);
      this.#sync();
      this.#play();
    }

    onDisconnected() {
      document.removeEventListener('visibilitychange', this.#visibilityHandler);
      this.#pause('lifecycle');
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'active') this.#goTo(this.active, true);
      if (name === 'autoplay') this.#play();
      if (name === 'without-controls' || name === 'without-indicators' || name === 'vertical' || name === 'slides-per-page' || name === 'aspect-ratio') this.#sync();
    }

    // ---- public properties ----
    get active() {
      const v = parseInt(this.getAttribute('active') || '0', 10);
      return Number.isFinite(v) ? v : 0;
    }
    set active(v) {
      if (v == null) this.removeAttribute('active');
      else this.setAttribute('active', String(v));
    }

    get autoplay() {
      const v = parseInt(this.getAttribute('autoplay') || '0', 10);
      return Number.isFinite(v) ? v : 0;
    }
    set autoplay(v) {
      if (v == null || v === 0) this.removeAttribute('autoplay');
      else this.setAttribute('autoplay', String(v));
    }

    get loop() { return this.hasAttribute('loop'); }
    set loop(v) {
      if (v) this.setAttribute('loop', '');
      else this.removeAttribute('loop');
    }

    get vertical() { return this.hasAttribute('vertical'); }
    set vertical(v) {
      if (v) this.setAttribute('vertical', '');
      else this.removeAttribute('vertical');
    }

    get slidesPerPage() {
      return Math.max(1, parseInt(this.getAttribute('slides-per-page') || '1', 10) || 1);
    }
    set slidesPerPage(v) {
      this.setAttribute('slides-per-page', String(Math.max(1, v)));
    }

    next() {
      const total = this.#totalSlides();
      if (total === 0) return;
      const from = this.active;
      let to = from + 1;
      if (to >= total) to = this.loop ? 0 : total - 1;
      this.#goTo(to);
    }
    prev() {
      const total = this.#totalSlides();
      if (total === 0) return;
      const from = this.active;
      let to = from - 1;
      if (to < 0) to = this.loop ? total - 1 : 0;
      this.#goTo(to);
    }
    pause() { this.#pause('user'); }
    play() { this.#play(); }

    // ---- private ----

    #items() {
      return [...this.querySelectorAll<HTMLElement>(':scope > is-carousel-item')];
    }

    #totalSlides() {
      const items = this.#items();
      const per = this.slidesPerPage;
      return Math.max(1, items.length - per + 1);
    }

    #sync() {
      const items = this.#items();
      const per = this.slidesPerPage;
      const vertical = this.vertical;
      const base = this.shadowRoot!.querySelector<HTMLElement>('.carousel');
      base.dataset.orientation = vertical ? 'vertical' : 'horizontal';
      if (this.hasAttribute('aspect-ratio')) {
        base.style.setProperty('--aspect-ratio', this.getAttribute('aspect-ratio'));
      } else {
        base.style.removeProperty('--aspect-ratio');
      }
      this.#indicators.hidden = this.hasAttribute('without-indicators');
      this.#btnPrev.hidden = this.hasAttribute('without-controls');
      this.#btnNext.hidden = this.hasAttribute('without-controls');
      // Track direction
      this.#track.dataset.orientation = vertical ? 'vertical' : 'horizontal';
      // Layout items
      items.forEach((item: HTMLElement, i) => {
        item.style.flex = `0 0 ${100 / per}%`;
      });
      // Build indicators
      this.#indicators.innerHTML = '';
      const total = this.#totalSlides();
      for (let i = 0; i < total; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-label', `Slide ${i + 1}`);
        btn.dataset.index = String(i);
        if (i === this.active) btn.setAttribute('aria-selected', 'true');
        btn.addEventListener('click', () => this.#goTo(i));
        this.#indicators.appendChild(btn);
      }
      // posicion inicial
      requestAnimationFrame(() => this.#goTo(this.active, true));
    }

    #onScroll() {
      // Sincronizar active con scroll position (rueda táctil, etc.)
      const items = this.#items();
      if (items.length === 0) return;
      const sl = this.#scroller[this.vertical ? 'scrollTop' : 'scrollLeft'];
      const itemSize = items[0].getBoundingClientRect()[
        this.vertical ? 'height' : 'width'
      ];
      const idx = Math.round(sl / itemSize);
      if (idx !== this.active && idx >= 0 && idx < items.length) {
        this.active = idx;
        this.#updateIndicators();
      }
    }

    #goTo(idx: number, silent = false) {
      const items = this.#items();
      if (items.length === 0) return;
      const total = this.#totalSlides();
      const clamped = Math.max(0, Math.min(total - 1, idx));
      const item = items[clamped];
      if (!item) return;
      const vp = this.#scroller;
      const rect = item.getBoundingClientRect();
      const vpRect = vp.getBoundingClientRect();
      const target = this.vertical
        ? vp.scrollTop + (rect.top - vpRect.top)
        : vp.scrollLeft + (rect.left - vpRect.left);
      vp.scrollTo({
        [this.vertical ? 'top' : 'left']: target,
        behavior: silent ? 'auto' : 'smooth',
      });
      const from = this.active;
      this.setAttribute('active', String(clamped));
      this.#updateIndicators();
      if (!silent && from !== clamped) {
        emit(this, 'is-carousel-change', { from, to: clamped, item });
      }
    }

    #updateIndicators() {
      const btns = this.#indicators.querySelectorAll<HTMLButtonElement>('button');
      btns.forEach((b: HTMLElement, i) => {
        if (i === this.active) b.setAttribute('aria-selected', 'true');
        else b.removeAttribute('aria-selected');
      });
    }

    #play() {
      this.#pause('auto');
      const ms = this.autoplay;
      if (ms > 0) {
        this.#autoplayTimer = setInterval(() => this.next(), ms);
        emit(this, 'is-carousel-play');
      }
    }

    #pause(reason) {
      if (this.#autoplayTimer) {
        clearInterval(this.#autoplayTimer);
        this.#autoplayTimer = null;
        emit(this, 'is-carousel-pause', { reason });
      }
    }
  }

  defineElement('is-carousel', IsCarousel, 'IsCarousel');

  // ============ <is-carousel-item> ============
  const ITEM_TEMPLATE = document.createElement('template');
  ITEM_TEMPLATE.innerHTML = /* html */ `
    <div class="citem" part="base">
      <slot></slot>
    </div>
  `;

  class IsCarouselItem extends HTMLElement {
    static get observedAttributes(): string[] { return ['label']; }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(ITEM_TEMPLATE.content.cloneNode(true));
    }

    connectedCallback(): void {
      this.setAttribute('role', 'tabpanel');
      if (this.hasAttribute('label')) this.setAttribute('aria-label', this.getAttribute('label'));
    }

    attributeChangedCallback(name: string): void {
      if (name === 'label' && this.hasAttribute('label')) this.setAttribute('aria-label', this.getAttribute('label'));
    }
  }

  defineElement('is-carousel-item', IsCarouselItem, 'IsCarouselItem');
})();
