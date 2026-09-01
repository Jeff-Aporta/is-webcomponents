import { adoptCss, defineElement, emit } from '../../core/element.js';
import { escapeHtml } from '../_shared/dom-utils.js';
import '../media/icon.js';
import '../actions/button.js';

/**
 * <is-dropzone> — Zona de drop con preview, cola y progreso por archivo.
 *
 * Atributos
 *   accept       mismo formato que &lt;input type="file"&gt;
 *   multiple     boolean
 *   max-files    tope de archivos simultáneos
 *   max-size     bytes — archivos mayores se rechazan
 *   chunked      boolean — emite is-upload-start / -progress / -end con
 *               chunks ficticios (server real lo entrega)
 *
 * API
 *   dz.files         array vivo de FileRecord
 *   dz.addFile(file) agrega manualmente
 *   dz.removeFile(id)
 *   dz.upload()      dispara la simulación de upload (emitiendo progreso)
 *
 * FileRecord
 *   { id, file, name, size, type, status, progress, url?, error? }
 *   status: 'queued' | 'uploading' | 'done' | 'error'
 *
 * Eventos
 *   is-files-change   detail: { files }
 *   is-upload-start   detail: { id, file }
 *   is-upload-progress detail: { id, file, progress }
 *   is-upload-end     detail: { id, file, ok, error? }
 *   is-error          detail: { id, file, reason }
 */
