// xlsx-write.ts — exporta el libro a OOXML: valores, fórmulas (nombres canónicos en inglés),
// estilos, combinaciones, anchos, inmovilizado, filtro, validación, formato condicional y notas.
import { cellName, colName, parseRange } from './address.js';
import type { SpreadsheetDoc } from './document.js';
import { keyCol, keyRow } from './engine.js';
import type { Sheet } from './engine.js';
import { canonicalName } from './functions/index.js';
import { mapTokens } from './rewrite.js';
import { CellError } from './values.js';
import type { CellStyle, CfRule, ValidationRule } from '../../schemas/spreadsheet.schemas.js';
import { escapeXml } from './xml.js';
import { writeZip } from './zip.js';

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const RNS = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const EM_PER_CHAR = 0.5;
const PT_PER_EM = 11;
const FUTURE = new Set(['IFS', 'SWITCH', 'XLOOKUP', 'XMATCH', 'FILTER', 'SORT', 'SORTBY', 'UNIQUE', 'SEQUENCE', 'RANDARRAY', 'LET', 'LAMBDA', 'MAP', 'REDUCE', 'SCAN', 'BYROW', 'BYCOL', 'MAKEARRAY', 'TEXTJOIN', 'CONCAT', 'MAXIFS', 'MINIFS', 'TEXTBEFORE', 'TEXTAFTER', 'TEXTSPLIT', 'VSTACK', 'HSTACK', 'TAKE', 'DROP', 'EXPAND', 'TOCOL', 'TOROW', 'WRAPROWS', 'WRAPCOLS', 'CHOOSEROWS', 'CHOOSECOLS', 'XOR', 'IFNA', 'DAYS', 'ISOWEEKNUM', 'NUMBERVALUE', 'FORMULATEXT', 'SHEET', 'SHEETS', 'ISFORMULA', 'REGEXTEST', 'REGEXEXTRACT', 'REGEXREPLACE']);

/** Fórmula con nombres canónicos y comas, sin `=`. */
export function canonicalFormula(f: string): string {
  return mapTokens(f, (t) => {
    if (t.type === 'func') {
      const c = canonicalName(t.text);
      if (!c) return undefined;
      return FUTURE.has(c) ? `_xlfn.${c}` : c;
    }
    if (t.type === 'sep' && t.text === ';') return ',';
    return undefined;
  }).trimStart().replace(/^=/, '');
}

