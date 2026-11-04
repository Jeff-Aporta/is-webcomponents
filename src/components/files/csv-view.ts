import { emit } from '@jeff-aporta/iswc-base/core/element.js';
import { setOptionalAttr, setStringAttr } from '@jeff-aporta/iswc-base/core/reflect.js';
import { escapeHtml } from '@jeff-aporta/iswc-base/core/dom-utils.js';
import { loadText, resolveFileSource } from './utils/file-source.js';
import { pintarEstado, sincronizarAlto } from './utils/file-estado.js';
import { parseCsv } from './utils/csv-parse.js';
import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import css from 'iswc:css';

(() => {
  const OBSERVED = ['src', 'content', 'height'];
  class IswcCsvView extends IswcElement {
    static tag = 'iswc-csv-view';
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

    onConnected() { sincronizarAlto(this); this.#reload(); }
    onAttributeChanged() { sincronizarAlto(this); this.#reload(); }

    get src() { return this.getAttribute('src'); }
    set src(v) { setOptionalAttr(this, 'src', v); }
    get content() { return this.getAttribute('content') ?? ''; }
    set content(v) { setStringAttr(this, 'content', v); }

    async #reload() {
      const gen = ++this.#gen;
      const source = resolveFileSource(this.getAttribute('src'), this.getAttribute('content'));
      if (source.kind === 'empty') {
        pintarEstado(this.#stage, 'Sin CSV');
        return;
      }
      try {
        const text = await loadText(source);
        if (gen !== this.#gen) return;
        const rows = parseCsv(text);
        if (!rows.length) {
          pintarEstado(this.#stage, 'CSV vacío');
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
        pintarEstado(this.#stage, 'No se pudo cargar el CSV', 'error');
        emit(this, 'iswc-error', { reason: (e as { reason?: string })?.reason || 'fetch' });
      }
    }
  }
  define(IswcCsvView);
})();
