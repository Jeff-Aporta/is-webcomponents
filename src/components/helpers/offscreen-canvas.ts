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

    #cv!: HTMLCanvasElement;
    #off: OffscreenCanvas | null = null;
    #worker: Worker | null = null;
    #ready = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#cv = shadow.querySelector<HTMLCanvasElement>('.cv')!;
    }

    connectedCallback(): void { this.#boot(); }
    disconnectedCallback(): void { this.#worker?.terminate(); this.#worker = null; }
    attributeChangedCallback(): void {
      if (!this.isConnected) return;
      this.#cv.width = this.width;
      this.#cv.height = this.height;
    }

    get width(): number { return Number(this.getAttribute('width')) || 320; }
    set width(v: number) { this.setAttribute('width', String(v)); }
    get height(): number { return Number(this.getAttribute('height')) || 180; }
    set height(v: number) { this.setAttribute('height', String(v)); }
    get workerSrc(): string { return this.getAttribute('worker-src') || ''; }
    get canvas(): HTMLCanvasElement { return this.#cv; }
    get offscreen(): OffscreenCanvas | HTMLCanvasElement { return this.#off || this.#cv; }

    #boot(): void {
      this.#cv.width = this.width;
      this.#cv.height = this.height;
      if (this.#ready) return;
      this.#ready = true;
      const canOff = typeof this.#cv.transferControlToOffscreen === 'function';
      if (canOff) {
        const off = this.#cv.transferControlToOffscreen();
        this.#off = off;
        if (this.workerSrc) {
          const worker = new Worker(this.workerSrc, { type: 'module' });
          this.#worker = worker;
          worker.postMessage({ canvas: off }, [off]);
        }
        emit(this, 'is-ready', { offscreen: off, fallback: false });
        return;
      }
      emit(this, 'is-ready', { offscreen: this.#cv, fallback: true });
    }
  }

  defineElement('is-offscreen-canvas', IsOffscreenCanvas, 'IsOffscreenCanvas');
})();
