import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { ElementBase } from '../_shared/element-base.js';
import { emit } from '../_shared/emit.js';

/**
 * <is-pivot-table> — Pivot table: agrupar una colección por `rows` × `cols`,
 * agregar `measure` con `agg`. Sin recarga, todo en cliente.
 *
 * Atributos
 *   rows    nombre del campo para filas      (requerido)
 *   cols    nombre del campo para columnas   (requerido)
 *   measure nombre del campo a agregar       (default = cuenta filas)
 *   agg     sum (default) | avg | count | min | max
 *   format  es-CO (Intl.NumberFormat locale) — default 'es-CO'
 *   decimals dígitos (default 0)
 *
 * Datos
 *   <script type="application/json">[{...}, ...]</script>
 *
 * Eventos
 *   is-cell-click    detail: { row, col, value }
 */
(() => {
  const OBSERVED = ['rows', 'cols', 'measure', 'agg', 'format', 'decimals'];

  const AGG_FNS = {
    sum: (vs) => vs.reduce((a, b) => a + b, 0),
    avg: (vs) => vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0,
    count: (vs) => vs.length,
    min: (vs) => Math.min(...vs),
    max: (vs) => Math.max(...vs),
  };

  class IsPivotTable extends ElementBase {
    static get observedAttributes() { return OBSERVED; }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <div part="root" class="root">
          <table part="table" class="pivot" role="table"></table>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
    }

    onConnected() {
      this.#readData();
      this.#render();
    }

    onAttributeChanged() {
      this.#render();
    }

    #readData() {
      const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
      if (!script) { this.#data = []; return; }
      try { this.#data = JSON.parse(script.textContent); }
      catch { this.#data = []; }
    }

    #render() {
      const data = this.#data || [];
      const rowsField = this.getAttribute('rows');
      const colsField = this.getAttribute('cols');
      const measure = this.getAttribute('measure');
      const agg = AGG_FNS[this.getAttribute('agg') || 'sum'] || AGG_FNS.sum;
      const fmt = new Intl.NumberFormat(this.getAttribute('format') || 'es-CO', {
        minimumFractionDigits: Number(this.getAttribute('decimals')) || 0,
        maximumFractionDigits: Number(this.getAttribute('decimals')) || 2,
      });

      const table = this.shadowRoot.querySelector('.pivot');
      table.innerHTML = '';
      if (!rowsField || !colsField) {
        table.innerHTML = `<tfoot><tr><td class="empty">Faltan <code>rows</code> o <code>cols</code></td></tr></tfoot>`;
        return;
      }
      if (!data.length) {
        table.innerHTML = `<tfoot><tr><td class="empty">Sin datos</td></tr></tfoot>`;
        return;
      }

      // agrupar
      const rowVals = [...new Set(data.map((d) => d[rowsField]))];
      const colVals = [...new Set(data.map((d) => d[colsField]))];
      const buckets = new Map();
      for (const r of data) {
        const k = `${r[rowsField]}__${r[colsField]}`;
        if (!buckets.has(k)) buckets.set(k, []);
        if (measure == null) buckets.get(k).push(1);
        else buckets.get(k).push(Number(r[measure]) || 0);
      }
      const totals = { rows: new Map(), cols: new Map(), grand: [] };
      for (const r of rowVals) totals.rows.set(r, []);
      for (const c of colVals) totals.cols.set(c, []);
      for (const r of rowVals) {
        for (const c of colVals) {
          const k = `${r}__${c}`;
          const v = (buckets.get(k) || []).length ? agg(buckets.get(k)) : null;
          this.#cellMap = this.#cellMap || new Map();
          this.#cellMap.set(k, v);
          if (v != null && Number.isFinite(v)) {
            totals.rows.get(r).push(v);
            totals.cols.get(c).push(v);
            totals.grand.push(v);
          }
        }
      }
      // totales agregados
      const rowTotals = {};
      for (const r of rowVals) rowTotals[r] = totals.rows.get(r).length ? agg(totals.rows.get(r)) : null;
      const colTotals = {};
      for (const c of colVals) colTotals[c] = totals.cols.get(c).length ? agg(totals.cols.get(c)) : null;
      const grand = totals.grand.length ? agg(totals.grand) : null;

      // construir tabla
      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      trh.appendChild(th(rowsField, 'corner'));
      for (const c of colVals) trh.appendChild(th(String(c)));
      trh.appendChild(th('Total', 'total'));
      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (const r of rowVals) {
        const tr = document.createElement('tr');
        tr.appendChild(td(String(r), 'row-head'));
        for (const c of colVals) {
          const v = this.#cellMap.get(`${r}__${c}`);
          tr.appendChild(this.#cellEl(r, c, v, fmt));
        }
        tr.appendChild(td(rowTotals[r] != null ? fmt.format(rowTotals[r]) : '—', 'total'));
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);

      const tfoot = document.createElement('tfoot');
      const trf = document.createElement('tr');
      trf.appendChild(td('Total', 'row-head'));
      for (const c of colVals) trf.appendChild(td(colTotals[c] != null ? fmt.format(colTotals[c]) : '—', 'total'));
      trf.appendChild(td(grand != null ? fmt.format(grand) : '—', 'total'));
      tfoot.appendChild(trf);
      table.appendChild(tfoot);
    }

    #cellMap = new Map();
    #data = [];

    #cellEl(row, col, value, fmt) {
      const td = document.createElement('td');
      td.className = 'cell';
      td.dataset.row = row;
      td.dataset.col = col;
      td.dataset.value = value == null ? '' : String(value);
      td.textContent = value == null ? '—' : fmt.format(value);
      td.addEventListener('click', () => {
        emit(this, 'is-cell-click', { row, col, value });
      });
      return td;
    }
  }

  function th(text, cls = '') {
    const t = document.createElement('th');
    t.textContent = text;
    if (cls) t.className = cls;
    return t;
  }
  function td(text, cls = '') {
    const t = document.createElement('td');
    t.textContent = text;
    if (cls) t.className = cls;
    return t;
  }

  defineElement('is-pivot-table', IsPivotTable);
})();
