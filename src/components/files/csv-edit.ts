import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { setOptionalAttr, setStringAttr } from '@jeff-aporta/iswc-base/core/attrs.js';
import { escapeHtml } from '@jeff-aporta/iswc-base/core/dom.js';
import { loadText, resolveFileSource } from './utils/file-source.js';
import { pintarEstado, sincronizarAlto } from './utils/file-estado.js';
import { parseCsv, toCsv } from './utils/csv-parse.js';
import css from 'iswc:css';

(() => {
  const OBSERVED = ['src', 'content', 'height'];
  class IswcCsvEdit extends IswcElement {
    static tag = 'iswc-csv-edit';
    static css = css;
    static deps = ['iswc-button', 'iswc-icon'];
    static observed = OBSERVED;
    #stage!: HTMLElement;
    #rows: string[][] = [];
    #gen = 0;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.innerHTML = `
        <div class="root" part="root">
          <div class="toolbar" part="toolbar">
            <iswc-button part="add-row" data-accion="fila" variant="text" color="text"><iswc-icon slot="start" icon="mdi:table-row-plus-after" aria-hidden="true"></iswc-icon>Fila</iswc-button>
            <iswc-button part="add-column" data-accion="columna" variant="text" color="text"><iswc-icon slot="start" icon="mdi:table-column-plus-after" aria-hidden="true"></iswc-icon>Columna</iswc-button>
            <iswc-button part="remove-row" data-accion="quitar-fila" variant="text" color="text" aria-label="Quitar la última fila" title="Quitar la última fila"><iswc-icon slot="start" icon="mdi:table-row-remove" aria-hidden="true"></iswc-icon></iswc-button>
            <iswc-button part="remove-column" data-accion="quitar-columna" variant="text" color="text" aria-label="Quitar la última columna" title="Quitar la última columna"><iswc-icon slot="start" icon="mdi:table-column-remove" aria-hidden="true"></iswc-icon></iswc-button>
            <iswc-button class="exportar" part="export" data-accion="exportar" variant="outlined" color="text"><iswc-icon slot="start" icon="mdi:download" aria-hidden="true"></iswc-icon>Exportar CSV</iswc-button>
          </div>
          <div class="stage" part="stage"></div>
        </div>`;
      this.#stage = shadow.querySelector('.stage')!;
      shadow.querySelector('.toolbar')!.addEventListener('click', (ev) => {
        const accion = (ev.target as HTMLElement).closest<HTMLElement>('[data-accion]')?.dataset['accion'];
        if (accion === 'exportar') this.#export();
        else if (accion) this.#editar(accion);
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

    onConnected() { sincronizarAlto(this); this.#reload(); }
    onAttributeChanged(name: string) {
      if (name === 'height') { sincronizarAlto(this); return; }
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

    /** Agrega o quita la última fila o columna. */
    #editar(accion: string): void {
      const cols = this.#rows[0]?.length || 1;
      if (accion === 'fila') this.#rows.push(Array.from({ length: cols }, () => ''));
      else if (accion === 'columna') this.#rows.forEach((fila) => fila.push(''));
      else if (accion === 'quitar-fila') this.#rows.pop();
      else if (accion === 'quitar-columna' && cols > 1) this.#rows.forEach((fila) => fila.pop());
      this.#paint();
      this.#emitChange();
    }

    #export() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([toCsv(this.#rows)], { type: 'text/csv' }));
      a.download = 'data.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    }

    #paint() {
      if (!this.#rows.length) {
        pintarEstado(this.#stage, 'CSV vacío');
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
        pintarEstado(this.#stage, 'No se pudo cargar el CSV', 'error');
        emit(this, 'iswc-error', { reason: (e as { reason?: string })?.reason || 'fetch' });
      }
    }
  }
  define(IswcCsvEdit);
})();
