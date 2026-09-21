import '../actions/button.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { setStringAttr } from '../_shared/reflect.js';

/**
 * <is-media-recorder> — getUserMedia / getDisplayMedia + MediaRecorder.
 *
 * Atributos: source camera|mic|display (default camera), disabled
 * Métodos: start(), stop()
 * Eventos: is-start, is-stop { blob, url, type }, is-error
 *
 * Estados accesibles (F0.3 g12):
 *   role="region" aria-label="Grabadora de medios" aria-keyshortcuts
 *   aria-busy="true" mientras se solicita permiso / durante la grabación
 *   aria-disabled cuando `disabled` está presente
 *   aria-live="polite" en <p.status> anuncia permiso/estado al lector
 *   Space / Enter sobre el host alternan start/stop
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <video class="preview" part="preview" playsinline muted></video>
    <div class="row">
      <is-button class="go" variant="filled" color="brand" type="button"
        aria-label="Iniciar grabación">Grabar</is-button>
      <a class="dl" part="download" hidden download="captura.webm">Descargar</a>
    </div>
    <p class="status" part="status" aria-live="polite"></p>
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
        const on = this.hasAttribute('disabled');
        this.#go?.toggleAttribute('disabled', on);
        // F0.3 g12 [visual/state]: aria-disabled para que el reader
        // anuncie "deshabilitado" sin que el botón pierda foco nativo.
        if (this.#go) this.#go.setAttribute('aria-disabled', String(on));
      }
    }

    #video!: HTMLVideoElement;
    #go!: HTMLElement;
    #dl!: HTMLAnchorElement;
    #status!: HTMLElement;
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
      this.#status = shadow.querySelector<HTMLElement>('.status')!;
      this.#go.addEventListener('click', () => this.#rec ? this.stop() : this.start());
      // F0.3 g12 [keyboard/media]: Space sobre el componente alterna
      // start/stop (como YouTube / OBS). Sin la convención, un usuario con
      // lector de pantalla no sabía que el botón se podía togglear.
      this.addEventListener('keydown', this.#onKeydown);
    }

    disconnectedCallback(): void {
      this.removeEventListener('keydown', this.#onKeydown);
      this.stop();
      this.#revoke();
    }

    connectedCallback(): void {
      // F0.3 g12 [a11y/region]: landmark + label. aria-keyshortcuts para
      // que el lector exponga la lista de atajos al pedirla.
      if (!this.hasAttribute('role')) this.setAttribute('role', 'region');
      if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Grabadora de medios');
      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
      if (!this.hasAttribute('aria-keyshortcuts')) {
        this.setAttribute('aria-keyshortcuts', 'Space Enter');
      }
    }

    #onKeydown = (e: KeyboardEvent): void => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target && (e.target as HTMLElement).closest('input,textarea,[contenteditable]')) return;
      if (this.hasAttribute('disabled')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (this.#rec) this.stop(); else this.start();
      }
    };

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
      // F0.3 g12 [media/loading]: aria-busy mientras se negocia getUserMedia.
      this.setAttribute('aria-busy', 'true');
      this.#status.textContent = 'Solicitando permiso…';
      try {
        if (this.source === 'display') this.#stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        else if (this.source === 'mic') this.#stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        else this.#stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        this.removeAttribute('aria-busy');
        this.#status.textContent = 'Permiso denegado o dispositivo no disponible';
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
      this.#go.setAttribute('aria-label', 'Detener grabación');
      this.removeAttribute('aria-busy');
      this.#status.textContent = 'Grabando…';
      emit(this, 'is-start', { source: this.source });
    }

    stop(): void {
      const rec = this.#rec;
      this.#rec = null;
      this.#go.textContent = 'Grabar';
      this.#go.setAttribute('aria-label', 'Iniciar grabación');
      this.removeAttribute('aria-busy');
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