/** Color OOXML ARGB. */
function argb(c: string | undefined): string | null {
  if (!c || !/^#[0-9a-fA-F]{6}$/.test(c)) return null;
  return `FF${c.slice(1).toUpperCase()}`;
}

/** Tablas de estilos en construcción. */
class StyleSheet {
  fonts = ['<font><sz val="11"/><name val="Calibri"/></font>'];
  fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
  numFmts: string[] = [];
  xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  dxfs: string[] = [];
  #map = new Map<string, number>();

  #index(list: string[], xml: string): number {
    const i = list.indexOf(xml);
    if (i >= 0) return i;
    list.push(xml);
    return list.length - 1;
  }

  #numFmt(fmt: string | undefined): number {
    if (!fmt || fmt === 'General') return 0;
    return 164 + this.#index(this.numFmts, fmt);
  }

  #font(s: CellStyle): string {
    const c = argb(s.color);
    return `<font>${s.bold ? '<b/>' : ''}${s.italic ? '<i/>' : ''}${s.strike ? '<strike/>' : ''}${s.underline ? '<u/>' : ''}<sz val="${s.size ?? 11}"/>${c ? `<color rgb="${c}"/>` : ''}<name val="${escapeXml(s.font ?? 'Calibri')}"/></font>`;
  }

  #side(tag: string, b: CellStyle['borderTop']): string {
    if (!b) return `<${tag}/>`;
    const c = argb(b.color);
    return `<${tag} style="${b.style}">${c ? `<color rgb="${c}"/>` : '<color auto="1"/>'}</${tag}>`;
  }

  xf(style: CellStyle): number {
    const key = JSON.stringify(style);
    const hit = this.#map.get(key);
    if (hit !== undefined) return hit;
    const font = this.#index(this.fonts, this.#font(style));
    const bg = argb(style.bg);
    const fill = bg ? this.#index(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="${bg}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    const border = this.#index(this.borders, `<border>${this.#side('left', style.borderLeft)}${this.#side('right', style.borderRight)}${this.#side('top', style.borderTop)}${this.#side('bottom', style.borderBottom)}<diagonal/></border>`);
    const num = this.#numFmt(style.numFmt);
    const aligned = style.align || style.valign || style.wrap || style.indent;
    const align = aligned ? `<alignment${style.align ? ` horizontal="${style.align}"` : ''}${style.valign ? ` vertical="${style.valign === 'middle' ? 'center' : style.valign}"` : ''}${style.wrap ? ' wrapText="1"' : ''}${style.indent ? ` indent="${style.indent}"` : ''}/>` : '';
    const xml = `<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"${align ? ' applyAlignment="1"' : ''}>${align}</xf>`;
    this.xfs.push(xml);
    this.#map.set(key, this.xfs.length - 1);
    return this.xfs.length - 1;
  }

  dxf(style: CfRule['style']): number {
    const c = argb(style?.color);
    const bg = argb(style?.bg);
    const font = c || style?.bold || style?.italic ? `<font>${style?.bold ? '<b/>' : ''}${style?.italic ? '<i/>' : ''}${c ? `<color rgb="${c}"/>` : ''}</font>` : '';
    const fill = bg ? `<fill><patternFill><bgColor rgb="${bg}"/></patternFill></fill>` : '';
    this.dxfs.push(`<dxf>${font}${fill}</dxf>`);
    return this.dxfs.length - 1;
  }

  xml(): string {
    const fmts = this.numFmts.length ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${escapeXml(f)}"/>`).join('')}</numFmts>` : '';
    return `${HEAD}<styleSheet ${NS}>${fmts}<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts><fills count="${this.fills.length}">${this.fills.join('')}</fills><borders count="${this.borders.length}">${this.borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="${this.dxfs.length}">${this.dxfs.join('')}</dxfs></styleSheet>`;
  }
}

/** Operadores de cellIs. */
const CF_OP: Record<string, string> = { gt: 'greaterThan', lt: 'lessThan', gte: 'greaterThanOrEqual', lte: 'lessThanOrEqual', eq: 'equal', ne: 'notEqual', between: 'between' };
const DV_OP: Record<string, string> = { ...CF_OP, notBetween: 'notBetween' };

/** Operando de regla como fórmula XML. */
const operand = (t: string): string => escapeXml(t.startsWith('=') ? canonicalFormula(t) : Number.isNaN(Number(t)) ? `"${t}"` : t);

