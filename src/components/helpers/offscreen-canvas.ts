import { adoptCss, defineElement, emit } from '../../core/element.js';

/**
 * <is-offscreen-canvas> — transferControlToOffscreen; worker-src opcional.
 * Si no hay OffscreenCanvas, getContext('2d') en el hilo principal.
 *
 * Atributos: width, height, worker-src
 * Props: canvas, offscreen (OffscreenCanvas | HTMLCanvasElement)
 * Eventos: is-ready { offscreen, fallback }
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = '<canvas part="canvas" class="cv"></canvas>';

  class IsOffscreenCanvas extends HTMLElement {
    static get observedAttributes(): string[] { return ['width', 'height', 'worker-src']; }

    #cv!: HTMLElement;
    #off = null;
    #worker = null;
    #ready = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#cv = shadow.querySelector<HTMLElement>('.cv')!;
    }

    connectedCallback(): void { this.#boot(); }
    disconnectedCallback(): void { this.#worker?.terminate(); this.#worker = null; }
    attributeChangedCallback() {
      if (!this.isConnected) return;
      this.#cv.width = this.width;
      this.#cv.height = this.height;
    }

    get width() { return Number(this.getAttribute('width')) || 320; }
    set width(v) { this.setAttribute('width', String(v)); }
    get height() { return Number(this.getAttribute('height')) || 180; }
    set height(v) { this.setAttribute('height', String(v)); }
    get workerSrc() { return this.getAttribute('worker-src') || ''; }
    get canvas() { return this.#cv; }
    get offscreen() { return this.#off || this.#cv; }

    #boot() {
      this.#cv.width = this.width;
      this.#cv.height = this.height;
      if (this.#ready) return;
      this.#ready = true;
      const canOff = typeof this.#cv.transferControlToOffscreen === 'function';
      if (canOff) {
        this.#off = this.#cv.transferControlToOffscreen();
        if (this.workerSrc) {
          this.#worker = new Worker(this.workerSrc, { type: 'module' });
          this.#worker.postMessage({ canvas: this.#off }, [this.#off]);
        }
        emit(this, 'is-ready', { offscreen: this.#off, fallback: false });
        return;
      }
      emit(this, 'is-ready', { offscreen: this.#cv, fallback: true });
    }
  }

  defineElement('is-offscreen-canvas', IsOffscreenCanvas, 'IsOffscreenCanvas');
})();
