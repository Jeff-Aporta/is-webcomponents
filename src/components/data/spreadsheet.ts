import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { parseWorkbookDoc } from './schemas/spreadsheet.schemas.js';
import type { CellStyle, ChartDef, MacroDef, SpreadsheetChangeDetail, SpreadsheetSelectDetail, WorkbookDoc } from './schemas/spreadsheet.schemas.js';
import { cellName, colName, inRect, normalize, parseCell, parseRange, quoteSheet, rangeName } from './utils/spreadsheet/address.js';
import type { Rect } from './utils/spreadsheet/address.schemas.js';
import type { Axis } from './utils/spreadsheet/axis.js';
import { CfEvaluator } from './utils/spreadsheet/conditional.js';
import { detectDelimiter, parseDelimited, toDelimited } from './utils/spreadsheet/csv.js';
import { SpreadsheetDoc } from './utils/spreadsheet/document.js';
import type { Sheet } from './utils/spreadsheet/engine.js';
import { runMacro } from './utils/spreadsheet/macro/host.js';
import type { MacroView } from './utils/spreadsheet/macro/host.schemas.js';
import { MacroRecorder } from './utils/spreadsheet/macro/recorder.js';
import type { RecordArg } from './utils/spreadsheet/macro/recorder.schemas.js';
import { adjustDecimals, NUMBER_FORMATS } from './utils/spreadsheet/numfmt.js';
import { parseClipboardHtml, toHtml, toTsv } from './utils/spreadsheet/ui/clipboard.js';
import { cfDialog, cfManageDialog, commentDialog, dedupeDialog, findDialog, formatDialog, functionDialog, goalSeekDialog, gotoDialog, MACRO_HELP, namesDialog, pasteSpecialDialog, promptDialog, sortDialog, textColumnsDialog, validationDialog } from './utils/spreadsheet/ui/dialogs.js';
import type { DialogHost, DialogSpec, Fields } from './utils/spreadsheet/ui/dialogs.schemas.js';
import { canPoint, cycleAbsolute, formulaRefs, rectText, refAtCaret, signatureAt, signatureParts, suggestionsAt } from './utils/spreadsheet/ui/formula-assist.js';
import type { Suggestion } from './utils/spreadsheet/ui/formula-assist.schemas.js';
import { buildAxes, computeWindow, esc, HEAD_HEIGHT, renderGrid, rowHeadWidth } from './utils/spreadsheet/ui/render.js';
import type { GridWindow } from './utils/spreadsheet/ui/render.schemas.js';
import { CELL_MENU, COL_MENU, menuHtml, ribbonHtml, ribbonItem, ROW_MENU, SWATCHES, TAB_MENU } from './utils/spreadsheet/ui/ribbon.js';
import type { MenuItem } from './utils/spreadsheet/ui/ribbon.schemas.js';
import { isValid, listItems } from './utils/spreadsheet/validation.js';
import { displayValue } from './utils/spreadsheet/values.js';
import type { Scalar } from './utils/spreadsheet/values.schemas.js';
import { readXlsx } from './utils/spreadsheet/xlsx-read.js';
import { writeXlsx } from './utils/spreadsheet/xlsx-write.js';
import '@jeff-aporta/iswc-base/components/actions/context-menu.js';
import '@jeff-aporta/iswc-base/components/forms/checkbox.js';
import '@jeff-aporta/iswc-base/components/forms/color-picker.js';
import '@jeff-aporta/iswc-base/components/forms/input.js';
import '@jeff-aporta/iswc-base/components/forms/option.js';
import '@jeff-aporta/iswc-base/components/forms/select.js';
import '@jeff-aporta/iswc-base/components/forms/textarea.js';
import '@jeff-aporta/iswc-base/components/layout/dialog.js';
import '@jeff-aporta/iswc-base/components/navigation/tab-group.js';
import type { Selection, Edit, Pointing, Drag, Clip, ValueEl } from './spreadsheet.schemas.js';
import css from 'iswc:css';

/**
 * <iswc-spreadsheet> — Hoja de cálculo completa en un web component: varias hojas, más de 380
 * funciones con alias en español, formato, tablas, gráficos, macros y archivos XLSX/CSV.
 *
 * Atributos
 *   rows, cols, value (matriz o documento iswc-spreadsheet/v1 en JSON), read-only, locale (es|en),
 *   without-toolbar, without-formula-bar, without-tabs, without-status
 *
 * Eventos
 *   iswc-change   { row, col, raw, value, sheet, cells }
 *   iswc-select   { row, col, value, range, sheet }
 *
 * Métodos: getCell, setCell, getValue, select, undo, redo, recalc, runMacro, importFile,
 * exportXlsx, exportCsv. Propiedades: value, workbook, doc.
 *
 * El motor vive en utils/spreadsheet/ y no conoce el DOM. Guía completa en spreadsheet.md.
 */

const OBSERVED = ['rows', 'cols', 'value', 'read-only', 'locale', 'without-toolbar', 'without-formula-bar', 'without-tabs', 'without-status'];

/** Por debajo de este número de celdas se pinta todo: la tabla es pequeña y sin espaciadores. */
const SMALL_SHEET = 2500;
const ZOOMS = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];
const RESIZE_MIN = 1;
const CHART_COLORS = { w: 26, h: 15 };

/** iswc-chart solo pinta las marcas de los tipos cuyo módulo se cargó. */
const CHART_MODULES: Record<ChartDef['type'], () => Promise<unknown>> = {
  bar: () => import('@jeff-aporta/iswc-base/components/charts/bar-chart.js'),
  line: () => import('@jeff-aporta/iswc-base/components/charts/line-chart.js'),
  pie: () => import('@jeff-aporta/iswc-base/components/charts/pie-chart.js'),
  doughnut: () => import('@jeff-aporta/iswc-base/components/charts/doughnut-chart.js'),
  scatter: () => import('@jeff-aporta/iswc-base/components/charts/scatter-chart.js'),
  radar: () => import('@jeff-aporta/iswc-base/components/charts/radar-chart.js'),
};

/** Dirección de cada flecha. */
const ARROWS: Record<string, readonly [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };







class IswcSpreadsheet extends IswcElement {
  static tag = 'iswc-spreadsheet';
  static css = css;
  static deps = ['iswc-button', 'iswc-icon'];
  static observed = OBSERVED;

  #doc = new SpreadsheetDoc(this.#initialLocale());
  #sel: Selection = { r: 0, c: 0, ranges: [{ r1: 0, c1: 0, r2: 0, c2: 0 }] };
  #axes: { rows: Axis; cols: Axis } | null = null;
  #win: GridWindow | null = null;
  #cf = new CfEvaluator(this.#doc);
  #edit: Edit | null = null;
  #point: Pointing | null = null;
  #drag: Drag | null = null;
  #clip: Clip | null = null;
  #rec = new MacroRecorder();
  #showFormulas = false;
  #zoom = 1;
  #painter: number | undefined | null = null;
  #painted: HTMLElement[] = [];
  #frame = 0;
  #toastTimer = 0;
  #observer: ResizeObserver | null = null;
  #suggest: { items: Suggestion[]; start: number; end: number; index: number } | null = null;
  #menuHandler: ((value: string, arg: string) => void) | null = null;
  #dialogOk: ((f: Fields) => boolean | void) | null = null;
  #chartCache = new Map<string, string>();

  #root!: HTMLElement;
  #ribbon!: HTMLElement;
  #bar!: HTMLElement;
  #nameBox!: HTMLInputElement;
  #fx!: HTMLTextAreaElement;
  #view!: HTMLElement;
  #table!: HTMLElement;
  #objects!: HTMLElement;
  #guide!: HTMLElement;
  #tabs!: HTMLElement;
  #status!: HTMLElement;
  #assist!: HTMLElement;
  #note!: HTMLElement;
  #toast!: HTMLElement;
  #menu!: HTMLElement & { openAt(x: number, y: number): void; close(): void };
  #dialog!: ValueEl;

  constructor() {
    super();
    this.shadowRoot!.innerHTML = /* html */ `
      <div part="root" class="root">
        <div part="toolbar" class="ribbon"></div>
        <div part="formula-bar" class="fbar">
          <input class="namebox" aria-label="Cuadro de nombres" spellcheck="false" autocomplete="off" />
          <iswc-button class="fx-btn" variant="text" color="neutral" title="Insertar función" aria-label="Insertar función" data-cmd="fx"><iswc-icon icon="mdi:function-variant"></iswc-icon></iswc-button>
          <textarea class="fx-input" rows="1" aria-label="Barra de fórmulas" spellcheck="false"></textarea>
        </div>
        <div part="viewport" class="viewport">
          <table part="grid" class="grid" role="grid" tabindex="-1"></table>
          <div class="objects"></div>
          <div class="guide" hidden></div>
        </div>
        <div part="tabs" class="tabs"></div>
        <div part="status" class="status" role="status"></div>
        <div class="assist" hidden></div>
        <div class="note" hidden></div>
        <div class="toast" hidden role="status"></div>
        <iswc-context-menu class="menu"></iswc-context-menu>
        <iswc-dialog class="dlg"></iswc-dialog>
      </div>
    `;
    const q = <T extends HTMLElement>(s: string): T => this.shadowRoot!.querySelector<T>(s)!;
    this.#root = q('.root');
    this.#ribbon = q('.ribbon');
    this.#bar = q('.fbar');
    this.#nameBox = q('.namebox');
    this.#fx = q('.fx-input');
    this.#view = q('.viewport');
    this.#table = q('.grid');
    this.#objects = q('.objects');
    this.#guide = q('.guide');
    this.#tabs = q('.tabs');
    this.#status = q('.status');
    this.#assist = q('.assist');
    this.#note = q('.note');
    this.#toast = q('.toast');
    this.#menu = q('.menu');
    this.#dialog = q('.dlg');
    this.#bind();
  }

  // ---- ciclo de vida ----

  onConnected(): void {
    // La cinta se arma ya conectada: iswc-color-picker lee su input interno al montarse y ese
    // input solo está actualizado si el HTML entra en un árbol conectado.
    if (!this.#ribbon.firstChild) {
      this.#ribbon.innerHTML = ribbonHtml();
      for (const el of this.#ribbon.querySelectorAll<ValueEl>('iswc-color-picker')) el.swatches = SWATCHES;
    }
    this.#load();
    this.#syncChrome();
    this.#renderAll();
    this.#observer = new ResizeObserver(() => this.#schedule());
    this.#observer.observe(this.#view);
  }

  onDisconnected(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    cancelAnimationFrame(this.#frame);
    clearTimeout(this.#toastTimer);
    this.#endDrag();
  }

  onAttributeChanged(name: string): void {
    if (name === 'value') this.#load();
    else if (name === 'rows' || name === 'cols') this.#resizeSheet();
    else if (name === 'locale') this.#doc.locale = this.#initialLocale();
    this.#syncChrome();
    this.#renderAll();
  }

  #initialLocale(): 'es' | 'en' {
    const raw = this.getAttribute('locale') ?? document.documentElement.lang ?? 'es';
    return raw.toLowerCase().startsWith('en') ? 'en' : 'es';
  }

  #rowsCount(): number { return Number(this.getAttribute('rows')) || 20; }
  #colsCount(): number { return Number(this.getAttribute('cols')) || 26; }
  #readOnly(): boolean { return this.hasAttribute('read-only') || this.hasAttribute('readonly'); }

  #load(): void {
    const raw = this.getAttribute('value');
    let parsed: unknown = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
    }
    this.#endEdit(false);
    const doc = !Array.isArray(parsed) && parsed ? parseWorkbookDoc(parsed) : null;
    if (doc) this.#doc.load(doc);
    else this.#doc.loadMatrix(parsed, this.#rowsCount(), this.#colsCount());
    this.#afterLoad();
  }

