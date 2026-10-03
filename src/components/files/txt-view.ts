import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setOptionalAttr, setStringAttr } from '../_shared/reflect.js';
import { loadText, resolveFileSource } from './_shared/file-source.js';

(() => {
  const OBSERVED = ['src', 'content', 'height'];
  class IswcTxtView extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }
    #pre!: HTMLElement;
    #empty!: HTMLElement;
    #gen = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <div class="root" part="root">
          <pre class="body" part="body" hidden></pre>
          <p class="empty" part="empty">Sin contenido</p>
        </div>`;
      adoptCss(shadow, import.meta.url);
      this.#pre = shadow.querySelector('.body')!;
      this.#empty = shadow.querySelector('.empty')!;
    }

    onConnected() { this.#reload(); }
    onAttributeChanged() { this.#reload(); }

    get src() { return this.getAttribute('src'); }
    set src(v) { setOptionalAttr(this, 'src', v); }
    get content() { return this.getAttribute('content') ?? ''; }
    set content(v) { setStringAttr(this, 'content', v); }
    get height() { return this.getAttribute('height') ?? ''; }
    set height(v) {
      setOptionalAttr(this, 'height', v);
      if (v) this.style.setProperty('--iswc-file-height', String(v));
      else this.style.removeProperty('--iswc-file-height');
    }

    async #reload() {
      const gen = ++this.#gen;
      const source = resolveFileSource(this.getAttribute('src'), this.getAttribute('content'));
      if (source.kind === 'empty') {
        this.#pre.hidden = true;
        this.#empty.hidden = false;
        this.#empty.className = 'empty';
        this.#empty.textContent = 'Sin contenido';
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
        this.#empty.textContent = 'No se pudo cargar el texto';
        this.#empty.className = 'error';
        emit(this, 'iswc-error', { reason: (e as { reason?: string })?.reason || 'fetch' });
      }
    }
  }
  defineElement('iswc-txt-view', IswcTxtView);
})();
