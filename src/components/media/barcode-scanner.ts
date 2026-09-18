import '../actions/button.js';
import '../media/icon.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-barcode-scanner> — BarcodeDetector sobre cámara o <img>/canvas.
 *
 * Atributos: formats (csv), disabled
 * Métodos: start(), stop(), detect(source)
 * Eventos: is-detect { rawValue, format, barcodes }, is-error
 */

// BarcodeDetector no está en lib.dom.d.ts (aún no es estándar en todos los
// navegadores). Declaramos el subset que usamos para tipar el código.
interface BarcodeDetectorCtor {
  new (init?: { formats?: string[] }): BarcodeDetectorInstance;
}
interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface DetectedBarcode {
  rawValue: string;
  format: string;
}
declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
  // Constructor global (Firefox aún lo expone como global, no en window).
  // eslint-disable-next-line no-var
  var BarcodeDetector: BarcodeDetectorCtor | undefined;
}
function getBarcodeDetector(): BarcodeDetectorCtor | undefined {
  if (typeof globalThis.BarcodeDetector !== 'undefined') return globalThis.BarcodeDetector;
  if (typeof window !== 'undefined' && window.BarcodeDetector) return window.BarcodeDetector;
  return undefined;
}

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <video class="preview" part="preview" playsinline muted></video>
    <is-button class="go" variant="filled" color="brand" type="button">Escanear</is-button>
    <p class="hint" part="hint"></p>
  `;

  class IsBarcodeScanner extends HTMLElement {
    static get observedAttributes(): string[] { return ['formats', 'disabled']; }

    /**
     * 2026-Q1 fix: attributeChangedCallback faltaba → el playground no
     * podía alternar `formats` ni `disabled` después del mount. Ahora
     * `disabled` re-aplica el estado al botón de acción, y `formats`
     * re-construye la lista interna de decodificadores si el scanner
     * está activo.
     */
    attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void {
      if (name === 'disabled') {
        this.#go?.toggleAttribute('disabled', this.hasAttribute('disabled'));
      } else if (name === 'formats' && this.#stream) {
        // Cambio de formatos en vivo: reiniciar para que tome los nuevos.
        this.stop();
        this.start();
      }
      void newVal;
    }

    #video!: HTMLVideoElement;
    #stream: MediaStream | null = null;
    #timer: ReturnType<typeof setTimeout> | null = null;
    #go!: HTMLElement;
    #hint!: HTMLElement;
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#video = shadow.querySelector<HTMLVideoElement>('.preview')!;
      this.#go = shadow.querySelector<HTMLElement>('.go')!;
      this.#hint = shadow.querySelector<HTMLElement>('.hint')!;
      this.#go.addEventListener('click', () => this.#stream ? this.stop() : this.start());
    }

    disconnectedCallback(): void { this.stop(); }

    get formats(): string[] {
      const raw = this.getAttribute('formats');
      return raw ? raw.split(',').map((s: string) => s.trim()).filter(Boolean) : ['qr_code', 'ean_13'];
    }
    set formats(v: string[] | string) { setStringAttr(this, 'formats', Array.isArray(v) ? v.join(',') : v); }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    async detect(source: CanvasImageSource): Promise<DetectedBarcode[]> {
      const Ctor = getBarcodeDetector();
      if (!Ctor) {
        emit(this, 'is-error', { message: 'BarcodeDetector no disponible' });
        return [];
      }
      const det = new Ctor({ formats: this.formats });
      const barcodes = await det.detect(source);
      if (barcodes.length) emit(this, 'is-detect', { barcodes, rawValue: barcodes[0].rawValue, format: barcodes[0].format });
      return barcodes;
    }

    async start(): Promise<void> {
      if (this.disabled) return;
      const Ctor = getBarcodeDetector();
      if (!Ctor) {
        this.#hint.textContent = 'BarcodeDetector no está en este navegador';
        emit(this, 'is-error', { message: 'BarcodeDetector no disponible' });
        return;
      }
      try {
        this.#stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch (err) {
        emit(this, 'is-error', { message: (err as Error)?.message || 'cámara' });
        return;
      }
      this.#video.srcObject = this.#stream;
      await this.#video.play();
      this.#go.textContent = 'Detener';
      this.#tick();
    }

    stop(): void {
      if (this.#timer !== null) clearTimeout(this.#timer);
      this.#timer = null;
      this.#stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      this.#stream = null;
      this.#video.srcObject = null;
      this.#go.textContent = 'Escanear';
    }

    #tick(): void {
      if (!this.#stream) return;
      this.detect(this.#video).catch(() => { /* tick interno: errores ya se emitieron */ });
      this.#timer = setTimeout(() => this.#tick(), 400);
    }
  }

  defineElement('is-barcode-scanner', IsBarcodeScanner, 'IsBarcodeScanner');
})();
