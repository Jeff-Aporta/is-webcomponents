import { emit } from '@jeff-aporta/iswc-base/core/element.js';
import { setOptionalAttr, setStringAttr } from '@jeff-aporta/iswc-base/core/reflect.js';
import { loadText, resolveFileSource } from './utils/file-source.js';
import { pintarEstado, sincronizarAlto } from './utils/file-estado.js';
import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import css from 'iswc:css';

(() => {
  const OBSERVED = ['src', 'content', 'height'];
  class IswcTxtView extends IswcElement {
    static tag = 'iswc-txt-view';
    static css = css;
    static observed = OBSERVED;
    #pre!: HTMLElement;
    #empty!: HTMLElement;
    #gen = 0;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.innerHTML = `
        <div class="root" part="root">
          <pre class="body" part="body" hidden></pre>
          <div class="estado" part="empty"></div>
        </div>`;
      this.#pre = shadow.querySelector('.body')!;
      this.#empty = shadow.querySelector('.estado')!;
    }

    onConnected() { sincronizarAlto(this); this.#reload(); }
    onAttributeChanged() { sincronizarAlto(this); this.#reload(); }

    get src() { return this.getAttribute('src'); }
    set src(v) { setOptionalAttr(this, 'src', v); }
    get content() { return this.getAttribute('content') ?? ''; }
    set content(v) { setStringAttr(this, 'content', v); }
    get height() { return this.getAttribute('height') ?? ''; }
    set height(v) { setOptionalAttr(this, 'height', v); }

    async #reload() {
      const gen = ++this.#gen;
      const source = resolveFileSource(this.getAttribute('src'), this.getAttribute('content'));
      if (source.kind === 'empty') {
        this.#pre.hidden = true;
        this.#empty.hidden = false;
        pintarEstado(this.#empty, 'Sin contenido');
        return;
      }
      try {
        const text = await loadText(source);
        if (gen !== this.#gen) return;
        this.#pre.textContent = text;
        this.#pre.hidden = false;
        this.#empty.hidden = true;
        emit(this, 'iswc-load', { bytes: text.length });
      } catch (e) {
        if (gen !== this.#gen) return;
        this.#pre.hidden = true;
        this.#empty.hidden = false;
        pintarEstado(this.#empty, 'No se pudo cargar el texto', 'error');
        emit(this, 'iswc-error', { reason: (e as { reason?: string })?.reason || 'fetch' });
      }
    }
  }
  define(IswcTxtView);
})();