function cfXml(rule: CfRule, priority: number, sheet: StyleSheet): string {
  const open = (type: string, extra = ''): string => `<cfRule type="${type}" priority="${priority}"${extra}`;
  const dxf = (): string => ` dxfId="${sheet.dxf(rule.style)}"`;
  const anchor = parseRange(rule.range)?.r1 !== undefined ? cellName(parseRange(rule.range)!.r1, parseRange(rule.range)!.c1) : 'A1';
  switch (rule.type) {
    case 'cell': {
      const f = `<formula>${operand(rule.a ?? '')}</formula>${rule.op === 'between' ? `<formula>${operand(rule.b ?? '')}</formula>` : ''}`;
      return `${open('cellIs', `${dxf()} operator="${CF_OP[rule.op ?? 'gt']}"`)}>${f}</cfRule>`;
    }
    case 'text': return `${open('containsText', `${dxf()} operator="containsText" text="${escapeXml(rule.a ?? '')}"`)}><formula>NOT(ISERROR(SEARCH("${escapeXml(rule.a ?? '')}",${anchor})))</formula></cfRule>`;
    case 'formula': return `${open('expression', dxf())}><formula>${operand(rule.a?.startsWith('=') ? rule.a : `=${rule.a ?? ''}`)}</formula></cfRule>`;
    case 'top': case 'bottom': return `${open('top10', `${dxf()} rank="${rule.rank ?? 10}"${rule.type === 'bottom' ? ' bottom="1"' : ''}`)}/>`;
    case 'aboveAverage': return `${open('aboveAverage', dxf())}/>`;
    case 'belowAverage': return `${open('aboveAverage', `${dxf()} aboveAverage="0"`)}/>`;
    case 'duplicate': return `${open('duplicateValues', dxf())}/>`;
    case 'unique': return `${open('uniqueValues', dxf())}/>`;
    case 'blank': return `${open('containsBlanks', dxf())}><formula>LEN(TRIM(${anchor}))=0</formula></cfRule>`;
    case 'colorScale': {
      const colors = rule.colors?.length ? rule.colors : ['#f8696b', '#ffeb84', '#63be7b'];
      const cfvo = colors.map((_, i) => (i === 0 ? '<cfvo type="min"/>' : i === colors.length - 1 ? '<cfvo type="max"/>' : '<cfvo type="percentile" val="50"/>')).join('');
      return `${open('colorScale')}><colorScale>${cfvo}${colors.map((c) => `<color rgb="${argb(c) ?? 'FF000000'}"/>`).join('')}</colorScale></cfRule>`;
    }
    case 'dataBar': return `${open('dataBar')}><dataBar><cfvo type="min"/><cfvo type="max"/><color rgb="${argb(rule.colors?.[0]) ?? 'FF5B9BD5'}"/></dataBar></cfRule>`;
    case 'iconSet': return `${open('iconSet')}><iconSet iconSet="${rule.icons === 'flags' ? '3Flags' : rule.icons === 'dots' ? '3TrafficLights1' : '3Arrows'}"><cfvo type="percent" val="0"/><cfvo type="percent" val="33"/><cfvo type="percent" val="67"/></iconSet></cfRule>`;
  }
}

function dvXml(rule: ValidationRule): string {
  const type = rule.type === 'whole' ? 'whole' : rule.type;
  const f1 = rule.type === 'list' && !rule.a?.startsWith('=') ? `"${escapeXml((rule.a ?? '').replace(/;/g, ','))}"` : operand(rule.a ?? '');
  const f2 = rule.b ? `<formula2>${operand(rule.b)}</formula2>` : '';
  const op = rule.type === 'list' || rule.type === 'custom' ? '' : ` operator="${DV_OP[rule.op ?? 'between']}"`;
  const style = rule.severity && rule.severity !== 'stop' ? ` errorStyle="${rule.severity === 'info' ? 'information' : 'warning'}"` : '';
  const text = rule.message ? ` error="${escapeXml(rule.message)}" errorTitle="Valor no válido"` : '';
  return `<dataValidation type="${type}"${op}${style} allowBlank="${rule.allowBlank === false ? 0 : 1}" showErrorMessage="1"${text} sqref="${rule.range}"><formula1>${f1}</formula1>${f2}</dataValidation>`;
}

