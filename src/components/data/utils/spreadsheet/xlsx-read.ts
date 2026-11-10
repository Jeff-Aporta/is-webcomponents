// @contexto INDICE.md · src/components/data/README.md
// xlsx-read.ts — importa .xlsx a un documento `iswc-spreadsheet/v1`: valores, fórmulas (también
// compartidas), estilos, combinaciones, medidas, nombres, validación, condicional y notas.
import { parseCell, parseRange, rangeName } from './address.js';
import { mapTokens, shiftFormula } from './rewrite.js';
import { child, children, parseXml } from './xml.js';
import type { XNode } from './xml.schemas.js';
import { readZip } from './zip.js';
import type { BorderSide, CellDoc, CellStyle, CfRule, SheetDoc, ValidationRule, WorkbookDoc } from '@jeff-aporta/iswc-base/components/data/schemas/spreadsheet.schemas.js';

const EM_PER_CHAR = 0.5;
const PT_PER_EM = 11;

/** Formatos numéricos integrados de OOXML. */
const BUILTIN: Record<number, string> = {
  1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%', 11: '0.00E+00', 12: '# ?/?', 13: '# ??/??',
  14: 'dd/mm/yyyy', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy', 18: 'h:mm AM/PM', 19: 'h:mm:ss AM/PM', 20: 'h:mm', 21: 'h:mm:ss', 22: 'dd/mm/yyyy h:mm',
  37: '#,##0 ;(#,##0)', 38: '#,##0 ;[Red](#,##0)', 39: '#,##0.00;(#,##0.00)', 40: '#,##0.00;[Red](#,##0.00)', 45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mm:ss.0', 48: '##0.0E+0', 49: '@',
};

/** Paleta del tema por defecto de Office. */
const THEME = ['#ffffff', '#000000', '#e7e6e6', '#44546a', '#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47', '#0563c1', '#954f72'];

/** Color de un nodo OOXML. El negro automático se omite para que siga al tema de la app. */
function colorOf(n: XNode | undefined, theme: string[]): string | undefined {
  if (!n) return undefined;
  if (n.attrs.rgb) {
    const c = `#${n.attrs.rgb.slice(-6).toLowerCase()}`;
    return c === '#000000' ? undefined : c;
  }
  if (n.attrs.theme === undefined) return undefined;
  const base = theme[Number(n.attrs.theme)];
  if (!base) return undefined;
  const tint = Number(n.attrs.tint ?? 0);
  if (!tint) return base === '#000000' ? undefined : base;
  const ch = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16));
  const out = ch.map((v) => Math.round(tint > 0 ? v + (255 - v) * tint : v * (1 + tint)).toString(16).padStart(2, '0'));
  return `#${out.join('')}`;
}

/** Lector de una parte como texto. */
const text = (b: Uint8Array | undefined): string => (b ? new TextDecoder().decode(b) : '');

