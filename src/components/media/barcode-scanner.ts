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
 *
 * Estados accesibles (F0.3 g12):
 *   role="region" aria-label aria-keyshortcuts
 *   aria-busy mientras se concede permiso y durante el escaneo
 *   aria-disabled en el botón si BarcodeDetector no existe
 *   aria-label dinámico (Iniciar/Detener)
 *   aria-live="polite" en <p.hint> anuncia permiso/estado
 *   Space / Enter sobre el host alternan el escaneo
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
    <video class="preview" part="preview" playsinline muted aria-hidden="true"></video>
    <is-button class="go" variant="filled" color="brand" type="button" aria-label="Iniciar escaneo">Escanear</is-button>
    <p class="hint" part="hint" aria-live="polite"></p>
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
        const on = this.hasAttribute('disabled');
        this.#go?.toggleAttribute('disabled', on);
        if (this.#go) this.#go.setAttribute('aria-disabled', String(on));
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
      // F0.3 g12 [keyboard/media]: Space / Enter sobre el host alternan
      // el escaneo, igual que en grabadora.
      this.addEventListener('keydown', this.#onKeydown);
    }

    connectedCallback(): void {
      // F0.3 g12 [a11y/region]: landmark + label.
      if (!this.hasAttribute('role')) this.setAttribute('role', 'region');
      if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Escáner de códigos');
      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
      if (!this.hasAttribute('aria-keyshortcuts')) {
        this.setAttribute('aria-keyshortcuts', 'Space Enter');
      }
      this.#syncSupport();
    }

    disconnectedCallback(): void {
      this.removeEventListener('keydown', this.#onKeydown);
      this.stop();
    }

    /**
     * F0.3 g12 [a11y/support]: si BarcodeDetector no existe, marcamos el
     * botón como aria-disabled y dejamos un mensaje persistente.
     */
    #syncSupport(): void {
      const has = !!getBarcodeDetector();
      this.#go.setAttribute('aria-disabled', String(!has));
      this.#go.setAttribute('title', has ? 'Iniciar escaneo' : 'BarcodeDetector no soportado');
      if (!has) this.#hint.textContent = 'BarcodeDetector no está en este navegador';
    }

    #onKeydown = (e: KeyboardEvent): void => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target && (e.target as HTMLElement).closest('input,textarea,[contenteditable]')) return;
      if (this.hasAttribute('disabled')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (this.#stream) this.stop(); else this.start();
      }
    };

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
      // F0.3 g12 [media/loading]: aria-busy mientras se concede permiso y
      // arranca el detector. Sin esto, el botón "Escanear" parece colgado.
      this.setAttribute('aria-busy', 'true');
      this.#hint.textContent = 'Solicitando permiso de cámara…';
      try {
        this.#stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch (err) {
        this.removeAttribute('aria-busy');
        this.#hint.textContent = 'Permiso denegado o cámara no disponible';
        emit(this, 'is-error', { message: (err as Error)?.message || 'cámara' });
        return;
      }
      this.#video.srcObject = this.#stream;
      await this.#video.play();
      this.removeAttribute('aria-busy');
      this.#hint.textContent = 'Escaneando…';
      this.#go.textContent = 'Detener';
      this.#go.setAttribute('aria-label', 'Detener escaneo');
      this.#tick();
    }

    stop(): void {
      if (this.#timer !== null) clearTimeout(this.#timer);
      this.#timer = null;
      this.#stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      this.#stream = null;
      this.#video.srcObject = null;
      this.removeAttribute('aria-busy');
      this.#hint.textContent = '';
      this.#go.textContent = 'Escanear';
      this.#go.setAttribute('aria-label', 'Iniciar escaneo');
    }

    #tick(): void {
      if (!this.#stream) return;
      this.detect(this.#video).catch(() => { /* tick interno: errores ya se emitieron */ });
      this.#timer = setTimeout(() => this.#tick(), 400);
    }
  }

  defineElement('is-barcode-scanner', IsBarcodeScanner, 'IsBarcodeScanner');
})();