(() => {
  const OBSERVED = ['accept', 'multiple', 'max-files', 'max-size', 'chunked'];

  let nextId = 0;
  const newId = () => `f${(nextId++)}_${Date.now().toString(36)}`;

  class IsDropzone extends HTMLElement {
    static get observedAttributes(): string[] { return OBSERVED; }
    #files = [];
    #counter = 0;
    #zone!: HTMLElement;
    #input!: HTMLElement;
    #queueEl!: HTMLElement;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root">
          <div part="zone" class="zone" tabindex="0">
            <span class="ico"><is-icon icon="mdi:cloud-upload-outline"></is-icon></span>
            <strong class="title">Arrastrá archivos acá</strong>
            <small class="sub">o hacé click para elegir</small>
            <input type="file" class="file-input" id="fileInput" hidden />
          </div>
          <ol part="queue" class="queue" id="queue"></ol>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#zone = this.shadowRoot!.querySelector<HTMLElement>('.zone')!;
      this.#input = this.shadowRoot!.getElementById('fileInput')!;
      this.#queueEl = this.shadowRoot!.getElementById('queue')!;

      this.#zone.addEventListener('click', () => this.#input.click());
      this.#zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.#input.click(); } });
      this.#zone.addEventListener('dragover', (e) => { e.preventDefault(); this.#zone.classList.add('is-over'); });
      this.#zone.addEventListener('dragleave', () => this.#zone.classList.remove('is-over'));
      this.#zone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.#zone.classList.remove('is-over');
        if (!e.dataTransfer) return;
        const files = [...e.dataTransfer.files];
        this.addFiles(files);
      });
      this.#input.addEventListener('change', () => {
        this.addFiles([...this.#input.files]);
        this.#input.value = '';
      });
    }

    connectedCallback(): void { this.#sync(); this.#render(); }

    attributeChangedCallback() {
      if (this.hasAttribute('multiple')) this.#input.multiple = true;
      if (!this.hasAttribute('multiple')) this.#input.multiple = false;
      const accept = this.getAttribute('accept');
      if (accept != null) this.#input.accept = accept;
      this.#render();
    }

    get files() { return this.#files; }

    addFile(file) { this.addFiles([file]); }

    addFiles(files) {
      const max = Number(this.getAttribute('max-files')) || Infinity;
      const maxSize = Number(this.getAttribute('max-size')) || Infinity;
      const accept = this.getAttribute('accept');
      for (const f of files) {
        if (this.#files.length >= max) {
          emit(this, 'is-error', { reason: 'max-files', limit: max });
          break;
        }
        if (f.size > maxSize) {
          emit(this, 'is-error', { id: null, file: f, reason: 'max-size', limit: maxSize });
          continue;
        }
        if (accept && !matchesAccept(f, accept)) {
          emit(this, 'is-error', { id: null, file: f, reason: 'accept' });
          continue;
        }
        const rec = { id: newId(), file: f, name: f.name, size: f.size, type: f.type, status: 'queued', progress: 0, url: '' };
        if (f.type.startsWith('image/')) {
          try { rec.url = URL.createObjectURL(f); } catch { /* noop */ }
        }
        this.#files.push(rec);
      }
      this.#render();
      this.#emitFiles();
    }

    removeFile(id) {
      const rec = this.#files.find((r) => r.id === id);
      if (rec?.url) URL.revokeObjectURL(rec.url);
      this.#files = this.#files.filter((r) => r.id !== id);
      this.#render();
      this.#emitFiles();
    }

    async upload() {
      // simulación chunked
      const queue = this.#files.filter((r) => r.status === 'queued');
      for (const rec of queue) {
        rec.status = 'uploading';
        this.#patch(rec);
        emit(this, 'is-upload-start', { id: rec.id, file: rec.file });
        const steps = 24;
        for (let i = 1; i <= steps; i++) {
          await new Promise((r) => setTimeout(r, 30 + Math.random() * 60));
          rec.progress = Math.round((i / steps) * 100);
          this.#patch(rec);
          emit(this, 'is-upload-progress', { id: rec.id, file: rec.file, progress: rec.progress });
        }
        rec.status = 'done';
        rec.progress = 100;
        this.#patch(rec);
        emit(this, 'is-upload-end', { id: rec.id, file: rec.file, ok: true });
      }
    }

    #emitFiles() {
      emit(this, 'is-files-change', { files: this.#files });
    }

    #patch(rec) {
      const li = this.#queueEl.querySelector<HTMLElement>(`[data-id="${rec.id}"]`);
      if (!li) return this.#render();
      const bar = li.querySelector<HTMLProgressElement>('progress');
      if (bar) bar.value = rec.progress;
      const status = li.querySelector<HTMLElement>('.status');
      if (status) status.textContent = `${rec.status} ${rec.progress}%`;
    }

    #sync() {
      if (this.hasAttribute('multiple')) this.#input.multiple = true;
    }

    #render() {
      this.#queueEl.innerHTML = '';
      for (const rec of this.#files) this.#queueEl.appendChild(this.#row(rec));
    }

    #row(rec) {
      const li = document.createElement('li');
      li.className = `row status-${rec.status}`;
      li.dataset.id = rec.id;
      li.innerHTML = `
        <span class="thumb">${rec.url ? `<img src="${rec.url}" alt="">` : `<is-icon icon="${iconForType(rec.type)}"></is-icon>`}</span>
        <div class="meta">
          <b class="name">${escapeHtml(rec.name)}</b>
          <small class="size">${formatSize(rec.size)}</small>
        </div>
        <progress max="100" value="${rec.progress}"></progress>
        <span class="status">${rec.status} ${rec.progress}%</span>
        <is-button type="button" class="del" variant="text" color="neutral" aria-label="Quitar">
          <is-icon icon="mdi:close" aria-hidden="true"></is-icon>
        </is-button>
      `;
      li.querySelector<HTMLElement>('.del').addEventListener('click', (e) => { e.stopPropagation(); this.removeFile(rec.id); });
      return li;
    }
  }

  function iconForType(t: string) {
    if (!t) return 'mdi:file-outline';
    if (t.startsWith('image/')) return 'mdi:image-outline';
    if (t.startsWith('video/')) return 'mdi:video-outline';
    if (t.startsWith('audio/')) return 'mdi:music-note';
    if (t.includes('pdf'))       return 'mdi:file-pdf-box';
    if (t.includes('zip'))       return 'mdi:folder-zip-outline';
    return 'mdi:file-document-outline';
  }

  function matchesAccept(file, accept: string) {
    const rules = accept.split(',').map((s: string) => s.trim()).filter(Boolean);
    for (const r of rules) {
      if (!r) continue;
      if (r.startsWith('.')) { if (file.name.toLowerCase().endsWith(r.toLowerCase())) return true; continue; }
      if (r.endsWith('/*')) { if (file.type.split('/')[0] === r.split('/')[0]) return true; continue; }
      if (r === file.type) return true;
    }
    return false;
  }

  function formatSize(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  defineElement('is-dropzone', IsDropzone);
})();