/** Estilos del libro. */
function readStyles(root: XNode | undefined, theme: string[]): { xfs: CellStyle[]; dxfs: CfRule['style'][] } {
  const fmts = new Map<number, string>();
  for (const n of children(child(root, 'numFmts'), 'numFmt')) fmts.set(Number(n.attrs.numFmtId), n.attrs.formatCode);
  const font = (f: XNode | undefined): Partial<CellStyle> => {
    const s: Partial<CellStyle> = {};
    if (!f) return s;
    if (child(f, 'b') && child(f, 'b')!.attrs.val !== '0') s.bold = true;
    if (child(f, 'i') && child(f, 'i')!.attrs.val !== '0') s.italic = true;
    if (child(f, 'u')) s.underline = true;
    if (child(f, 'strike')) s.strike = true;
    const color = colorOf(child(f, 'color'), theme);
    if (color) s.color = color;
    const sz = Number(child(f, 'sz')?.attrs.val);
    if (sz && sz !== 11) s.size = sz;
    const name = child(f, 'name')?.attrs.val;
    if (name && name !== 'Calibri') s.font = name;
    return s;
  };
  const fill = (f: XNode | undefined): string | undefined => {
    const p = child(f, 'patternFill');
    if (!p || p.attrs.patternType === 'none' || p.attrs.patternType === 'gray125') return undefined;
    return colorOf(child(p, 'fgColor'), theme) ?? colorOf(child(p, 'bgColor'), theme);
  };
  const fonts = children(child(root, 'fonts'), 'font');
  const fills = children(child(root, 'fills'), 'fill');
  const borders = children(child(root, 'borders'), 'border');
  const side = (b: XNode | undefined, tag: string): BorderSide | undefined => {
    const n = child(b, tag);
    if (!n?.attrs.style) return undefined;
    const map: Record<string, BorderSide['style']> = { thin: 'thin', hair: 'thin', medium: 'medium', mediumDashed: 'dashed', dashed: 'dashed', dotted: 'dotted', thick: 'thick', double: 'double' };
    return { style: map[n.attrs.style] ?? 'thin', color: colorOf(child(n, 'color'), theme) };
  };
  const xfs = children(child(root, 'cellXfs'), 'xf').map((x): CellStyle => {
    const s: CellStyle = { ...font(fonts[Number(x.attrs.fontId)]) };
    const bg = fill(fills[Number(x.attrs.fillId)]);
    if (bg) s.bg = bg;
    const b = borders[Number(x.attrs.borderId)];
    const top = side(b, 'top');
    const right = side(b, 'right');
    const bottom = side(b, 'bottom');
    const left = side(b, 'left');
    if (top) s.borderTop = top;
    if (right) s.borderRight = right;
    if (bottom) s.borderBottom = bottom;
    if (left) s.borderLeft = left;
    const id = Number(x.attrs.numFmtId);
    const nf = fmts.get(id) ?? BUILTIN[id];
    if (nf) s.numFmt = nf;
    const a = child(x, 'alignment');
    if (a) {
      if (a.attrs.horizontal === 'left' || a.attrs.horizontal === 'center' || a.attrs.horizontal === 'right') s.align = a.attrs.horizontal;
      const v = a.attrs.vertical;
      if (v === 'top' || v === 'bottom') s.valign = v;
      if (v === 'center') s.valign = 'middle';
      if (a.attrs.wrapText === '1') s.wrap = true;
      if (a.attrs.indent) s.indent = Number(a.attrs.indent);
    }
    return s;
  });
  const dxfs = children(child(root, 'dxfs'), 'dxf').map((d): CfRule['style'] => {
    const f = font(child(d, 'font'));
    const p = child(child(d, 'fill'), 'patternFill');
    const bg = colorOf(child(p, 'bgColor'), theme);
    const s: NonNullable<CfRule['style']> = {};
    if (f.color) s.color = f.color;
    if (f.bold) s.bold = true;
    if (f.italic) s.italic = true;
    if (bg) s.bg = bg;
    return s;
  });
  return { xfs, dxfs };
}

/** Quita prefijos de funciones nuevas. */
const cleanFormula = (f: string): string => mapTokens(`=${f}`, (t) => (t.type === 'func' ? t.text.replace(/^_xlfn\.(_xlws\.)?/i, '') : undefined));

/** Reglas de formato condicional admitidas. */
function readCf(n: XNode, dxfs: CfRule['style'][], theme: string[], seq: () => string): CfRule[] {
  const range = (n.attrs.sqref ?? '').split(' ')[0];
  const out: CfRule[] = [];
  const OPS: Record<string, CfRule['op']> = { greaterThan: 'gt', lessThan: 'lt', greaterThanOrEqual: 'gte', lessThanOrEqual: 'lte', equal: 'eq', notEqual: 'ne', between: 'between' };
  for (const r of children(n, 'cfRule')) {
    const style = r.attrs.dxfId === undefined ? undefined : dxfs[Number(r.attrs.dxfId)];
    const f = children(r, 'formula').map((x) => x.text);
    const base = { id: seq(), range, style };
    const value = (t: string | undefined): string | undefined => (t === undefined ? undefined : /^-?[\d.]+$/.test(t) ? t : /^".*"$/.test(t) ? t.slice(1, -1) : `=${t}`);
    switch (r.attrs.type) {
      case 'cellIs': out.push({ ...base, type: 'cell', op: OPS[r.attrs.operator] ?? 'eq', a: value(f[0]), b: value(f[1]) }); break;
      case 'containsText': out.push({ ...base, type: 'text', a: r.attrs.text }); break;
      case 'expression': out.push({ ...base, type: 'formula', a: `=${f[0] ?? ''}` }); break;
      case 'top10': out.push({ ...base, type: r.attrs.bottom === '1' ? 'bottom' : 'top', rank: Number(r.attrs.rank ?? 10) }); break;
      case 'aboveAverage': out.push({ ...base, type: r.attrs.aboveAverage === '0' ? 'belowAverage' : 'aboveAverage' }); break;
      case 'duplicateValues': out.push({ ...base, type: 'duplicate' }); break;
      case 'uniqueValues': out.push({ ...base, type: 'unique' }); break;
      case 'containsBlanks': out.push({ ...base, type: 'blank' }); break;
      case 'colorScale': out.push({ ...base, type: 'colorScale', colors: children(child(r, 'colorScale'), 'color').map((c) => colorOf(c, theme) ?? '#000000') }); break;
      case 'dataBar': out.push({ ...base, type: 'dataBar', colors: [colorOf(child(child(r, 'dataBar'), 'color'), theme) ?? '#5b9bd5'] }); break;
      case 'iconSet': {
        const set = child(r, 'iconSet')?.attrs.iconSet ?? '';
        out.push({ ...base, type: 'iconSet', icons: /Flags/.test(set) ? 'flags' : /Traffic|Symbols/.test(set) ? 'dots' : 'arrows' });
        break;
      }
      default:
    }
  }
  return out;
}

