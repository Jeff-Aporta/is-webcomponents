import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { setOptionalAttr, setStringAttr } from '@jeff-aporta/iswc-base/core/attrs.js';
import { loadArrayBuffer, resolveFileSource, loadCdnScript, MAMMOTH_CDN } from './utils/file-source.js';
import { pintarEstado, sincronizarAlto } from './utils/file-estado.js';
import type { MammothApi } from "./schemas/docx-view.schemas.js";
import css from 'iswc:css';

(() => {
  const OBSERVED = ['src', 'content', 'height'];
  class IswcDocxView extends IswcElement {
    static override tag = 'iswc-docx-view';
    static override css = css;
    static override observed = OBSERVED;
    #body!: HTMLElement;
    #gen = 0;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.innerHTML = `
        <div class="root" part="root">
          <div class="body" part="body"></div>
        </div>`;
      this.#body = shadow.querySelector('.body')!;
    }

    override onConnected() { sincronizarAlto(this); this.#reload(); }
    override onAttributeChanged() { sincronizarAlto(this); this.#reload(); }

    get src() { return this.getAttribute('src'); }
    set src(v) { setOptionalAttr(this, 'src', v); }
    get content() { return this.getAttribute('content') ?? ''; }
    set content(v) { setStringAttr(this, 'content', v); }

    async #reload() {
      const gen = ++this.#gen;
      const source = resolveFileSource(this.getAttribute('src'), this.getAttribute('content'));
      if (source.kind === 'empty') {
        pintarEstado(this.#body, 'Sin documento');
        return;
      }
      try {
        await loadCdnScript(MAMMOTH_CDN, () => !!(globalThis as { mammoth?: MammothApi }).mammoth);
        const mammoth = (globalThis as { mammoth?: MammothApi }).mammoth;
        if (!mammoth) throw Object.assign(new Error('mammoth'), { reason: 'cdn' });
        const buf = await loadArrayBuffer(source);
        if (gen !== this.#gen) return;
        const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
        if (gen !== this.#gen) return;
        if (value) this.#body.innerHTML = value;
        else pintarEstado(this.#body, 'Documento vacío');
        emit(this, 'iswc-load');
      } catch (e) {
        if (gen !== this.#gen) return;
        pintarEstado(this.#body, 'No se pudo previsualizar el DOCX', 'error');
        emit(this, 'iswc-error', { reason: (e as { reason?: string })?.reason || 'fetch' });
      }
    }
  }
  define(IswcDocxView);
})();
