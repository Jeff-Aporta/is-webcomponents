// render.ts — HTML de la rejilla visible. Función pura de (documento, ventana): el componente
// decide cuándo pintar; aquí no se toca el DOM.
import { cellName, colName } from '../address.js';
import type { Rect } from '../address.schemas.js';
import { Axis } from '../axis.js';
import type { CfEffect } from '../conditional.schemas.js';
import type { CfEvaluator } from '../conditional.js';
import type { SpreadsheetDoc } from '../document.js';
import { cellKey } from '../engine.js';
import type { Sheet } from '../engine.js';
import { CellError } from '../values.js';
import type { BorderSide, CellStyle } from '../../../schemas/spreadsheet.schemas.js';
import type { GridWindow, RenderOptions } from './render.schemas.js';

/** Medidas fijas de la rejilla, en em. */
export const HEAD_HEIGHT = 1.75;
export const MIN_ROW_HEAD = 2.75;



const SAFE_COLOR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,24}|rgba?\([\d\s,.%]+\))$/;
const BORDER_WIDTH: Record<BorderSide['style'], string> = { thin: 'thin solid', medium: 'medium solid', thick: 'thick solid', dashed: 'thin dashed', dotted: 'thin dotted', double: 'medium double' };

/** Escapa texto para HTML. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Color seguro para un atributo style; vacío si no lo es. */
export function safeColor(c: string | undefined): string {
  return c && SAFE_COLOR.test(c) ? c : '';
}

