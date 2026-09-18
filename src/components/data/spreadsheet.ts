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

  /** Mapa tecla-flecha → desplazamiento [dr, dc]. */
  const ARROW_KEYS: Record<string, readonly [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };

  /** Una celda de la hoja. */
  interface Cell {
    raw: string | number;
    computed: string | number;
  }

  /** Una fila de la hoja. */
  type Row = Cell[];

  /** La matriz completa de la hoja (rows × cols). */
  type Data = Row[];

  /** Estado del editor inline de una celda. */
  interface Editing {
    r: number;
    c: number;
    td: HTMLElement;
    original: string | number;
    input: HTMLInputElement;
  }

  /** Cache de evaluación de fórmulas (clave `"row,col"` → resultado). */
  type FormulaCache = Map<string, string | number>;

  /** Detalle del evento `is-change` y `is-select`. */
  interface CellEventDetail {
    row: number;
    col: number;
    raw: string | number;
    value: string | number;
  }

  class IsSpreadsheet extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }
    #data: Data = [];
    #editing: Editing | null = null;
    #formulaCache: FormulaCache | null = null;
    #table!: HTMLElement;
    #onDocKeydown: (e: KeyboardEvent) => void;

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
      this.#table.addEventListener('click', this.#onClick);
      this.#table.addEventListener('keydown', this.#onKey);
      this.#onDocKeydown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && this.#editing) this.#endEdit(false);
      };
    }

    onConnected(): void {
      this.#load();
      this.#render();
      document.addEventListener('keydown', this.#onDocKeydown);
    }

    onDisconnected(): void {
      document.removeEventListener('keydown', this.#onDocKeydown);
    }

    onAttributeChanged(name: string): void {
      if (name === 'value') this.#load();
      this.#render();
    }

    #rowsCount(): number { return Number(this.getAttribute('rows')) || 20; }
    #colsCount(): number { return Number(this.getAttribute('cols')) || 26; }

    #load(): void {
      const r = this.#rowsCount();
      const c = this.#colsCount();
      const v = this.getAttribute('value');
      let parsed: unknown = null;
      if (v) {
        try { parsed = JSON.parse(v); } catch { parsed = null; }
      }
      const source = Array.isArray(parsed) ? parsed : [];
      this.#data = Array.from({ length: r }, (_, y: number): Row =>
        Array.from({ length: c }, (_, x: number): Cell => ({
          raw: readCellValue(source, y, x),
          computed: '',
        }))
      );
      this.#formulaCache = null;
      this.#recompute();
    }

    #render(): void {
      const colsCount = this.#colsCount();
      // cabecera
      const head = ['<thead><tr><th class="corner"></th>'];
      for (let x = 0; x < colsCount; x++) head.push(`<th>${COLS[x]}</th>`);
      head.push('</tr></thead>');
      // cuerpo
      const rows: string[] = [];
      for (let y = 0; y < this.#data.length; y++) {
        rows.push(`<tr><th class="row-head">${y + 1}</th>`);
        const row = this.#data[y];
        for (let x = 0; x < row.length; x++) {
          const id = `${COLS[x]}${y + 1}`;
          const v = row[x];
          rows.push(`<td class="cell" data-r="${y}" data-c="${x}" data-id="${id}" tabindex="0">${escapeHtml(v.computed)}</td>`);
        }
        rows.push('</tr>');
      }
      this.#table.innerHTML = `<colgroup>${'<col style="width:3rem">' + '<col>'.repeat(colsCount)}</colgroup>${head.join('')}<tbody>${rows.join('')}</tbody>`;
    }

    #onClick = (e: MouseEvent): void => {
      const target = e.target as Element | null;
      if (!target) return;
      const td = target.closest('td.cell');
      if (!(td instanceof HTMLElement)) return;
      const r = Number(td.dataset.r);
      const c = Number(td.dataset.c);
      if (this.#editing) this.#endEdit(true);
      this.#startEdit(r, c, td);
    };

    #onKey = (e: KeyboardEvent): void => {
      if (this.#editing) return;
      const target = e.target as Element | null;
      if (!target) return;
      const td = target.closest('td.cell');
      if (!(td instanceof HTMLElement)) return;
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
        const editing = this.#startEdit(r, c, td);
        if (editing) editing.input.value = e.key === 'Enter' ? '' : e.key;
      }
    };

    #startEdit(r: number, c: number, td: HTMLElement): Editing | null {
      if (this.#readOnly()) return null;
      const cell = this.#data[r][c];
      const editing: Editing = {
        r,
        c,
        td,
        original: cell.raw,
        input: document.createElement('input'),
      };
      editing.input.type = 'text';
      editing.input.value = String(cell.raw ?? '');
      editing.input.className = 'cell-input';
      td.innerHTML = '';
      td.appendChild(editing.input);
      editing.input.focus();
      editing.input.select();
      editing.input.addEventListener('keydown', (e: KeyboardEvent): void => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.#endEdit(true);
          this.#move(r + 1, c);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          this.#endEdit(true);
          this.#move(r, e.shiftKey ? c - 1 : c + 1);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.#endEdit(false);
        }
      });
      this.#editing = editing;
      return editing;
    }

    #endEdit(commit: boolean): void {
      if (!this.#editing) return;
      const { r, c, td, input, original } = this.#editing;
      const raw: string | number = commit ? input.value : original;
      td.innerHTML = '';
      this.#editing = null;
      this.#setCell(r, c, raw);
    }

    #setCell(r: number, c: number, raw: string | number): void {
      const cell = this.#data[r][c];
      cell.raw = raw ?? '';
      this.#formulaCache = null;
      this.#recompute();
      this.#render();
      const detail: CellEventDetail = { row: r, col: c, raw, value: cell.computed };
      emit(this, 'is-change', detail);
    }

    #move(r: number, c: number): void {
      const lastRow = this.#data.length - 1;
      const lastCol = this.#data[0]?.length ? this.#data[0].length - 1 : 0;
      const cr = Math.max(0, Math.min(lastRow, r));
      const cc = Math.max(0, Math.min(lastCol, c));
      const td = this.#table.querySelector<HTMLElement>(`td.cell[data-r="${cr}"][data-c="${cc}"]`);
      if (td) td.focus();
    }

    #readOnly(): boolean { return this.hasAttribute('read-only') || this.hasAttribute('readonly'); }

    #recompute(): void {
      if (this.#formulaCache) this.#recomputeFormula();
      else this.#recomputeAll();
    }

    #recomputeAll(): void {
      this.#formulaCache = new Map<string, string | number>();
      for (let y = 0; y < this.#data.length; y++) {
        const row = this.#data[y];
        for (let x = 0; x < row.length; x++) {
          row[x].computed = this.#eval(y, x);
        }
      }
    }

    #recomputeFormula(): void {
      this.#formulaCache = new Map<string, string | number>();
      for (let y = 0; y < this.#data.length; y++) {
        const row = this.#data[y];
        for (let x = 0; x < row.length; x++) {
          if (this.#isFormula(row[x].raw)) {
            row[x].computed = this.#eval(y, x);
          }
        }
      }
      // asegurar también los no-formula que referencia fórmula en una fórmula
      for (let y = 0; y < this.#data.length; y++) {
        const row = this.#data[y];
        for (let x = 0; x < row.length; x++) {
          if (!this.#isFormula(row[x].raw)) row[x].computed = row[x].raw;
        }
      }
    }

    #isFormula(s: string | number): boolean {
      return typeof s === 'string' && s.trimStart().startsWith('=');
    }

    #eval(row: number, col: number): string | number {
      const cell = this.#data[row][col];
      if (!this.#isFormula(cell.raw)) return cell.raw;
      const cache = this.#formulaCache ?? (this.#formulaCache = new Map<string, string | number>());
      const key = `${row},${col}`;
      if (cache.has(key)) return cache.get(key) as string | number;
      cache.set(key, '#CYCLE');
      try {
        const rawStr = String(cell.raw).slice(1).toUpperCase().replace(/[^A-Z0-9(),:\-+*/.\s]/g, '');
        const result = evalExpr(rawStr, this.#data, row, col);
        if (typeof result === 'number') {
          cache.set(key, result);
          return result;
        }
        cache.set(key, '#ERR');
        return '#ERR';
      } catch {
        cache.set(key, '#ERR');
        return '#ERR';
      }
    }
  }

  /**
   * Lee una celda del JSON parseado: `parsed[y][x]`, con defensa frente a
   * entradas mal formadas.
   */
  function readCellValue(parsed: unknown, y: number, x: number): string | number {
    if (!Array.isArray(parsed)) return '';
    const row = parsed[y];
    if (!Array.isArray(row)) return '';
    const value = row[x];
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return value;
    return String(value);
  }

  /** Devuelve la celda adyacente (o null) en función de la flecha pulsada. */
  function move(table: HTMLElement, r: number, c: number, key: string): HTMLElement | null {
    const step = ARROW_KEYS[key];
    if (!step) return null;
    const nr = Math.max(0, r + step[0]);
    const nc = Math.max(0, c + step[1]);
    return table.querySelector<HTMLElement>(`td.cell[data-r="${nr}"][data-c="${nc}"]`);
  }

  /**
   * Evalúa una expresión de fórmula (pre-sanitizada) contra la matriz.
   * Devuelve un número si la expresión es válida, o `#ERR` en caso contrario.
   */
  function evalExpr(expr: string, data: Data, row: number, col: number): string | number {
    // FUNCIONES: SUM, AVERAGE, MIN, MAX, COUNT con RANGE o lista de celdas.
    let s = expr;
    s = s.replace(/([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/g, (_match: string, c1: string, r1: string, c2: string | undefined, r2: string | undefined): string => {
      const list = expandRange(c1, r1, c2, r2);
      return list.map(([x, y]: readonly [number, number]) => `__VAL(${x},${y})`).join(',');
    });
    s = s.replace(/\bSUM\(/g, 'sumArr([')
     .replace(/\bAVERAGE\(/g, 'avgArr([')
     .replace(/\bMIN\(/g, 'minArr([')
     .replace(/\bMAX\(/g, 'maxArr([')
     .replace(/\bCOUNT\(/g, 'countArr([');
    // cierre de cada llamada a sumArr (la lógica real vive abajo)
    // s = s.replace(/\](\s*[+\-*/])/g, '])+'.slice(2); // noop; handled below
    // Reemplazo manual: cada cierre de paréntesis que sigue a ] cierra la lista.
    // Simplificación: reemplazo recursivo inverso.
    s = (function close(input: string): string {
      let out = '';
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === ')' && input[i - 1] === ']') {
          // buscar el último "sumArr([" sin cerrar
          const lastOpen = out.lastIndexOf('([');
          if (lastOpen > -1) {
            out = out.slice(0, lastOpen) + '(' + out.slice(lastOpen + 2) + '])';
            continue;
          }
        }
        out += ch;
      }
      return out;
    })(s);
    // nuestra VM: __VAL(x,y) → numeric del data, comas de args → array
    const fn = new Function('__VAL', 'sumArr', 'avgArr', 'minArr', 'maxArr', 'countArr',
      `try { return (${s}); } catch { return '#ERR'; }`);
    return fn(
      (x: number, y: number): number => Number(data?.[y]?.[x]?.computed) || 0,
      (arr: unknown[]): number => arr.reduce((a: number, b: unknown) => a + (Number(b) || 0), 0),
      (arr: unknown[]): number => arr.length ? arr.reduce((a: number, b: unknown) => a + (Number(b) || 0), 0) / arr.length : 0,
      (arr: unknown[]): number => arr.length ? Math.min(...arr.map(Number)) : 0,
      (arr: unknown[]): number => arr.length ? Math.max(...arr.map(Number)) : 0,
      (arr: unknown[]): number => arr.filter((v: unknown) => Number.isFinite(Number(v))).length,
    );
  }

  /** Expande `A1..B3` (con o sin `c2`) en la lista de coordenadas `[x,y]`. */
  function expandRange(c1: string, r1: string, c2: string | undefined, r2: string | undefined): Array<readonly [number, number]> {
    if (!c2) return [[letterToIndex(c1), Number(r1) - 1]];
    const x1 = letterToIndex(c1), x2 = letterToIndex(c2);
    const y1 = Number(r1) - 1, y2 = Number(r2) - 1;
    const out: Array<readonly [number, number]> = [];
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) out.push([x, y]);
    }
    return out;
  }

  /** Convierte referencia A1 ("A" = 0, "AA" = 26, etc.) a índice de columna. */
  function letterToIndex(letters: string): number {
    let n = 0;
    for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }

  defineElement('is-spreadsheet', IsSpreadsheet);
})();