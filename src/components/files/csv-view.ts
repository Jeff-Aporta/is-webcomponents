import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setOptionalAttr, setStringAttr } from '../_shared/reflect.js';
import { escapeHtml } from '../_shared/dom-utils.js';
import { loadText, resolveFileSource } from './_shared/file-source.js';
import { parseCsv } from './_shared/csv-parse.js';

(() => {
  const OBSERVED = ['src', 'content', 'height'];
  class IswcCsvView extends ElementBase {
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
        this.#stage.innerHTML = '<p class="empty" part="empty">Sin CSV</p>';
        return;
      }
      try {
        const text = await loadText(source);
        if (gen !== this.#gen) return;
        const rows = parseCsv(text);
        if (!rows.length) {
          this.#stage.innerHTML = '<p class="empty">CSV vacio</p>';
          emit(this, 'iswc-load', { rows: 0 });
          return;
        }
        const head = rows[0];
        const body = rows.slice(1);
        this.#stage.innerHTML = `<table class="csv" part="table">
          <thead><tr>${head.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${body.map((r) => `<tr>${head.map((_, i) => `<td>${escapeHtml(r[i] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>`;
        emit(this, 'iswc-load', { rows: rows.length });
      } catch (e) {
        if (gen !== this.#gen) return;
        this.#stage.innerHTML = '<p class="error">No se pudo cargar el CSV</p>';
        emit(this, 'iswc-error', { reason: (e as { reason?: string })?.reason || 'fetch' });
      }
    }
  }
  defineElement('iswc-csv-view', IswcCsvView);
})();