/** Reglas de validación. */
function readValidations(root: XNode, seq: () => string): ValidationRule[] {
  const OPS: Record<string, ValidationRule['op']> = { between: 'between', notBetween: 'notBetween', equal: 'eq', notEqual: 'ne', greaterThan: 'gt', lessThan: 'lt', greaterThanOrEqual: 'gte', lessThanOrEqual: 'lte' };
  return children(child(root, 'dataValidations'), 'dataValidation').flatMap((d): ValidationRule[] => {
    const t = d.attrs.type;
    if (t !== 'list' && t !== 'whole' && t !== 'decimal' && t !== 'date' && t !== 'textLength' && t !== 'custom') return [];
    const f1 = child(d, 'formula1')?.text ?? '';
    const f2 = child(d, 'formula2')?.text;
    const a = t === 'list' && /^".*"$/.test(f1) ? f1.slice(1, -1) : /^-?[\d.]+$/.test(f1) ? f1 : `=${f1}`;
    return [{
      id: seq(), range: (d.attrs.sqref ?? '').split(' ')[0], type: t, op: OPS[d.attrs.operator ?? 'between'], a,
      b: f2 === undefined ? undefined : /^-?[\d.]+$/.test(f2) ? f2 : `=${f2}`,
      allowBlank: d.attrs.allowBlank === '1', message: d.attrs.error,
      severity: d.attrs.errorStyle === 'warning' ? 'warning' : d.attrs.errorStyle === 'information' ? 'info' : 'stop',
    }];
  });
}

/** Relaciones de una parte. */
function rels(xml: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!xml) return out;
  for (const r of children(parseXml(xml), 'Relationship')) out.set(r.attrs.Id, r.attrs.Target);
  return out;
}

