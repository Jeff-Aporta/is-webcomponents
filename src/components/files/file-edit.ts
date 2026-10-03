import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setOptionalAttr, setStringAttr } from '../_shared/reflect.js';
import { resolveDispatch } from './_shared/mime-map.js';

(() => {
  const MODE = 'edit' as const;
  const OBSERVED = ['src', 'content', 'type', 'name', 'height'];

  const MODULES: Record<string, () => Promise<unknown>> = {
    'iswc-txt-view': () => import('./txt-view.js'),
    'iswc-txt-edit': () => import('./txt-edit.js'),
    'iswc-csv-view': () => import('./csv-view.js'),
    'iswc-csv-edit': () => import('./csv-edit.js'),
    'iswc-docx-view': () => import('./docx-view.js'),
    'iswc-pptx-view': () => import('./pptx-view.js'),
    'iswc-pdf-viewer': () => import('../overlays/pdf-viewer.js'),
  };

  class IswcFileEdit extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }
    #stage!: HTMLElement;
    #gen = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<div class="root" part="root"><div class="stage" part="stage"></div></div>`;
      adoptCss(shadow, import.meta.url);
      this.#stage = shadow.querySelector('.stage')!;
    }

    onConnected() { this.#mount(); }
    onAttributeChanged() { this.#mount(); }

    get src() { return this.getAttribute('src'); }
    set src(v) { setOptionalAttr(this, 'src', v); }
    get content() { return this.getAttribute('content') ?? ''; }
    set content(v) { setStringAttr(this, 'content', v); }
    get type() { return this.getAttribute('type') ?? ''; }
    set type(v) { setStringAttr(this, 'type', v); }
    get name() { return this.getAttribute('name') ?? ''; }
    set name(v) { setStringAttr(this, 'name', v); }

    async #mount() {
      const gen = ++this.#gen;
      const d = resolveDispatch({
        type: this.getAttribute('type'),
        name: this.getAttribute('name'),
        src: this.getAttribute('src'),
        mode: MODE,
      });
      this.#stage.replaceChildren();
      if (d.unsupported || !d.tag) {
        const p = document.createElement('p');
        p.className = 'error';
        p.setAttribute('part', 'error');
        p.textContent = 'Este tipo de archivo no admite edicion en el kit';
        this.#stage.append(p);
        emit(this, 'iswc-error', { reason: 'unsupported', kind: d.kind });
        return;
      }
      const loader = MODULES[d.tag];
      if (loader) await loader();
      if (gen !== this.#gen) return;
      await customElements.whenDefined(d.tag);
      if (gen !== this.#gen) return;
      const el = document.createElement(d.tag);
      const src = this.getAttribute('src');
      const content = this.getAttribute('content');
      const height = this.getAttribute('height');
      if (src) el.setAttribute('src', src);
      if (content != null && content !== '') el.setAttribute('content', content);
      if (height) el.setAttribute('height', height);
      el.addEventListener('iswc-load', (ev) => emit(this, 'iswc-load', (ev as CustomEvent).detail));
      el.addEventListener('iswc-error', (ev) => emit(this, 'iswc-error', (ev as CustomEvent).detail));
      el.addEventListener('iswc-change', (ev) => emit(this, 'iswc-change', (ev as CustomEvent).detail));
      this.#stage.append(el);
      emit(this, 'iswc-dispatch', { tag: d.tag, kind: d.kind, mode: MODE });
    }
  }
  defineElement('iswc-file-edit', IswcFileEdit);
})();
