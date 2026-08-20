import '../actions/button.js';
import '../media/icon.js';
import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-barcode-scanner> — BarcodeDetector sobre cámara o <img>/canvas.
 *
 * Atributos: formats (csv), disabled
 * Métodos: start(), stop(), detect(source)
 * Eventos: is-detect { rawValue, format, barcodes }, is-error
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <video class="preview" part="preview" playsinline muted></video>
    <is-button class="go" variant="filled" color="brand" type="button">Escanear</is-button>
    <p class="hint" part="hint"></p>
  `;

  class IsBarcodeScanner extends HTMLElement {
    static get observedAttributes() { return ['formats', 'disabled']; }

    #video;
    #stream = null;
    #timer = null;
    #go;
    #hint;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#video = shadow.querySelector('.preview');
      this.#go = shadow.querySelector('.go');
      this.#hint = shadow.querySelector('.hint');
      this.#go.addEventListener('click', () => this.#stream ? this.stop() : this.start());
    }

    disconnectedCallback() { this.stop(); }

    get formats() {
      const raw = this.getAttribute('formats');
      return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : ['qr_code', 'ean_13'];
    }
    set formats(v) { setStringAttr(this, 'formats', Array.isArray(v) ? v.join(',') : v); }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    async detect(source) {
      if (typeof BarcodeDetector !== 'function') {
        emit(this, 'is-error', { message: 'BarcodeDetector no disponible' });
        return [];
      }
      const det = new BarcodeDetector({ formats: this.formats });
      const barcodes = await det.detect(source);
      if (barcodes.length) emit(this, 'is-detect', { barcodes, rawValue: barcodes[0].rawValue, format: barcodes[0].format });
      return barcodes;
    }

    async start() {
      if (this.disabled) return;
      if (typeof BarcodeDetector !== 'function') {
        this.#hint.textContent = 'BarcodeDetector no está en este navegador';
        emit(this, 'is-error', { message: 'BarcodeDetector no disponible' });
        return;
      }
      try {
        this.#stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch (err) {
        emit(this, 'is-error', { message: err?.message || 'cámara' });
        return;
      }
      this.#video.srcObject = this.#stream;
      await this.#video.play();
      this.#go.textContent = 'Detener';
      this.#tick();
    }

    stop() {
      clearTimeout(this.#timer);
      this.#timer = null;
      this.#stream?.getTracks().forEach((t) => t.stop());
      this.#stream = null;
      this.#video.srcObject = null;
      this.#go.textContent = 'Escanear';
    }

    #tick() {
      if (!this.#stream) return;
      this.detect(this.#video).catch(() => {});
      this.#timer = setTimeout(() => this.#tick(), 400);
    }
  }

  defineElement('is-barcode-scanner', IsBarcodeScanner, 'IsBarcodeScanner');
})();
