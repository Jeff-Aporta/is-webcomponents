import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setOptionalAttr, setStringAttr } from '../_shared/reflect.js';
import { loadArrayBuffer, resolveFileSource } from './_shared/file-source.js';
import { loadCdnScript, MAMMOTH_CDN } from './_shared/load-cdn.js';
import type { MammothApi } from "./docx-view.schemas.js";

(() => {
  const OBSERVED = ['src', 'content', 'height'];
  class IswcDocxView extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }
    #body!: HTMLElement;
    #gen = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <div class="root" part="root">
          <div class="body" part="body"></div>
        </div>`;
      adoptCss(shadow, import.meta.url);
      this.#body = shadow.querySelector('.body')!;
    }

    onConnected() { this.#reload(); }
    onAttributeChanged() { this.#reload(); }

    get src() { return this.getAttribute('src'); }
    set src(v) { setOptionalAttr(this, 'src', v); }
    get content() { return this.getAttribute('content') ?? ''; }
    set content(v) { setStringAttr(this, 'content', v); }

    async #reload() {
      const gen = ++this.#gen;
      const source = resolveFileSource(this.getAttribute('src'), this.getAttribute('content'));
      if (source.kind === 'empty') {
        this.#body.innerHTML = '<p class="empty">Sin documento</p>';
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
        this.#body.innerHTML = value || '<p class="empty">Documento vacio</p>';
        emit(this, 'iswc-load');
      } catch (e) {
        if (gen !== this.#gen) return;
        this.#body.innerHTML = '<p class="error">No se pudo previsualizar el DOCX</p>';
        emit(this, 'iswc-error', { reason: (e as { reason?: string })?.reason || 'fetch' });
      }
    }
  }
  defineElement('iswc-docx-view', IswcDocxView);
})();