  #afterLoad(): void {
    this.#doc.onChange = () => this.#afterChange();
    this.#axes = null;
    this.#chartCache.clear();
    this.#objects.innerHTML = '';
    this.#sel = { r: 0, c: 0, ranges: [{ r1: 0, c1: 0, r2: 0, c2: 0 }] };
  }

  #resizeSheet(): void {
    const s = this.#doc.sheet;
    if (!s) return;
    s.rows = this.#rowsCount();
    s.cols = this.#colsCount();
    this.#doc.engine.rebuild();
    this.#axes = null;
  }

  #syncChrome(): void {
    this.#ribbon.hidden = this.hasAttribute('without-toolbar');
    this.#bar.hidden = this.hasAttribute('without-formula-bar');
    this.#tabs.hidden = this.hasAttribute('without-tabs');
    this.#status.hidden = this.hasAttribute('without-status');
    this.#root.toggleAttribute('data-readonly', this.#readOnly());
  }

  // ---- API pública ----

  /** Documento editable (motor incluido). */
  get doc(): SpreadsheetDoc { return this.#doc; }

  /** Matriz de valores crudos de la hoja activa, en JSON. */
  get value(): string {
    const s = this.#sheet;
    const { rows, cols } = this.#doc.engine.usedBounds(s);
    const out: (string | number | boolean)[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: (string | number | boolean)[] = [];
      for (let c = 0; c < cols; c++) {
        const cell = this.#doc.engine.getCell(s, r, c);
        row.push(cell?.f ?? cell?.v ?? '');
      }
      out.push(row);
    }
    return JSON.stringify(out);
  }

  set value(v: string | unknown[]) { this.setAttribute('value', typeof v === 'string' ? v : JSON.stringify(v)); }

  /** Documento `iswc-spreadsheet/v1`. */
  get workbook(): WorkbookDoc { return this.#doc.save(); }

  set workbook(v: WorkbookDoc) {
    const doc = parseWorkbookDoc(v);
    if (!doc) throw new TypeError('Documento iswc-spreadsheet no válido');
    this.#doc.load(doc);
    this.#afterLoad();
    this.#renderAll();
  }

  /** Contenido crudo de una celda A1 (fórmula o valor). */
  getCell(a1: string): string {
    const p = parseCell(a1);
    return p ? this.#doc.rawText(this.#sheet, p.r, p.c) : '';
  }

  /** Valor calculado de una celda A1. */
  getValue(a1: string): string | number {
    const p = parseCell(a1);
    return p ? this.#publicValue(p.r, p.c) : '';
  }

  /** Escribe como si lo tecleara el usuario. */
  setCell(a1: string, text: string | number | boolean): void {
    const p = parseCell(a1);
    if (!p) return;
    this.#doc.setInput(this.#sheet, p.r, p.c, String(text));
    this.#emitChange(p.r, p.c, String(text));
  }

  /** Selecciona un rango A1. */
  select(a1: string): void {
    const x = parseRange(a1, this.#sheet.rows, this.#sheet.cols);
    if (!x) return;
    this.#setSelection({ r: x.r1, c: x.c1, ranges: [x] });
    this.#scrollTo(x.r1, x.c1);
  }

  undo(): void { this.#cmd('undo'); }
  redo(): void { this.#cmd('redo'); }
  recalc(): void { this.#cmd('recalc'); }

  /** Ejecuta una macro guardada por nombre, o un texto de macro. */
  runMacro(nameOrCode: string): { ok: boolean; error?: string } {
    const def = this.#doc.macros.find((m) => m.name === nameOrCode);
    return this.#execMacro(def?.code ?? nameOrCode, def?.name ?? 'anónima');
  }

  /** Importa un archivo XLSX, CSV o TSV. */
  async importFile(file: File): Promise<void> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
      const doc = await readXlsx(new Uint8Array(await file.arrayBuffer()));
      this.#endEdit(false);
      this.#doc.load(doc);
      this.#afterLoad();
      this.#renderAll();
      this.#flash(`Abierto ${file.name}`);
      return;
    }
    this.#importDelimited(await file.text(), file.name.replace(/\.[^.]+$/, ''));
  }

  /** Libro como .xlsx. */
  async exportXlsx(): Promise<Blob> {
    const bytes = await writeXlsx(this.#doc);
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /** Hoja activa como CSV. */
  exportCsv(delimiter = ','): string {
    const s = this.#sheet;
    const { rows, cols } = this.#doc.engine.usedBounds(s);
    const out: string[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: string[] = [];
      for (let c = 0; c < cols; c++) row.push(this.#doc.displayText(s, r, c).text);
      out.push(row);
    }
    return toDelimited(out, delimiter);
  }

  // ---- utilidades de estado ----

  get #sheet(): Sheet { return this.#doc.sheet; }
  get #rect(): Rect { return this.#sel.ranges[this.#sel.ranges.length - 1]; }

  #publicValue(r: number, c: number): string | number {
    const v = this.#doc.engine.getValue(this.#sheet, r, c);
    if (v === null) return '';
    if (typeof v === 'number' || typeof v === 'string') return v;
    return displayValue(v);
  }

  #emitChange(r: number, c: number, raw: string, cells = 1): void {
    const detail: SpreadsheetChangeDetail = { row: r, col: c, raw, value: this.#publicValue(r, c), sheet: this.#sheet.name, cells };
    emit(this, 'iswc-change', detail);
  }

  #emitSelect(): void {
    const { r, c } = this.#sel;
    const detail: SpreadsheetSelectDetail = { row: r, col: c, value: this.#publicValue(r, c), range: rangeName(this.#rect), sheet: this.#sheet.name };
    emit(this, 'iswc-select', detail);
  }

  #emitRange(x: Rect): void {
    this.#emitChange(x.r1, x.c1, this.#doc.rawText(this.#sheet, x.r1, x.c1), (x.r2 - x.r1 + 1) * (x.c2 - x.c1 + 1));
  }

  // ---- render ----

  #schedule(): void {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#render());
  }

  /** px por em del área de la rejilla. */
  #em(): number {
    return parseFloat(getComputedStyle(this.#view).fontSize) || 13;
  }

  #geometry(): { rows: Axis; cols: Axis } {
    this.#axes ??= buildAxes(this.#doc, this.#sheet);
    return this.#axes;
  }

  #renderAll(): void {
    if (!this.mounted || !this.#doc.sheet) return;
    this.#axes = null;
    this.#render();
    this.#renderTabs();
    this.#renderCharts();
    this.#renderStatus();
    this.#syncBar();
    this.#syncRibbon();
  }

  #render(): void {
    const sheet = this.#sheet;
    if (!sheet) return;
    this.#view.style.fontSize = `${this.#zoom * 0.82}em`;
    const axes = this.#geometry();
    const em = this.#em();
    const head = rowHeadWidth(sheet);
    const everything = sheet.rows * sheet.cols <= SMALL_SHEET;
    const scroll = {
      top: Math.max(0, this.#view.scrollTop / em),
      left: Math.max(0, this.#view.scrollLeft / em),
      // Acotado a la pantalla: si la rejilla no hace scroll (sin CSS o sin alto máximo), su alto
      // crece con lo pintado y la ventana nunca dejaría de crecer.
      height: Math.min(Math.max(this.#view.clientHeight, 200), window.innerHeight) / em - HEAD_HEIGHT,
      width: Math.min(Math.max(this.#view.clientWidth, 300), window.innerWidth) / em - head,
    };
    const win = computeWindow(this.#doc, sheet, axes, scroll, everything);
    this.#win = win;
    const hadFocus = this.shadowRoot!.activeElement;
    const inGrid = !!hadFocus && (hadFocus === this.#table || this.#table.contains(hadFocus)) && hadFocus !== this.#edit?.input;
    const { freeze, gridlines } = this.#doc.extras(sheet);
    this.#table.innerHTML = renderGrid(this.#doc, sheet, axes, win, this.#cf, { showFormulas: this.#showFormulas, headings: true, activeCell: this.#activeAnchor(), zoom: this.#zoom });
    const total = head + axes.cols.total;
    this.#table.style.inlineSize = `${total}em`;
    this.#table.toggleAttribute('data-nogrid', !gridlines);
    this.#table.toggleAttribute('data-frozen', freeze.rows + freeze.cols > 0);
    this.#table.setAttribute('aria-rowcount', String(sheet.rows + 1));
    this.#table.setAttribute('aria-colcount', String(sheet.cols + 1));
    this.#table.setAttribute('aria-label', `Hoja ${sheet.name}: ${sheet.rows} filas por ${sheet.cols} columnas`);
    this.#painted = [];
    this.#paintSelection();
    this.#reattachEditor();
    if (inGrid) this.#focusActive();
  }

  #activeAnchor(): { r: number; c: number } {
    const m = this.#doc.mergeAt(this.#sheet, this.#sel.r, this.#sel.c);
    return m ? { r: m.r1, c: m.c1 } : { r: this.#sel.r, c: this.#sel.c };
  }

  #td(r: number, c: number): HTMLElement | null {
    return this.#table.querySelector<HTMLElement>(`td.cell[data-r="${r}"][data-c="${c}"]`);
  }

  #focusActive(): void {
    const a = this.#activeAnchor();
    const td = this.#td(a.r, a.c);
    (td ?? this.#table).focus({ preventScroll: true });
  }

  /** Pinta selección, referencias, recorte y vista previa de relleno. Sin rehacer la tabla. */
  #paintSelection(): void {
    for (const el of this.#painted) {
      el.classList.remove('sel', 'act', 'e-t', 'e-r', 'e-b', 'e-l', 'hl', 'rf', 'cp', 'fp');
      el.style.removeProperty('--bc');
      el.querySelector('.fh')?.remove();
    }
    this.#painted = [];
    const { r, c, ranges } = this.#sel;
    const anchor = this.#activeAnchor();
    const refs = this.#edit ? formulaRefs(this.#editText()) : [];
    const sheet = this.#sheet;
    const editSheet = this.#edit?.sheet;
    const refRects = refs.flatMap((x) => {
      const target = x.sheet === undefined ? editSheet : this.#doc.sheetByName(x.sheet);
      return target === sheet ? [x] : [];
    });
    const clip = this.#clip && this.#clip.block.sheet === sheet.id ? this.#clip.block.rect : null;
    const fill = this.#drag?.kind === 'fill' ? this.#drag.target ?? null : null;
    const multi = ranges.length > 1 || ranges[0].r1 !== ranges[0].r2 || ranges[0].c1 !== ranges[0].c2;
    const edges = (el: HTMLElement, x: Rect, r1: number, c1: number, r2: number, c2: number): void => {
      if (r1 <= x.r1) el.classList.add('e-t');
      if (r2 >= x.r2) el.classList.add('e-b');
      if (c1 <= x.c1) el.classList.add('e-l');
      if (c2 >= x.c2) el.classList.add('e-r');
    };
    for (const el of this.#table.querySelectorAll<HTMLElement>('td.cell')) {
      const r1 = Number(el.dataset.r);
      const c1 = Number(el.dataset.c);
      const r2 = Number(el.dataset.r2 ?? r1);
      const c2 = Number(el.dataset.c2 ?? c1);
      const touch = (x: Rect): boolean => r1 <= x.r2 && r2 >= x.r1 && c1 <= x.c2 && c2 >= x.c1;
      let hit = false;
      for (const x of ranges) {
        if (!touch(x)) continue;
        hit = true;
        if (multi) el.classList.add('sel');
        if (!this.#edit) edges(el, x, r1, c1, r2, c2);
      }
      if (r1 === anchor.r && c1 === anchor.c) { el.classList.add('act'); hit = true; }
      if (clip && touch(clip)) { el.classList.add('cp'); edges(el, clip, r1, c1, r2, c2); hit = true; }
      if (fill && touch(fill)) { el.classList.add('fp'); edges(el, fill, r1, c1, r2, c2); hit = true; }
      for (const ref of refRects) {
        if (!touch(ref.rect)) continue;
        el.classList.add('rf');
        el.style.setProperty('--bc', ref.color);
        edges(el, ref.rect, r1, c1, r2, c2);
        hit = true;
      }
      if (hit) this.#painted.push(el);
    }
    for (const el of this.#table.querySelectorAll<HTMLElement>('th.col-head, th.row-head')) {
      const col = el.dataset.col;
      const i = Number(col ?? el.dataset.row);
      const on = ranges.some((x) => (col !== undefined ? i >= x.c1 && i <= x.c2 : i >= x.r1 && i <= x.r2));
      if (on) { el.classList.add('hl'); this.#painted.push(el); }
    }
    const last = this.#rect;
    if (!this.#edit && !this.#readOnly() && ranges.length === 1) {
      const m = this.#doc.mergeAt(sheet, last.r2, last.c2);
      const td = this.#td(m ? m.r1 : last.r2, m ? m.c1 : last.c2);
      if (td) {
        const h = document.createElement('i');
        h.className = 'fh';
        td.append(h);
        this.#painted.push(td);
      }
    }
    this.#paintDropdown(r, c);
  }

  #paintDropdown(r: number, c: number): void {
    this.#table.querySelector('.dd')?.remove();
    const rule = this.#doc.validationAt(this.#sheet, r, c);
    if (!rule || rule.type !== 'list' || this.#edit) return;
    const td = this.#td(r, c);
    if (!td) return;
    const b = document.createElement('button');
    b.className = 'dd';
    b.tabIndex = -1;
    b.setAttribute('aria-label', 'Abrir lista');
    b.innerHTML = '<iswc-icon icon="mdi:menu-down"></iswc-icon>';
    td.append(b);
  }

  // ---- pestañas, estado y barra ----

  #renderTabs(): void {
    const items = this.#doc.engine.sheets.map((s, i) => {
      const ex = this.#doc.extras(s);
      if (ex.hidden) return '';
      const on = i === this.#doc.active;
      const tint = ex.tabColor ? ` style="--tab:${esc(ex.tabColor)}"` : '';
      return `<button class="tab${on ? ' on' : ''}" role="tab" aria-selected="${on}" data-sheet="${i}" draggable="true"${tint}>${esc(s.name)}</button>`;
    }).join('');
    const macros = this.#doc.macros.filter((m) => m.button).map((m) => `<iswc-button class="mbtn" variant="soft" color="brand" data-macro="${esc(m.name)}"><iswc-icon icon="mdi:play"></iswc-icon>${esc(m.name)}</iswc-button>`).join('');
    this.#tabs.innerHTML = `<div class="tablist" role="tablist" aria-label="Hojas">${items}</div><iswc-button class="tab-add" variant="text" color="neutral" data-cmd="sheet-add" aria-label="Nueva hoja" title="Nueva hoja"><iswc-icon icon="mdi:plus"></iswc-icon></iswc-button><span class="tab-fill"></span>${macros}`;
  }

  #renderStatus(): void {
    const x = this.#sel.ranges;
    const sheet = this.#sheet;
    const area = x.reduce((s, y) => s + (y.r2 - y.r1 + 1) * (y.c2 - y.c1 + 1), 0);
    let stats = '';
    if (area > 1 && area <= 250000) {
      let sum = 0;
      let count = 0;
      let nums = 0;
      let min = Infinity;
      let max = -Infinity;
      for (const y of x) {
        for (let r = y.r1; r <= y.r2; r++) {
          for (let c = y.c1; c <= y.c2; c++) {
            const v = this.#doc.engine.getValue(sheet, r, c);
            if (v === null) continue;
            count++;
            if (typeof v !== 'number') continue;
            nums++;
            sum += v;
            min = Math.min(min, v);
            max = Math.max(max, v);
          }
        }
      }
      const f = (n: number): string => displayValue(Number(n.toPrecision(12)));
      if (count) stats = `<span>Recuento: <b>${count}</b></span>`;
      if (nums) stats = `<span>Promedio: <b>${f(sum / nums)}</b></span>${stats}<span>Mín: <b>${f(min)}</b></span><span>Máx: <b>${f(max)}</b></span><span>Suma: <b>${f(sum)}</b></span>`;
    }
    const mode = this.#rec.recording ? '<span class="rec"><iswc-icon icon="mdi:record"></iswc-icon> Grabando</span>' : this.#edit ? (this.#point ? 'Apuntar' : 'Editar') : this.#readOnly() ? 'Solo lectura' : 'Listo';
    this.#status.innerHTML = `<span class="st-mode">${mode}</span><span class="st-fill"></span>${stats}<span class="st-zoom">${Math.round(this.#zoom * 100)} %</span>`;
  }

  #syncBar(): void {
    if (this.#edit) return;
    const { r, c } = this.#activeAnchor();
    this.#fx.value = this.#doc.rawText(this.#sheet, r, c);
    if (this.shadowRoot!.activeElement !== this.#nameBox) this.#nameBox.value = this.#sel.ranges.length === 1 && (this.#rect.r1 !== this.#rect.r2 || this.#rect.c1 !== this.#rect.c2) ? rangeName(this.#rect) : cellName(r, c);
    this.#fx.readOnly = this.#readOnly();
  }

  /** Refleja el estado de la celda activa en la cinta. */
  #syncRibbon(): void {
    const sheet = this.#sheet;
    const { r, c } = this.#activeAnchor();
    const s = this.#doc.styleAt(sheet, r, c);
    const ex = this.#doc.extras(sheet);
    const on: Record<string, boolean> = {
      bold: !!s.bold, italic: !!s.italic, underline: !!s.underline, strike: !!s.strike, wrap: !!s.wrap,
      'align-left': s.align === 'left', 'align-center': s.align === 'center', 'align-right': s.align === 'right',
      'valign-top': s.valign === 'top', 'valign-middle': s.valign === 'middle', 'valign-bottom': s.valign === 'bottom',
      'show-formulas': this.#showFormulas, gridlines: ex.gridlines, filter: !!ex.filter, 'formula-bar': !this.#bar.hidden,
      'macro-record': this.#rec.recording, painter: this.#painter !== null,
    };
    for (const el of this.#ribbon.querySelectorAll<HTMLElement>('iswc-button[data-kind="toggle"]')) {
      const active = !!on[el.dataset.cmd!];
      el.toggleAttribute('data-on', active);
      el.setAttribute('variant', active ? 'soft' : 'text');
      el.setAttribute('color', active ? 'brand' : 'neutral');
      el.setAttribute('aria-pressed', String(active));
    }
    const set = (cmd: string, value: string): void => {
      const el = this.#ribbon.querySelector<ValueEl>(`iswc-select[data-cmd="${cmd}"]`);
      if (el && el.value !== value) el.value = value;
    };
    set('font', s.font ?? 'Calibri');
    set('size', String(s.size ?? 11));
    set('numfmt', NUMBER_FORMATS.find((f) => f.fmt === (s.numFmt ?? 'General'))?.id ?? '');
    const undo = this.#ribbon.querySelector('[data-cmd="undo"]');
    const redo = this.#ribbon.querySelector('[data-cmd="redo"]');
    undo?.toggleAttribute('disabled', !this.#doc.canUndo);
    redo?.toggleAttribute('disabled', !this.#doc.canRedo);
  }

  /** Tras cualquier transacción. */
  #afterChange(): void {
    this.#axes = null;
    this.#render();
    this.#renderCharts();
    this.#renderStatus();
    this.#syncBar();
    this.#syncRibbon();
  }

  // ---- gráficos ----

  #chartData(def: ChartDef): unknown {
    const sheet = this.#sheet;
    const x = parseRange(def.range, sheet.rows, sheet.cols);
    if (!x) return null;
    const v = (r: number, c: number): Scalar => this.#doc.engine.getValue(sheet, r, c);
    const hasHead = x.r2 > x.r1 && typeof v(x.r1, x.c2) === 'string';
    const hasLabels = x.c2 > x.c1 && typeof v(x.r1 + (hasHead ? 1 : 0), x.c1) === 'string';
    const top = x.r1 + (hasHead ? 1 : 0);
    const left = x.c1 + (hasLabels ? 1 : 0);
    const labels: string[] = [];
    for (let r = top; r <= x.r2; r++) labels.push(hasLabels ? this.#doc.displayText(sheet, r, x.c1).text : String(r - top + 1));
    const datasets = [];
    for (let c = left; c <= x.c2; c++) {
      const data: (number | { x: number; y: number })[] = [];
      for (let r = top; r <= x.r2; r++) {
        const n = v(r, c);
        data.push(typeof n === 'number' ? n : 0);
      }
      datasets.push({ label: hasHead ? this.#doc.displayText(sheet, x.r1, c).text : colName(c), data });
    }
    if (def.type === 'scatter' && datasets.length > 1) {
      const xs = datasets[0].data as number[];
      return { datasets: datasets.slice(1).map((d) => ({ label: d.label, data: (d.data as number[]).map((y, i) => ({ x: xs[i], y })) })) };
    }
    return { labels, datasets };
  }

  #renderCharts(): void {
    const charts = this.#doc.extras(this.#sheet).charts;
    const keep = new Set(charts.map((c) => c.id));
    for (const el of [...this.#objects.children] as HTMLElement[]) {
      if (keep.has(el.dataset.chart ?? '')) continue;
      this.#chartCache.delete(el.dataset.chart ?? '');
      el.remove();
    }
    if (!charts.length) return;
    const head = rowHeadWidth(this.#sheet);
    for (const def of charts) {
      let box = this.#objects.querySelector<HTMLElement>(`[data-chart="${def.id}"]`);
      if (!box) {
        box = document.createElement('div');
        box.className = 'chart';
        box.dataset.chart = def.id;
        box.innerHTML = '<div class="chart-bar"><span class="chart-title"></span><button class="chart-x" aria-label="Eliminar gráfico" data-chart-del><iswc-icon icon="mdi:close"></iswc-icon></button></div><iswc-chart without-animation></iswc-chart><i class="chart-size"></i>';
        this.#objects.append(box);
      }
      box.style.insetInlineStart = `${def.x + head}em`;
      box.style.insetBlockStart = `${def.y + HEAD_HEIGHT}em`;
      box.style.inlineSize = `${def.w}em`;
      box.style.blockSize = `${def.h}em`;
      box.querySelector('.chart-title')!.textContent = def.title ?? '';
      const config = {
        type: def.type,
        data: this.#chartData(def),
        options: { indexAxis: def.horizontal ? 'y' : 'x', plugins: { legend: { display: true } }, scales: { x: { stacked: !!def.stacked }, y: { stacked: !!def.stacked } } },
      };
      const text = JSON.stringify(config);
      if (this.#chartCache.get(def.id) === text) continue;
      this.#chartCache.set(def.id, text);
      const target = box.querySelector<ValueEl>('iswc-chart')!;
      void CHART_MODULES[def.type]().catch(() => this.#flash('No se pudo cargar iswc-chart')).then(() => {
        target.setAttribute('type', def.type);
        target.config = config;
      });
    }
  }

  #addChart(kind: string): void {
    const sheet = this.#sheet;
    const x = this.#rect;
    const box = x.r1 === x.r2 && x.c1 === x.c2 ? this.#doc.currentRegion(sheet, x.r1, x.c1) : x;
    const axes = this.#geometry();
    const horizontal = kind === 'bar-h';
    const type = (horizontal ? 'bar' : kind) as ChartDef['type'];
    this.#doc.addChart(sheet, { type, horizontal, range: rangeName(box), x: axes.cols.offset(box.c2 + 1) + 1, y: axes.rows.offset(box.r1), w: CHART_COLORS.w, h: CHART_COLORS.h });
    this.#rec.record('imprimir', 'gráfico insertado');
  }

  // ---- selección ----

  #setSelection(sel: Selection, emitEvent = true): void {
    this.#sel = sel;
    this.#clampSelection();
    this.#paintSelection();
    this.#renderStatus();
    this.#syncBar();
    this.#syncRibbon();
    this.#showPrompt();
    if (emitEvent) {
      this.#rec.record('seleccionar', rangeName(this.#rect));
      this.#emitSelect();
    }
  }

  #clampSelection(): void {
    const s = this.#sheet;
    this.#sel.r = Math.min(this.#sel.r, s.rows - 1);
    this.#sel.c = Math.min(this.#sel.c, s.cols - 1);
    this.#sel.ranges = this.#sel.ranges.map((x) => ({ r1: Math.min(x.r1, s.rows - 1), c1: Math.min(x.c1, s.cols - 1), r2: Math.min(x.r2, s.rows - 1), c2: Math.min(x.c2, s.cols - 1) }));
  }

  /** Amplía un rectángulo para que no corte combinaciones. */
  #expandMerges(x: Rect): Rect {
    const merges = this.#doc.extras(this.#sheet).merges;
    if (!merges.length) return x;
    const out = { ...x };
    for (let changed = true; changed;) {
      changed = false;
      for (const m of merges) {
        if (m.r1 > out.r2 || m.r2 < out.r1 || m.c1 > out.c2 || m.c2 < out.c1) continue;
        if (m.r1 < out.r1 || m.r2 > out.r2 || m.c1 < out.c1 || m.c2 > out.c2) {
          out.r1 = Math.min(out.r1, m.r1);
          out.r2 = Math.max(out.r2, m.r2);
          out.c1 = Math.min(out.c1, m.c1);
          out.c2 = Math.max(out.c2, m.c2);
          changed = true;
        }
      }
    }
    return out;
  }

  #moveTo(r: number, c: number, extend = false): void {
    const s = this.#sheet;
    const nr = Math.max(0, Math.min(s.rows - 1, r));
    const nc = Math.max(0, Math.min(s.cols - 1, c));
    if (extend) {
      const x = this.#expandMerges(normalize({ r1: this.#sel.r, c1: this.#sel.c, r2: nr, c2: nc }));
      this.#setSelection({ ...this.#sel, ranges: [x] });
      this.#extendCursor = { r: nr, c: nc };
    } else {
      const m = this.#doc.mergeAt(s, nr, nc);
      const x = m ?? { r1: nr, c1: nc, r2: nr, c2: nc };
      this.#extendCursor = null;
      this.#setSelection({ r: nr, c: nc, ranges: [x] });
    }
    this.#scrollTo(nr, nc);
    this.#focusActive();
  }

  #extendCursor: { r: number; c: number } | null = null;

  /** Desplaza lo justo para ver una celda. */
  #scrollTo(r: number, c: number): void {
    const { rows, cols } = this.#geometry();
    const { freeze } = this.#doc.extras(this.#sheet);
    const em = this.#em();
    const head = rowHeadWidth(this.#sheet);
    const view = this.#view;
    const before = [view.scrollTop, view.scrollLeft];
    if (r >= freeze.rows) {
      const fixed = rows.offset(freeze.rows) + HEAD_HEIGHT;
      const top = rows.offset(r) - rows.offset(freeze.rows);
      const bottom = top + rows.size(r);
      const span = view.clientHeight / em - fixed;
      if (top < view.scrollTop / em) view.scrollTop = top * em;
      else if (bottom > view.scrollTop / em + span) view.scrollTop = (bottom - span) * em;
    }
    if (c >= freeze.cols) {
      const fixed = cols.offset(freeze.cols) + head;
      const left = cols.offset(c) - cols.offset(freeze.cols);
      const right = left + cols.size(c);
      const span = view.clientWidth / em - fixed;
      if (left < view.scrollLeft / em) view.scrollLeft = left * em;
      else if (right > view.scrollLeft / em + span) view.scrollLeft = (right - span) * em;
    }
    if (before[0] !== view.scrollTop || before[1] !== view.scrollLeft) this.#render();
  }

  /** Celda bajo un punto de la pantalla, por geometría (vale fuera de lo pintado). */
  #cellAt(x: number, y: number): { r: number; c: number } {
    const { rows, cols } = this.#geometry();
    const { freeze } = this.#doc.extras(this.#sheet);
    const box = this.#view.getBoundingClientRect();
    const em = this.#em();
    const head = rowHeadWidth(this.#sheet);
    const px = (x - box.left) / em - head;
    const py = (y - box.top) / em - HEAD_HEIGHT;
    const fw = cols.offset(freeze.cols);
    const fh = rows.offset(freeze.rows);
    const c = cols.indexAt(px < fw ? px : px + this.#view.scrollLeft / em);
    const r = rows.indexAt(py < fh ? py : py + this.#view.scrollTop / em);
    return { r: Math.max(0, r), c: Math.max(0, c) };
  }

  // ---- edición ----

  #editText(): string {
    const e = this.#edit;
    if (!e) return '';
    return e.source === 'bar' ? this.#fx.value : e.input.value;
  }

  #setEditText(text: string, caret?: number): void {
    const e = this.#edit;
    if (!e) return;
    e.input.value = text;
    this.#fx.value = text;
    if (caret !== undefined) {
      this.#editElement().setSelectionRange(caret, caret);
    }
    this.#afterEditInput();
  }

  #editElement(): HTMLInputElement | HTMLTextAreaElement {
    return this.#edit?.source === 'bar' ? this.#fx : this.#edit!.input;
  }

  /** Abre el editor. Devuelve null en solo lectura. */
  #beginEdit(r: number, c: number, opts: { text?: string; quick?: boolean; source?: 'cell' | 'bar'; select?: boolean } = {}): Edit | null {
    if (this.#readOnly()) return null;
    this.#scrollTo(r, c);
    const original = this.#doc.rawText(this.#sheet, r, c);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cell-input';
    input.spellcheck = false;
    input.setAttribute('aria-label', `Editar ${cellName(r, c)}`);
    const text = opts.text ?? original;
    input.value = text;
    this.#edit = { sheet: this.#sheet, r, c, input, original, quick: !!opts.quick, source: opts.source ?? 'cell' };
    this.#fx.value = text;
    input.addEventListener('keydown', this.#onEditKey);
    input.addEventListener('input', this.#onCellInput);
    input.addEventListener('click', () => this.#afterEditInput());
    input.addEventListener('keyup', this.#onEditCaret);
    this.#reattachEditor();
    if (opts.source !== 'bar') {
      input.focus({ preventScroll: true });
      if (opts.select) input.select();
      else input.setSelectionRange(text.length, text.length);
    }
    this.#paintSelection();
    this.#renderStatus();
    this.#afterEditInput();
    return this.#edit;
  }

  /** Coloca el input en su celda tras un repintado. */
  #reattachEditor(): void {
    const e = this.#edit;
    if (!e || e.sheet !== this.#sheet) return;
    const td = this.#td(e.r, e.c);
    if (!td) return;
    const hadFocus = this.shadowRoot!.activeElement === e.input;
    td.classList.add('editing');
    td.append(e.input);
    const width = this.#doc.colWidth(e.sheet, e.c);
    e.input.style.minInlineSize = `${Math.max(width, Math.min(30, e.input.value.length * 0.56))}em`;
    if (hadFocus) e.input.focus({ preventScroll: true });
  }

  #onCellInput = (): void => {
    if (!this.#edit) return;
    this.#edit.source = 'cell';
    this.#fx.value = this.#edit.input.value;
    this.#point = null;
    this.#afterEditInput();
  };

  #onEditCaret = (e: KeyboardEvent): void => {
    if (this.#suggest && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;
    if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') this.#afterEditInput();
  };

  #afterEditInput(): void {
    const e = this.#edit;
    if (!e) return;
    e.input.style.minInlineSize = `${Math.max(this.#doc.colWidth(e.sheet, e.c), Math.min(30, e.input.value.length * 0.56))}em`;
    this.#paintSelection();
    this.#updateAssist();
  }

  /** Cierra el editor. Devuelve false si la validación impide confirmar. */
  #endEdit(commit: boolean): boolean {
    const e = this.#edit;
    if (!e) return true;
    const text = this.#editText();
    if (commit && text !== e.original) {
      if (!this.#validate(e, text)) return false;
    }
    e.input.removeEventListener('keydown', this.#onEditKey);
    e.input.removeEventListener('input', this.#onCellInput);
    e.input.removeEventListener('keyup', this.#onEditCaret);
    e.input.closest('td')?.classList.remove('editing');
    e.input.remove();
    this.#edit = null;
    this.#point = null;
    this.#hideAssist();
    const sheetBack = e.sheet !== this.#sheet ? this.#doc.engine.sheets.indexOf(e.sheet) : -1;
    if (sheetBack >= 0) this.#doc.active = sheetBack;
    if (commit && text !== e.original) {
      this.#doc.setInput(e.sheet, e.r, e.c, text);
      if (this.#doc.styleAt(e.sheet, e.r, e.c).wrap) this.#autofitRow([e.r]);
      this.#rec.record('escribir', cellName(e.r, e.c), text);
      this.#emitChange(e.r, e.c, text);
    } else {
      this.#syncBar();
      this.#paintSelection();
    }
    if (sheetBack >= 0) this.#renderAll();
    this.#renderStatus();
    return true;
  }

  #validate(e: Edit, text: string): boolean {
    const rule = this.#doc.validationAt(e.sheet, e.r, e.c);
    if (!rule || isValid(this.#doc, e.sheet, rule, e.r, e.c, text)) return true;
    const msg = rule.message || 'El valor no cumple la validación de esta celda.';
    this.#flash(msg);
    return rule.severity === 'warning' || rule.severity === 'info';
  }

  #onEditKey = (e: KeyboardEvent): void => {
    const edit = this.#edit;
    if (!edit) return;
    if (this.#suggest) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = this.#suggest.items.length;
        this.#suggest.index = (this.#suggest.index + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
        this.#drawSuggest();
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (this.#suggest.index >= 0 || e.key === 'Tab') {
          e.preventDefault();
          this.#acceptSuggestion(Math.max(0, this.#suggest.index));
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.#hideAssist();
        return;
      }
    }
    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      const el = this.#editElement();
      const pos = el.selectionStart ?? el.value.length;
      const text = `${el.value.slice(0, pos)}\n${el.value.slice(el.selectionEnd ?? pos)}`;
      edit.source = 'bar';
      this.#fx.value = text;
      this.#fx.focus();
      this.#fx.setSelectionRange(pos + 1, pos + 1);
      edit.input.value = text.replace(/\n/g, ' ');
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) { this.#commitToSelection(); return; }
      if (this.#endEdit(true)) this.#advance(e.shiftKey ? -1 : 1, 0);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (this.#endEdit(true)) this.#advance(0, e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.#endEdit(false);
      this.#focusActive();
      return;
    }
    if (e.key === 'F4') {
      e.preventDefault();
      const el = this.#editElement();
      const text = el.value;
      const hit = refAtCaret(text, el.selectionStart ?? 0);
      if (!hit) return;
      const next = cycleAbsolute(text.slice(hit.pos, hit.end));
      this.#setEditText(text.slice(0, hit.pos) + next + text.slice(hit.end), hit.pos + next.length);
      return;
    }
    const arrow = ARROWS[e.key];
    if (arrow && edit.source === 'cell') {
      const el = this.#editElement();
      const pointing = this.#point || canPoint(el.value, el.selectionStart ?? 0);
      if (pointing && /^\s*=/.test(el.value)) {
        e.preventDefault();
        this.#pointByKey(arrow[0], arrow[1], e.shiftKey);
        return;
      }
      if (edit.quick) {
        e.preventDefault();
        if (this.#endEdit(true)) this.#moveTo(this.#sel.r + arrow[0], this.#sel.c + arrow[1]);
      }
    }
  };

  /** Ctrl+Enter: escribe lo mismo en toda la selección. */
  #commitToSelection(): void {
    const e = this.#edit;
    if (!e) return;
    const text = this.#editText();
    const ranges = this.#sel.ranges;
    this.#endEdit(false);
    this.#doc.transact('Escribir en selección', () => {
      for (const x of ranges) {
        for (let r = x.r1; r <= x.r2; r++) {
          for (let c = x.c1; c <= x.c2; c++) this.#doc.setInput(this.#sheet, r, c, text);
        }
      }
    });
    this.#emitRange(this.#rect);
    this.#focusActive();
  }

  /** Enter y Tab recorren la selección si hay varias celdas. */
  #advance(dr: number, dc: number): void {
    const x = this.#rect;
    const multi = x.r1 !== x.r2 || x.c1 !== x.c2;
    if (!multi) { this.#moveTo(this.#sel.r + dr, this.#sel.c + dc); return; }
    let { r, c } = this.#sel;
    r += dr;
    c += dc;
    if (r > x.r2) { r = x.r1; c = c === x.c2 ? x.c1 : c + 1; }
    if (r < x.r1) { r = x.r2; c = c === x.c1 ? x.c2 : c - 1; }
    if (c > x.c2) { c = x.c1; r = r === x.r2 ? x.r1 : r + 1; }
    if (c < x.c1) { c = x.c2; r = r === x.r1 ? x.r2 : r - 1; }
    this.#setSelection({ r, c, ranges: this.#sel.ranges });
    this.#scrollTo(r, c);
    this.#focusActive();
  }

  // ---- modo apuntar ----

  #sheetPrefix(): string {
    const e = this.#edit;
    return e && e.sheet !== this.#sheet ? `${quoteSheet(this.#sheet.name)}!` : '';
  }

  #pointInsert(x: Rect, anchor: { r: number; c: number }): void {
    const el = this.#editElement();
    const text = el.value;
    const ref = rectText(x, this.#sheetPrefix());
    const start = this.#point?.start ?? el.selectionStart ?? text.length;
    const end = this.#point?.end ?? el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + ref + text.slice(end);
    this.#point = { start, end: start + ref.length, anchor };
    this.#setEditText(next, start + ref.length);
    this.#renderStatus();
  }

  #pointByKey(dr: number, dc: number, extend: boolean): void {
    const base = this.#pointCursor ?? { r: this.#edit!.r, c: this.#edit!.c };
    const r = Math.max(0, base.r + dr);
    const c = Math.max(0, base.c + dc);
    this.#pointCursor = { r, c };
    const anchor = extend && this.#point ? this.#point.anchor : { r, c };
    this.#pointInsert(normalize({ r1: anchor.r, c1: anchor.c, r2: r, c2: c }), anchor);
    this.#scrollToKeepFocus(r, c);
  }

  #pointCursor: { r: number; c: number } | null = null;

  #scrollToKeepFocus(r: number, c: number): void {
    this.#scrollTo(r, c);
    this.#edit?.input.focus({ preventScroll: true });
  }

  // ---- ayudas de fórmula ----

  #updateAssist(): void {
    const e = this.#edit;
    if (!e) { this.#hideAssist(); return; }
    const el = this.#editElement();
    const caret = el.selectionStart ?? el.value.length;
    const text = el.value;
    const hits = suggestionsAt(text, caret, this.#doc.locale, [...this.#doc.engine.names.values()].map((n) => n.name));
    this.#suggest = hits ? { ...hits, index: hits.items.length ? 0 : -1 } : null;
    if (this.#suggest) { this.#drawSuggest(); return; }
    const sig = signatureAt(text, caret);
    if (!sig) { this.#assist.hidden = true; return; }
    const p = signatureParts(sig.def, sig.arg, this.#doc.locale);
    this.#assist.className = 'assist sig';
    this.#assist.innerHTML = `<div class="sig-line"><b>${esc(p.name)}</b>(${p.params.map((x) => `<span class="${x.active ? 'on' : ''}">${esc(x.text)}</span>`).join(', ')})</div><div class="sig-desc">${esc(sig.def.desc)}</div>`;
    this.#placeAssist();
  }

  #drawSuggest(): void {
    const s = this.#suggest;
    if (!s) return;
    this.#assist.className = 'assist list';
    this.#assist.innerHTML = s.items.map((it, i) => `<button class="sg${i === s.index ? ' on' : ''}" data-i="${i}" tabindex="-1"><b>${esc(it.label)}</b><span>${esc(it.hint)}</span></button>`).join('');
    this.#placeAssist();
  }

  #placeAssist(): void {
    const el = this.#editElement();
    const box = el.getBoundingClientRect();
    const host = this.#root.getBoundingClientRect();
    this.#assist.hidden = false;
    this.#assist.style.insetInlineStart = `${(box.left - host.left) / this.#hostEm()}em`;
    this.#assist.style.insetBlockStart = `${(box.bottom - host.top) / this.#hostEm() + 0.2}em`;
  }

  #hostEm(): number {
    return parseFloat(getComputedStyle(this.#root).fontSize) || 16;
  }

  #hideAssist(): void {
    this.#suggest = null;
    this.#assist.hidden = true;
  }

  #acceptSuggestion(i: number): void {
    const s = this.#suggest;
    if (!s) return;
    const el = this.#editElement();
    const text = el.value;
    const insert = s.items[i].insert;
    this.#hideAssist();
    this.#setEditText(text.slice(0, s.start) + insert + text.slice(s.end), s.start + insert.length);
    el.focus({ preventScroll: true });
  }

  // ---- teclado de la rejilla ----

  /** Extremo del bloque de datos en una dirección (Ctrl+flecha). */
  #jump(r: number, c: number, dr: number, dc: number): { r: number; c: number } {
    const s = this.#sheet;
    const filled = (y: number, x: number): boolean => this.#doc.engine.getValue(s, y, x) !== null;
    let y = r + dr;
    let x = c + dc;
    const inside = (a: number, b: number): boolean => a >= 0 && b >= 0 && a < s.rows && b < s.cols;
    if (!inside(y, x)) return { r, c };
    const bounds = this.#doc.engine.usedBounds(s);
    if (filled(r, c) && filled(y, x)) {
      while (inside(y + dr, x + dc) && filled(y + dr, x + dc)) { y += dr; x += dc; }
      return { r: y, c: x };
    }
    while (inside(y, x) && !filled(y, x)) {
      if ((dr > 0 && y >= bounds.rows) || (dc > 0 && x >= bounds.cols)) return { r: dr ? s.rows - 1 : y, c: dc ? s.cols - 1 : x };
      y += dr;
      x += dc;
    }
    return inside(y, x) ? { r: y, c: x } : { r: Math.max(0, y - dr), c: Math.max(0, x - dc) };
  }

  #onGridKey = (e: KeyboardEvent): void => {
    if (this.#edit) return;
    const target = e.target as HTMLElement;
    if (target !== this.#table && !this.#table.contains(target)) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const cur = this.#extendCursor ?? { r: this.#sel.r, c: this.#sel.c };
    const arrow = ARROWS[e.key];
    const consume = (): void => { e.preventDefault(); e.stopPropagation(); };
    if (e.altKey && e.key === 'ArrowDown') { consume(); this.#openDropdown(); return; }
    if (arrow) {
      consume();
      if (ctrl) {
        const to = this.#jump(shift ? cur.r : this.#sel.r, shift ? cur.c : this.#sel.c, arrow[0], arrow[1]);
        this.#moveTo(to.r, to.c, shift);
        return;
      }
      const next = this.#stepVisible(shift ? cur.r : this.#sel.r, shift ? cur.c : this.#sel.c, arrow[0], arrow[1]);
      this.#moveTo(next.r, next.c, shift);
      return;
    }
    if (e.key === 'Tab') { consume(); this.#advance(0, shift ? -1 : 1); return; }
    if (e.key === 'Enter') {
      consume();
      if (this.#rect.r1 !== this.#rect.r2 || this.#rect.c1 !== this.#rect.c2) { this.#advance(shift ? -1 : 1, 0); return; }
      if (shift) { this.#advance(-1, 0); return; }
      const { r, c } = this.#activeAnchor();
      const edit = this.#beginEdit(r, c, { select: false });
      if (edit) edit.quick = false;
      return;
    }
    if (e.key === 'F2') {
      consume();
      if (shift) { this.#cmd('comment'); return; }
      const { r, c } = this.#activeAnchor();
      this.#beginEdit(r, c);
      return;
    }
    if (e.key === 'Escape') {
      consume();
      if (this.#clip) { this.#clip = null; this.#paintSelection(); }
      if (this.#painter !== null) { this.#painter = null; this.#syncRibbon(); }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      consume();
      if (this.#readOnly()) return;
      this.#cmd('clear-contents');
      if (e.key === 'Backspace') {
        const { r, c } = this.#activeAnchor();
        this.#beginEdit(r, c, { text: '', quick: true });
      }
      return;
    }
    if (e.key === 'Home') {
      consume();
      if (ctrl) this.#moveTo(0, 0, shift);
      else this.#moveTo(shift ? cur.r : this.#sel.r, 0, shift);
      return;
    }
    if (e.key === 'End' && ctrl) {
      consume();
      const b = this.#doc.engine.usedBounds(this.#sheet);
      this.#moveTo(Math.max(0, b.rows - 1), Math.max(0, b.cols - 1), shift);
      return;
    }
    if (e.key === 'PageDown' || e.key === 'PageUp') {
      consume();
      const dir = e.key === 'PageDown' ? 1 : -1;
      if (ctrl) { this.#switchSheet(this.#doc.active + dir); return; }
      const em = this.#em();
      const page = Math.max(1, Math.floor(this.#view.clientHeight / em / 1.75) - 2);
      const span = Math.max(1, Math.floor(this.#view.clientWidth / em / 6.5) - 1);
      if (e.altKey) this.#moveTo(this.#sel.r, this.#sel.c + dir * span, shift);
      else this.#moveTo(cur.r + dir * page, this.#sel.c, shift);
      return;
    }
    if (e.key === 'F4') { consume(); this.#repeatLast(); return; }
    if (e.key === 'F9') { consume(); this.#cmd('recalc'); return; }
    if (e.key === 'F11' && shift) { consume(); this.#cmd('sheet-add'); return; }
    if (e.key === 'F3' && shift) { consume(); this.#cmd('fx'); return; }
    if (e.key === 'F8' && e.altKey) { consume(); this.#cmd('macro-editor'); return; }
    if (e.key === 'F5') { consume(); this.#cmd('goto'); return; }
    if (e.altKey && (e.key === '=' || e.key === '+')) { consume(); this.#cmd('autosum'); return; }
    if (e.key === ' ' && ctrl) {
      consume();
      this.#setSelection({ ...this.#sel, ranges: [{ r1: 0, c1: this.#rect.c1, r2: this.#sheet.rows - 1, c2: this.#rect.c2 }] });
      return;
    }
    if (e.key === ' ' && shift) {
      consume();
      this.#setSelection({ ...this.#sel, ranges: [{ r1: this.#rect.r1, c1: 0, r2: this.#rect.r2, c2: this.#sheet.cols - 1 }] });
      return;
    }
    if (ctrl && this.#runShortcut(e)) { consume(); return; }
    if (!ctrl && this.#matchMacroKey(e)) { consume(); return; }
    if (e.key.length === 1 && !ctrl && !e.metaKey && !e.altKey) {
      if (this.#readOnly()) return;
      consume();
      const { r, c } = this.#activeAnchor();
      this.#beginEdit(r, c, { text: e.key, quick: true });
      return;
    }
    if (e.key.length === 1 && e.ctrlKey && e.altKey) {
      if (this.#readOnly()) return;
      consume();
      const { r, c } = this.#activeAnchor();
      this.#beginEdit(r, c, { text: e.key, quick: true });
    }
  };

  /** Siguiente celda visible: salta ocultas y combinaciones. */
  #stepVisible(r: number, c: number, dr: number, dc: number): { r: number; c: number } {
    const s = this.#sheet;
    const m = this.#doc.mergeAt(s, r, c);
    let y = r;
    let x = c;
    if (m) {
      if (dr > 0) y = m.r2;
      if (dc > 0) x = m.c2;
    }
    do {
      y += dr;
      x += dc;
    } while (y >= 0 && x >= 0 && y < s.rows && x < s.cols && (this.#doc.rowHidden(s, y) || this.#doc.colHidden(s, x)));
    return { r: y, c: x };
  }

  /** Atajos con Ctrl. Devuelve true si consumió la tecla. */
  #runShortcut(e: KeyboardEvent): boolean {
    const key = e.key.toLowerCase();
    const shift = e.shiftKey;
    if (this.#matchMacroKey(e)) return true;
    const map: Record<string, string> = {
      b: 'bold', i: 'italic', u: 'underline', k: 'link', '2': 'bold', '3': 'italic', '4': 'underline', '5': 'strike',
      z: 'undo', y: 'redo', d: 'fill-down', r: 'fill-right', e: 'flash-fill', f: 'find', h: 'find', g: 'goto', '1': 'format-dialog', '`': 'show-formulas', "'": 'show-formulas',
    };
    if (shift) {
      const sh: Record<string, string> = { l: 'filter', '~': 'fmt-general', '!': 'fmt-number', '@': 'fmt-time', '#': 'fmt-date', $: 'fmt-currency', '%': 'fmt-percent', '^': 'fmt-scientific', '&': 'border-outer', _: 'border-none', '+': 'insert-smart', z: 'redo', ':': 'now-time', ';': 'now-time' };
      const cmd = sh[key];
      if (cmd) { this.#cmd(cmd); return true; }
      if (key === '*' || key === '8') {
        const x = this.#doc.currentRegion(this.#sheet, this.#sel.r, this.#sel.c);
        this.#setSelection({ ...this.#sel, ranges: [x] });
        return true;
      }
      return false;
    }
    if (key === 'a') {
      this.#setSelection({ ...this.#sel, ranges: [{ r1: 0, c1: 0, r2: this.#sheet.rows - 1, c2: this.#sheet.cols - 1 }] });
      return true;
    }
    if (key === ';') { this.#cmd('now-date'); return true; }
    if (key === '-') { this.#cmd('delete-smart'); return true; }
    if (key === '9') { this.#cmd('hide-row'); return true; }
    if (key === '0') { this.#cmd('hide-col'); return true; }
    if (key === 'c' || key === 'x' || key === 'v') return false;
    const cmd = map[key];
    if (!cmd) return false;
    this.#cmd(cmd);
    return true;
  }

  #lastCmd: [string, string | undefined] | null = null;

  #repeatLast(): void {
    if (this.#lastCmd) this.#cmd(this.#lastCmd[0], this.#lastCmd[1]);
  }

  #matchMacroKey(e: KeyboardEvent): boolean {
    const combo = `${e.ctrlKey || e.metaKey ? 'ctrl+' : ''}${e.altKey ? 'alt+' : ''}${e.shiftKey ? 'shift+' : ''}${e.key.toLowerCase()}`;
    const def = this.#doc.macros.find((m) => m.shortcut?.toLowerCase().replace(/\s/g, '') === combo);
    if (!def) return false;
    this.#execMacro(def.code, def.name);
    return true;
  }

  // ---- ratón ----

  #bind(): void {
    const v = this.#view;
    v.addEventListener('mousedown', this.#onMouseDown);
    v.addEventListener('dblclick', this.#onDblClick);
    v.addEventListener('contextmenu', this.#onContext);
    v.addEventListener('scroll', () => this.#schedule(), { passive: true });
    v.addEventListener('keydown', this.#onGridKey);
    v.addEventListener('mouseover', this.#onHover);
    v.addEventListener('mouseout', () => { this.#note.hidden = true; });
    this.#table.addEventListener('click', this.#onSyntheticClick);
    const root = this.shadowRoot!;
    root.addEventListener('copy', this.#onCopy as EventListener);
    root.addEventListener('cut', this.#onCut as EventListener);
    root.addEventListener('paste', this.#onPaste as EventListener);
    this.#ribbon.addEventListener('click', this.#onCommandClick);
    this.#bar.addEventListener('click', this.#onCommandClick);
    this.#tabs.addEventListener('click', this.#onTabClick);
    this.#tabs.addEventListener('dblclick', this.#onTabDbl);
    this.#tabs.addEventListener('contextmenu', this.#onTabContext);
    this.#tabs.addEventListener('dragstart', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-sheet]');
      if (t) e.dataTransfer?.setData('text/x-iswc-sheet', t.dataset.sheet!);
    });
    this.#tabs.addEventListener('dragover', (e) => e.preventDefault());
    this.#tabs.addEventListener('drop', this.#onTabDrop);
    this.#ribbon.addEventListener('mousedown', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('iswc-button') && this.#edit) e.preventDefault();
    });
    this.#ribbon.addEventListener('iswc-change', this.#onRibbonChange);
    this.#fx.addEventListener('focus', this.#onBarFocus);
    this.#fx.addEventListener('input', this.#onBarInput);
    this.#fx.addEventListener('keydown', this.#onBarKey);
    this.#fx.addEventListener('click', () => this.#afterEditInput());
    this.#nameBox.addEventListener('keydown', this.#onNameKey);
    this.#nameBox.addEventListener('focus', () => this.#nameBox.select());
    this.#assist.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const i = (e.target as HTMLElement).closest<HTMLElement>('[data-i]')?.dataset.i;
      if (i !== undefined) this.#acceptSuggestion(Number(i));
    });
    const menu = this.#menu;
    menu.addEventListener('iswc-select', (e) => {
      e.stopPropagation();
      const item = (e as CustomEvent<{ item: HTMLElement; value: string }>).detail;
      const handler = this.#menuHandler;
      if (handler) handler(item.value, item.item?.dataset?.arg ?? '');
    });
    // Los controles internos no deben asomarse como si fueran eventos de la hoja.
    for (const name of ['iswc-change', 'iswc-input', 'iswc-select', 'iswc-show', 'iswc-hide', 'iswc-after-show', 'iswc-after-hide', 'iswc-open', 'iswc-close', 'iswc-tab-show', 'iswc-tab-hide', 'iswc-ready']) {
      this.#root.addEventListener(name, (e) => e.stopPropagation());
    }
    this.#dialog.addEventListener('click', this.#onDialogClick);
    this.#dialog.addEventListener('iswc-after-hide', () => this.#focusIfIdle());
  }

  #focusIfIdle(): void {
    if (!this.#edit) this.#focusActive();
  }

  /** `el.click()` sin ratón real abre el editor: contrato heredado del componente. */
  #onSyntheticClick = (e: MouseEvent): void => {
    if (e.detail !== 0) return;
    const td = (e.target as HTMLElement).closest<HTMLElement>('td.cell');
    if (!td) return;
    const r = Number(td.dataset.r);
    const c = Number(td.dataset.c);
    this.#endEdit(true);
    this.#setSelection({ r, c, ranges: [{ r1: r, c1: c, r2: r, c2: c }] }, false);
    this.#beginEdit(r, c, { select: true });
  };

  #onMouseDown = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;
    if (e.button === 2) return;
    if (t.closest('.chart')) { this.#onChartDown(e, t); return; }
    if (t.closest('.fb')) {
      e.preventDefault();
      this.#openFilterPanel(Number(t.closest<HTMLElement>('.fb')!.dataset.filter), t.closest<HTMLElement>('.fb')!);
      return;
    }
    if (t.closest('.dd')) { e.preventDefault(); this.#openDropdown(); return; }
    if (t.classList.contains('cell-input')) return;
    if (t.closest('.corner')) {
      e.preventDefault();
      this.#endEdit(true);
      this.#setSelection({ r: 0, c: 0, ranges: [{ r1: 0, c1: 0, r2: this.#sheet.rows - 1, c2: this.#sheet.cols - 1 }] });
      this.#focusActive();
      return;
    }
    if (t.classList.contains('rsz')) { this.#startResize(e, 'resize-col', Number(t.closest<HTMLElement>('th')!.dataset.col)); return; }
    if (t.classList.contains('rsz-r')) { this.#startResize(e, 'resize-row', Number(t.closest<HTMLElement>('th')!.dataset.row)); return; }
    const colHead = t.closest<HTMLElement>('th.col-head');
    if (colHead) { this.#headerDown(e, 'col', Number(colHead.dataset.col)); return; }
    const rowHead = t.closest<HTMLElement>('th.row-head');
    if (rowHead) { this.#headerDown(e, 'row', Number(rowHead.dataset.row)); return; }
    const td = t.closest<HTMLElement>('td.cell');
    if (!td) return;
    e.preventDefault();
    const r = Number(td.dataset.r);
    const c = Number(td.dataset.c);
    if (t.classList.contains('fh')) { this.#startFill(e); return; }
    if (this.#edit) {
      const el = this.#editElement();
      if (/^\s*=/.test(el.value) && (this.#point || canPoint(el.value, el.selectionStart ?? 0))) {
        this.#point = this.#point && e.shiftKey ? this.#point : null;
        const anchor = { r, c };
        this.#pointInsert({ r1: r, c1: c, r2: r, c2: c }, anchor);
        this.#pointCursor = anchor;
        this.#startDrag({ kind: 'point' });
        el.focus({ preventScroll: true });
        return;
      }
      if (!this.#endEdit(true)) return;
    }
    if (e.ctrlKey || e.metaKey) {
      const url = this.#doc.engine.getCell(this.#sheet, r, c)?.l;
      if (url && /^(https?:|mailto:)/i.test(url)) { window.open(url, '_blank', 'noopener'); return; }
    }
    const m = this.#doc.mergeAt(this.#sheet, r, c);
    const base = m ?? { r1: r, c1: c, r2: r, c2: c };
    if (e.shiftKey) {
      const x = this.#expandMerges(normalize({ r1: this.#sel.r, c1: this.#sel.c, r2: r, c2: c }));
      this.#setSelection({ ...this.#sel, ranges: [...this.#sel.ranges.slice(0, -1), x] });
    } else if (e.ctrlKey || e.metaKey) {
      this.#setSelection({ r, c, ranges: [...this.#sel.ranges, base] });
    } else {
      this.#setSelection({ r, c, ranges: [base] });
    }
    this.#extendCursor = null;
    this.#focusActive();
    this.#startDrag({ kind: 'select', add: e.ctrlKey || e.metaKey });
  };

  #startDrag(d: Drag): void {
    this.#drag = d;
    document.addEventListener('mousemove', this.#onDragMove);
    document.addEventListener('mouseup', this.#onDragEnd);
  }

  #endDrag(): void {
    this.#drag = null;
    document.removeEventListener('mousemove', this.#onDragMove);
    document.removeEventListener('mouseup', this.#onDragEnd);
  }

  #autoScroll(e: MouseEvent): void {
    const box = this.#view.getBoundingClientRect();
    const em = this.#em();
    const margin = 2 * em;
    if (e.clientY > box.bottom - margin) this.#view.scrollTop += em * 2;
    else if (e.clientY < box.top + margin + HEAD_HEIGHT * em) this.#view.scrollTop -= em * 2;
    if (e.clientX > box.right - margin) this.#view.scrollLeft += em * 4;
    else if (e.clientX < box.left + margin + rowHeadWidth(this.#sheet) * em) this.#view.scrollLeft -= em * 4;
  }

  #onDragMove = (e: MouseEvent): void => {
    const d = this.#drag;
    if (!d) return;
    const pos = this.#cellAt(e.clientX, e.clientY);
    d.pos = pos;
    const em = this.#em();
    switch (d.kind) {
      case 'select': {
        this.#autoScroll(e);
        const x = this.#expandMerges(normalize({ r1: this.#sel.r, c1: this.#sel.c, r2: pos.r, c2: pos.c }));
        this.#sel.ranges = [...this.#sel.ranges.slice(0, -1), x];
        this.#paintSelection();
        this.#renderStatus();
        this.#syncBar();
        break;
      }
      case 'col': case 'row': {
        this.#autoScroll(e);
        const s = this.#sheet;
        const a = d.index!;
        const x = d.kind === 'col' ? { r1: 0, c1: Math.min(a, pos.c), r2: s.rows - 1, c2: Math.max(a, pos.c) } : { r1: Math.min(a, pos.r), c1: 0, r2: Math.max(a, pos.r), c2: s.cols - 1 };
        this.#sel.ranges = [...this.#sel.ranges.slice(0, -1), x];
        this.#paintSelection();
        this.#renderStatus();
        break;
      }
      case 'point': {
        this.#autoScroll(e);
        const anchor = this.#point?.anchor ?? pos;
        this.#pointInsert(normalize({ r1: anchor.r, c1: anchor.c, r2: pos.r, c2: pos.c }), anchor);
        break;
      }
      case 'fill': {
        this.#autoScroll(e);
        d.target = this.#fillTarget(pos);
        d.alternate = e.ctrlKey;
        this.#paintSelection();
        break;
      }
      case 'resize-col': {
        const box = this.#view.getBoundingClientRect();
        this.#guide.hidden = false;
        this.#guide.className = 'guide v';
        this.#guide.style.insetInlineStart = `${(e.clientX - box.left + this.#view.scrollLeft) / em}em`;
        this.#guide.style.insetBlockStart = `${this.#view.scrollTop / em}em`;
        break;
      }
      case 'resize-row': {
        const box = this.#view.getBoundingClientRect();
        this.#guide.hidden = false;
        this.#guide.className = 'guide h';
        this.#guide.style.insetBlockStart = `${(e.clientY - box.top + this.#view.scrollTop) / em}em`;
        this.#guide.style.insetInlineStart = `${this.#view.scrollLeft / em}em`;
        break;
      }
      case 'chart-move': case 'chart-size': {
        const box = this.#objects.querySelector<HTMLElement>(`[data-chart="${d.chart!.id}"]`);
        if (!box) break;
        const dx = (e.clientX - d.origin!.x) / em;
        const dy = (e.clientY - d.origin!.y) / em;
        const head = rowHeadWidth(this.#sheet);
        if (d.kind === 'chart-move') {
          box.style.insetInlineStart = `${Math.max(0, d.chart!.x + dx) + head}em`;
          box.style.insetBlockStart = `${Math.max(0, d.chart!.y + dy) + HEAD_HEIGHT}em`;
        } else {
          box.style.inlineSize = `${Math.max(10, d.chart!.w + dx)}em`;
          box.style.blockSize = `${Math.max(6, d.chart!.h + dy)}em`;
        }
        break;
      }
      default:
    }
  };

  #onDragEnd = (e: MouseEvent): void => {
    const d = this.#drag;
    this.#endDrag();
    if (!d) return;
    const em = this.#em();
    switch (d.kind) {
      case 'select': case 'col': case 'row':
        this.#syncRibbon();
        this.#applyPainter();
        this.#rec.record('seleccionar', rangeName(this.#rect));
        this.#emitSelect();
        break;
      case 'point':
        this.#edit?.input.focus({ preventScroll: true });
        break;
      case 'fill': {
        if (d.target) this.#doFill(d.target, !!d.alternate);
        else this.#paintSelection();
        break;
      }
      case 'resize-col': {
        this.#guide.hidden = true;
        const delta = (e.clientX - d.start!) / em;
        const width = Math.max(RESIZE_MIN, this.#doc.colWidth(this.#sheet, d.index!) + delta);
        const x = this.#rect;
        const list = d.index! >= x.c1 && d.index! <= x.c2 && x.r2 - x.r1 === this.#sheet.rows - 1 ? Array.from({ length: x.c2 - x.c1 + 1 }, (_, i) => x.c1 + i) : [d.index!];
        this.#doc.setColWidth(this.#sheet, list, Number(width.toFixed(2)));
        this.#rec.record('anchoColumna', colName(d.index!), Number(width.toFixed(2)));
        break;
      }
      case 'resize-row': {
        this.#guide.hidden = true;
        const delta = (e.clientY - d.start!) / em;
        const height = Math.max(RESIZE_MIN, this.#doc.rowHeight(this.#sheet, d.index!) + delta);
        const x = this.#rect;
        const list = d.index! >= x.r1 && d.index! <= x.r2 && x.c2 - x.c1 === this.#sheet.cols - 1 ? Array.from({ length: x.r2 - x.r1 + 1 }, (_, i) => x.r1 + i) : [d.index!];
        this.#doc.setRowHeight(this.#sheet, list, Number(height.toFixed(2)));
        this.#rec.record('altoFila', d.index! + 1, Number(height.toFixed(2)));
        break;
      }
      case 'chart-move': case 'chart-size': {
        const dx = (e.clientX - d.origin!.x) / em;
        const dy = (e.clientY - d.origin!.y) / em;
        if (Math.abs(dx) + Math.abs(dy) < 0.1) break;
        const c = d.chart!;
        const patch = d.kind === 'chart-move' ? { x: Math.max(0, c.x + dx), y: Math.max(0, c.y + dy) } : { w: Math.max(10, c.w + dx), h: Math.max(6, c.h + dy) };
        this.#doc.updateChart(this.#sheet, c.id, patch);
        this.#chartCache.delete(c.id);
        this.#renderCharts();
        break;
      }
    }
  };

  #startResize(e: MouseEvent, kind: 'resize-col' | 'resize-row', index: number): void {
    e.preventDefault();
    e.stopPropagation();
    this.#startDrag({ kind, index, start: kind === 'resize-col' ? e.clientX : e.clientY });
  }

  #headerDown(e: MouseEvent, axis: 'col' | 'row', i: number): void {
    e.preventDefault();
    if (this.#edit && !this.#endEdit(true)) return;
    const s = this.#sheet;
    const whole = axis === 'col' ? { r1: 0, c1: i, r2: s.rows - 1, c2: i } : { r1: i, c1: 0, r2: i, c2: s.cols - 1 };
    const top = axis === 'col' ? { r: this.#firstVisibleRow(), c: i } : { r: i, c: this.#firstVisibleCol() };
    if (e.shiftKey) {
      const x = axis === 'col' ? { ...whole, c1: Math.min(this.#sel.c, i), c2: Math.max(this.#sel.c, i) } : { ...whole, r1: Math.min(this.#sel.r, i), r2: Math.max(this.#sel.r, i) };
      this.#setSelection({ ...this.#sel, ranges: [x] });
    } else if (e.ctrlKey || e.metaKey) this.#setSelection({ ...top, ranges: [...this.#sel.ranges, whole] });
    else this.#setSelection({ ...top, ranges: [whole] });
    this.#focusActive();
    this.#startDrag({ kind: axis, index: i });
  }

  #firstVisibleRow(): number { return this.#win?.rows[0] ?? 0; }
  #firstVisibleCol(): number { return this.#win?.cols[0] ?? 0; }

  #startFill(e: MouseEvent): void {
    e.preventDefault();
    this.#startDrag({ kind: 'fill' });
  }

  /** Rectángulo destino del relleno: se extiende en el eje dominante. */
  #fillTarget(pos: { r: number; c: number }): Rect | undefined {
    const x = this.#rect;
    if (inRect(x, pos.r, pos.c)) return undefined;
    const dr = pos.r > x.r2 ? pos.r - x.r2 : pos.r < x.r1 ? x.r1 - pos.r : 0;
    const dc = pos.c > x.c2 ? pos.c - x.c2 : pos.c < x.c1 ? x.c1 - pos.c : 0;
    if (dr >= dc) return { ...x, r1: Math.min(x.r1, pos.r), r2: Math.max(x.r2, pos.r) };
    return { ...x, c1: Math.min(x.c1, pos.c), c2: Math.max(x.c2, pos.c) };
  }

  #doFill(target: Rect, alternate: boolean): void {
    const src = this.#rect;
    this.#doc.fill(this.#sheet, src, target, alternate);
    this.#rec.record('rellenar', rangeName(src), rangeName(target));
    this.#setSelection({ ...this.#sel, ranges: [target] });
    this.#emitRange(target);
    this.#focusActive();
  }

  #onDblClick = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;
    if (t.classList.contains('rsz')) { this.#autofitCols([Number(t.closest<HTMLElement>('th')!.dataset.col)]); return; }
    if (t.classList.contains('rsz-r')) { this.#autofitRow([Number(t.closest<HTMLElement>('th')!.dataset.row)], true); return; }
    if (t.classList.contains('fh')) { this.#fillDownAuto(); return; }
    const title = t.closest<HTMLElement>('.chart-title');
    if (title) { this.#chartDialog(title.closest<HTMLElement>('.chart')!.dataset.chart!); return; }
    const td = t.closest<HTMLElement>('td.cell');
    if (!td || this.#edit) return;
    this.#beginEdit(Number(td.dataset.r), Number(td.dataset.c));
  };

  /** Doble clic en el tirador: rellena hasta donde llegue la columna vecina. */
  #fillDownAuto(): void {
    const x = this.#rect;
    const s = this.#sheet;
    const side = x.c1 > 0 && this.#doc.engine.getValue(s, x.r2 + 1, x.c1 - 1) !== null ? x.c1 - 1 : x.c2 + 1;
    let r = x.r2;
    while (r + 1 < s.rows && this.#doc.engine.getValue(s, r + 1, side) !== null) r++;
    if (r > x.r2) this.#doFill({ ...x, r2: r }, false);
  }

  #onHover = (e: MouseEvent): void => {
    const td = (e.target as HTMLElement).closest<HTMLElement>('td.has-note');
    if (!td) { this.#note.hidden = true; return; }
    const text = this.#doc.engine.getCell(this.#sheet, Number(td.dataset.r), Number(td.dataset.c))?.c ?? '';
    this.#placeNote(td, text);
  };

  #placeNote(td: HTMLElement, text: string): void {
    const box = td.getBoundingClientRect();
    const host = this.#root.getBoundingClientRect();
    const em = this.#hostEm();
    this.#note.textContent = text;
    this.#note.hidden = false;
    this.#note.style.insetInlineStart = `${(box.right - host.left) / em + 0.3}em`;
    this.#note.style.insetBlockStart = `${(box.top - host.top) / em}em`;
  }

  #showPrompt(): void {
    const rule = this.#doc.validationAt(this.#sheet, this.#sel.r, this.#sel.c);
    const td = this.#td(this.#sel.r, this.#sel.c);
    if (rule?.prompt && td) this.#placeNote(td, rule.prompt);
    else this.#note.hidden = true;
  }

  // ---- menús ----

  #openMenu(items: MenuItem[], x: number, y: number, handler?: (value: string, arg: string) => void): void {
    this.#menu.innerHTML = menuHtml(items);
    this.#menuHandler = handler ?? ((value, arg) => this.#cmd(value, arg || undefined));
    this.#menu.openAt(x, y);
  }

  #onContext = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;
    if (t.classList.contains('cell-input') || t.closest('.chart')) return;
    e.preventDefault();
    if (this.#edit && !this.#endEdit(true)) return;
    const col = t.closest<HTMLElement>('th.col-head');
    const row = t.closest<HTMLElement>('th.row-head');
    if (col) {
      const i = Number(col.dataset.col);
      if (!(i >= this.#rect.c1 && i <= this.#rect.c2)) this.#setSelection({ r: this.#firstVisibleRow(), c: i, ranges: [{ r1: 0, c1: i, r2: this.#sheet.rows - 1, c2: i }] });
      this.#openMenu(COL_MENU, e.clientX, e.clientY);
      return;
    }
    if (row) {
      const i = Number(row.dataset.row);
      if (!(i >= this.#rect.r1 && i <= this.#rect.r2)) this.#setSelection({ r: i, c: this.#firstVisibleCol(), ranges: [{ r1: i, c1: 0, r2: i, c2: this.#sheet.cols - 1 }] });
      this.#openMenu(ROW_MENU, e.clientX, e.clientY);
      return;
    }
    const td = t.closest<HTMLElement>('td.cell');
    if (td) {
      const r = Number(td.dataset.r);
      const c = Number(td.dataset.c);
      if (!this.#sel.ranges.some((x) => inRect(x, r, c))) this.#setSelection({ r, c, ranges: [{ r1: r, c1: c, r2: r, c2: c }] });
      this.#openMenu(CELL_MENU, e.clientX, e.clientY);
    }
  };

  #openDropdown(): void {
    const { r, c } = this.#sel;
    const rule = this.#doc.validationAt(this.#sheet, r, c);
    if (!rule || rule.type !== 'list' || this.#readOnly()) return;
    const td = this.#td(r, c);
    const box = (td ?? this.#view).getBoundingClientRect();
    const items = listItems(this.#doc, this.#sheet, rule).map((label): MenuItem => ({ cmd: label, label }));
    this.#openMenu(items, box.left, box.bottom, (value) => {
      this.#doc.setInput(this.#sheet, r, c, value);
      this.#emitChange(r, c, value);
      this.#focusActive();
    });
  }

  #openFilterPanel(col: number, anchor: HTMLElement): void {
    const sheet = this.#sheet;
    const values = this.#doc.filterValues(sheet, col).slice(0, 200);
    const cur = this.#doc.extras(sheet).filter?.columns[String(col)];
    const box = anchor.getBoundingClientRect();
    const rows = values.map((v) => `<iswc-checkbox data-v="${esc(v)}"${!cur?.values || cur.values.includes(v) ? ' checked' : ''}>${esc(v || '(Vacías)')}</iswc-checkbox>`).join('');
    this.#menu.innerHTML = `<div class="fl-panel" role="group" aria-label="Filtro de columna">
      <button class="item" data-value="asc"><iswc-icon icon="mdi:sort-alphabetical-ascending"></iswc-icon><span>Ordenar A → Z</span></button>
      <button class="item" data-value="desc"><iswc-icon icon="mdi:sort-alphabetical-descending"></iswc-icon><span>Ordenar Z → A</span></button>
      <hr class="mn-sep">
      <iswc-input class="fl-q" placeholder="Filtrar por texto contenido" value="${esc(cur?.op === 'contains' ? cur.a ?? '' : '')}"></iswc-input>
      <div class="fl-list">${rows}</div>
      <hr class="mn-sep">
      <button class="item fl-ok" data-value="ok"><iswc-icon icon="mdi:check"></iswc-icon><span>Aplicar</span></button>
      <button class="item" data-value="clear"><iswc-icon icon="mdi:filter-remove-outline"></iswc-icon><span>Quitar filtro</span></button>
    </div>`;
    this.#menuHandler = (value) => {
      const f = this.#doc.extras(sheet).filter;
      const x = f ? parseRange(f.range, sheet.rows, sheet.cols) : null;
      if (value === 'clear') this.#doc.setFilterColumn(sheet, col, null);
      else if ((value === 'asc' || value === 'desc') && x) {
        this.#doc.sort(sheet, x, [{ col, desc: value === 'desc' }], true);
      } else if (value === 'ok') {
        const q = this.#menu.querySelector<ValueEl>('.fl-q')?.value ?? '';
        const boxes = [...this.#menu.querySelectorAll<ValueEl>('iswc-checkbox')];
        const on = boxes.filter((b) => b.checked).map((b) => b.dataset.v ?? '');
        if (q) this.#doc.setFilterColumn(sheet, col, { op: 'contains', a: q });
        else if (on.length === boxes.length) this.#doc.setFilterColumn(sheet, col, null);
        else this.#doc.setFilterColumn(sheet, col, { values: on });
      }
      this.#focusActive();
    };
    this.#menu.openAt(box.left, box.bottom);
  }

  // ---- pestañas ----

  #onTabClick = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;
    const tab = t.closest<HTMLElement>('[data-sheet]');
    if (tab) { this.#switchSheet(Number(tab.dataset.sheet)); return; }
    const macro = t.closest<HTMLElement>('[data-macro]');
    if (macro) { this.runMacro(macro.dataset.macro!); return; }
    this.#onCommandClick(e);
  };

  #switchSheet(i: number): void {
    const list = this.#doc.engine.sheets;
    if (i < 0 || i >= list.length || this.#doc.extras(list[i]).hidden) return;
    const pointing = this.#edit && /^\s*=/.test(this.#editElement().value);
    if (this.#edit && !pointing && !this.#endEdit(true)) return;
    this.#doc.active = i;
    this.#view.scrollTop = 0;
    this.#view.scrollLeft = 0;
    this.#chartCache.clear();
    this.#objects.innerHTML = '';
    if (!pointing) this.#sel = { r: 0, c: 0, ranges: [{ r1: 0, c1: 0, r2: 0, c2: 0 }] };
    this.#renderAll();
    if (pointing) this.#edit?.input.focus({ preventScroll: true });
    else this.#focusActive();
    this.#rec.record('hoja', list[i].name);
    if (!pointing) this.#emitSelect();
  }

  #onTabDbl = (e: MouseEvent): void => {
    if ((e.target as HTMLElement).closest('[data-sheet]')) this.#renameSheetInline(Number((e.target as HTMLElement).closest<HTMLElement>('[data-sheet]')!.dataset.sheet));
  };

  #renameSheetInline(i: number): void {
    const tab = this.#tabs.querySelector<HTMLElement>(`[data-sheet="${i}"]`);
    const sheet = this.#doc.engine.sheets[i];
    if (!tab || !sheet || this.#readOnly()) return;
    const input = document.createElement('input');
    input.className = 'tab-edit';
    input.value = sheet.name;
    input.setAttribute('aria-label', 'Nombre de la hoja');
    tab.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (ok: boolean): void => {
      if (done) return;
      done = true;
      if (ok && input.value !== sheet.name && !this.#doc.renameSheet(sheet, input.value)) this.#flash('Nombre de hoja no válido o repetido');
      this.#renderAll();
      this.#focusActive();
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  }

  #onTabContext = (e: MouseEvent): void => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>('[data-sheet]');
    if (!tab) return;
    e.preventDefault();
    this.#switchSheet(Number(tab.dataset.sheet));
    this.#openMenu(TAB_MENU, e.clientX, e.clientY);
  };

  #onTabDrop = (e: DragEvent): void => {
    e.preventDefault();
    const from = Number(e.dataTransfer?.getData('text/x-iswc-sheet'));
    const tab = (e.target as HTMLElement).closest<HTMLElement>('[data-sheet]');
    if (Number.isNaN(from) || !tab) return;
    const to = Number(tab.dataset.sheet);
    const sheet = this.#doc.engine.sheets[from];
    const current = this.#sheet;
    this.#doc.moveSheet(sheet, to);
    this.#doc.active = this.#doc.engine.sheets.indexOf(current);
    this.#renderTabs();
  };

  // ---- barra de fórmulas y cuadro de nombres ----

  #onBarFocus = (): void => {
    if (this.#edit || this.#readOnly()) return;
    const { r, c } = this.#activeAnchor();
    this.#beginEdit(r, c, { source: 'bar' });
  };

  #onBarInput = (): void => {
    if (!this.#edit) return;
    this.#edit.source = 'bar';
    this.#edit.input.value = this.#fx.value.replace(/\n/g, ' ');
    this.#point = null;
    this.#afterEditInput();
  };

  #onBarKey = (e: KeyboardEvent): void => {
    if (this.#edit) this.#onEditKey(e);
  };

  #onNameKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') { this.#syncBar(); this.#focusActive(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const text = this.#nameBox.value.trim();
    const name = this.#doc.engine.names.get(text.toUpperCase());
    if (name) {
      const v = name.ref.replace(/^=/, '');
      const bang = v.lastIndexOf('!');
      const target = bang >= 0 ? this.#doc.sheetByName(v.slice(0, bang).replace(/^'|'$/g, '')) : this.#sheet;
      if (target) {
        this.#switchSheet(this.#doc.engine.sheets.indexOf(target));
        this.select(v.slice(bang + 1).replace(/\$/g, ''));
        this.#focusActive();
      }
      return;
    }
    const x = parseRange(text, this.#sheet.rows, this.#sheet.cols);
    if (x) {
      this.select(rangeName(x));
      this.#focusActive();
      return;
    }
    const scope = `${quoteSheet(this.#sheet.name)}!${rangeName(this.#rect)}`;
    if (this.#doc.defineName(text, scope)) this.#flash(`Nombre «${text}» definido`);
    else this.#flash('Referencia o nombre no válido');
    this.#focusActive();
  };

  // ---- portapapeles ----

  #onCopy = (e: ClipboardEvent): void => {
    if (this.#edit || !this.#gridOwnsFocus()) return;
    e.preventDefault();
    this.#copyTo(e.clipboardData, false);
  };

  #onCut = (e: ClipboardEvent): void => {
    if (this.#edit || !this.#gridOwnsFocus()) return;
    e.preventDefault();
    this.#copyTo(e.clipboardData, !this.#readOnly());
  };

  #gridOwnsFocus(): boolean {
    const a = this.shadowRoot!.activeElement;
    return !a || a === this.#table || this.#table.contains(a);
  }

  #copyTo(data: DataTransfer | null, cut: boolean): void {
    const x = this.#rect;
    const text = toTsv(this.#doc, this.#sheet, x);
    data?.setData('text/plain', text);
    data?.setData('text/html', toHtml(this.#doc, this.#sheet, x));
    this.#clip = { block: this.#doc.copy(this.#sheet, x), cut, text };
    this.#paintSelection();
    this.#rec.record('imprimir', `copiado ${rangeName(x)}`);
  }

  #onPaste = (e: ClipboardEvent): void => {
    if (this.#edit || !this.#gridOwnsFocus() || this.#readOnly()) return;
    e.preventDefault();
    this.#pasteText(e.clipboardData?.getData('text/plain') ?? '', e.clipboardData?.getData('text/html') ?? '');
  };

  /** Pega: si coincide con lo copiado aquí conserva fórmulas; si no, lee la tabla HTML o el TSV. */
  #pasteText(text: string, html: string): void {
    const sheet = this.#sheet;
    const clip = this.#clip;
    const same = clip && text.replace(/\r/g, '') === clip.text.replace(/\r/g, '');
    if (clip && (same || !text)) { this.#pasteInternal(clip, { mode: 'all' }); return; }
    const table = html ? parseClipboardHtml(html) : null;
    const rows = table?.rows ?? parseDelimited(text.replace(/\r?\n$/, ''), '\t');
    if (!rows.length) return;
    const x = this.#doc.pasteMatrix(sheet, this.#rect, rows, table?.styles);
    this.#setSelection({ ...this.#sel, ranges: [x] });
    this.#emitRange(x);
    this.#focusActive();
  }

  #pasteInternal(clip: Clip, opts: { mode: 'all' | 'values' | 'formulas' | 'formats'; transpose?: boolean }): void {
    const target = this.#rect;
    const src = clip.block.rect;
    const x = this.#doc.paste(this.#sheet, clip.block, target, { ...opts, move: clip.cut });
    this.#rec.record('copiar', rangeName(src), rangeName(target));
    if (clip.cut) this.#clip = null;
    this.#setSelection({ ...this.#sel, ranges: [x] });
    this.#emitRange(x);
    this.#focusActive();
  }

  async #clipboardCopy(cut: boolean): Promise<void> {
    this.#copyTo(null, cut);
    const x = this.#rect;
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/plain': new Blob([toTsv(this.#doc, this.#sheet, x)], { type: 'text/plain' }),
        'text/html': new Blob([toHtml(this.#doc, this.#sheet, x)], { type: 'text/html' }),
      })]);
    } catch {
      try { await navigator.clipboard.writeText(toTsv(this.#doc, this.#sheet, x)); } catch { /* el portapapeles interno sigue vivo */ }
    }
  }

  async #clipboardPaste(): Promise<void> {
    if (this.#readOnly()) return;
    let text = '';
    try { text = await navigator.clipboard.readText(); } catch { text = this.#clip?.text ?? ''; }
    this.#pasteText(text, '');
  }

  // ---- diálogos ----

  get #host(): DialogHost {
    return {
      doc: this.#doc,
      sheet: () => this.#sheet,
      rects: () => this.#sel.ranges,
      rect: () => this.#rect,
      active: () => this.#activeAnchor(),
      open: (spec) => this.#openDialog(spec),
      close: () => this.#dialog.hide?.(),
      toast: (m) => this.#flash(m),
      refresh: () => this.#afterChange(),
      select: (sheet, r, c) => {
        const i = this.#doc.engine.sheets.indexOf(sheet);
        if (i !== this.#doc.active) this.#switchSheet(i);
        this.#setSelection({ r, c, ranges: [{ r1: r, c1: c, r2: r, c2: c }] });
        this.#scrollTo(r, c);
      },
      selectRect: (x) => {
        this.#setSelection({ r: x.r1, c: x.c1, ranges: [x] });
        this.#scrollTo(x.r1, x.c1);
      },
      insertAtEditor: (text) => this.#insertFormulaText(text),
      record: (fn, ...args) => this.#rec.record(fn, ...(args as RecordArg[])),
    };
  }

  #insertFormulaText(text: string): void {
    const { r, c } = this.#activeAnchor();
    if (!this.#edit && !this.#beginEdit(r, c, { text: `=${text}` })) return;
    if (this.#editText() === `=${text}`) { this.#setEditText(`=${text}`, text.length + 1); return; }
    const el = this.#editElement();
    const value = el.value;
    const pos = el.selectionStart ?? value.length;
    const prefix = /^\s*=/.test(value) ? '' : '=';
    this.#setEditText(prefix + value.slice(0, pos) + text + value.slice(pos), prefix.length + pos + text.length);
    el.focus();
  }

  #fields(root: HTMLElement): Fields {
    const el = (name: string): ValueEl | null => root.querySelector<ValueEl>(`[data-f="${name}"]`);
    return { root, get: (name) => String(el(name)?.value ?? ''), on: (name) => !!el(name)?.checked };
  }

  #openDialog(spec: DialogSpec): void {
    const d = this.#dialog;
    d.setAttribute('label', spec.title);
    d.classList.toggle('wide', !!spec.wide);
    this.#dialogOk = spec.onOk ?? null;
    const ok = spec.hideOk ? '' : `<iswc-button data-dlg="ok" color="brand">${esc(spec.okLabel ?? 'Aceptar')}</iswc-button>`;
    d.innerHTML = `<div class="dlg-body">${spec.body}</div><div slot="footer" class="dlg-foot"><iswc-button data-dlg="cancel" variant="text" color="neutral">${spec.hideOk ? 'Cerrar' : 'Cancelar'}</iswc-button>${ok}</div>`;
    const body = d.querySelector<HTMLElement>('.dlg-body')!;
    for (const el of body.querySelectorAll<ValueEl>('iswc-color-picker[data-initial]')) {
      if (el.dataset.initial) el.value = el.dataset.initial;
    }
    spec.onOpen?.(this.#fields(body));
    d.show?.();
  }

  #onDialogClick = (e: MouseEvent): void => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-dlg]')?.dataset.dlg;
    if (!act) return;
    if (act === 'ok') {
      const body = this.#dialog.querySelector<HTMLElement>('.dlg-body')!;
      if (this.#dialogOk?.(this.#fields(body)) === false) return;
    }
    this.#dialog.hide?.();
  };

  #flash(text: string): void {
    this.#toast.textContent = text;
    this.#toast.hidden = false;
    clearTimeout(this.#toastTimer);
    this.#toastTimer = window.setTimeout(() => { this.#toast.hidden = true; }, 3200);
  }

  #chartDialog(id: string): void {
    const def = this.#doc.extras(this.#sheet).charts.find((c) => c.id === id);
    if (!def) return;
    const types: [string, string][] = [['bar', 'Columnas o barras'], ['line', 'Líneas'], ['pie', 'Circular'], ['doughnut', 'Anillo'], ['scatter', 'Dispersión'], ['radar', 'Radial']];
    this.#openDialog({
      title: 'Editar gráfico',
      body: `<div class="dlg-grid"><iswc-input data-f="title" label="Título" value="${esc(def.title ?? '')}"></iswc-input><iswc-input data-f="range" label="Datos" value="${esc(def.range)}"></iswc-input><iswc-select data-f="type" label="Tipo" value="${def.type}">${types.map(([v, t]) => `<iswc-option value="${v}">${t}</iswc-option>`).join('')}</iswc-select><iswc-checkbox data-f="stacked"${def.stacked ? ' checked' : ''}>Apilado</iswc-checkbox><iswc-checkbox data-f="horizontal"${def.horizontal ? ' checked' : ''}>Horizontal</iswc-checkbox></div>`,
      onOk: (f) => {
        this.#doc.updateChart(this.#sheet, id, { title: f.get('title') || undefined, range: f.get('range'), type: f.get('type') as ChartDef['type'], stacked: f.on('stacked'), horizontal: f.on('horizontal') });
        this.#chartCache.delete(id);
        this.#renderCharts();
      },
    });
  }

  #onChartDown(e: MouseEvent, t: HTMLElement): void {
    const box = t.closest<HTMLElement>('.chart')!;
    const id = box.dataset.chart!;
    const def = this.#doc.extras(this.#sheet).charts.find((c) => c.id === id);
    if (!def) return;
    if (t.closest('[data-chart-del]')) {
      this.#doc.removeChart(this.#sheet, id);
      return;
    }
    if (t.classList.contains('chart-size')) {
      e.preventDefault();
      this.#startDrag({ kind: 'chart-size', chart: def, origin: { x: e.clientX, y: e.clientY } });
      return;
    }
    if (t.closest('.chart-bar')) {
      e.preventDefault();
      this.#startDrag({ kind: 'chart-move', chart: def, origin: { x: e.clientX, y: e.clientY } });
    }
  }

  // ---- macros ----

  get #macroView(): MacroView {
    return {
      getSelection: () => this.#rect,
      select: (x) => { this.#sel = { r: x.r1, c: x.c1, ranges: [x] }; },
      message: (t) => this.#flash(t),
      log: (t) => this.#macroLog?.(t),
      refresh: () => this.#renderAll(),
    };
  }

  #macroLog: ((t: string) => void) | null = null;

  #execMacro(code: string, name: string): { ok: boolean; error?: string } {
    if (this.#readOnly()) return { ok: false, error: 'La hoja es de solo lectura' };
    this.#endEdit(true);
    const res = runMacro(this.#doc, code, name, this.#macroView);
    if (!res.ok) this.#flash(res.error ?? 'Error en la macro');
    else emit(this, 'iswc-change', { row: this.#sel.r, col: this.#sel.c, raw: '', value: this.#publicValue(this.#sel.r, this.#sel.c), sheet: this.#sheet.name, macro: name } as SpreadsheetChangeDetail);
    return { ok: res.ok, error: res.error };
  }

  async #macroEditor(preset?: { name: string; code: string }): Promise<void> {
    await import('@jeff-aporta/iswc-base/components/code/code.js');
    const list = (): string => this.#doc.macros.map((m) => `<button class="mc-item" data-load="${esc(m.name)}"><iswc-icon icon="mdi:script-text-outline"></iswc-icon>${esc(m.name)}${m.shortcut ? `<kbd>${esc(m.shortcut)}</kbd>` : ''}</button>`).join('') || '<p class="dlg-status">Sin macros todavía.</p>';
    const first: Partial<MacroDef> = preset ?? this.#doc.macros[0] ?? { name: 'MiMacro', code: '# Escribe aquí tu macro\nformato(seleccion(), {negrita: verdadero})\n' };
    this.#openDialog({
      title: 'Editor de macros', wide: true, hideOk: true,
      body: `<div class="mc">
        <aside class="mc-side"><div data-list>${list()}</div><iswc-button data-act="new" variant="text" color="brand"><iswc-icon icon="mdi:plus"></iswc-icon>Nueva</iswc-button></aside>
        <div class="mc-main">
          <div class="dlg-row">
            <iswc-input data-f="name" label="Nombre" value="${esc(first.name ?? '')}"></iswc-input>
            <iswc-input data-f="key" label="Atajo" placeholder="ctrl+shift+m" value="${esc(first.shortcut ?? '')}"></iswc-input>
            <iswc-checkbox data-f="button"${first.button ? ' checked' : ''}>Botón junto a las hojas</iswc-checkbox>
          </div>
          <iswc-code class="mc-code" lang="python" line-numbers></iswc-code>
          <div class="dlg-row">
            <iswc-button data-act="run" color="brand"><iswc-icon icon="mdi:play"></iswc-icon>Ejecutar</iswc-button>
            <iswc-button data-act="save" variant="outlined">Guardar</iswc-button>
            <iswc-button data-act="del" variant="text" color="danger">Eliminar</iswc-button>
          </div>
          <pre class="mc-out" aria-live="polite"></pre>
          <details class="mc-help"><summary>Referencia del lenguaje</summary><pre>${esc(MACRO_HELP)}</pre></details>
        </div></div>`,
      onOpen: (f) => {
        const code = f.root.querySelector<ValueEl>('.mc-code')!;
        const out = f.root.querySelector<HTMLElement>('.mc-out')!;
        code.value = first.code ?? '';
        const save = (): MacroDef | null => {
          const name = f.get('name').trim();
          if (!/^[\p{L}_][\p{L}\p{N}_ ]*$/u.test(name)) { out.textContent = 'Nombre de macro no válido.'; return null; }
          const def: MacroDef = { name, code: code.value, shortcut: f.get('key').trim() || undefined, button: f.on('button') };
          this.#doc.saveMacro(def);
          f.root.querySelector('[data-list]')!.innerHTML = list();
          this.#renderTabs();
          return def;
        };
        f.root.addEventListener('click', (e) => {
          const t = e.target as HTMLElement;
          const load = t.closest<HTMLElement>('[data-load]')?.dataset.load;
          if (load) {
            const m = this.#doc.macros.find((x) => x.name === load);
            if (!m) return;
            f.root.querySelector<ValueEl>('[data-f="name"]')!.value = m.name;
            f.root.querySelector<ValueEl>('[data-f="key"]')!.value = m.shortcut ?? '';
            f.root.querySelector<ValueEl>('[data-f="button"]')!.checked = !!m.button;
            code.value = m.code;
            return;
          }
          const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
          if (act === 'new') {
            f.root.querySelector<ValueEl>('[data-f="name"]')!.value = `Macro${this.#doc.macros.length + 1}`;
            code.value = '';
          }
          if (act === 'save' && save()) out.textContent = 'Guardada.';
          if (act === 'del') {
            this.#doc.removeMacro(f.get('name').trim());
            f.root.querySelector('[data-list]')!.innerHTML = list();
            this.#renderTabs();
            out.textContent = 'Eliminada.';
          }
          if (act === 'run') {
            const logs: string[] = [];
            this.#macroLog = (m) => logs.push(m);
            const res = this.#execMacro(code.value, f.get('name') || 'macro');
            this.#macroLog = null;
            out.textContent = [...logs, res.ok ? 'Ejecutada sin errores.' : res.error].join('\n');
          }
        });
      },
    });
  }

  // ---- autoajuste ----

  #measure(text: string): number {
    const ctx = (this.#canvas ??= document.createElement('canvas')).getContext('2d');
    if (!ctx) return text.length * 0.55;
    const cs = getComputedStyle(this.#table);
    ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
    return ctx.measureText(text).width / this.#em();
  }

  #canvas: HTMLCanvasElement | null = null;

  #autofitCols(cols: number[]): void {
    const s = this.#sheet;
    const rows = Math.min(this.#doc.engine.usedBounds(s).rows, 5000);
    const out = new Map<number, number>();
    for (const c of cols) {
      let w = 2;
      for (let r = 0; r < rows; r++) {
        const text = this.#doc.displayText(s, r, c).text;
        if (!text) continue;
        const scale = (this.#doc.styleAt(s, r, c).size ?? 11) / 11;
        w = Math.max(w, this.#measure(text) * scale);
      }
      out.set(c, Number((w + 1).toFixed(2)));
    }
    this.#doc.transact('Autoajustar columnas', () => { for (const [c, w] of out) this.#doc.setColWidth(s, [c], w); });
  }

  #autofitRow(rows: number[], force = false): void {
    const s = this.#sheet;
    const cols = this.#doc.engine.usedBounds(s).cols;
    this.#doc.transact('Autoajustar filas', () => {
      for (const r of rows) {
        let lines = 1;
        let scale = 1;
        for (let c = 0; c < cols; c++) {
          const st = this.#doc.styleAt(s, r, c);
          const text = this.#doc.displayText(s, r, c).text;
          if (!text) continue;
          scale = Math.max(scale, (st.size ?? 11) / 11);
          if (st.wrap) lines = Math.max(lines, text.split('\n').reduce((n, part) => n + Math.max(1, Math.ceil(this.#measure(part) / (this.#doc.colWidth(s, c) - 0.7))), 0));
        }
        if (lines > 1 || scale > 1 || force) this.#doc.setRowHeight(s, [r], Number(Math.max(1.75, lines * 1.35 * scale + 0.4).toFixed(2)));
      }
    });
  }

  // ---- comandos ----

  #onCommandClick = (e: Event): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cmd]');
    if (!el || el.tagName === 'ISWC-SELECT' || el.tagName === 'ISWC-COLOR-PICKER' || el.hasAttribute('disabled')) return;
    const cmd = el.dataset.cmd!;
    const item = ribbonItem(cmd);
    if (item?.menu) {
      const box = el.getBoundingClientRect();
      this.#openMenu(item.menu, box.left, box.bottom + 2);
      return;
    }
    this.#cmd(cmd);
  };

  #onRibbonChange = (e: Event): void => {
    const el = e.target as ValueEl;
    const cmd = el.dataset.cmd;
    if (!cmd) return;
    const value = (e as CustomEvent<{ value: string }>).detail?.value ?? el.value;
    this.#cmd(cmd, value);
  };

  #style(patch: CellStyle, record: Record<string, string | number | boolean>): void {
    this.#doc.applyStyle(this.#sheet, this.#sel.ranges, patch);
    this.#rec.record('formato', rangeName(this.#rect), record);
    this.#emitRange(this.#rect);
  }

  #toggle(key: 'bold' | 'italic' | 'underline' | 'strike' | 'wrap', name: string): void {
    const { r, c } = this.#activeAnchor();
    const on = !this.#doc.styleAt(this.#sheet, r, c)[key];
    this.#style({ [key]: on || undefined }, { [name]: on });
    if (key === 'wrap') this.#autofitRow(this.#rowsOf(), true);
  }

  #rowsOf(): number[] {
    const x = this.#rect;
    return Array.from({ length: Math.min(x.r2 - x.r1 + 1, 1000) }, (_, i) => x.r1 + i);
  }

  #colsOf(): number[] {
    const x = this.#rect;
    return Array.from({ length: Math.min(x.c2 - x.c1 + 1, 512) }, (_, i) => x.c1 + i);
  }

  #numFmt(fmt: string): void {
    this.#doc.applyStyle(this.#sheet, this.#sel.ranges, { numFmt: fmt === 'General' ? undefined : fmt }, 'Formato de número');
    this.#rec.record('formatoNumero', rangeName(this.#rect), fmt);
  }

  #sortBy(desc: boolean): void {
    const s = this.#sheet;
    const x = this.#rect;
    const single = x.r1 === x.r2 && x.c1 === x.c2;
    const whole = x.r2 - x.r1 === s.rows - 1;
    const box = single || whole ? this.#doc.currentRegion(s, this.#sel.r, x.c1) : x;
    const head = single || whole;
    this.#doc.sort(s, box, [{ col: x.c1, desc }], head);
    this.#rec.record('ordenar', rangeName(box), colName(x.c1), desc, head);
    this.#emitRange(box);
  }

  #autosum(): void {
    const s = this.#sheet;
    const { r, c } = this.#sel;
    const x = this.#rect;
    if (x.r1 !== x.r2 || x.c1 !== x.c2) {
      const col = x.r2 < s.rows - 1 ? x.r2 + 1 : x.r2;
      this.#doc.transact('Autosuma', () => {
        for (let k = x.c1; k <= x.c2; k++) this.#doc.setInput(s, col, k, `=SUM(${rangeName({ r1: x.r1, c1: k, r2: x.r2, c2: k })})`);
      });
      return;
    }
    let top = r;
    while (top > 0 && typeof this.#doc.engine.getValue(s, top - 1, c) === 'number') top--;
    let left = c;
    while (left > 0 && typeof this.#doc.engine.getValue(s, r, left - 1) === 'number') left--;
    const rect = top < r ? { r1: top, c1: c, r2: r - 1, c2: c } : left < c ? { r1: r, c1: left, r2: r, c2: c - 1 } : null;
    const name = this.#doc.locale === 'es' ? 'SUMA' : 'SUM';
    this.#beginEdit(r, c, { text: `=${name}(${rect ? rangeName(rect) : ''})` });
  }

  #tableStyle(): void {
    const s = this.#sheet;
    const x = this.#rect.r1 === this.#rect.r2 && this.#rect.c1 === this.#rect.c2 ? this.#doc.currentRegion(s, this.#sel.r, this.#sel.c) : this.#rect;
    this.#doc.transact('Formato de tabla', () => {
      this.#doc.applyStyle(s, [{ ...x, r2: x.r1 }], { bold: true, bg: '#1f6f8b', color: '#ffffff' });
      for (let r = x.r1 + 1; r <= x.r2; r++) if ((r - x.r1) % 2 === 0) this.#doc.applyStyle(s, [{ ...x, r1: r, r2: r }], { bg: '#e8f3f7', color: '#1a1a1a' });
      this.#doc.setBorders(s, x, 'outer', { style: 'thin', color: '#1f6f8b' });
      if (!this.#doc.extras(s).filter) this.#doc.toggleFilter(s, x);
    });
  }

  #applyPainter(): void {
    if (this.#painter === null) return;
    const style = this.#doc.styles.get(this.#painter ?? undefined);
    const s = this.#sheet;
    this.#doc.transact('Copiar formato', () => {
      this.#doc.clearFormats(s, this.#sel.ranges);
      if (Object.keys(style).length) this.#doc.applyStyle(s, this.#sel.ranges, style);
    });
    this.#painter = null;
    this.#syncRibbon();
  }

  #insertAxis(axis: 'row' | 'col', insert: boolean): void {
    if (this.#readOnly()) return;
    const x = this.#rect;
    const at = axis === 'row' ? x.r1 : x.c1;
    const n = axis === 'row' ? x.r2 - x.r1 + 1 : x.c2 - x.c1 + 1;
    this.#doc.structural(this.#sheet, axis, at, n, insert);
    this.#rec.record(`${insert ? 'insertar' : 'borrar'}${axis === 'row' ? 'Filas' : 'Columnas'}`, axis === 'row' ? at + 1 : colName(at), n);
    this.#clampSelection();
    this.#emitRange(x);
    this.#renderAll();
  }

  #download(blob: Blob, name: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  #importDelimited(text: string, name: string): void {
    const rows = parseDelimited(text, detectDelimiter(text));
    const width = Math.max(1, ...rows.map((r) => r.length));
    let label = name.slice(0, 28).replace(/[\\/?*[\]:]/g, ' ') || this.#doc.freeSheetName();
    for (let i = 2; this.#doc.sheetByName(label); i++) label = `${name.slice(0, 25)} ${i}`;
    this.#doc.transact('Importar CSV', () => {
      const s = this.#doc.addSheet(label, Math.max(rows.length + 20, 40), Math.max(width + 4, 26));
      this.#doc.pasteMatrix(s, { r1: 0, c1: 0, r2: 0, c2: 0 }, rows);
      this.#doc.active = this.#doc.engine.sheets.indexOf(s);
    });
    this.#sel = { r: 0, c: 0, ranges: [{ r1: 0, c1: 0, r2: 0, c2: 0 }] };
    this.#renderAll();
  }

  #pickFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xlsm,.csv,.tsv,.txt';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) this.importFile(file).catch((e: Error) => this.#flash(`No se pudo abrir: ${e.message}`));
    });
    input.click();
  }

  /** Despacha un comando de la cinta, un menú, un atajo o la API. */
  #cmd(cmd: string, arg?: string): void {
    const doc = this.#doc;
    const sheet = this.#sheet;
    const range = rangeName(this.#rect);
    const readOnlySafe = new Set(['copy', 'find', 'goto', 'show-formulas', 'gridlines', 'formula-bar', 'zoom-in', 'zoom-out', 'zoom-reset', 'export-xlsx', 'export-csv', 'recalc', 'macro-editor', 'names']);
    if (this.#readOnly() && !readOnlySafe.has(cmd)) return;
    if (this.#edit && !['fx', 'autosum'].includes(cmd) && !this.#endEdit(true)) return;
    if (!['undo', 'redo'].includes(cmd)) this.#lastCmd = [cmd, arg];
    const h = this.#host;
    switch (cmd) {
      case 'undo': doc.undo(); this.#clampSelection(); this.#renderAll(); break;
      case 'redo': doc.redo(); this.#clampSelection(); this.#renderAll(); break;
      case 'copy': void this.#clipboardCopy(false); break;
      case 'cut': void this.#clipboardCopy(true); break;
      case 'paste': void this.#clipboardPaste(); break;
      case 'paste-special': {
        const clip = this.#clip;
        if (!clip) { this.#flash('Copia celdas de esta hoja primero'); break; }
        pasteSpecialDialog(h, (mode, transpose) => this.#pasteInternal(clip, { mode, transpose }));
        break;
      }
      case 'painter': {
        this.#painter = this.#painter === null ? doc.engine.getCell(sheet, this.#sel.r, this.#sel.c)?.s : null;
        if (this.#painter === undefined) this.#painter = 0;
        this.#syncRibbon();
        break;
      }
      case 'font': this.#style({ font: arg === 'Calibri' ? undefined : arg }, { fuente: arg ?? '' }); break;
      case 'size': this.#style({ size: Number(arg) === 11 ? undefined : Number(arg) }, { tamano: Number(arg) }); this.#autofitRow(this.#rowsOf()); break;
      case 'bold': this.#toggle('bold', 'negrita'); break;
      case 'italic': this.#toggle('italic', 'cursiva'); break;
      case 'underline': this.#toggle('underline', 'subrayado'); break;
      case 'strike': this.#toggle('strike', 'tachado'); break;
      case 'wrap': this.#toggle('wrap', 'ajustar'); break;
      case 'bg': this.#style({ bg: arg || undefined }, { relleno: arg ?? '' }); break;
      case 'color': this.#style({ color: arg || undefined }, { color: arg ?? '' }); break;
      case 'align-left': case 'align-center': case 'align-right': {
        const v = cmd.slice(6) as 'left';
        const cur = doc.styleAt(sheet, this.#sel.r, this.#sel.c).align;
        this.#style({ align: cur === v ? undefined : v }, { alineacion: v });
        break;
      }
      case 'valign-top': case 'valign-middle': case 'valign-bottom': {
        const v = cmd.slice(7) as 'top';
        this.#style({ valign: v }, { vertical: v });
        break;
      }
      case 'border': doc.setBorders(sheet, this.#rect, arg ?? 'all'); this.#rec.record('bordes', range, arg ?? 'all'); break;
      case 'border-outer': doc.setBorders(sheet, this.#rect, 'outer'); break;
      case 'border-none': doc.setBorders(sheet, this.#rect, 'none'); break;
      case 'border-thick': doc.setBorders(sheet, this.#rect, 'outer', { style: 'thick' }); this.#rec.record('bordes', range, 'outer', 'thick'); break;
      case 'border-double': doc.setBorders(sheet, this.#rect, 'bottom', { style: 'double' }); this.#rec.record('bordes', range, 'bottom', 'double'); break;
      case 'merge': doc.merge(sheet, this.#rect); this.#rec.record('combinar', range); break;
      case 'merge-across': doc.merge(sheet, this.#rect, true); break;
      case 'merge-center':
        doc.transact('Combinar y centrar', () => {
          doc.merge(sheet, this.#rect);
          doc.applyStyle(sheet, [this.#rect], { align: 'center' });
        });
        this.#rec.record('combinar', range);
        this.#rec.record('formato', range, { alineacion: 'centro' });
        break;
      case 'unmerge': doc.unmerge(sheet, this.#rect); this.#rec.record('separar', range); break;
      case 'numfmt': {
        const f = NUMBER_FORMATS.find((x) => x.id === arg);
        if (f) this.#numFmt(f.fmt);
        break;
      }
      case 'currency': case 'fmt-currency': this.#numFmt('$#,##0.00'); break;
      case 'percent': case 'fmt-percent': this.#numFmt('0%'); break;
      case 'comma': case 'fmt-number': this.#numFmt('#,##0.00'); break;
      case 'fmt-general': this.#numFmt('General'); break;
      case 'fmt-date': this.#numFmt('dd/mm/yyyy'); break;
      case 'fmt-time': this.#numFmt('hh:mm'); break;
      case 'fmt-scientific': this.#numFmt('0.00E+00'); break;
      case 'dec-more': case 'dec-less': {
        const cur = doc.styleAt(sheet, this.#sel.r, this.#sel.c).numFmt;
        this.#numFmt(adjustDecimals(cur, cmd === 'dec-more' ? 1 : -1));
        break;
      }
      case 'format-dialog': formatDialog(h); break;
      case 'cf-dialog': cfDialog(h, arg ?? 'cell'); break;
      case 'cf-manage': cfManageDialog(h); break;
      case 'cf-clear': doc.removeCf(sheet); break;
      case 'cf-quick': {
        const type = arg as 'duplicate';
        doc.addCf(sheet, { range, type, style: type === 'duplicate' || type as string === 'aboveAverage' ? { bg: '#ffc7ce', color: '#9c0006' } : undefined });
        break;
      }
      case 'table-style': this.#tableStyle(); break;
      case 'insert-row': this.#insertAxis('row', true); break;
      case 'insert-col': this.#insertAxis('col', true); break;
      case 'delete-row': this.#insertAxis('row', false); break;
      case 'delete-col': this.#insertAxis('col', false); break;
      case 'insert-smart': this.#insertAxis(this.#rect.c2 - this.#rect.c1 === sheet.cols - 1 ? 'row' : this.#rect.r2 - this.#rect.r1 === sheet.rows - 1 ? 'col' : 'row', true); break;
      case 'delete-smart': this.#insertAxis(this.#rect.c2 - this.#rect.c1 === sheet.cols - 1 ? 'row' : this.#rect.r2 - this.#rect.r1 === sheet.rows - 1 ? 'col' : 'row', false); break;
      case 'row-height': promptDialog(h, 'Alto de fila', 'Alto en em', String(doc.rowHeight(sheet, this.#sel.r)), (v) => { if (Number(v) > 0) doc.setRowHeight(sheet, this.#rowsOf(), Number(v)); }); break;
      case 'col-width': promptDialog(h, 'Ancho de columna', 'Ancho en em', String(doc.colWidth(sheet, this.#sel.c)), (v) => { if (Number(v) > 0) doc.setColWidth(sheet, this.#colsOf(), Number(v)); }); break;
      case 'autofit-col': this.#autofitCols(this.#colsOf()); break;
      case 'autofit-row': this.#autofitRow(this.#rowsOf(), true); break;
      case 'hide-row': doc.setHidden(sheet, 'row', this.#rowsOf(), true); break;
      case 'unhide-row': doc.setHidden(sheet, 'row', [...doc.extras(sheet).hiddenRows].filter((r) => r >= this.#rect.r1 - 1 && r <= this.#rect.r2 + 1), false); break;
      case 'hide-col': doc.setHidden(sheet, 'col', this.#colsOf(), true); break;
      case 'unhide-col': doc.setHidden(sheet, 'col', [...doc.extras(sheet).hiddenCols].filter((c) => c >= this.#rect.c1 - 1 && c <= this.#rect.c2 + 1), false); break;
      case 'autosum': if (this.#edit) this.#insertFormulaText('SUM('); else this.#autosum(); break;
      case 'fill-down': {
        const x = this.#rect;
        const src = { ...x, r2: x.r1 };
        if (x.r2 > x.r1) { doc.paste(sheet, doc.copy(sheet, src), { ...x, r1: x.r1 + 1 }); this.#rec.record('rellenar', rangeName(src), range); this.#emitRange(x); } else if (x.r1 > 0) { const up = { ...x, r1: x.r1 - 1, r2: x.r1 - 1 }; doc.paste(sheet, doc.copy(sheet, up), x); }
        break;
      }
      case 'fill-right': {
        const x = this.#rect;
        const src = { ...x, c2: x.c1 };
        if (x.c2 > x.c1) { doc.paste(sheet, doc.copy(sheet, src), { ...x, c1: x.c1 + 1 }); this.#rec.record('rellenar', rangeName(src), range); this.#emitRange(x); } else if (x.c1 > 0) { const left = { ...x, c1: x.c1 - 1, c2: x.c1 - 1 }; doc.paste(sheet, doc.copy(sheet, left), x); }
        break;
      }
      case 'flash-fill': {
        const c = this.#sel.c;
        const box = doc.currentRegion(sheet, this.#sel.r, c);
        const n = c > 0 ? doc.flashFill(sheet, c, c - 1, box.r1, box.r2) : 0;
        this.#flash(n ? `Relleno rápido: ${n} celdas` : 'No se detectó un patrón');
        break;
      }
      case 'clear-contents': doc.clearContents(sheet, this.#sel.ranges); this.#rec.record('limpiar', range); this.#emitRange(this.#rect); break;
      case 'clear-formats': doc.clearFormats(sheet, this.#sel.ranges); this.#rec.record('borrarFormato', range); break;
      case 'clear-all': doc.clearAll(sheet, this.#sel.ranges); this.#emitRange(this.#rect); break;
      case 'clear-comments':
        doc.transact('Borrar comentarios', () => {
          for (const x of this.#sel.ranges) for (let r = x.r1; r <= x.r2; r++) for (let c = x.c1; c <= x.c2; c++) if (doc.engine.getCell(sheet, r, c)?.c) doc.setComment(sheet, r, c, '');
        });
        break;
      case 'sort-asc': this.#sortBy(false); break;
      case 'sort-desc': this.#sortBy(true); break;
      case 'sort-dialog': sortDialog(h); break;
      case 'filter': {
        const x = this.#rect.r1 === this.#rect.r2 ? doc.currentRegion(sheet, this.#sel.r, this.#sel.c) : this.#rect;
        doc.toggleFilter(sheet, doc.extras(sheet).filter ? null : x);
        break;
      }
      case 'find': findDialog(h); break;
      case 'goto': gotoDialog(h); break;
      case 'chart': this.#addChart(arg ?? 'bar'); break;
      case 'comment': commentDialog(h); break;
      case 'link': promptDialog(h, 'Vínculo', 'Dirección', doc.engine.getCell(sheet, this.#sel.r, this.#sel.c)?.l ?? 'https://', (v) => doc.setLink(sheet, this.#sel.r, this.#sel.c, /^(https?:|mailto:)/i.test(v) ? v : ''), 'Abre con Ctrl+clic'); break;
      case 'fx': functionDialog(h); break;
      case 'names': namesDialog(h); break;
      case 'define-name': namesDialog(h); break;
      case 'show-formulas': this.#showFormulas = !this.#showFormulas; this.#render(); this.#syncRibbon(); break;
      case 'recalc': doc.engine.rebuild(); this.#render(); this.#renderStatus(); this.#renderCharts(); break;
      case 'import': this.#pickFile(); break;
      case 'export-xlsx': void this.exportXlsx().then((b) => this.#download(b, `${sheet.name}.xlsx`)); break;
      case 'export-csv': this.#download(new Blob(['﻿', this.exportCsv()], { type: 'text/csv;charset=utf-8' }), `${sheet.name}.csv`); break;
      case 'text-columns': textColumnsDialog(h); break;
      case 'dedupe': dedupeDialog(h); break;
      case 'validation': validationDialog(h); break;
      case 'goal-seek': goalSeekDialog(h); break;
      case 'freeze': {
        const fr = arg === 'row' ? 1 : arg === 'cell' ? this.#sel.r : 0;
        const fc = arg === 'col' ? 1 : arg === 'cell' ? this.#sel.c : 0;
        doc.setFreeze(sheet, fr, fc);
        this.#rec.record('inmovilizar', fr, fc);
        this.#view.scrollTop = 0;
        this.#view.scrollLeft = 0;
        break;
      }
      case 'gridlines': doc.setGridlines(sheet, !doc.extras(sheet).gridlines); break;
      case 'formula-bar': this.#bar.hidden = !this.#bar.hidden; this.#syncRibbon(); break;
      case 'zoom-in': case 'zoom-out': case 'zoom-reset': {
        const i = ZOOMS.indexOf(this.#zoom);
        this.#zoom = cmd === 'zoom-reset' ? 1 : ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + (cmd === 'zoom-in' ? 1 : -1)))];
        this.#render();
        this.#renderStatus();
        break;
      }
      case 'sheet-add': {
        const s = doc.addSheet(undefined, Math.max(100, sheet.rows), sheet.cols);
        this.#rec.record('nuevaHoja', s.name);
        this.#switchSheet(doc.engine.sheets.indexOf(s));
        break;
      }
      case 'sheet-rename': this.#renameSheetInline(doc.active); break;
      case 'sheet-duplicate': {
        const s = doc.duplicateSheet(sheet);
        this.#switchSheet(doc.engine.sheets.indexOf(s));
        break;
      }
      case 'sheet-delete':
        if (!doc.deleteSheet(sheet)) this.#flash('El libro necesita al menos una hoja visible');
        this.#renderAll();
        break;
      case 'sheet-hide':
        if (doc.engine.sheets.filter((s) => !doc.extras(s).hidden).length > 1) {
          doc.setSheetHidden(sheet, true);
          this.#switchSheet(doc.engine.sheets.findIndex((s) => !doc.extras(s).hidden));
        }
        break;
      case 'sheet-unhide':
        doc.transact('Mostrar hojas', () => { for (const s of doc.engine.sheets) doc.setSheetHidden(s, false); });
        this.#renderTabs();
        break;
      case 'sheet-color': promptDialog(h, 'Color de pestaña', 'Color (#rrggbb)', doc.extras(sheet).tabColor ?? '', (v) => { doc.setTabColor(sheet, /^#[0-9a-f]{6}$/i.test(v) ? v : undefined); this.#renderTabs(); }); break;
      case 'macro-editor': void this.#macroEditor(); break;
      case 'macro-record': {
        if (this.#rec.recording) {
          const code = this.#rec.stop();
          this.#syncRibbon();
          void this.#macroEditor({ name: `Grabada${doc.macros.length + 1}`, code });
        } else {
          this.#rec.start();
          this.#syncRibbon();
        }
        this.#renderStatus();
        break;
      }
      case 'now-date': this.#doc.setValue(sheet, this.#sel.r, this.#sel.c, Math.floor(doc.engine.evalText('=TODAY()', sheet) as number)); this.#numFmt('dd/mm/yyyy'); break;
      case 'now-time': {
        const v = doc.engine.evalText('=NOW()', sheet) as number;
        this.#doc.setValue(sheet, this.#sel.r, this.#sel.c, v - Math.floor(v));
        this.#numFmt('hh:mm');
        break;
      }
      default:
    }
  }
}

define(IswcSpreadsheet);
