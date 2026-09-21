import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

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

  type AggInput = readonly number[] | number;
  const AGG_FNS: Record<string, (vs: AggInput) => number> = {
    sum: (vs) => (vs as readonly number[]).reduce((a, b) => a + b, 0),
    avg: (vs) => {
      const arr = vs as readonly number[];
      return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    },
    count: (vs) => (vs as readonly number[]).length,
    min: (vs) => Math.min(...(vs as readonly number[])),
    max: (vs) => Math.max(...(vs as readonly number[])),
  };

  type Row = Record<string, unknown>;

  class IsPivotTable extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = `
        <div part="root" class="root">
          <table part="table" class="pivot" role="table"></table>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
    }

    onConnected() {
      this.#readData();
      this.#render();
    }

    onAttributeChanged() {
      this.#render();
    }

    #readData() {
      const script = [...this.children].find(
        (c): c is HTMLScriptElement => c.tagName === 'SCRIPT' && /json/i.test((c as HTMLScriptElement).type || ''),
      );
      if (!script) { this.#data = []; return; }
      try { this.#data = JSON.parse(script.textContent || '[]') as Row[]; }
      catch { this.#data = []; }
    }

    #render() {
      const data: Row[] = this.#data || [];
      const rowsField = this.getAttribute('rows');
      const colsField = this.getAttribute('cols');
      const measure = this.getAttribute('measure');
      const aggFnName = this.getAttribute('agg') || 'sum';
      const agg: (vs: AggInput) => number = AGG_FNS[aggFnName] || AGG_FNS.sum;
      const fmt = new Intl.NumberFormat(this.getAttribute('format') || 'es-CO', {
        minimumFractionDigits: Number(this.getAttribute('decimals')) || 0,
        maximumFractionDigits: Number(this.getAttribute('decimals')) || 2,
      });

      const table = this.shadowRoot!.querySelector<HTMLElement>('.pivot');
      if (!table) return;
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
      const rowVals: unknown[] = [...new Set(data.map((d) => d[rowsField]))];
      const colVals: unknown[] = [...new Set(data.map((d) => d[colsField]))];
      const buckets = new Map<string, number[]>();
      for (const r of data) {
        const k = `${String(r[rowsField])}__${String(r[colsField])}`;
        if (!buckets.has(k)) buckets.set(k, []);
        const arr = buckets.get(k);
        if (!arr) continue;
        if (measure == null) arr.push(1);
        else arr.push(Number(r[measure]) || 0);
      }
      const totals = { rows: new Map<string, number[]>(), cols: new Map<string, number[]>(), grand: [] as number[] };
      for (const r of rowVals) totals.rows.set(String(r), []);
      for (const c of colVals) totals.cols.set(String(c), []);
      for (const r of rowVals) {
        for (const c of colVals) {
          const k = `${String(r)}__${String(c)}`;
          const cellArr = buckets.get(k) ?? [];
          const v = cellArr.length ? agg(cellArr) : null;
          this.#cellMap = this.#cellMap || new Map();
          this.#cellMap.set(k, v);
          if (v != null && Number.isFinite(v)) {
            totals.rows.get(String(r))?.push(v);
            totals.cols.get(String(c))?.push(v);
            totals.grand.push(v);
          }
        }
      }
      // totales agregados
      const rowTotals: Record<string, number | null> = {};
      for (const r of rowVals) {
        const arr = totals.rows.get(String(r)) ?? [];
        rowTotals[String(r)] = arr.length ? agg(arr) : null;
      }
      const colTotals: Record<string, number | null> = {};
      for (const c of colVals) {
        const arr = totals.cols.get(String(c)) ?? [];
        colTotals[String(c)] = arr.length ? agg(arr) : null;
      }
      const grand: number | null = totals.grand.length ? agg(totals.grand) : null;

      // construir tabla
      const thead = document.createElement('thead');
      thead.setAttribute('role', 'rowgroup');
      const trh = document.createElement('tr');
      trh.setAttribute('role', 'row');
      trh.appendChild(th(rowsField, 'corner'));
      for (const c of colVals) trh.appendChild(th(String(c)));
      trh.appendChild(th('Total', 'total'));
      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      tbody.setAttribute('role', 'rowgroup');
      for (const r of rowVals) {
        const tr = document.createElement('tr');
        tr.setAttribute('role', 'row');
        tr.appendChild(td(String(r), 'row-head'));
        for (const c of colVals) {
          const v = this.#cellMap?.get(`${String(r)}__${String(c)}`) ?? null;
          tr.appendChild(this.#cellEl(String(r), String(c), v, fmt));
        }
        const rt = rowTotals[String(r)];
        tr.appendChild(td(rt != null ? fmt.format(rt) : '—', 'total'));
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);

      const tfoot = document.createElement('tfoot');
      tfoot.setAttribute('role', 'rowgroup');
      const trf = document.createElement('tr');
      trf.setAttribute('role', 'row');
      trf.appendChild(td('Total', 'row-head'));
      for (const c of colVals) {
        const ct = colTotals[String(c)];
        trf.appendChild(td(ct != null ? fmt.format(ct) : '—', 'total'));
      }
      trf.appendChild(td(grand != null ? fmt.format(grand) : '—', 'total'));
      tfoot.appendChild(trf);
      table.appendChild(tfoot);

      // aria-rowcount + aria-colcount para lectores de pantalla.
      const totalRows = rowVals.length + 2; // thead + body + tfoot
      table.setAttribute('aria-rowcount', String(totalRows));
      table.setAttribute('aria-colcount', String(colVals.length + 2));
      table.setAttribute('aria-label', `Tabla pivote de ${rowVals.length} filas por ${colVals.length} columnas, agregación ${aggFnName} de ${measure ?? 'filas'}`);
    }

    #cellMap: Map<string, number | null> | null = new Map();
    #data: Row[] = [];

    #cellEl(row: string, col: string, value: number | null, fmt: Intl.NumberFormat): HTMLElement {
      const td = document.createElement('td');
      td.className = 'cell';
      td.setAttribute('role', 'gridcell');
      td.dataset.row = row;
      td.dataset.col = col;
      td.dataset.value = value == null ? '' : String(value);
      td.textContent = value == null ? '—' : fmt.format(value);
      if (value != null) td.setAttribute('aria-label', `${row}, ${col}: ${fmt.format(value)}`);
      td.addEventListener('click', () => {
        emit(this, 'is-cell-click', { row, col, value });
      });
      return td;
    }
  }

  function th(text: string, cls: string = ''): HTMLElement {
    const t = document.createElement('th');
    t.setAttribute('role', 'columnheader');
    t.textContent = text;
    if (cls) t.className = cls;
    return t;
  }
  function td(text: string, cls: string = ''): HTMLElement {
    const t = document.createElement('td');
    t.textContent = text;
    if (cls) t.className = cls;
    return t;
  }

  defineElement('is-pivot-table', IsPivotTable);
})();
