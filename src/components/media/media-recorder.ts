import '../actions/button.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-media-recorder> — getUserMedia / getDisplayMedia + MediaRecorder.
 *
 * Atributos: source camera|mic|display (default camera)
 * Métodos: start(), stop()
 * Eventos: is-start, is-stop { blob, url, type }, is-error
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <video class="preview" part="preview" playsinline muted></video>
    <div class="row">
      <is-button class="go" variant="filled" color="brand" type="button">Grabar</is-button>
      <a class="dl" part="download" hidden download="captura.webm">Descargar</a>
    </div>
  `;

  class IsMediaRecorder extends HTMLElement {
    static get observedAttributes(): string[] { return ['source', 'disabled']; }

    /**
     * 2026-Q1 fix: attributeChangedCallback faltaba → el playground no
     * podía alternar `source` (camera / mic / display) ni `disabled`.
     * Ahora ambos disparan la acción correspondiente.
     */
    attributeChangedCallback(name: string, _oldVal: string | null, _newVal: string | null): void {
      if (name === 'source') {
        // Cambio de fuente: si está grabando, parar; si no, refrescar preview.
        if (this.#rec) this.stop();
        this.#attach();
      } else if (name === 'disabled') {
        this.#go?.toggleAttribute('disabled', this.hasAttribute('disabled'));
      }
    }

    #video!: HTMLVideoElement;
    #go!: HTMLElement;
    #dl!: HTMLAnchorElement;
    #stream: MediaStream | null = null;
    #rec: MediaRecorder | null = null;
    #chunks: Blob[] = [];
    #url = '';

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#video = shadow.querySelector<HTMLVideoElement>('.preview')!;
      this.#go = shadow.querySelector<HTMLElement>('.go')!;
      this.#dl = shadow.querySelector<HTMLAnchorElement>('.dl')!;
      this.#go.addEventListener('click', () => this.#rec ? this.stop() : this.start());
    }

    disconnectedCallback(): void { this.stop(); this.#revoke(); }

    get source(): 'camera' | 'mic' | 'display' {
      const v = (this.getAttribute('source') || 'camera').toLowerCase();
      return v === 'mic' || v === 'display' ? v : 'camera';
    }
    set source(v: 'camera' | 'mic' | 'display') { setStringAttr(this, 'source', v); }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    async start(): Promise<void> {
      if (this.disabled) return;
      this.stop();
      try {
        if (this.source === 'display') this.#stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        else if (this.source === 'mic') this.#stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        else this.#stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        emit(this, 'is-error', { message: (err as Error)?.message || 'media' });
        return;
      }
      this.#video.srcObject = this.#stream;
      this.#video.hidden = this.source === 'mic';
      if (this.source !== 'mic') await this.#video.play().catch(() => { /* autoplay bloqueado */ });
      this.#chunks = [];
      if (typeof MediaRecorder !== 'function') {
        emit(this, 'is-error', { message: 'MediaRecorder no disponible' });
        this.stop();
        return;
      }
      const stream = this.#stream;
      if (!stream) return;
      const mime = this.source === 'mic'
        ? (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '')
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm');
      this.#rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      this.#rec.ondataavailable = (e: BlobEvent) => { if (e.data.size) this.#chunks.push(e.data); };
      this.#rec.start();
      this.#go.textContent = 'Detener';
      emit(this, 'is-start', { source: this.source });
    }

    stop(): void {
      const rec = this.#rec;
      this.#rec = null;
      this.#go.textContent = 'Grabar';
      if (rec && rec.state !== 'inactive') {
        rec.onstop = () => {
          this.#haltStream();
          this.#finish(rec.mimeType);
        };
        rec.stop();
        return;
      }
      this.#haltStream();
    }

    #attach(): void {
      // Cambio de source fuera de una grabación: refrescar el preview en vivo.
      // Si no hay nada conectado aún, no hacemos nada (la cámara se abrirá al start()).
      if (!this.#stream) return;
      this.#haltStream();
      void this.start();
    }

    #haltStream(): void {
      this.#stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      this.#stream = null;
      this.#video.srcObject = null;
    }

    #finish(type: string): void {
      this.#revoke();
      const blob = new Blob(this.#chunks, { type: type || 'video/webm' });
      this.#url = URL.createObjectURL(blob);
      this.#dl.href = this.#url;
      this.#dl.download = this.source === 'mic' ? 'audio.webm' : 'captura.webm';
      this.#dl.hidden = false;
      emit(this, 'is-stop', { blob, url: this.#url, type: blob.type });
    }

    #revoke(): void {
      if (this.#url) URL.revokeObjectURL(this.#url);
      this.#url = '';
    }
  }

  defineElement('is-media-recorder', IsMediaRecorder, 'IsMediaRecorder');
})();
