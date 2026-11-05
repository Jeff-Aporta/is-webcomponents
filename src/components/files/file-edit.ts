import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { setOptionalAttr, setStringAttr } from '@jeff-aporta/iswc-base/core/attrs.js';
import { pintarEstado, sincronizarAlto } from './utils/file-estado.js';
import { resolveDispatch } from './utils/mime-map.js';
import css from 'iswc:css';

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
    'iswc-pdf-viewer': () => import('@jeff-aporta/iswc-base/components/overlays/pdf-viewer.js'),
  };

  class IswcFileEdit extends IswcElement {
    static tag = 'iswc-file-edit';
    static css = css;
    static observed = OBSERVED;
    #stage!: HTMLElement;
    #gen = 0;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.innerHTML = `<div class="root" part="root"><div class="stage" part="stage"></div></div>`;
      this.#stage = shadow.querySelector('.stage')!;
    }

    onConnected() { sincronizarAlto(this); this.#mount(); }
    onAttributeChanged() { sincronizarAlto(this); this.#mount(); }

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
        pintarEstado(this.#stage, 'Este tipo de archivo no admite edición en el kit', 'error');
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
  define(IswcFileEdit);
})();
