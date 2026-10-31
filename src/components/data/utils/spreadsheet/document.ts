// document.ts — el libro como documento editable: estilos, combinaciones, reglas, gráficos y
// macros, con transacciones que dan deshacer/rehacer. Toda mutación pasa por aquí. Sin DOM.
import { cellName, colName, intersects, normalize, parseCell, parseRange, rangeName } from './address.js';
import type { Rect } from './address.js';
import { cellKey, Engine, keyCol, keyRow } from './engine.js';
import type { CellData, Sheet } from './engine.js';
import { flashFill, planFill } from './fill.js';
import type { FillSource } from './fill.js';
import { parseInput } from './input-parse.js';
import { formatValue, isDateFormat } from './numfmt.js';
import { isFormulaText } from './parser.js';
import { shiftFormula } from './rewrite.js';
import { CellError, compare, displayValue } from './values.js';
import type { Scalar } from './values.js';
import type { AutoFilter, BorderSide, CellDoc, CellStyle, CfRule, ChartDef, FilterColumn, MacroDef, SheetDoc, ValidationRule, WorkbookDoc } from '../../schemas/spreadsheet.schemas.js';

/** Datos de una hoja que no son celdas. */
export interface SheetExtras {
  colWidths: Map<number, number>; rowHeights: Map<number, number>;
  hiddenRows: Set<number>; hiddenCols: Set<number>; filterHidden: Set<number>;
  merges: Rect[]; freeze: { rows: number; cols: number };
  cf: CfRule[]; validations: ValidationRule[]; filter: AutoFilter | null; charts: ChartDef[];
  tabColor?: string; hidden: boolean; gridlines: boolean;
}

/** Clave de orden. */
export interface SortKey { col: number; desc?: boolean }

/** Partes pegables. */
export interface PasteOptions { mode?: 'all' | 'values' | 'formulas' | 'formats'; transpose?: boolean; move?: boolean }

/** Celda copiada. */
export interface ClipCell { r: number; c: number; cell?: CellData; value: Scalar }

/** Bloque copiado. */
export interface ClipBlock { sheet: number; rect: Rect; cells: ClipCell[]; styles: Map<number, CellStyle> }

/** Cambio de una celda dentro de una transacción. */
interface CellPatch { sheet: Sheet; key: number; before?: CellData; after?: CellData }

/** Foto del libro para operaciones estructurales. */
interface Snapshot {
  sheets: { sheet: Sheet; name: string; rows: number; cols: number; cells: Map<number, CellData>; extras: SheetExtras }[];
  names: [string, string][];
  macros: MacroDef[];
}

/** Paso del historial. */
interface HistoryEntry {
  label: string; cells: CellPatch[];
  meta: Map<Sheet, { before: SheetExtras; after?: SheetExtras }>;
  snapBefore?: Snapshot; snapAfter?: Snapshot;
}

const MAX_HISTORY = 200;
const DEFAULT_COL = 6.5;
const DEFAULT_ROW = 1.75;

const BORDER_SIDES = ['borderTop', 'borderRight', 'borderBottom', 'borderLeft'] as const;

/** Copia de los datos de una hoja. */
function cloneExtras(x: SheetExtras): SheetExtras {
  return {
    ...x,
    colWidths: new Map(x.colWidths), rowHeights: new Map(x.rowHeights),
    hiddenRows: new Set(x.hiddenRows), hiddenCols: new Set(x.hiddenCols), filterHidden: new Set(x.filterHidden),
    merges: x.merges.map((m) => ({ ...m })), freeze: { ...x.freeze },
    cf: x.cf.map((r) => ({ ...r })), validations: x.validations.map((r) => ({ ...r })),
    filter: x.filter ? { range: x.filter.range, columns: { ...x.filter.columns } } : null,
    charts: x.charts.map((c) => ({ ...c })),
  };
}

/** Datos vacíos de una hoja. */
function emptyExtras(): SheetExtras {
  return {
    colWidths: new Map(), rowHeights: new Map(), hiddenRows: new Set(), hiddenCols: new Set(), filterHidden: new Set(),
    merges: [], freeze: { rows: 0, cols: 0 }, cf: [], validations: [], filter: null, charts: [], hidden: false, gridlines: true,
  };
}

/** Desplaza índices de un mapa o conjunto tras insertar o borrar. */
function shiftIndex(i: number, at: number, n: number, insert: boolean): number | null {
  if (insert) return i >= at ? i + n : i;
  if (i >= at && i < at + n) return null;
  return i >= at + n ? i - n : i;
}

function shiftMap<V>(m: Map<number, V>, at: number, n: number, insert: boolean): Map<number, V> {
  const out = new Map<number, V>();
  for (const [k, v] of m) {
    const j = shiftIndex(k, at, n, insert);
    if (j !== null) out.set(j, v);
  }
  return out;
}

function shiftSet(s: Set<number>, at: number, n: number, insert: boolean): Set<number> {
  const out = new Set<number>();
  for (const k of s) {
    const j = shiftIndex(k, at, n, insert);
    if (j !== null) out.add(j);
  }
  return out;
}

/** Ajusta un rectángulo a un cambio estructural; null si desaparece. */
function shiftRect(x: Rect, axis: 'row' | 'col', at: number, n: number, insert: boolean): Rect | null {
  const lo = axis === 'row' ? x.r1 : x.c1;
  const hi = axis === 'row' ? x.r2 : x.c2;
  let a: number;
  let b: number;
  if (insert) {
    a = lo >= at ? lo + n : lo;
    b = hi >= at ? hi + n : hi;
  } else {
    const end = at + n - 1;
    if (lo >= at && hi <= end) return null;
    a = lo > end ? lo - n : lo >= at ? at : lo;
    b = hi > end ? hi - n : hi >= at ? at - 1 : hi;
  }
  return axis === 'row' ? { ...x, r1: a, r2: b } : { ...x, c1: a, c2: b };
}

/** Tabla de estilos con internado. */
class StyleTable {
  #list: CellStyle[] = [{}];
  #ids = new Map<string, number>([['{}', 0]]);

  intern(s: CellStyle): number {
    const key = JSON.stringify(Object.keys(s).sort().map((k) => [k, s[k as keyof CellStyle]]));
    const hit = this.#ids.get(key);
    if (hit !== undefined) return hit;
    this.#list.push(s);
    this.#ids.set(key, this.#list.length - 1);
    return this.#list.length - 1;
  }

  get(id: number | undefined): CellStyle {
    return id === undefined ? this.#list[0] : this.#list[id] ?? this.#list[0];
  }
}