/** XML de una hoja. Devuelve también sus notas. */
function sheetXml(doc: SpreadsheetDoc, sheet: Sheet, st: StyleSheet, shared: Map<string, number>, tabSelected: boolean): { xml: string; notes: { ref: string; text: string }[] } {
  const ex = doc.extras(sheet);
  const notes: { ref: string; text: string }[] = [];
  const rows = new Map<number, number[]>();
  for (const k of sheet.cells.keys()) {
    const r = keyRow(k);
    const list = rows.get(r);
    if (list) list.push(keyCol(k));
    else rows.set(r, [keyCol(k)]);
  }
  for (const r of ex.rowHeights.keys()) if (!rows.has(r)) rows.set(r, []);
  for (const r of ex.hiddenRows) if (!rows.has(r)) rows.set(r, []);
  for (const r of ex.filterHidden) if (!rows.has(r)) rows.set(r, []);
  let body = '';
  for (const r of [...rows.keys()].sort((a, b) => a - b)) {
    const cols = rows.get(r)!.sort((a, b) => a - b);
    const h = ex.rowHeights.get(r);
    const hidden = ex.hiddenRows.has(r) || ex.filterHidden.has(r);
    body += `<row r="${r + 1}"${h ? ` ht="${(h * PT_PER_EM).toFixed(2)}" customHeight="1"` : ''}${hidden ? ' hidden="1"' : ''}>`;
    for (const c of cols) {
      const cell = doc.engine.getCell(sheet, r, c);
      if (!cell) continue;
      const ref = cellName(r, c);
      if (cell.c) notes.push({ ref, text: cell.c });
      const s = cell.s ? ` s="${st.xf(doc.styles.get(cell.s))}"` : '';
      if (cell.f !== undefined) {
        const v = doc.engine.getValue(sheet, r, c);
        const f = `<f>${escapeXml(canonicalFormula(cell.f))}</f>`;
        if (typeof v === 'number') body += `<c r="${ref}"${s}>${f}<v>${v}</v></c>`;
        else if (typeof v === 'boolean') body += `<c r="${ref}"${s} t="b">${f}<v>${v ? 1 : 0}</v></c>`;
        else if (v instanceof CellError) body += `<c r="${ref}"${s} t="e">${f}<v>${escapeXml(v.code)}</v></c>`;
        else body += `<c r="${ref}"${s} t="str">${f}<v>${escapeXml(String(v ?? ''))}</v></c>`;
      } else if (typeof cell.v === 'number') body += `<c r="${ref}"${s}><v>${cell.v}</v></c>`;
      else if (typeof cell.v === 'boolean') body += `<c r="${ref}"${s} t="b"><v>${cell.v ? 1 : 0}</v></c>`;
      else if (typeof cell.v === 'string') {
        let i = shared.get(cell.v);
        if (i === undefined) {
          i = shared.size;
          shared.set(cell.v, i);
        }
        body += `<c r="${ref}"${s} t="s"><v>${i}</v></c>`;
      } else body += `<c r="${ref}"${s}/>`;
    }
    body += '</row>';
  }
  const cols = [...new Set([...ex.colWidths.keys(), ...ex.hiddenCols])].sort((a, b) => a - b);
  const colsXml = cols.length ? `<cols>${cols.map((c) => `<col min="${c + 1}" max="${c + 1}" width="${((ex.colWidths.get(c) ?? 6.5) / EM_PER_CHAR).toFixed(2)}"${ex.colWidths.has(c) ? ' customWidth="1"' : ''}${ex.hiddenCols.has(c) ? ' hidden="1"' : ''}/>`).join('')}</cols>` : '';
  const { rows: fr, cols: fc } = ex.freeze;
  const pane = fr || fc ? `<pane${fc ? ` xSplit="${fc}"` : ''}${fr ? ` ySplit="${fr}"` : ''} topLeftCell="${cellName(fr, fc)}" activePane="${fr && fc ? 'bottomRight' : fr ? 'bottomLeft' : 'topRight'}" state="frozen"/>` : '';
  const view = `<sheetViews><sheetView workbookViewId="0"${tabSelected ? ' tabSelected="1"' : ''}${ex.gridlines ? '' : ' showGridLines="0"'}>${pane}</sheetView></sheetViews>`;
  const merges = ex.merges.length ? `<mergeCells count="${ex.merges.length}">${ex.merges.map((m) => `<mergeCell ref="${cellName(m.r1, m.c1)}:${cellName(m.r2, m.c2)}"/>`).join('')}</mergeCells>` : '';
  const filter = ex.filter ? `<autoFilter ref="${ex.filter.range}"/>` : '';
  const cf = ex.cf.map((rule, i) => `<conditionalFormatting sqref="${rule.range}">${cfXml(rule, i + 1, st)}</conditionalFormatting>`).join('');
  const dv = ex.validations.length ? `<dataValidations count="${ex.validations.length}">${ex.validations.map(dvXml).join('')}</dataValidations>` : '';
  const pr = ex.tabColor && argb(ex.tabColor) ? `<sheetPr><tabColor rgb="${argb(ex.tabColor)}"/></sheetPr>` : '';
  const legacy = notes.length ? '<legacyDrawing r:id="rId2"/>' : '';
  return {
    notes,
    xml: `${HEAD}<worksheet ${NS} ${RNS}>${pr}<dimension ref="A1:${colName(Math.max(0, sheet.cols - 1))}${Math.max(1, sheet.rows)}"/>${view}<sheetFormatPr defaultRowHeight="15"/>${colsXml}<sheetData>${body}</sheetData>${filter}${merges}${cf}${dv}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>${legacy}</worksheet>`,
  };
}

