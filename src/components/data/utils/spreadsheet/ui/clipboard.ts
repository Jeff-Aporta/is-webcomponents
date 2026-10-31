// clipboard.ts — intercambio con Excel y Sheets: TSV más tabla HTML con estilos, en ambos sentidos.
import type { Rect } from '../address.js';
import type { SpreadsheetDoc } from '../document.js';
import type { Sheet } from '../engine.js';
import { CellError } from '../values.js';
import { esc, safeColor } from './render.js';
import type { CellStyle } from '../../../schemas/spreadsheet.schemas.js';

/** TSV de un rango con el texto visible. */
export function toTsv(doc: SpreadsheetDoc, sheet: Sheet, x: Rect): string {
  const rows: string[] = [];
  for (let r = x.r1; r <= x.r2; r++) {
    const line: string[] = [];
    for (let c = x.c1; c <= x.c2; c++) {
      const t = doc.displayText(sheet, r, c).text;
      line.push(/[\t\n"]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
    }
    rows.push(line.join('\t'));
  }
  return rows.join('\r\n');
}

/** CSS de una celda para el HTML copiado. */
function styleCss(s: CellStyle): string {
  let css = '';
  if (s.bold) css += 'font-weight:bold;';
  if (s.italic) css += 'font-style:italic;';
  if (s.underline) css += 'text-decoration:underline;';
  if (safeColor(s.color)) css += `color:${s.color};`;
  if (safeColor(s.bg)) css += `background:${s.bg};`;
  if (s.align) css += `text-align:${s.align};`;
  if (s.size) css += `font-size:${s.size}pt;`;
  if (s.numFmt) css += `mso-number-format:'${s.numFmt.replace(/'/g, '')}';`;
  return css;
}

/** Tabla HTML de un rango, con fórmulas para Excel. */
export function toHtml(doc: SpreadsheetDoc, sheet: Sheet, x: Rect): string {
  let out = '<table>';
  for (let r = x.r1; r <= x.r2; r++) {
    out += '<tr>';
    for (let c = x.c1; c <= x.c2; c++) {
      const css = styleCss(doc.styleAt(sheet, r, c));
      const v = doc.engine.getValue(sheet, r, c);
      const num = typeof v === 'number' ? ` x:num="${v}"` : '';
      const f = doc.engine.getCell(sheet, r, c)?.f;
      const fa = f ? ` x:fmla="${esc(f)}"` : '';
      const text = v instanceof CellError ? v.code : doc.displayText(sheet, r, c).text;
      out += `<td${css ? ` style="${esc(css)}"` : ''}${num}${fa}>${esc(text)}</td>`;
    }
    out += '</tr>';
  }
  return `${out}</table>`;
}

/** Color CSS a hex. */
function toHex(css: string): string | undefined {
  const t = css.trim();
  if (/^#[0-9a-f]{6}$/i.test(t)) return t.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(t)) return `#${[...t.slice(1)].map((h) => h + h).join('')}`.toLowerCase();
  const m = /^rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/.exec(t);
  if (m) return `#${[m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('')}`;
  return undefined;
}

/** Lee estilos del `style` de una celda pegada. */
function readStyle(el: HTMLElement): CellStyle | undefined {
  const st = el.style;
  const s: CellStyle = {};
  const weight = st.fontWeight;
  if (weight === 'bold' || Number(weight) >= 600 || el.querySelector('b,strong')) s.bold = true;
  if (st.fontStyle === 'italic' || el.querySelector('i,em')) s.italic = true;
  if (st.textDecoration.includes('underline') || el.querySelector('u')) s.underline = true;
  const color = toHex(st.color);
  if (color && color !== '#000000') s.color = color;
  const bg = toHex(st.backgroundColor);
  if (bg && bg !== '#ffffff') s.bg = bg;
  const align = st.textAlign;
  if (align === 'center' || align === 'right' || align === 'left') s.align = align;
  return Object.keys(s).length ? s : undefined;
}

/** Interpreta HTML del portapapeles. Null si no trae tabla. */
export function parseClipboardHtml(html: string): { rows: string[][]; styles: (CellStyle | undefined)[][] } | null {
  if (!/<table/i.test(html) || typeof DOMParser === 'undefined') return null;
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const table = dom.querySelector('table');
  if (!table) return null;
  const rows: string[][] = [];
  const styles: (CellStyle | undefined)[][] = [];
  for (const tr of table.querySelectorAll('tr')) {
    const line: string[] = [];
    const st: (CellStyle | undefined)[] = [];
    for (const td of tr.querySelectorAll<HTMLElement>('td,th')) {
      line.push(td.getAttribute('x:fmla') ?? td.innerText ?? td.textContent ?? '');
      st.push(readStyle(td));
      const span = Number(td.getAttribute('colspan') ?? 1);
      for (let i = 1; i < span; i++) {
        line.push('');
        st.push(undefined);
      }
    }
    rows.push(line);
    styles.push(st);
  }
  return rows.length ? { rows, styles } : null;
}
