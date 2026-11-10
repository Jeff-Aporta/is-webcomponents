import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { setOptionalAttr, setStringAttr } from '@jeff-aporta/iswc-base/core/attrs.js';
import { loadText, resolveFileSource } from './utils/file-source.js';
import { sincronizarAlto } from './utils/file-estado.js';
import css from 'iswc:css';

(() => {
  const OBSERVED = ['src', 'content', 'height', 'readonly'];
  class IswcTxtEdit extends IswcElement {
    static override tag = 'iswc-txt-edit';
    static override css = css;
    static override observed = OBSERVED;
    #ta!: HTMLTextAreaElement;
    #gen = 0;
    #suppress = false;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.innerHTML = `
        <div class="root" part="root">
          <textarea class="body" part="editor" spellcheck="false" aria-label="Editor de texto"></textarea>
        </div>`;
      this.#ta = shadow.querySelector('textarea')!;
      this.#ta.addEventListener('input', () => {
        if (this.#suppress) return;
        setStringAttr(this, 'content', this.#ta.value);
        emit(this, 'iswc-change', { value: this.#ta.value });
      });
    }

    override onConnected() { sincronizarAlto(this); this.#reload(); this.#syncRo(); }
    override onAttributeChanged(name: string) {
      if (name === 'height') sincronizarAlto(this);
      else if (name === 'readonly') this.#syncRo();
      else if (name === 'content' && this.#ta.value === (this.getAttribute('content') ?? '')) return;
      else this.#reload();
    }

    get src() { return this.getAttribute('src'); }
    set src(v) { setOptionalAttr(this, 'src', v); }
    get content() { return this.#ta?.value ?? this.getAttribute('content') ?? ''; }
    set content(v) { setStringAttr(this, 'content', v); }
    get value() { return this.content; }
    set value(v: string) { this.content = v; }
    get height() { return this.getAttribute('height') ?? ''; }
    set height(v) { setOptionalAttr(this, 'height', v); }

    #syncRo() { this.#ta.readOnly = this.hasAttribute('readonly'); }

    async #reload() {
      const gen = ++this.#gen;
      const source = resolveFileSource(this.getAttribute('src'), this.getAttribute('content'));
      try {
        const text = source.kind === 'empty' ? '' : await loadText(source);
        if (gen !== this.#gen) return;
        this.#suppress = true;
        this.#ta.value = text;
        this.#suppress = false;
        emit(this, 'iswc-load', { bytes: text.length });
      } catch (e) {
        if (gen !== this.#gen) return;
        emit(this, 'iswc-error', { reason: (e as { reason?: string })?.reason || 'fetch' });
      }
    }
  }
  define(IswcTxtEdit);
})();