/** Parte VML que Excel exige para mostrar notas. */
function vmlXml(notes: { ref: string }[]): string {
  const shapes = notes.map((n, i) => {
    const m = /^([A-Z]+)(\d+)$/.exec(n.ref)!;
    const col = m[1].split('').reduce((s, ch) => s * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    return `<v:shape id="_x0000_s${1025 + i}" type="#_x0000_t202" style="position:absolute;margin-left:80pt;margin-top:5pt;width:120pt;height:60pt;z-index:${i + 1};visibility:hidden" fillcolor="#ffffe1"><v:shadow on="t" color="black" obscured="t"/><v:path o:connecttype="none"/><x:ClientData ObjectType="Note"><x:MoveWithCells/><x:SizeWithCells/><x:AutoFill>False</x:AutoFill><x:Row>${Number(m[2]) - 1}</x:Row><x:Column>${col}</x:Column></x:ClientData></v:shape>`;
  }).join('');
  return `<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout><v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>${shapes}</xml>`;
}

/** Genera el binario .xlsx del libro. */
export async function writeXlsx(doc: SpreadsheetDoc): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const files = new Map<string, Uint8Array>();
  const put = (name: string, xml: string): void => { files.set(name, enc.encode(xml)); };
  const st = new StyleSheet();
  const shared = new Map<string, number>();
  const types: string[] = [];
  doc.engine.sheets.forEach((sheet, i) => {
    const n = i + 1;
    const { xml, notes } = sheetXml(doc, sheet, st, shared, i === doc.active);
    put(`xl/worksheets/sheet${n}.xml`, xml);
    types.push(`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    if (!notes.length) return;
    put(`xl/comments${n}.xml`, `${HEAD}<comments ${NS}><authors><author>iswc</author></authors><commentList>${notes.map((x) => `<comment ref="${x.ref}" authorId="0"><text><t xml:space="preserve">${escapeXml(x.text)}</t></text></comment>`).join('')}</commentList></comments>`);
    put(`xl/drawings/vmlDrawing${n}.vml`, vmlXml(notes));
    put(`xl/worksheets/_rels/sheet${n}.xml.rels`, `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/comments" Target="../comments${n}.xml"/><Relationship Id="rId2" Type="${REL}/vmlDrawing" Target="../drawings/vmlDrawing${n}.vml"/></Relationships>`);
    types.push(`<Override PartName="/xl/comments${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"/>`);
  });
  const sheetsXml = doc.engine.sheets.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}"${doc.extras(s).hidden ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('');
  const names = [...doc.engine.names.values()];
  const namesXml = names.length ? `<definedNames>${names.map((n) => `<definedName name="${escapeXml(n.name)}">${escapeXml(canonicalFormula(n.ref))}</definedName>`).join('')}</definedNames>` : '';
  const count = doc.engine.sheets.length;
  put('xl/workbook.xml', `${HEAD}<workbook ${NS} ${RNS}><bookViews><workbookView activeTab="${doc.active}"/></bookViews><sheets>${sheetsXml}</sheets>${namesXml}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
  put('xl/_rels/workbook.xml.rels', `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${doc.engine.sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${count + 1}" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="rId${count + 2}" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`);
  put('xl/styles.xml', st.xml());
  put('xl/sharedStrings.xml', `${HEAD}<sst ${NS} count="${shared.size}" uniqueCount="${shared.size}">${[...shared.keys()].map((s) => `<si><t xml:space="preserve">${escapeXml(s)}</t></si>`).join('')}</sst>`);
  put('[Content_Types].xml', `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>${types.join('')}</Types>`);
  put('_rels/.rels', `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  return writeZip(files);
}

