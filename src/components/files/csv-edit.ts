import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setOptionalAttr, setStringAttr } from '../_shared/reflect.js';
import { escapeHtml } from '../_shared/dom-utils.js';
import { loadText, resolveFileSource } from './_shared/file-source.js';
import { parseCsv, toCsv } from './_shared/csv-parse.js';

(() => {
  const OBSERVED = ['src', 'content', 'height'];
  class IswcCsvEdit extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }
    #stage!: HTMLElement;
    #rows: string[][] = [];
    #gen = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <div class="root" part="root">
          <div class="toolbar" part="toolbar">
            <button type="button" part="export" id="exp">Exportar CSV</button>
            <button type="button" part="add-row" id="add">+ fila</button>
          </div>
          <div class="stage" part="stage"></div>
        </div>`;
      adoptCss(shadow, import.meta.url);
      this.#stage = shadow.querySelector('.stage')!;
      shadow.getElementById('exp')!.addEventListener('click', () => this.#export());
      shadow.getElementById('add')!.addEventListener('click', () => {
        const cols = this.#rows[0]?.length || 1;
        this.#rows.push(Array.from({ length: cols }, () => ''));
        this.#paint();
        this.#emitChange();
      });
      this.#stage.addEventListener('input', (ev) => {
        const td = (ev.target as HTMLElement).closest('td');
        if (!td) return;
        const r = Number(td.getAttribute('data-r'));
        const c = Number(td.getAttribute('data-c'));
        if (!Number.isFinite(r) || !Number.isFinite(c)) return;
        this.#rows[r][c] = td.textContent ?? '';
        this.#emitChange();
      });
    }

    onConnected() { this.#reload(); }
    onAttributeChanged(name: string) {
      if (name === 'content' && this.content === (this.getAttribute('content') ?? '')) return;
      this.#reload();
    }

    get src() { return this.getAttribute('src'); }
    set src(v) { setOptionalAttr(this, 'src', v); }
    get content() { return toCsv(this.#rows); }
    set content(v) { setStringAttr(this, 'content', v); }
    get value() { return this.content; }

    #emitChange() {
      const csv = toCsv(this.#rows);
      setStringAttr(this, 'content', csv);
      emit(this, 'iswc-change', { value: csv, rows: this.#rows });
    }

    #export() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([toCsv(this.#rows)], { type: 'text/csv' }));
      a.download = 'data.csv';
      a.click();
    }

    #paint() {
      if (!this.#rows.length) {
        this.#stage.innerHTML = '<p class="empty">CSV vacio</p>';
        return;
      }
      this.#stage.innerHTML = `<table class="csv" part="table"><tbody>${
        this.#rows
          .map(
            (r, ri) =>
              `<tr>${r
                .map(
                  (c, ci) =>
                    `<td contenteditable="true" data-r="${ri}" data-c="${ci}">${escapeHtml(c)}</td>`,
                )
                .join('')}</tr>`,
          )
          .join('')
      }</tbody></table>`;
    }

    async #reload() {
      const gen = ++this.#gen;
      const source = resolveFileSource(this.getAttribute('src'), this.getAttribute('content'));
      try {
        const text = source.kind === 'empty' ? 'col1,col2\na,b' : await loadText(source);
        if (gen !== this.#gen) return;
        this.#rows = parseCsv(text);
        this.#paint();
        emit(this, 'iswc-load', { rows: this.#rows.length });
      } catch (e) {
        if (gen !== this.#gen) return;
        this.#stage.innerHTML = '<p class="error">No se pudo cargar el CSV</p>';
        emit(this, 'iswc-error', { reason: (e as { reason?: string })?.reason || 'fetch' });
      }
    }
  }
  defineElement('iswc-csv-edit', IswcCsvEdit);
})();