/** Luminancia relativa de un color hex; null si no es hex. */
function luminance(hex: string): number | null {
  const m = /^#([0-9a-f]{6}|[0-9a-f]{3})/i.exec(hex);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join('') : m[1];
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Texto legible sobre un relleno: la hoja se lee igual en tema claro y oscuro. */
export function contrastOn(bg: string): string | null {
  const l = luminance(bg);
  if (l === null) return null;
  return l > 0.4 ? '#1a1a1a' : '#ffffff';
}

/** Estilo de borde. */
const borderCss = (b: BorderSide | undefined, prop: string): string => {
  if (!b) return '';
  const color = safeColor(b.color) || 'var(--iswc-text)';
  return `${prop}:${BORDER_WIDTH[b.style] ?? 'thin solid'} ${color};`;
};

/** CSS en línea de la celda (fondo, bordes, alineación). */
function cellCss(s: CellStyle, fx: CfEffect | null, formatColor: string | undefined): { td: string; text: string } {
  let td = '';
  let text = '';
  const bg = safeColor(fx?.bg ?? s.bg);
  if (bg) td += `background-color:${bg};`;
  const color = safeColor(fx?.color ?? formatColor ?? s.color) || (bg ? contrastOn(bg) ?? '' : '');
  if (color) td += `color:${color};`;
  if (s.align) td += `text-align:${s.align};`;
  if (s.valign) td += `vertical-align:${s.valign};`;
  td += borderCss(s.borderTop, 'border-block-start') + borderCss(s.borderBottom, 'border-block-end') + borderCss(s.borderLeft, 'border-inline-start') + borderCss(s.borderRight, 'border-inline-end');
  if (s.indent) td += `padding-inline-start:${0.35 + s.indent}em;`;
  if (fx?.bold ?? s.bold) text += 'font-weight:700;';
  if (fx?.italic ?? s.italic) text += 'font-style:italic;';
  const deco = `${s.underline ? 'underline ' : ''}${s.strike ? 'line-through' : ''}`.trim();
  if (deco) text += `text-decoration:${deco};`;
  if (s.size) text += `font-size:${(s.size / 11).toFixed(3)}em;`;
  if (s.font) text += `font-family:"${s.font.replace(/["<>;\\]/g, '')}";`;
  return { td, text };
}

/** Ejes de una hoja. */
export function buildAxes(doc: SpreadsheetDoc, sheet: Sheet): { rows: Axis; cols: Axis } {
  const ex = doc.extras(sheet);
  const rowSpecial = new Map<number, number>(ex.rowHeights);
  for (const r of ex.hiddenRows) rowSpecial.set(r, 0);
  for (const r of ex.filterHidden) rowSpecial.set(r, 0);
  const colSpecial = new Map<number, number>(ex.colWidths);
  for (const c of ex.hiddenCols) colSpecial.set(c, 0);
  return { rows: new Axis(sheet.rows, 1.75, rowSpecial), cols: new Axis(sheet.cols, 6.5, colSpecial) };
}

/** Ancho de la columna de números de fila. */
export function rowHeadWidth(sheet: Sheet): number {
  return Math.max(MIN_ROW_HEAD, 1.2 + String(sheet.rows).length * 0.62);
}

/** Ventana visible a partir del desplazamiento en em. `everything` desactiva la virtualización. */
export function computeWindow(doc: SpreadsheetDoc, sheet: Sheet, axes: { rows: Axis; cols: Axis }, scroll: { top: number; left: number; height: number; width: number }, everything: boolean): GridWindow {
  const { rows: ra, cols: ca } = axes;
  const { freeze } = doc.extras(sheet);
  const range = (ax: Axis, frozen: number, start: number, size: number): { list: number[]; before: number; after: number; at: number } => {
    const list: number[] = [];
    for (let i = 0; i < frozen; i++) if (ax.size(i) > 0) list.push(i);
    if (everything) {
      for (let i = frozen; i < ax.count; i++) if (ax.size(i) > 0) list.push(i);
      return { list, before: 0, after: 0, at: -1 };
    }
    const frozenSize = ax.offset(frozen);
    const from = Math.max(frozen, ax.indexAt(start + frozenSize) - 3);
    const to = Math.min(ax.count - 1, ax.indexAt(start + size) + 3);
    const at = list.length;
    for (let i = from; i <= to; i++) if (ax.size(i) > 0) list.push(i);
    return { list, before: ax.offset(from) - frozenSize, after: ax.total - ax.offset(to + 1), at };
  };
  const r = range(ra, freeze.rows, scroll.top, scroll.height);
  const c = range(ca, freeze.cols, scroll.left, scroll.width);
  return { rows: r.list, cols: c.list, topGapAt: r.at, topGap: r.before, bottomGap: r.after, leftGapAt: c.at, leftGap: c.before, rightGap: c.after };
}

/** Combinaciones que tocan la ventana, por celda. */
function mergeIndex(doc: SpreadsheetDoc, sheet: Sheet): Map<number, Rect> {
  const out = new Map<number, Rect>();
  for (const m of doc.extras(sheet).merges) {
    for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) out.set(cellKey(r, c), m);
  }
  return out;
}

