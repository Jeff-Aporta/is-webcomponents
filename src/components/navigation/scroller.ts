// @contexto INDICE.md · src/components/navigation/scroller.md
import { emit, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';
import css from 'iswc:css';

/**
 * <iswc-scroller> — Web Component (vanilla, zero dependencies).
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
 *   iswc-scroll-start    detail: { direction: -1 }
 *   iswc-scroll-end      detail: { direction: +1 }
 *   iswc-scroll-overflow detail: { overflowing: boolean }
 *   iswc-scroll-position detail: { scrollLeft, scrollTop }
 */
(() => {
  registrarTerminos('es', { areaDesplazable: 'Área desplazable' });

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="scroller" part="base" data-orientation="horizontal">
      <button type="button" class="scroll-btn scroll-start" part="scroll-button" tabindex="-1">
        <slot name="scroll-button-start">
          <iswc-icon icon="mdi:chevron-left" aria-hidden="true"></iswc-icon>
        </slot>
      </button>
      <div class="viewport" part="viewport" role="region" tabindex="0">
        <slot></slot>
      </div>
      <button type="button" class="scroll-btn scroll-end" part="scroll-button" tabindex="-1">
        <slot name="scroll-button-end">
          <iswc-icon icon="mdi:chevron-right" aria-hidden="true"></iswc-icon>
        </slot>
      </button>
    </div>
  `;

  const OBSERVED = ['orientation', 'without-scroll-buttons', 'label'];

  class IswcScroller extends IswcReactive {
    static override tag = 'iswc-scroller';
    static override css = css;

    static override observed = [...OBSERVED, 'button-size', 'button-bg', 'button-color'];

    #scroller!: HTMLElement;
    #viewport!: HTMLElement;
    #btnStart!: HTMLElement;
    #btnEnd!: HTMLElement;
    #ro: ResizeObserver | null = null;
    #onScroll: (() => void) | null = null;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#scroller = shadow.querySelector<HTMLElement>('.scroller')!;
      this.#viewport = shadow.querySelector<HTMLElement>('.viewport')!;
      this.#btnStart = shadow.querySelector<HTMLElement>('.scroll-start')!;
      this.#btnEnd = shadow.querySelector<HTMLElement>('.scroll-end')!;
      this.#onScroll = () => this.#syncOverflow();
      this.#btnStart.addEventListener('click', () => this.#scrollBy(-1));
      this.#btnEnd.addEventListener('click', () => this.#scrollBy(1));
    }

    override onConnected() {
      if (!this.hasAttribute('orientation')) this.setAttribute('orientation', 'horizontal');
      this.#syncLabel();
      this.#ro = new ResizeObserver(this.#syncOverflow);
      this.#ro.observe(this.#viewport);
      const onScroll = this.#onScroll;
      if (onScroll) this.#viewport.addEventListener('scroll', onScroll, { passive: true });
      requestAnimationFrame(() => this.#syncOverflow());
    }

    override onDisconnected() {
      this.#ro?.disconnect();
      if (this.#onScroll) this.#viewport.removeEventListener('scroll', this.#onScroll);
    }

    override onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'orientation') this.#syncOrientation();
      if (name === 'without-scroll-buttons') this.#syncOverflow();
      if (name === 'label') this.#syncLabel();
    }

    /** Textos de accesibilidad en el idioma heredado (repinta al cambiar `lang`). */
    override actualizado(): void {
      this.#btnStart.setAttribute('aria-label', this.t('anterior'));
      this.#btnEnd.setAttribute('aria-label', this.t('siguiente'));
      this.#syncLabel();
    }

    #syncLabel() {
      const label = (this.getAttribute('label') || '').trim() || this.t('areaDesplazable');
      if (this.#viewport) this.#viewport.setAttribute('aria-label', label);
    }

    get orientation(): 'horizontal' | 'vertical' | 'both' {
      const v = this.getAttribute('orientation');
      return v === 'vertical' || v === 'both' ? v : 'horizontal';
    }
    set orientation(v: 'horizontal' | 'vertical' | 'both' | null | undefined) {
      if (v == null) this.removeAttribute('orientation');
      else this.setAttribute('orientation', v);
    }

    // API pública
    override scrollTo(x: number, y: number): void;
    override scrollTo(options?: ScrollToOptions): void;
    override scrollTo(optionsOrX?: ScrollToOptions | number, y?: number): void {
      if (typeof optionsOrX === 'number') {
        this.#viewport.scrollTo({ left: optionsOrX, top: y ?? 0 });
      } else {
        this.#viewport.scrollTo(optionsOrX);
      }
    }
    override scrollBy(x: number, y: number): void;
    override scrollBy(options?: ScrollToOptions): void;
    override scrollBy(optionsOrX?: ScrollToOptions | number, y?: number): void {
      if (typeof optionsOrX === 'number') {
        this.#viewport.scrollBy({ left: optionsOrX, top: y ?? 0 });
      } else {
        this.#viewport.scrollBy(optionsOrX);
      }
    }
    getViewport(): HTMLElement { return this.#viewport; }

    // ---- private ----

    #syncOrientation() {
      const o = this.orientation;
      this.#scroller.dataset.orientation = o;
      this.#btnStart.hidden = false;
      this.#btnEnd.hidden = false;
      this.#syncOverflow();
    }

    #scrollBy(direction: number) {
      const o = this.orientation;
      const horiz = o === 'horizontal' || o === 'both';
      const vert = o === 'vertical' || o === 'both';
      const dx = horiz ? direction * 120 : 0;
      const dy = vert ? direction * 120 : 0;
      this.#viewport.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
      emit(this, direction < 0 ? 'iswc-scroll-start' : 'iswc-scroll-end', { direction });
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
      emit(this, 'iswc-scroll-overflow', { overflowing: overflow });
      emit(this, 'iswc-scroll-position', { scrollLeft: sl, scrollTop: st });
    };
  }

  define(IswcScroller, 'IswcScroller');
})();
