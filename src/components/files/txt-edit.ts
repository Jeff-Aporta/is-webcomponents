import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setOptionalAttr, setStringAttr } from '../_shared/reflect.js';
import { loadText, resolveFileSource } from './_shared/file-source.js';

(() => {
  const OBSERVED = ['src', 'content', 'height', 'readonly'];
  class IswcTxtEdit extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }
    #ta!: HTMLTextAreaElement;
    #gen = 0;
    #suppress = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <div class="root" part="root">
          <textarea class="body" part="editor" spellcheck="false" aria-label="Editor de texto"></textarea>
        </div>`;
      adoptCss(shadow, import.meta.url);
      this.#ta = shadow.querySelector('textarea')!;
      this.#ta.addEventListener('input', () => {
        if (this.#suppress) return;
        setStringAttr(this, 'content', this.#ta.value);
        emit(this, 'iswc-change', { value: this.#ta.value });
      });
    }

    onConnected() { this.#reload(); this.#syncRo(); }
    onAttributeChanged(name: string) {
      if (name === 'readonly') this.#syncRo();
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
    set height(v) {
      setOptionalAttr(this, 'height', v);
      if (v) this.style.setProperty('--iswc-file-height', String(v));
      else this.style.removeProperty('--iswc-file-height');
    }

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
  defineElement('iswc-txt-edit', IswcTxtEdit);
})();