/** Lee un .xlsx. */
export async function readXlsx(bytes: Uint8Array): Promise<WorkbookDoc> {
  const zip = await readZip(bytes);
  const wb = parseXml(text(zip.get('xl/workbook.xml')));
  if (wb.name === '#root') throw new Error('El archivo no contiene un libro de Excel');
  const wbRels = rels(text(zip.get('xl/_rels/workbook.xml.rels')));
  const sst = children(parseXml(text(zip.get('xl/sharedStrings.xml')) || '<sst/>'), 'si').map((si) => {
    const t = child(si, 't');
    return t ? t.text : children(si, 'r').map((r) => child(r, 't')?.text ?? '').join('');
  });
  const themeXml = text(zip.get('xl/theme/theme1.xml'));
  let theme = THEME;
  if (themeXml) {
    const scheme = child(child(parseXml(themeXml), 'themeElements'), 'clrScheme');
    const pick = (n: string): string | undefined => { const c = child(scheme, n)?.children[0]; return c ? `#${(c.attrs.lastClr ?? c.attrs.val ?? '').toLowerCase()}` : undefined; };
    const names = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
    theme = names.map((n, i) => pick(n) ?? THEME[i]);
  }
  const styleRoot = zip.has('xl/styles.xml') ? parseXml(text(zip.get('xl/styles.xml'))) : undefined;
  const { xfs, dxfs } = readStyles(styleRoot, theme);
  let seq = 0;
  const nextId = (): string => `x${++seq}`;
  const sheets: SheetDoc[] = children(child(wb, 'sheets'), 'sheet').map((sh) => {
    const target = wbRels.get(sh.attrs['r:id']) ?? '';
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    const root = parseXml(text(zip.get(path)));
    const cells: Record<string, CellDoc> = {};
    const shared = new Map<string, { f: string; r: number; c: number }>();
    let rows = 1;
    let cols = 1;
    const rowHeights: Record<string, number> = {};
    const hiddenRows: number[] = [];
    for (const row of children(child(root, 'sheetData'), 'row')) {
      const y = Number(row.attrs.r) - 1;
      if (row.attrs.ht && row.attrs.customHeight === '1') rowHeights[y] = Number(row.attrs.ht) / PT_PER_EM;
      if (row.attrs.hidden === '1') hiddenRows.push(y);
      for (const c of children(row, 'c')) {
        const ref = c.attrs.r;
        const pos = parseCell(ref);
        if (!pos) continue;
        rows = Math.max(rows, pos.r + 1);
        cols = Math.max(cols, pos.c + 1);
        const out: CellDoc = {};
        const style = xfs[Number(c.attrs.s ?? 0)];
        if (style && Object.keys(style).length) out.s = style;
        const fn = child(c, 'f');
        const raw = child(c, 'v')?.text;
        if (fn) {
          if (fn.attrs.t === 'shared') {
            const si = fn.attrs.si;
            if (fn.text) shared.set(si, { f: `=${fn.text}`, r: pos.r, c: pos.c });
            const base = shared.get(si);
            if (base) out.f = cleanFormula(shiftFormula(base.f, pos.r - base.r, pos.c - base.c).slice(1));
          } else if (fn.text) out.f = cleanFormula(fn.text);
        }
        if (out.f === undefined) {
          const t = c.attrs.t;
          if (t === 's') out.v = sst[Number(raw)] ?? '';
          else if (t === 'inlineStr') out.v = child(child(c, 'is'), 't')?.text ?? '';
          else if (t === 'b') out.v = raw === '1';
          else if (t === 'str' || t === 'e') out.v = raw ?? '';
          else if (raw !== undefined) out.v = Number(raw);
        }
        if (out.v !== undefined || out.f !== undefined || out.s) cells[ref] = out;
      }
    }
    const doc: SheetDoc = { name: sh.attrs.name, cells, rows: Math.max(rows + 20, 40), cols: Math.max(cols + 4, 26) };
    if (sh.attrs.state === 'hidden' || sh.attrs.state === 'veryHidden') doc.hidden = true;
    if (Object.keys(rowHeights).length) doc.rowHeights = rowHeights;
    if (hiddenRows.length) doc.hiddenRows = hiddenRows;
    const colWidths: Record<string, number> = {};
    const hiddenCols: number[] = [];
    for (const col of children(child(root, 'cols'), 'col')) {
      const lo = Number(col.attrs.min) - 1;
      const hi = Math.min(Number(col.attrs.max) - 1, lo + 512);
      for (let c = lo; c <= hi; c++) {
        if (col.attrs.customWidth === '1' && col.attrs.width) colWidths[c] = Number(col.attrs.width) * EM_PER_CHAR;
        if (col.attrs.hidden === '1') hiddenCols.push(c);
      }
    }
    if (Object.keys(colWidths).length) doc.colWidths = colWidths;
    if (hiddenCols.length) doc.hiddenCols = hiddenCols;
    const merges = children(child(root, 'mergeCells'), 'mergeCell').map((m) => m.attrs.ref);
    if (merges.length) doc.merges = merges;
    const view = child(child(root, 'sheetViews'), 'sheetView');
    const pane = child(view, 'pane');
    if (pane?.attrs.state === 'frozen') doc.freeze = { rows: Number(pane.attrs.ySplit ?? 0), cols: Number(pane.attrs.xSplit ?? 0) };
    if (view?.attrs.showGridLines === '0') doc.gridlines = false;
    const tab = colorOf(child(child(root, 'sheetPr'), 'tabColor'), theme);
    if (tab) doc.tabColor = tab;
    const filter = child(root, 'autoFilter');
    if (filter?.attrs.ref) {
      const x = parseRange(filter.attrs.ref);
      if (x) doc.filter = { range: rangeName(x), columns: {} };
    }
    const cf = children(root, 'conditionalFormatting').flatMap((n) => readCf(n, dxfs, theme, nextId));
    if (cf.length) doc.cf = cf;
    const dv = readValidations(root, nextId);
    if (dv.length) doc.validations = dv;
    const base = path.split('/').pop();
    const sheetRels = rels(text(zip.get(`xl/worksheets/_rels/${base}.rels`)));
    for (const t of sheetRels.values()) {
      if (!/comments/i.test(t)) continue;
      const file = t.startsWith('/') ? t.slice(1) : `xl/${t.replace(/^\.\.\//, '')}`;
      for (const com of children(child(parseXml(text(zip.get(file))), 'commentList'), 'comment')) {
        const tn = child(com, 'text');
        const body = child(tn, 't')?.text ?? children(tn, 'r').map((r) => child(r, 't')?.text ?? '').join('');
        const ref = com.attrs.ref;
        cells[ref] = { ...cells[ref], c: body };
      }
    }
    return doc;
  });
  if (!sheets.length) throw new Error('El libro no tiene hojas');
  const names = children(child(wb, 'definedNames'), 'definedName')
    .filter((n) => !n.attrs.name.startsWith('_xlnm.'))
    .map((n) => ({ name: n.attrs.name, ref: `=${n.text}` }));
  return { $schema: 'iswc-spreadsheet/v1', sheets, names, active: Number(child(child(wb, 'bookViews'), 'workbookView')?.attrs.activeTab ?? 0) };
}

