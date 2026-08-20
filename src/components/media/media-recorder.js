import '../actions/button.js';
import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
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
    static get observedAttributes() { return ['source', 'disabled']; }

    #video;
    #go;
    #dl;
    #stream = null;
    #rec = null;
    #chunks = [];
    #url = '';

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#video = shadow.querySelector('.preview');
      this.#go = shadow.querySelector('.go');
      this.#dl = shadow.querySelector('.dl');
      this.#go.addEventListener('click', () => this.#rec ? this.stop() : this.start());
    }

    disconnectedCallback() { this.stop(); this.#revoke(); }

    get source() {
      const v = (this.getAttribute('source') || 'camera').toLowerCase();
      return v === 'mic' || v === 'display' ? v : 'camera';
    }
    set source(v) { setStringAttr(this, 'source', v); }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    async start() {
      if (this.disabled) return;
      this.stop();
      try {
        if (this.source === 'display') this.#stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        else if (this.source === 'mic') this.#stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        else this.#stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        emit(this, 'is-error', { message: err?.message || 'media' });
        return;
      }
      this.#video.srcObject = this.#stream;
      this.#video.hidden = this.source === 'mic';
      if (this.source !== 'mic') await this.#video.play().catch(() => {});
      this.#chunks = [];
      if (typeof MediaRecorder !== 'function') {
        emit(this, 'is-error', { message: 'MediaRecorder no disponible' });
        this.stop();
        return;
      }
      const mime = this.source === 'mic'
        ? (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '')
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm');
      this.#rec = mime ? new MediaRecorder(this.#stream, { mimeType: mime }) : new MediaRecorder(this.#stream);
      this.#rec.ondataavailable = (e) => { if (e.data.size) this.#chunks.push(e.data); };
      this.#rec.start();
      this.#go.textContent = 'Detener';
      emit(this, 'is-start', { source: this.source });
    }

    stop() {
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

    #haltStream() {
      this.#stream?.getTracks().forEach((t) => t.stop());
      this.#stream = null;
      this.#video.srcObject = null;
    }

    #finish(type) {
      this.#revoke();
      const blob = new Blob(this.#chunks, { type: type || 'video/webm' });
      this.#url = URL.createObjectURL(blob);
      this.#dl.href = this.#url;
      this.#dl.download = this.source === 'mic' ? 'audio.webm' : 'captura.webm';
      this.#dl.hidden = false;
      emit(this, 'is-stop', { blob, url: this.#url, type: blob.type });
    }

    #revoke() {
      if (this.#url) URL.revokeObjectURL(this.#url);
      this.#url = '';
    }
  }

  defineElement('is-media-recorder', IsMediaRecorder, 'IsMediaRecorder');
})();