/** HTML completo de la tabla (colgroup, cabecera y cuerpo). */
export function renderGrid(doc: SpreadsheetDoc, sheet: Sheet, axes: { rows: Axis; cols: Axis }, win: GridWindow, cf: CfEvaluator, opts: RenderOptions): string {
  const ex = doc.extras(sheet);
  const { rows: ra, cols: ca } = axes;
  const head = rowHeadWidth(sheet);
  const fr = ex.freeze.rows;
  const fc = ex.freeze.cols;
  const engine = doc.engine;
  const merges = ex.merges.length ? mergeIndex(doc, sheet) : null;
  const filter = ex.filter ? filterInfo(doc, sheet) : null;
  const rowPos = new Map<number, number>(win.rows.map((r, i) => [r, i]));
  const colPos = new Map<number, number>(win.cols.map((c, i) => [c, i]));
  const hasGapL = win.leftGap > 0;
  const hasGapR = win.rightGap > 0;
  const headRowSticky = (r: number): string => (r < fr ? `inset-block-start:${HEAD_HEIGHT + ra.offset(r)}em;` : '');

  let cols = `<col style="inline-size:${head}em">`;
  win.cols.forEach((c, i) => {
    if (i === win.leftGapAt && hasGapL) cols += `<col style="inline-size:${win.leftGap}em">`;
    cols += `<col style="inline-size:${ca.size(c)}em">`;
  });
  if (win.leftGapAt >= win.cols.length && hasGapL) cols += `<col style="inline-size:${win.leftGap}em">`;
  if (hasGapR) cols += `<col style="inline-size:${win.rightGap}em">`;

  let thead = `<thead role="rowgroup"><tr role="row" aria-rowindex="1" style="block-size:${HEAD_HEIGHT}em"><th class="corner" role="columnheader" aria-colindex="1" aria-label="Seleccionar todo" data-corner="1"></th>`;
  const gapHead = '<td class="vgap" aria-hidden="true"></td>';
  win.cols.forEach((c, i) => {
    if (i === win.leftGapAt && hasGapL) thead += gapHead;
    const name = colName(c);
    const sticky = c < fc ? ` frz" style="inset-inline-start:${head + ca.offset(c)}em` : '';
    const edge = c === fc - 1 ? ' frz-r' : '';
    thead += `<th class="col-head${edge}${sticky}" role="columnheader" aria-colindex="${c + 2}" aria-label="Columna ${name}" data-col="${c}">${name}<i class="rsz"></i></th>`;
  });
  if (hasGapR) thead += gapHead;
  thead += '</tr></thead>';

  const body: string[] = ['<tbody role="rowgroup">'];
  const gapRow = (h: number, key: string): string => `<tr class="vgap" aria-hidden="true" data-gap="${key}" style="block-size:${h}em"><td colspan="${win.cols.length + 3}"></td></tr>`;
  win.rows.forEach((r, ri) => {
    if (ri === win.topGapAt && win.topGap > 0) body.push(gapRow(win.topGap, 'top'));
    const frozenRow = r < fr;
    const rowCls = frozenRow ? ' class="frz-row"' : '';
    const edgeRow = r === fr - 1 ? ' frz-b' : '';
    body.push(`<tr role="row"${rowCls} aria-rowindex="${r + 2}" style="block-size:${ra.size(r)}em">`);
    const stickyTop = headRowSticky(r);
    body.push(`<th class="row-head${edgeRow}${frozenRow ? ' frz-rh' : ''}" role="rowheader" scope="row" aria-colindex="1" aria-label="Fila ${r + 1}" data-row="${r}"${stickyTop ? ` style="${stickyTop}"` : ''}>${r + 1}<i class="rsz-r"></i></th>`);
    let overflow = 0;
    win.cols.forEach((c, ci) => {
      if (ci === win.leftGapAt && hasGapL) body.push('<td class="vgap" aria-hidden="true"></td>');
      const key = cellKey(r, c);
      const m = merges?.get(key);
      let spans = '';
      let anchorR = r;
      let anchorC = c;
      let extra = '';
      if (m) {
        const firstRow = win.rows.find((y) => y >= m.r1);
        const firstCol = win.cols.find((x) => x >= m.c1);
        if (firstRow !== r || firstCol !== c) return;
        let rs = 0;
        let cs = 0;
        for (let y = m.r1; y <= m.r2; y++) if (rowPos.has(y)) rs++;
        for (let x = m.c1; x <= m.c2; x++) if (colPos.has(x)) cs++;
        spans = `${rs > 1 ? ` rowspan="${rs}"` : ''}${cs > 1 ? ` colspan="${cs}"` : ''} data-r2="${m.r2}" data-c2="${m.c2}"`;
        anchorR = m.r1;
        anchorC = m.c1;
        extra = ' merged';
      }
      const cell = engine.getCell(sheet, anchorR, anchorC);
      const value = engine.getValue(sheet, anchorR, anchorC);
      const style = doc.styles.get(cell?.s);
      const fx = cf.effect(sheet, anchorR, anchorC);
      const showRaw = opts.showFormulas && cell?.f !== undefined;
      const shown = showRaw ? { text: cell!.f! } : doc.displayText(sheet, anchorR, anchorC);
      const css = cellCss(style, fx, shown.color);
      const isErr = value instanceof CellError;
      let cls = `cell${extra}`;
      if (typeof value === 'number' && !style.align) cls += ' n';
      if ((typeof value === 'boolean' || isErr) && !style.align) cls += ' b';
      if (isErr) cls += ' err';
      if (style.wrap) cls += ' wr';
      if (cell?.l) cls += ' lnk';
      if (c === fc - 1) cls += ' frz-r';
      if (r === fr - 1) cls += ' frz-b';
      let sticky = '';
      if (c < fc) {
        cls += ' frz';
        sticky += `inset-inline-start:${head + ca.offset(c)}em;`;
      }
      if (frozenRow) {
        cls += c < fc ? ' frz-both' : ' frz-top';
        sticky += stickyTop;
      }
      // Texto que invade celdas vecinas vacías, como en Excel.
      if (overflow > 0) { cls += ' ovc'; overflow -= ca.size(c); }
      if (typeof value === 'string' && !style.wrap && !style.align && !m && shown.text.length) {
        const need = shown.text.length * 0.5 * (style.size ? style.size / 11 : 1) - ca.size(c);
        if (need > 0) {
          let room = 0;
          for (let i = ci + 1; i < win.cols.length && room < need; i++) {
            const x = win.cols[i];
            const next = engine.getCell(sheet, r, x);
            if (next?.v !== undefined || next?.f !== undefined || engine.getValue(sheet, r, x) !== null) break;
            room += ca.size(x);
          }
          if (room > 0) { cls += ' ov'; overflow = room; }
        }
      }
      let inner = `<span class="t"${css.text ? ` style="${esc(css.text)}"` : ''}>${esc(shown.text)}</span>`;
      if (fx?.bar) inner = `<i class="bar" style="inline-size:${fx.bar.pct.toFixed(1)}%;background:${safeColor(fx.bar.color)}"></i>${inner}`;
      if (fx?.icon) inner = `<iswc-icon class="ci" icon="${esc(fx.icon)}" style="color:${safeColor(fx.iconColor)}"></iswc-icon>${inner}`;
      if (cell?.c) { cls += ' has-note'; inner += '<i class="cm"></i>'; }
      if (filter && r === filter.r1 && c >= filter.c1 && c <= filter.c2) inner += `<button class="fb${filter.active.has(c) ? ' on' : ''}" data-filter="${c}" aria-label="Filtrar columna" tabindex="-1"><iswc-icon icon="${filter.active.has(c) ? 'mdi:filter' : 'mdi:menu-down'}"></iswc-icon></button>`;
      const id = cellName(anchorR, anchorC);
      const active = opts.activeCell && opts.activeCell.r === anchorR && opts.activeCell.c === anchorC;
      const label = `${id}: ${shown.text === '' ? 'vacía' : shown.text}`;
      const styleAttr = css.td + sticky;
      body.push(`<td class="${cls}" role="gridcell" data-r="${anchorR}" data-c="${anchorC}" data-id="${id}" aria-colindex="${c + 2}" aria-label="${esc(label)}" tabindex="${active ? 0 : -1}"${spans}${styleAttr ? ` style="${esc(styleAttr)}"` : ''}>${inner}</td>`);
    });
    if (hasGapR) body.push('<td class="vgap" aria-hidden="true"></td>');
    body.push('</tr>');
  });
  if (win.bottomGap > 0) body.push(gapRow(win.bottomGap, 'bottom'));
  body.push('</tbody>');
  return `<colgroup>${cols}</colgroup>${thead}${body.join('')}`;
}

/** Datos del filtro automático para pintar sus botones. */
function filterInfo(doc: SpreadsheetDoc, sheet: Sheet): { r1: number; c1: number; c2: number; active: Set<number> } | null {
  const f = doc.extras(sheet).filter!;
  const m = /^([A-Z]+)(\d+)(?::([A-Z]+)\d+)?$/.exec(f.range);
  if (!m) return null;
  const toCol = (s: string): number => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return { r1: Number(m[2]) - 1, c1: toCol(m[1]), c2: toCol(m[3] ?? m[1]), active: new Set(Object.keys(f.columns).map(Number)) };
}
