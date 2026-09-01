import { adoptCss, defineElement, emit } from '../../core/element.js';
import { escapeHtml } from '../_shared/dom-utils.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <is-spreadsheet> — Hoja de cálculo mínima con edición por celda y fórmulas.
 *
 * Atributos
 *   rows         número de filas inicial (default 20)
 *   cols         número de columnas inicial (default A-Z = 26)
 *   value        matriz de celdas: [[raw,...], ...]   raw = number | string | formula "=..."
 *   read-only    boolean
 *
 * Referencia de celda estilo A1: A=0, B=1, …, fila 1 = índice 0.
 *
 * Fórmulas soportadas (no distinguen mayúsculas):
 *   =SUM(rango)   =AVERAGE(rango)   =MIN(rango)   =MAX(rango)   =COUNT(rango)
 *   =SUM(A1..C5)  formas equivalentes: =SUM(A1:C5) y =SUM(A1,B2,C3)
 *   +, -, *, /    paréntesis, números negativos
 *
 * Atajos
 *   Enter         aceptar y bajar
 *   Tab / Shift+Tab  mover derecha / izquierda
 *   Esc           cancelar edición
 *
 * Eventos
 *   is-change     detail: { row, col, raw, value }
 *   is-select     detail: { row, col, value }
 */
(() => {
  const OBSERVED = ['rows', 'cols', 'value', 'read-only'];

  const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  class IsSpreadsheet extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }
    #data = [];     // matriz [rows][cols]: { raw, computed }
    #editing = null;
    #formulaCache = null;
    #table!: HTMLElement;
    #onDocKeydown;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root">
          <table part="grid" class="grid" role="grid"></table>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#table = this.shadowRoot!.querySelector<HTMLElement>('.grid')!;
      this.#table.addEventListener('click', (e) => this.#onClick(e));
      this.#table.addEventListener('keydown', (e) => this.#onKey(e));
      this.#onDocKeydown = (e) => {
        if (e.key === 'Escape' && this.#editing) this.#endEdit(false);
      };
    }

    onConnected() {
      this.#load();
      this.#render();
      document.addEventListener('keydown', this.#onDocKeydown);
    }

    onDisconnected() {
      document.removeEventListener('keydown', this.#onDocKeydown);
    }

    onAttributeChanged(name) {
      if (name === 'value') this.#load();
      this.#render();
    }

    #rowsCount() { return Number(this.getAttribute('rows')) || 20; }
    #colsCount() { return Number(this.getAttribute('cols')) || 26; }

    #load() {
      const r = this.#rowsCount();
      const c = this.#colsCount();
      const v = this.getAttribute('value');
      let parsed = null;
      if (v) {
        try { parsed = JSON.parse(v); } catch { parsed = null; }
      }
      this.#data = Array.from({ length: r }, (_, y) =>
        Array.from({ length: c }, (_, x) => ({
          raw: parsed?.[y]?.[x] ?? '',
          computed: '',
        }))
      );
      this.#formulaCache = null;
      this.#recompute();
    }

    #render() {
      const r = this.#data.length;
      // cabecera
      const head = ['<thead><tr><th class="corner"></th>'];
      for (let x = 0; x < this.#colsCount(); x++) head.push(`<th>${COLS[x]}</th>`);
      head.push('</tr></thead>');
      // cuerpo
      const rows = [];
      for (let y = 0; y < this.#data.length; y++) {
        rows.push(`<tr><th class="row-head">${y + 1}</th>`);
        for (let x = 0; x < this.#data[y].length; x++) {
          const id = `${COLS[x]}${y + 1}`;
          const v = this.#data[y][x];
          rows.push(`<td class="cell" data-r="${y}" data-c="${x}" data-id="${id}" tabindex="0">${escapeHtml(String(v.computed ?? ''))}</td>`);
        }
        rows.push('</tr>');
      }
      this.#table.innerHTML = `<colgroup>${'<col style="width:3rem">' + '<col>'.repeat(this.#colsCount())}</colgroup>${head.join('')}<tbody>${rows.join('')}</tbody>`;
    }

    #onClick(e) {
      const td = e.target.closest('td.cell');
      if (!td) return;
      const r = Number(td.dataset.r);
      const c = Number(td.dataset.c);
      this.#editing && this.#endEdit(true);
      this.#startEdit(r, c, td);
    }

    #onKey(e) {
      if (this.#editing) return;
      const td = e.target.closest('td.cell');
      if (!td) return;
      const r = Number(td.dataset.r);
      const c = Number(td.dataset.c);
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const next = move(this.#table, r, c, e.key);
        if (next) next.focus();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!this.#readOnly()) {
          this.#setCell(r, c, '');
        }
      } else if (e.key === 'Enter' || /^[a-zA-Z\-+0-9]$/.test(e.key)) {
        if (this.#readOnly()) return;
        if (e.key === 'Enter') e.preventDefault();
        this.#startEdit(r, c, td);
        this.#editing.value = e.key === 'Enter' ? '' : e.key;
      }
    }

    #startEdit(r: number, c: number, td) {
      if (this.#readOnly()) return;
      this.#editing = { r, c, td, original: this.#data[r][c].raw };
      this.#editing.input = document.createElement('input');
      this.#editing.input.type = 'text';
      this.#editing.input.value = String(this.#data[r][c].raw ?? '');
      this.#editing.input.className = 'cell-input';
      td.innerHTML = '';
      td.appendChild(this.#editing.input);
      this.#editing.input.focus();
      this.#editing.input.select();
      this.#editing.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.#endEdit(true); this.#move(r + 1, c); }
        else if (e.key === 'Tab') {
          e.preventDefault();
          this.#endEdit(true);
          this.#move(r, e.shiftKey ? c - 1 : c + 1);
        } else if (e.key === 'Escape') { e.preventDefault(); this.#endEdit(false); }
      });
    }

    #endEdit(commit) {
      if (!this.#editing) return;
      const { r, c, td, input, original } = this.#editing;
      const raw = commit ? input.value : original;
      this.#editing = null;
      this.#setCell(r, c, raw);
    }

    #setCell(r, c, raw) {
      this.#data[r][c].raw = raw ?? '';
      this.#formulaCache = null;
      this.#recompute();
      this.#render();
      emit(this, 'is-change', { row: r, col: c, raw, value: this.#data[r][c].computed });
    }

    #move(r: number, c: number) {
      r = Math.max(0, Math.min(this.#data.length - 1, r));
      c = Math.max(0, Math.min(this.#data[0].length - 1, c));
      const td = this.#table.querySelector<HTMLElement>(`td.cell[data-r="${r}"][data-c="${c}"]`);
      if (td) td.focus();
    }

    #readOnly() { return this.hasAttribute('read-only') || this.hasAttribute('readonly'); }

    #recompute() {
      if (this.#formulaCache) this.#recomputeFormula();
      else this.#recomputeAll();
    }

    #recomputeAll() {
      this.#formulaCache = new Map();
      for (let y = 0; y < this.#data.length; y++) {
        for (let x = 0; x < this.#data[y].length; x++) {
          const v = this.#eval(y, x);
          this.#data[y][x].computed = v;
        }
      }
    }

    #recomputeFormula() {
      this.#formulaCache = new Map();
      for (let y = 0; y < this.#data.length; y++) {
        for (let x = 0; x < this.#data[y].length; x++) {
          if (this.#isFormula(this.#data[y][x].raw)) {
            const v = this.#eval(y, x);
            this.#data[y][x].computed = v;
          }
        }
      }
      // asegurar también los no-formula que referencia fórmula en una fórmula
      for (let y = 0; y < this.#data.length; y++) {
        for (let x = 0; x < this.#data[y].length; x++) {
          if (!this.#isFormula(this.#data[y][x].raw)) this.#data[y][x].computed = this.#data[y][x].raw;
        }
      }
    }

    #isFormula(s) { return typeof s === 'string' && s.trimStart().startsWith('='); }

    #eval(row, col) {
      const cell = this.#data[row][col];
      if (!this.#isFormula(cell.raw)) return cell.raw;
      const key = `${row},${col}`;
      if (this.#formulaCache.has(key)) return this.#formulaCache.get(key);
      this.#formulaCache.set(key, '#CYCLE');
      try {
        const expr = cell.raw.slice(1).toUpperCase().replace(/[^A-Z0-9(),:\-+*/.\s]/g, '');
        const result = evalExpr(expr, this.#data, row, col);
        if (typeof result === 'number') {
          this.#formulaCache.set(key, result);
          return result;
        }
        this.#formulaCache.set(key, '#ERR');
        return '#ERR';
      } catch {
        this.#formulaCache.set(key, '#ERR');
        return '#ERR';
      }
    }
  }

  function move(table, r: number, c: number, key) {
    const step = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[key];
    const nr = r + step[0];
    const nc = c + step[1];
    return table.querySelector<HTMLElement>(`td.cell[data-r="${Math.max(0, nr)}"][data-c="${Math.max(0, nc)}"]`);
  }

  function evalExpr(expr, data, row, col) {
    // FUNCIONES: SUM, AVERAGE, MIN, MAX, COUNT con RANGE o lista de celdas.
    let s = expr;
    s = s.replace(/([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/g, (_, c1, r1, c2, r2) => {
      const list = expandRange(c1, r1, c2, r2);
      return list.map(([x, y]) => `__VAL(${x},${y})`).join(',');
    });
    s = s.replace(/\bSUM\(/g, 'sumArr([').replace(/\bAVERAGE\(/g, 'avgArr([')
     .replace(/\bMIN\(/g, 'minArr([').replace(/\bMAX\(/g, 'maxArr([').replace(/\bCOUNT\(/g, 'countArr([');
    let depth = 0;
    s = s.replace(/\(/g, (m) => {
      if (s[s.indexOf(m) - 1] === 'r') return m;
      depth++;
      return m;
    });
    // cierre de cada llamada a sumArr (la lógica real vive abajo)
    // s = s.replace(/\](\s*[+\-*/])/g, '])+'.slice(2); // noop; handled below
    // Reemplazo manual: cada cierre de paréntesis que sigue a ] cierra la lista.
    // Simplificación: reemplazo recursivo inverso.
    s = (function close(s) {
      let out = '';
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === ')' && s[i - 1] === ']') {
          // buscar el último "sumArr([" sin cerrar
          const lastOpen = out.lastIndexOf('([');
          if (lastOpen > -1) {
            out = out.slice(0, lastOpen) + '(' + out.slice(lastOpen + 2) + '])';
            continue;
          }
        }
        out += c;
      }
      return out;
    })(s);
    // nuestra VM: __VAL(x,y) → numeric del data, comas de args → array
    const fn = new Function('__VAL', 'sumArr', 'avgArr', 'minArr', 'maxArr', 'countArr',
      `try { return (${s}); } catch { return '#ERR'; }`);
    return fn(
      (x, y) => Number(data?.[y]?.[x]?.computed) || 0,
      (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0),
      (arr) => arr.length ? arr.reduce((a, b) => a + (Number(b) || 0), 0) / arr.length : 0,
      (arr) => arr.length ? Math.min(...arr.map(Number)) : 0,
      (arr) => arr.length ? Math.max(...arr.map(Number)) : 0,
      (arr) => arr.filter((v) => Number.isFinite(Number(v))).length,
    );
  }

  function expandRange(c1, r1, c2, r2) {
    if (!c2) return [[letterToIndex(c1), Number(r1) - 1]];
    const x1 = letterToIndex(c1), x2 = letterToIndex(c2);
    const y1 = Number(r1) - 1, y2 = Number(r2) - 1;
    const out = [];
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) out.push([x, y]);
    }
    return out;
  }

  function letterToIndex(letters: string) {
    let n = 0;
    for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }

  defineElement('is-spreadsheet', IsSpreadsheet);
})();