/** Libro editable. */
export class SpreadsheetDoc {
  engine = new Engine();
  styles = new StyleTable();
  macros: MacroDef[] = [];
  locale: 'es' | 'en' = 'es';
  active = 0;
  #extras = new Map<number, SheetExtras>();
  #undo: HistoryEntry[] = [];
  #redo: HistoryEntry[] = [];
  #tx: HistoryEntry | null = null;
  #depth = 0;
  #nextId = 1;
  /** Se llama al terminar una transacción. */
  onChange: ((label: string) => void) | null = null;

  constructor(locale: 'es' | 'en' = 'es') {
    this.locale = locale;
  }

  // ---- acceso ----

  get sheet(): Sheet { return this.engine.sheets[this.active] ?? this.engine.sheets[0]; }
  extras(sheet: Sheet): SheetExtras { return this.#extras.get(sheet.id)!; }
  uid(prefix: string): string { return `${prefix}${Date.now().toString(36)}${(this.#nextId++).toString(36)}`; }
  styleAt(sheet: Sheet, r: number, c: number): CellStyle { return this.styles.get(this.engine.getCell(sheet, r, c)?.s); }

  /** Texto de edición de una celda. */
  rawText(sheet: Sheet, r: number, c: number): string {
    const cell = this.engine.getCell(sheet, r, c);
    if (!cell) return '';
    if (cell.f !== undefined) return cell.f;
    if (cell.v === undefined) return '';
    if (typeof cell.v === 'number' && isDateFormat(this.styles.get(cell.s).numFmt)) return formatValue(cell.v, this.styles.get(cell.s).numFmt, this.locale).text;
    if (typeof cell.v === 'boolean') return cell.v ? (this.locale === 'es' ? 'VERDADERO' : 'TRUE') : (this.locale === 'es' ? 'FALSO' : 'FALSE');
    return displayValue(cell.v);
  }

  /** Texto visible de una celda. */
  displayText(sheet: Sheet, r: number, c: number): { text: string; color?: string } {
    const v = this.engine.getValue(sheet, r, c);
    if (typeof v === 'boolean') return { text: this.locale === 'es' ? (v ? 'VERDADERO' : 'FALSO') : (v ? 'TRUE' : 'FALSE') };
    return formatValue(v, this.styleAt(sheet, r, c).numFmt, this.locale);
  }

  sheetByName(name: string): Sheet | null { return this.engine.sheetByName(name); }

  /** Combinación que contiene la celda. */
  mergeAt(sheet: Sheet, r: number, c: number): Rect | null {
    for (const m of this.extras(sheet).merges) if (r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2) return m;
    return null;
  }

  colWidth(sheet: Sheet, c: number): number { return this.extras(sheet).colWidths.get(c) ?? DEFAULT_COL; }
  rowHeight(sheet: Sheet, r: number): number { return this.extras(sheet).rowHeights.get(r) ?? DEFAULT_ROW; }
  rowHidden(sheet: Sheet, r: number): boolean { const x = this.extras(sheet); return x.hiddenRows.has(r) || x.filterHidden.has(r); }
  colHidden(sheet: Sheet, c: number): boolean { return this.extras(sheet).hiddenCols.has(c); }

  // ---- transacciones ----

  get canUndo(): boolean { return this.#undo.length > 0; }
  get canRedo(): boolean { return this.#redo.length > 0; }
  get undoLabel(): string { return this.#undo[this.#undo.length - 1]?.label ?? ''; }
  get redoLabel(): string { return this.#redo[this.#redo.length - 1]?.label ?? ''; }

  /** Ejecuta `fn` como un paso de deshacer. Las transacciones anidadas se funden en la externa. */
  transact<T>(label: string, fn: () => T): T {
    if (this.#tx) {
      this.#depth++;
      try { return fn(); } finally { this.#depth--; }
    }
    const tx: HistoryEntry = { label, cells: [], meta: new Map() };
    this.#tx = tx;
    const index = new Map<string, CellPatch>();
    this.#patchIndex = index;
    try {
      return this.engine.batch(fn);
    } finally {
      this.#tx = null;
      this.#patchIndex = null;
      for (const p of tx.cells) p.after = p.sheet.cells.get(p.key);
      for (const [sheet, m] of tx.meta) m.after = cloneExtras(this.extras(sheet));
      if (tx.snapBefore) tx.snapAfter = this.#snapshot();
      if (tx.cells.length || tx.meta.size || tx.snapBefore) {
        this.#undo.push(tx);
        if (this.#undo.length > MAX_HISTORY) this.#undo.shift();
        this.#redo = [];
      }
      this.onChange?.(label);
    }
  }

  #patchIndex: Map<string, CellPatch> | null = null;

  #write(sheet: Sheet, r: number, c: number, data: CellData | undefined): void {
    const key = cellKey(r, c);
    const id = `${sheet.id}:${key}`;
    if (this.#tx && !this.#patchIndex!.has(id)) {
      const patch: CellPatch = { sheet, key, before: sheet.cells.get(key) };
      this.#patchIndex!.set(id, patch);
      this.#tx.cells.push(patch);
    }
    this.engine.setCell(sheet, r, c, data);
  }

  #touch(sheet: Sheet): SheetExtras {
    const x = this.extras(sheet);
    if (this.#tx && !this.#tx.meta.has(sheet)) this.#tx.meta.set(sheet, { before: cloneExtras(x) });
    return x;
  }

  #structural(): void {
    if (this.#tx && !this.#tx.snapBefore) this.#tx.snapBefore = this.#snapshot();
  }

  #snapshot(): Snapshot {
    return {
      sheets: this.engine.sheets.map((sheet) => ({ sheet, name: sheet.name, rows: sheet.rows, cols: sheet.cols, cells: new Map(sheet.cells), extras: cloneExtras(this.extras(sheet)) })),
      names: [...this.engine.names.values()].map((n) => [n.name, n.ref]),
      macros: this.macros.map((m) => ({ ...m })),
    };
  }

  #restore(s: Snapshot): void {
    this.engine.sheets = s.sheets.map((x) => {
      x.sheet.name = x.name;
      x.sheet.rows = x.rows;
      x.sheet.cols = x.cols;
      x.sheet.cells = new Map(x.cells);
      this.#extras.set(x.sheet.id, cloneExtras(x.extras));
      return x.sheet;
    });
    for (const x of s.sheets) this.engine.reattach(x.sheet);
    this.engine.names.clear();
    this.macros = s.macros.map((m) => ({ ...m }));
    for (const [n, r] of s.names) this.engine.setName(n, r);
    this.engine.rebuild();
    this.active = Math.min(this.active, this.engine.sheets.length - 1);
  }

  #replay(entry: HistoryEntry, forward: boolean): void {
    const snap = forward ? entry.snapAfter : entry.snapBefore;
    if (snap) { this.#restore(snap); return; }
    this.engine.batch(() => {
      for (const p of forward ? entry.cells : [...entry.cells].reverse()) {
        this.engine.setCell(p.sheet, keyRow(p.key), keyCol(p.key), forward ? p.after : p.before);
      }
      for (const [sheet, m] of entry.meta) this.#extras.set(sheet.id, cloneExtras(forward ? m.after! : m.before));
    });
  }

  undo(): boolean {
    const e = this.#undo.pop();
    if (!e) return false;
    this.#replay(e, false);
    this.#redo.push(e);
    this.onChange?.('undo');
    return true;
  }

  redo(): boolean {
    const e = this.#redo.pop();
    if (!e) return false;
    this.#replay(e, true);
    this.#undo.push(e);
    this.onChange?.('redo');
    return true;
  }

  // ---- contenido ----

  /** Escribe texto como lo haría el usuario. */
  setInput(sheet: Sheet, r: number, c: number, text: string): void {
    this.transact('Editar celda', () => {
      const prev = this.engine.getCell(sheet, r, c);
      const style = this.styles.get(prev?.s);
      const parsed = parseInput(text, this.locale, style.numFmt === '@');
      let s = prev?.s;
      if (parsed.numFmt && (!style.numFmt || style.numFmt === 'General')) s = this.styles.intern({ ...style, numFmt: parsed.numFmt });
      const next: CellData = { ...prev, s };
      delete next.v;
      delete next.f;
      if (parsed.v !== undefined) next.v = parsed.v;
      if (parsed.f !== undefined) next.f = parsed.f;
      this.#write(sheet, r, c, next);
    });
  }

  /** Escribe un valor programático: número, lógico o texto (`=` inicial lo vuelve fórmula). */
  setValue(sheet: Sheet, r: number, c: number, value: unknown): void {
    this.transact('Escribir', () => {
      const prev = this.engine.getCell(sheet, r, c);
      const next: CellData = { ...prev };
      delete next.v;
      delete next.f;
      if (isFormulaText(value)) next.f = value.trimStart();
      else if (typeof value === 'number' || typeof value === 'boolean' || (typeof value === 'string' && value !== '')) next.v = value;
      this.#write(sheet, r, c, next);
    });
  }

  /** Recorre las celdas guardadas o de un rectángulo chico sin visitar el vacío de hojas enormes. */
  #eachStored(sheet: Sheet, x: Rect, fn: (r: number, c: number, cell: CellData) => void): void {
    const area = (x.r2 - x.r1 + 1) * (x.c2 - x.c1 + 1);
    if (area > sheet.cells.size) {
      for (const [k, cell] of [...sheet.cells]) {
        const r = keyRow(k);
        const c = keyCol(k);
        if (r >= x.r1 && r <= x.r2 && c >= x.c1 && c <= x.c2) fn(r, c, cell);
      }
      return;
    }
    for (let r = x.r1; r <= x.r2; r++) {
      for (let c = x.c1; c <= x.c2; c++) {
        const cell = this.engine.getCell(sheet, r, c);
        if (cell) fn(r, c, cell);
      }
    }
  }

  clearContents(sheet: Sheet, rects: Rect[]): void {
    this.transact('Borrar contenido', () => {
      for (const x of rects) this.#eachStored(sheet, x, (r, c, cell) => {
        const next = { ...cell };
        delete next.v;
        delete next.f;
        this.#write(sheet, r, c, next);
      });
    });
  }

  clearFormats(sheet: Sheet, rects: Rect[]): void {
    this.transact('Borrar formato', () => {
      for (const x of rects) this.#eachStored(sheet, x, (r, c, cell) => {
        const next = { ...cell };
        delete next.s;
        this.#write(sheet, r, c, next);
      });
    });
  }

  clearAll(sheet: Sheet, rects: Rect[]): void {
    this.transact('Borrar todo', () => {
      for (const x of rects) this.#eachStored(sheet, x, (r, c) => this.#write(sheet, r, c, undefined));
    });
  }

  /** Aplica cambios de estilo a rangos. `undefined` en un campo lo quita. */
  applyStyle(sheet: Sheet, rects: Rect[], patch: CellStyle, label = 'Formato'): void {
    this.transact(label, () => {
      for (const x of rects) {
        for (let r = x.r1; r <= x.r2; r++) {
          for (let c = x.c1; c <= x.c2; c++) this.#patchStyle(sheet, r, c, patch);
        }
      }
    });
  }

  #patchStyle(sheet: Sheet, r: number, c: number, patch: CellStyle): void {
    const cell = this.engine.getCell(sheet, r, c);
    const next: CellStyle = { ...this.styles.get(cell?.s), ...patch };
    for (const k of Object.keys(next) as (keyof CellStyle)[]) if (next[k] === undefined) delete next[k];
    this.#write(sheet, r, c, { ...cell, s: this.styles.intern(next) });
  }

  /** Bordes de un rango: all, outer, inner, top, right, bottom, left o none. */
  setBorders(sheet: Sheet, x: Rect, kind: string, side: BorderSide = { style: 'thin' }): void {
    this.transact('Bordes', () => {
      for (let r = x.r1; r <= x.r2; r++) {
        for (let c = x.c1; c <= x.c2; c++) {
          const top = r === x.r1;
          const bottom = r === x.r2;
          const left = c === x.c1;
          const right = c === x.c2;
          const p: CellStyle = {};
          if (kind === 'none') {
            for (const k of BORDER_SIDES) p[k] = undefined;
          } else {
            const on = (edge: boolean, inner: boolean): boolean => kind === 'all' || (kind === 'outer' && edge) || (kind === 'inner' && inner);
            if (on(top, !top) || (kind === 'top' && top)) p.borderTop = side;
            if (on(bottom, !bottom) || (kind === 'bottom' && bottom)) p.borderBottom = side;
            if (on(left, !left) || (kind === 'left' && left)) p.borderLeft = side;
            if (on(right, !right) || (kind === 'right' && right)) p.borderRight = side;
          }
          if (Object.keys(p).length) this.#patchStyle(sheet, r, c, p);
        }
      }
    });
  }

  setComment(sheet: Sheet, r: number, c: number, text: string): void {
    this.transact('Comentario', () => {
      const next: CellData = { ...this.engine.getCell(sheet, r, c) };
      if (text) next.c = text;
      else delete next.c;
      this.#write(sheet, r, c, next);
    });
  }

  setLink(sheet: Sheet, r: number, c: number, url: string): void {
    this.transact('Vínculo', () => {
      const next: CellData = { ...this.engine.getCell(sheet, r, c) };
      if (url) next.l = url;
      else delete next.l;
      this.#write(sheet, r, c, next);
    });
  }

  // ---- combinar ----

  merge(sheet: Sheet, x: Rect, across = false): void {
    if (x.r1 === x.r2 && x.c1 === x.c2) return;
    this.transact('Combinar', () => {
      const ex = this.#touch(sheet);
      ex.merges = ex.merges.filter((m) => !intersects(m, x));
      const parts = across ? Array.from({ length: x.r2 - x.r1 + 1 }, (_, i) => ({ ...x, r1: x.r1 + i, r2: x.r1 + i })) : [x];
      for (const m of parts) {
        if (m.r1 === m.r2 && m.c1 === m.c2) continue;
        ex.merges.push(m);
        for (let r = m.r1; r <= m.r2; r++) {
          for (let c = m.c1; c <= m.c2; c++) {
            if (r === m.r1 && c === m.c1) continue;
            const cell = this.engine.getCell(sheet, r, c);
            if (cell?.v !== undefined || cell?.f !== undefined) this.#write(sheet, r, c, { s: cell.s });
          }
        }
      }
    });
  }

  unmerge(sheet: Sheet, x: Rect): void {
    this.transact('Separar', () => {
      const ex = this.#touch(sheet);
      ex.merges = ex.merges.filter((m) => !intersects(m, x));
    });
  }

  // ---- estructura ----

  /** Inserta o borra filas o columnas ajustando todo lo que depende de sus índices. */
  structural(sheet: Sheet, axis: 'row' | 'col', at: number, n: number, insert: boolean): void {
    const dim = axis === 'row' ? sheet.rows : sheet.cols;
    if (!insert && n >= dim) return;
    this.transact(`${insert ? 'Insertar' : 'Eliminar'} ${axis === 'row' ? 'filas' : 'columnas'}`, () => {
      this.#structural();
      const ex = this.#touch(sheet);
      this.engine.structural(sheet, axis, at, n, insert);
      const shiftRange = (range: string): string | null => {
        const x = parseRange(range, sheet.rows, sheet.cols);
        const y = x ? shiftRect(x, axis, at, n, insert) : null;
        return y ? rangeName(y) : null;
      };
      if (axis === 'row') {
        ex.rowHeights = shiftMap(ex.rowHeights, at, n, insert);
        ex.hiddenRows = shiftSet(ex.hiddenRows, at, n, insert);
        ex.filterHidden = shiftSet(ex.filterHidden, at, n, insert);
        if (at < ex.freeze.rows) ex.freeze.rows = insert ? ex.freeze.rows + n : Math.max(at, ex.freeze.rows - n);
      } else {
        ex.colWidths = shiftMap(ex.colWidths, at, n, insert);
        ex.hiddenCols = shiftSet(ex.hiddenCols, at, n, insert);
        if (at < ex.freeze.cols) ex.freeze.cols = insert ? ex.freeze.cols + n : Math.max(at, ex.freeze.cols - n);
      }
      ex.merges = ex.merges.flatMap((m) => {
        const y = shiftRect(m, axis, at, n, insert);
        return y && (y.r1 !== y.r2 || y.c1 !== y.c2) ? [y] : [];
      });
      ex.cf = ex.cf.flatMap((rule) => { const range = shiftRange(rule.range); return range ? [{ ...rule, range }] : []; });
      ex.validations = ex.validations.flatMap((rule) => { const range = shiftRange(rule.range); return range ? [{ ...rule, range }] : []; });
      ex.charts = ex.charts.flatMap((chart) => { const range = shiftRange(chart.range); return range ? [{ ...chart, range }] : []; });
      if (ex.filter) {
        const range = shiftRange(ex.filter.range);
        ex.filter = range ? { ...ex.filter, range } : null;
      }
    });
  }

  setColWidth(sheet: Sheet, cols: number[], em: number): void {
    this.transact('Ancho de columna', () => {
      const ex = this.#touch(sheet);
      for (const c of cols) ex.colWidths.set(c, Math.max(0.5, em));
    });
  }

  setRowHeight(sheet: Sheet, rows: number[], em: number): void {
    this.transact('Alto de fila', () => {
      const ex = this.#touch(sheet);
      for (const r of rows) ex.rowHeights.set(r, Math.max(0.5, em));
    });
  }

  setHidden(sheet: Sheet, axis: 'row' | 'col', items: number[], hidden: boolean): void {
    this.transact(hidden ? 'Ocultar' : 'Mostrar', () => {
      const ex = this.#touch(sheet);
      const set = axis === 'row' ? ex.hiddenRows : ex.hiddenCols;
      for (const i of items) {
        if (hidden) set.add(i);
        else set.delete(i);
      }
    });
  }

  setFreeze(sheet: Sheet, rows: number, cols: number): void {
    this.transact('Inmovilizar', () => { this.#touch(sheet).freeze = { rows, cols }; });
  }

  setGridlines(sheet: Sheet, on: boolean): void {
    this.transact('Cuadrícula', () => { this.#touch(sheet).gridlines = on; });
  }

  // ---- hojas ----

  #newExtras(sheet: Sheet): void { this.#extras.set(sheet.id, emptyExtras()); }

  /** Nombre libre: Hoja2, Hoja3… */
  freeSheetName(base = this.locale === 'es' ? 'Hoja' : 'Sheet'): string {
    for (let i = 1; ; i++) if (!this.engine.sheetByName(`${base}${i}`)) return `${base}${i}`;
  }

  addSheet(name = this.freeSheetName(), rows = 100, cols = 26, at = this.engine.sheets.length): Sheet {
    return this.transact('Nueva hoja', () => {
      this.#structural();
      const s = this.engine.addSheet(name, rows, cols, at);
      this.#newExtras(s);
      return s;
    });
  }

  renameSheet(sheet: Sheet, name: string): boolean {
    const t = name.trim();
    if (!t || /[\\/?*[\]:]/.test(t) || t.length > 31) return false;
    const other = this.engine.sheetByName(t);
    if (other && other !== sheet) return false;
    this.transact('Renombrar hoja', () => {
      this.#structural();
      this.engine.renameSheet(sheet, t);
    });
    return true;
  }

  deleteSheet(sheet: Sheet): boolean {
    if (this.engine.sheets.filter((s) => !this.extras(s).hidden).length <= 1) return false;
    this.transact('Eliminar hoja', () => {
      this.#structural();
      this.engine.removeSheet(sheet);
    });
    this.active = Math.min(this.active, this.engine.sheets.length - 1);
    return true;
  }

  moveSheet(sheet: Sheet, to: number): void {
    this.transact('Mover hoja', () => {
      this.#structural();
      const list = this.engine.sheets.filter((s) => s !== sheet);
      list.splice(to, 0, sheet);
      this.engine.sheets = list;
    });
  }

  duplicateSheet(sheet: Sheet): Sheet {
    return this.transact('Duplicar hoja', () => {
      this.#structural();
      const base = `${sheet.name} (copia)`;
      let name = base;
      for (let i = 2; this.engine.sheetByName(name); i++) name = `${base} ${i}`;
      const s = this.engine.addSheet(name, sheet.rows, sheet.cols, this.engine.sheets.indexOf(sheet) + 1);
      this.#extras.set(s.id, { ...cloneExtras(this.extras(sheet)), charts: this.extras(sheet).charts.map((c) => ({ ...c, id: this.uid('ch') })) });
      for (const [k, cell] of sheet.cells) this.engine.setCell(s, keyRow(k), keyCol(k), cell);
      return s;
    });
  }

  setTabColor(sheet: Sheet, color: string | undefined): void {
    this.transact('Color de pestaña', () => { this.#touch(sheet).tabColor = color; });
  }

  setSheetHidden(sheet: Sheet, hidden: boolean): void {
    this.transact('Ocultar hoja', () => { this.#touch(sheet).hidden = hidden; });
  }

  // ---- nombres y macros ----

  defineName(name: string, ref: string): boolean {
    if (!/^[\p{L}_][\p{L}\p{N}_.]*$/u.test(name) || parseCell(name)) return false;
    this.transact('Definir nombre', () => {
      this.#structural();
      this.engine.setName(name, ref);
    });
    return true;
  }

  removeName(name: string): void {
    this.transact('Quitar nombre', () => {
      this.#structural();
      this.engine.removeName(name);
    });
  }

  saveMacro(def: MacroDef): void {
    this.transact('Guardar macro', () => {
      this.#structural();
      const i = this.macros.findIndex((m) => m.name === def.name);
      if (i >= 0) this.macros[i] = def;
      else this.macros.push(def);
    });
  }

  removeMacro(name: string): void {
    this.transact('Eliminar macro', () => {
      this.#structural();
      this.macros = this.macros.filter((m) => m.name !== name);
    });
  }

  // ---- reglas ----

  addCf(sheet: Sheet, rule: Omit<CfRule, 'id'>): string {
    const id = this.uid('cf');
    this.transact('Formato condicional', () => { this.#touch(sheet).cf.push({ ...rule, id }); });
    return id;
  }

  removeCf(sheet: Sheet, id?: string): void {
    this.transact('Quitar regla', () => {
      const ex = this.#touch(sheet);
      ex.cf = id ? ex.cf.filter((r) => r.id !== id) : [];
    });
  }

  addValidation(sheet: Sheet, rule: Omit<ValidationRule, 'id'>): string {
    const id = this.uid('dv');
    this.transact('Validación de datos', () => { this.#touch(sheet).validations.push({ ...rule, id }); });
    return id;
  }

  removeValidation(sheet: Sheet, x: Rect): void {
    this.transact('Quitar validación', () => {
      const ex = this.#touch(sheet);
      ex.validations = ex.validations.filter((r) => {
        const y = parseRange(r.range, sheet.rows, sheet.cols);
        return !y || !intersects(x, y);
      });
    });
  }

  validationAt(sheet: Sheet, r: number, c: number): ValidationRule | null {
    for (const rule of this.extras(sheet).validations) {
      const x = parseRange(rule.range, sheet.rows, sheet.cols);
      if (x && r >= x.r1 && r <= x.r2 && c >= x.c1 && c <= x.c2) return rule;
    }
    return null;
  }

  addChart(sheet: Sheet, def: Omit<ChartDef, 'id'>): string {
    const id = this.uid('ch');
    this.transact('Insertar gráfico', () => { this.#touch(sheet).charts.push({ ...def, id }); });
    return id;
  }

  updateChart(sheet: Sheet, id: string, patch: Partial<ChartDef>): void {
    this.transact('Editar gráfico', () => {
      const ex = this.#touch(sheet);
      ex.charts = ex.charts.map((c) => (c.id === id ? { ...c, ...patch } : c));
    });
  }

  removeChart(sheet: Sheet, id: string): void {
    this.transact('Eliminar gráfico', () => {
      const ex = this.#touch(sheet);
      ex.charts = ex.charts.filter((c) => c.id !== id);
    });
  }

  // ---- ordenar y filtrar ----

  /** Ordena filas de un rango. Las fórmulas conservan sus referencias relativas a la fila. */
  sort(sheet: Sheet, x: Rect, keys: SortKey[], hasHeader = false): void {
    const top = x.r1 + (hasHeader ? 1 : 0);
    this.transact('Ordenar', () => {
      const rows: { r: number; cells: (CellData | undefined)[]; vals: Scalar[] }[] = [];
      for (let r = top; r <= x.r2; r++) {
        const cells: (CellData | undefined)[] = [];
        const vals: Scalar[] = [];
        for (let c = x.c1; c <= x.c2; c++) {
          cells.push(this.engine.getCell(sheet, r, c));
          vals.push(this.engine.getValue(sheet, r, c));
        }
        rows.push({ r, cells, vals });
      }
      const blank = (v: Scalar): boolean => v === null || v === '';
      rows.sort((a, b) => {
        for (const k of keys) {
          const p = a.vals[k.col - x.c1];
          const q = b.vals[k.col - x.c1];
          if (blank(p) || blank(q)) {
            if (blank(p) && blank(q)) continue;
            return blank(p) ? 1 : -1;
          }
          if (p instanceof CellError || q instanceof CellError) {
            if (p instanceof CellError && q instanceof CellError) continue;
            return p instanceof CellError ? 1 : -1;
          }
          const d = compare(p, q);
          if (d) return k.desc ? -d : d;
        }
        return a.r - b.r;
      });
      rows.forEach((row, i) => {
        const r = top + i;
        row.cells.forEach((cell, j) => {
          const next = cell?.f !== undefined ? { ...cell, f: shiftFormula(cell.f, r - row.r, 0, sheet.rows, sheet.cols) } : cell;
          this.#write(sheet, r, x.c1 + j, next);
        });
      });
    });
    if (this.extras(sheet).filter) this.reapplyFilter(sheet);
  }

  /** Activa o quita el filtro automático. */
  toggleFilter(sheet: Sheet, x: Rect | null): void {
    this.transact('Filtro', () => {
      const ex = this.#touch(sheet);
      ex.filter = x ? { range: rangeName(x), columns: {} } : null;
      ex.filterHidden = new Set();
    });
  }

  setFilterColumn(sheet: Sheet, col: number, rule: FilterColumn | null): void {
    this.transact('Filtrar', () => {
      const ex = this.#touch(sheet);
      if (!ex.filter) return;
      const columns = { ...ex.filter.columns };
      if (rule) columns[String(col)] = rule;
      else delete columns[String(col)];
      ex.filter = { ...ex.filter, columns };
      this.reapplyFilter(sheet);
    });
  }

  /** Recalcula qué filas oculta el filtro. */
  reapplyFilter(sheet: Sheet): void {
    this.transact('Reaplicar filtro', () => {
      const ex = this.#touch(sheet);
      ex.filterHidden = new Set();
      const f = ex.filter;
      if (!f) return;
      const x = parseRange(f.range, sheet.rows, sheet.cols);
      if (!x) return;
      for (let r = x.r1 + 1; r <= x.r2; r++) {
        for (const [col, rule] of Object.entries(f.columns)) {
          if (!this.#passes(sheet, r, Number(col), rule)) { ex.filterHidden.add(r); break; }
        }
      }
    });
  }

  #passes(sheet: Sheet, r: number, c: number, rule: FilterColumn): boolean {
    const text = this.displayText(sheet, r, c).text;
    if (rule.values && !rule.values.includes(text)) return false;
    if (!rule.op) return true;
    const low = text.toLowerCase();
    const a = (rule.a ?? '').toLowerCase();
    const v = this.engine.getValue(sheet, r, c);
    const n = Number(rule.a);
    const cmp = typeof v === 'number' && !Number.isNaN(n) ? v - n : low < a ? -1 : low > a ? 1 : 0;
    switch (rule.op) {
      case 'contains': return low.includes(a);
      case 'notContains': return !low.includes(a);
      case 'begins': return low.startsWith(a);
      case 'ends': return low.endsWith(a);
      case 'eq': return cmp === 0;
      case 'ne': return cmp !== 0;
      case 'gt': return cmp > 0;
      case 'lt': return cmp < 0;
      case 'gte': return cmp >= 0;
      case 'lte': return cmp <= 0;
      case 'blank': return text === '';
      case 'notBlank': return text !== '';
    }
  }

  /** Valores distintos visibles de una columna del filtro. */
  filterValues(sheet: Sheet, col: number): string[] {
    const f = this.extras(sheet).filter;
    const x = f ? parseRange(f.range, sheet.rows, sheet.cols) : null;
    if (!x) return [];
    const seen = new Set<string>();
    for (let r = x.r1 + 1; r <= x.r2; r++) seen.add(this.displayText(sheet, r, col).text);
    return [...seen].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  /** Región contigua alrededor de una celda (Ctrl+Mayús+*). */
  currentRegion(sheet: Sheet, r: number, c: number): Rect {
    const filled = (y: number, x: number): boolean => y >= 0 && x >= 0 && y < sheet.rows && x < sheet.cols && this.engine.getValue(sheet, y, x) !== null;
    const box: Rect = { r1: r, c1: c, r2: r, c2: c };
    for (let changed = true; changed;) {
      changed = false;
      for (let y = box.r1 - 1; y <= box.r2 + 1; y++) {
        if (filled(y, box.c1 - 1)) { box.c1--; changed = true; break; }
      }
      for (let y = box.r1 - 1; y <= box.r2 + 1; y++) {
        if (filled(y, box.c2 + 1)) { box.c2++; changed = true; break; }
      }
      for (let x = box.c1 - 1; x <= box.c2 + 1; x++) {
        if (filled(box.r1 - 1, x)) { box.r1--; changed = true; break; }
      }
      for (let x = box.c1 - 1; x <= box.c2 + 1; x++) {
        if (filled(box.r2 + 1, x)) { box.r2++; changed = true; break; }
      }
    }
    return box;
  }

  // ---- relleno ----

  /** Rellena `target` (que contiene `src` en un borde) continuando el patrón. */
  fill(sheet: Sheet, src: Rect, target: Rect, alternate = false): void {
    const vertical = target.r1 < src.r1 || target.r2 > src.r2;
    const backward = vertical ? target.r1 < src.r1 : target.c1 < src.c1;
    const lanes = vertical ? [src.c1, src.c2] : [src.r1, src.r2];
    this.transact('Rellenar', () => {
      for (let lane = lanes[0]; lane <= lanes[1]; lane++) {
        const len = vertical ? src.r2 - src.r1 + 1 : src.c2 - src.c1 + 1;
        const at = (i: number): [number, number] => (vertical ? [src.r1 + i, lane] : [lane, src.c1 + i]);
        const cells = Array.from({ length: len }, (_, i) => this.engine.getCell(sheet, ...at(i)));
        const sources: FillSource[] = cells.map((cell) => ({ v: cell?.v, f: cell?.f, isDate: isDateFormat(this.styles.get(cell?.s).numFmt) }));
        const count = vertical ? (backward ? src.r1 - target.r1 : target.r2 - src.r2) : (backward ? src.c1 - target.c1 : target.c2 - src.c2);
        const steps = planFill(sources, count, backward, alternate);
        steps.forEach((step, i) => {
          const offset = i + 1;
          const r = vertical ? (backward ? src.r1 - offset : src.r2 + offset) : lane;
          const c = vertical ? lane : (backward ? src.c1 - offset : src.c2 + offset);
          const from = cells[step.from];
          const [fr, fc] = at(step.from);
          let next: CellData | undefined = from;
          if (step.v !== undefined) next = { ...from, v: step.v };
          else if (from?.f !== undefined) next = { ...from, f: shiftFormula(from.f, r - fr, c - fc, sheet.rows, sheet.cols) };
          if (next) {
            next = { ...next };
            delete next.c;
          }
          this.#write(sheet, r, c, next);
        });
      }
    });
  }

  /** Relleno rápido de una columna a partir de los ejemplos ya escritos. */
  flashFill(sheet: Sheet, col: number, sourceCol: number, r1: number, r2: number): number {
    const text = (r: number, c: number): string => this.displayText(sheet, r, c).text;
    const examples: { source: string; result: string }[] = [];
    const pending: number[] = [];
    for (let r = r1; r <= r2; r++) {
      if (this.engine.getValue(sheet, r, col) !== null) examples.push({ source: text(r, sourceCol), result: text(r, col) });
      else if (this.engine.getValue(sheet, r, sourceCol) !== null) pending.push(r);
    }
    if (!examples.length || !pending.length) return 0;
    const out = flashFill(examples, pending.map((r) => text(r, sourceCol)));
    if (!out) return 0;
    this.transact('Relleno rápido', () => {
      out.forEach((v, i) => { if (v !== null) this.setInput(sheet, pending[i], col, v); });
    });
    return out.length;
  }

  // ---- copiar y pegar ----

  /** Copia un rango a un bloque interno. */
  copy(sheet: Sheet, x: Rect): ClipBlock {
    const cells: ClipCell[] = [];
    const styles = new Map<number, CellStyle>();
    for (let r = x.r1; r <= x.r2; r++) {
      for (let c = x.c1; c <= x.c2; c++) {
        const cell = this.engine.getCell(sheet, r, c);
        if (cell?.s !== undefined) styles.set(cell.s, this.styles.get(cell.s));
        cells.push({ r, c, cell, value: this.engine.getValue(sheet, r, c) });
      }
    }
    return { sheet: sheet.id, rect: x, cells, styles };
  }

  /** Pega un bloque interno; si el destino es múltiplo del origen, lo repite. */
  paste(sheet: Sheet, block: ClipBlock, to: Rect, opts: PasteOptions = {}): Rect {
    const mode = opts.mode ?? 'all';
    const h = block.rect.r2 - block.rect.r1 + 1;
    const w = block.rect.c2 - block.rect.c1 + 1;
    const sh = opts.transpose ? w : h;
    const sw = opts.transpose ? h : w;
    const th = to.r2 - to.r1 + 1;
    const tw = to.c2 - to.c1 + 1;
    const rows = th % sh === 0 ? th : sh;
    const cols = tw % sw === 0 ? tw : sw;
    this.transact('Pegar', () => {
      if (opts.move) {
        const src = this.engine.byId(block.sheet);
        for (const cc of block.cells) if (cc.cell) this.#write(src, cc.r, cc.c, undefined);
      }
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const dr = y % sh;
          const dc = x % sw;
          const pr = opts.transpose ? dc : dr;
          const pc = opts.transpose ? dr : dc;
          const cc = block.cells[pr * w + pc];
          const r = to.r1 + y;
          const c = to.c1 + x;
          if (r >= sheet.rows || c >= sheet.cols) continue;
          this.#pasteCell(sheet, r, c, cc, mode, !!opts.move);
        }
      }
    });
    return { r1: to.r1, c1: to.c1, r2: to.r1 + rows - 1, c2: to.c1 + cols - 1 };
  }

  #pasteCell(sheet: Sheet, r: number, c: number, cc: ClipCell, mode: PasteOptions['mode'], move: boolean): void {
    const prev = this.engine.getCell(sheet, r, c);
    const src = cc.cell;
    const shifted = src?.f !== undefined ? (move ? src.f : shiftFormula(src.f, r - cc.r, c - cc.c, sheet.rows, sheet.cols)) : undefined;
    const literal = (v: Scalar): number | string | boolean | undefined => (v === null ? undefined : v instanceof CellError ? v.code : v);
    if (mode === 'all') { this.#write(sheet, r, c, src ? { ...src, f: shifted } : undefined); return; }
    const base: CellData = { ...prev };
    if (mode === 'formats') {
      if (src?.s === undefined) delete base.s;
      else base.s = src.s;
      this.#write(sheet, r, c, base);
      return;
    }
    delete base.v;
    delete base.f;
    if (mode === 'values') base.v = literal(cc.value);
    else if (shifted !== undefined) base.f = shifted;
    else base.v = src?.v;
    this.#write(sheet, r, c, base);
  }

  /** Pega una matriz de textos (portapapeles externo o CSV). */
  pasteMatrix(sheet: Sheet, to: Rect, rows: string[][], styles?: (CellStyle | undefined)[][]): Rect {
    const height = rows.length;
    const width = Math.max(0, ...rows.map((r) => r.length));
    this.transact('Pegar', () => {
      rows.forEach((row, y) => row.forEach((text, x) => {
        const r = to.r1 + y;
        const c = to.c1 + x;
        if (r >= sheet.rows || c >= sheet.cols) return;
        this.setInput(sheet, r, c, text);
        const style = styles?.[y]?.[x];
        if (style) this.#patchStyle(sheet, r, c, style);
      }));
    });
    return { r1: to.r1, c1: to.c1, r2: to.r1 + Math.max(0, height - 1), c2: to.c1 + Math.max(0, width - 1) };
  }

  // ---- herramientas de datos ----

  /** Quita filas duplicadas según las columnas dadas. Devuelve cuántas quitó. */
  removeDuplicates(sheet: Sheet, x: Rect, cols: number[], hasHeader = false): number {
    const top = x.r1 + (hasHeader ? 1 : 0);
    const seen = new Set<string>();
    const keep: number[] = [];
    for (let r = top; r <= x.r2; r++) {
      const key = JSON.stringify(cols.map((c) => { const v = this.engine.getValue(sheet, r, c); return typeof v === 'string' ? v.toLowerCase() : v instanceof CellError ? v.code : v; }));
      if (seen.has(key)) continue;
      seen.add(key);
      keep.push(r);
    }
    const removed = x.r2 - top + 1 - keep.length;
    if (!removed) return 0;
    this.transact('Quitar duplicados', () => {
      const copy = keep.map((r) => Array.from({ length: x.c2 - x.c1 + 1 }, (_, j) => this.engine.getCell(sheet, r, x.c1 + j)));
      for (let r = top; r <= x.r2; r++) {
        for (let c = x.c1; c <= x.c2; c++) {
          const i = r - top;
          const cell = copy[i]?.[c - x.c1];
          this.#write(sheet, r, c, i < keep.length ? (cell?.f !== undefined ? { ...cell, f: shiftFormula(cell.f, r - keep[i], 0, sheet.rows, sheet.cols) } : cell) : undefined);
        }
      }
    });
    return removed;
  }

  /** Texto en columnas. */
  textToColumns(sheet: Sheet, x: Rect, sep: string): void {
    this.transact('Texto en columnas', () => {
      for (let r = x.r1; r <= x.r2; r++) {
        const parts = this.displayText(sheet, r, x.c1).text.split(sep);
        if (parts.length < 2) continue;
        parts.forEach((p, i) => { if (x.c1 + i < sheet.cols) this.setInput(sheet, r, x.c1 + i, p); });
      }
    });
  }

  /** Busca objetivo por secante y bisección: ajusta `changing` para que `formula` valga `goal`. */
  goalSeek(sheet: Sheet, formula: { r: number; c: number }, goal: number, changing: { r: number; c: number }): number | null {
    const original = this.engine.getCell(sheet, changing.r, changing.c);
    const start = typeof original?.v === 'number' ? original.v : 0;
    const f = (x: number): number => {
      this.engine.setCell(sheet, changing.r, changing.c, { ...original, v: x });
      this.engine.recalc();
      const v = this.engine.getValue(sheet, formula.r, formula.c);
      return typeof v === 'number' ? v - goal : NaN;
    };
    let x0 = start;
    let x1 = start === 0 ? 1 : start * 1.1;
    let y0 = f(x0);
    let y1 = f(x1);
    let found: number | null = null;
    for (let i = 0; i < 100 && Number.isFinite(y1); i++) {
      if (Math.abs(y1) < 1e-7) { found = x1; break; }
      const d = y1 - y0;
      if (d === 0) break;
      const x2 = x1 - (y1 * (x1 - x0)) / d;
      x0 = x1;
      y0 = y1;
      x1 = x2;
      y1 = f(x1);
    }
    this.engine.setCell(sheet, changing.r, changing.c, original);
    this.engine.recalc();
    if (found !== null) this.setValue(sheet, changing.r, changing.c, found);
    return found;
  }

  // ---- importar / exportar documento ----

  /** Crea una hoja vacía sin pasar por el historial (uso interno de cargas). */
  bootstrap(name: string, rows: number, cols: number): Sheet {
    const s = this.engine.addSheet(name, rows, cols);
    this.#newExtras(s);
    return s;
  }

  /** Vacía el libro. */
  reset(): void {
    for (const s of [...this.engine.sheets]) this.#extras.delete(s.id);
    this.engine = new Engine();
    this.macros = [];
    this.active = 0;
    this.#undo = [];
    this.#redo = [];
  }

  /** Carga una matriz en una hoja nueva. */
  loadMatrix(matrix: unknown, rows: number, cols: number, name = this.freeSheetName()): void {
    this.reset();
    const sheet = this.bootstrap(name, rows, cols);
    if (Array.isArray(matrix)) {
      matrix.forEach((row, y) => {
        if (!Array.isArray(row) || y >= rows) return;
        row.forEach((v, x) => {
          if (x >= cols || v === null || v === undefined || v === '') return;
          if (isFormulaText(v)) this.engine.setCell(sheet, y, x, { f: v.trimStart() });
          else if (typeof v === 'number' || typeof v === 'boolean') this.engine.setCell(sheet, y, x, { v });
          else this.engine.setCell(sheet, y, x, { v: String(v) });
        });
      });
    }
    this.engine.recalc();
  }

  /** Carga un documento. */
  load(doc: WorkbookDoc): void {
    this.reset();
    this.macros = (doc.macros ?? []).map((m) => ({ ...m }));
    for (const sd of doc.sheets) {
      const sheet = this.bootstrap(sd.name, sd.rows ?? 100, sd.cols ?? 26);
      const ex = this.extras(sheet);
      for (const [a, cd] of Object.entries(sd.cells ?? {})) {
        const p = parseCell(a);
        if (!p) continue;
        sheet.rows = Math.max(sheet.rows, p.r + 1);
        sheet.cols = Math.max(sheet.cols, p.c + 1);
        const data: CellData = {};
        if (cd.f !== undefined) data.f = cd.f.startsWith('=') ? cd.f : `=${cd.f}`;
        else if (cd.v !== undefined) data.v = cd.v;
        if (cd.s) data.s = this.styles.intern(cd.s);
        if (cd.c) data.c = cd.c;
        if (cd.l) data.l = cd.l;
        sheet.cells.set(cellKey(p.r, p.c), data);
      }
      for (const [k, v] of Object.entries(sd.colWidths ?? {})) ex.colWidths.set(Number(k), v);
      for (const [k, v] of Object.entries(sd.rowHeights ?? {})) ex.rowHeights.set(Number(k), v);
      ex.hiddenRows = new Set(sd.hiddenRows ?? []);
      ex.hiddenCols = new Set(sd.hiddenCols ?? []);
      ex.merges = (sd.merges ?? []).flatMap((m) => { const x = parseRange(m); return x ? [x] : []; });
      if (sd.freeze) ex.freeze = { ...sd.freeze };
      ex.cf = (sd.cf ?? []).map((r) => ({ ...r }));
      ex.validations = (sd.validations ?? []).map((r) => ({ ...r }));
      ex.filter = sd.filter ?? null;
      ex.charts = (sd.charts ?? []).map((c) => ({ ...c }));
      ex.tabColor = sd.tabColor;
      ex.hidden = !!sd.hidden;
      ex.gridlines = sd.gridlines !== false;
    }
    for (const n of doc.names ?? []) this.engine.setNameQuiet(n.name, n.ref);
    this.engine.rebuild();
    for (const sheet of this.engine.sheets) if (this.extras(sheet).filter) this.#refilter(sheet);
    this.active = Math.min(doc.active ?? 0, this.engine.sheets.length - 1);
  }

  #refilter(sheet: Sheet): void {
    const undo = this.#undo;
    this.#undo = [];
    this.reapplyFilter(sheet);
    this.#undo = undo;
  }

  /** Serializa el libro. */
  save(): WorkbookDoc {
    const sheets: SheetDoc[] = this.engine.sheets.map((sheet) => {
      const ex = this.extras(sheet);
      const cells: Record<string, CellDoc> = {};
      for (const [k, cell] of sheet.cells) {
        const cd: CellDoc = {};
        if (cell.f !== undefined) cd.f = cell.f;
        else if (cell.v !== undefined) cd.v = cell.v;
        if (cell.s) cd.s = this.styles.get(cell.s);
        if (cell.c) cd.c = cell.c;
        if (cell.l) cd.l = cell.l;
        cells[cellName(keyRow(k), keyCol(k))] = cd;
      }
      const doc: SheetDoc = { name: sheet.name, rows: sheet.rows, cols: sheet.cols, cells };
      if (ex.colWidths.size) doc.colWidths = Object.fromEntries(ex.colWidths);
      if (ex.rowHeights.size) doc.rowHeights = Object.fromEntries(ex.rowHeights);
      if (ex.hiddenRows.size) doc.hiddenRows = [...ex.hiddenRows];
      if (ex.hiddenCols.size) doc.hiddenCols = [...ex.hiddenCols];
      if (ex.merges.length) doc.merges = ex.merges.map(rangeName);
      if (ex.freeze.rows || ex.freeze.cols) doc.freeze = ex.freeze;
      if (ex.cf.length) doc.cf = ex.cf;
      if (ex.validations.length) doc.validations = ex.validations;
      if (ex.filter) doc.filter = ex.filter;
      if (ex.charts.length) doc.charts = ex.charts;
      if (ex.tabColor) doc.tabColor = ex.tabColor;
      if (ex.hidden) doc.hidden = true;
      if (!ex.gridlines) doc.gridlines = false;
      return doc;
    });
    return {
      $schema: 'iswc-spreadsheet/v1', sheets,
      names: [...this.engine.names.values()].map((n) => ({ name: n.name, ref: n.ref })),
      macros: this.macros, active: this.active,
    };
  }

  /** Letras de columna, reexportadas para consumidores del documento. */
  colLabel(c: number): string { return colName(c); }

  /** Rectángulo normalizado desde dos celdas. */
  rect(r1: number, c1: number, r2 = r1, c2 = c1): Rect { return normalize({ r1, c1, r2, c2 }); }
}
