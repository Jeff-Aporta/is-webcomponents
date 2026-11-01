/**
 * ag-grid/filas/exportar-excel — XLSX (OOXML) propio. Logica pura.
 *
 * Genera el paquete a mano y lo empaqueta con `zip.ts`. Compatible con varias
 * hojas (`exportMultipleSheetsAsExcel`): cada hoja se serializa a su XML por
 * `hojaAXml` con textos en linea (`inlineStr`), asi las hojas son independientes.
 */
import { zipComprimido, zipGuardado } from './ag-zip.js';
import type { CeldaLibre, ColExport, EntradaZip, EstiloExcel, FilaExport, FilaLibre, HojaExcel, ParamsExport } from './filas.schemas.js';

const MAX_TEXTO = 32767;
const MAX_FILAS = 1048576;
const EPOCA = Date.UTC(1899, 11, 30);
const MS_DIA = 86400000;
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const CABECERA_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const CARACTERES_ILEGALES = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g;

export function letraColumna(indice: number): string {
  let n = indice + 1;
  let out = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function escaparXml(t: string): string {
  return t.replace(CARACTERES_ILEGALES, '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function nombreHoja(nombre: string | undefined, indice: number): string {
  const limpio = (nombre ?? '').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31);
  return limpio || `Hoja${indice + 1}`;
}

function serialFecha(d: Date): number {
  return (d.getTime() - EPOCA) / MS_DIA;
}

function hexColor(c: string | undefined): string | null {
  if (!c) return null;
  const h = c.replace('#', '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(h)) return `FF${h}`;
  if (/^[0-9A-F]{8}$/.test(h)) return h;
  return null;
}

/* ── Estilos ──────────────────────────────────────────────────────────── */

/** Indices fijos de cellXfs. Los de `excelStyles` van a continuacion. */
const XF_NORMAL = 0;
const XF_ENCABEZADO = 1;
const XF_FECHA = 2;
const XF_GRUPO = 3;

function estilosXml(estilos: readonly EstiloExcel[], tamFuente: number): { xml: string; indice: Map<string, number> } {
  const indice = new Map<string, number>();
  const fuentes = [`<font><sz val="${tamFuente}"/><name val="Calibri"/></font>`, `<font><b/><sz val="${tamFuente}"/><name val="Calibri"/></font>`];
  const rellenos = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const formatos: string[] = [];
  const xfs = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
    '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
  ];
  estilos.forEach((e) => {
    let fontId = 0;
    if (e.font) {
      const color = hexColor(e.font.color);
      fuentes.push(`<font>${e.font.bold ? '<b/>' : ''}${e.font.italic ? '<i/>' : ''}<sz val="${e.font.size ?? tamFuente}"/>${color ? `<color rgb="${color}"/>` : ''}<name val="${escaparXml(e.font.fontName ?? 'Calibri')}"/></font>`);
      fontId = fuentes.length - 1;
    }
    let fillId = 0;
    const fondo = hexColor(e.interior?.color);
    if (fondo) {
      rellenos.push(`<fill><patternFill patternType="solid"><fgColor rgb="${fondo}"/><bgColor indexed="64"/></patternFill></fill>`);
      fillId = rellenos.length - 1;
    }
    let numFmtId = 0;
    if (e.numberFormat?.format) {
      numFmtId = 164 + formatos.length;
      formatos.push(`<numFmt numFmtId="${numFmtId}" formatCode="${escaparXml(e.numberFormat.format)}"/>`);
    }
    const al = e.alignment;
    const alineacion = al ? `<alignment${al.horizontal ? ` horizontal="${escaparXml(al.horizontal.toLowerCase())}"` : ''}${al.vertical ? ` vertical="${escaparXml(al.vertical.toLowerCase())}"` : ''}${al.wrapText ? ' wrapText="1"' : ''}/>` : '';
    xfs.push(`<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="0" xfId="0"${numFmtId ? ' applyNumberFormat="1"' : ''}${fontId ? ' applyFont="1"' : ''}${fillId ? ' applyFill="1"' : ''}${alineacion ? ' applyAlignment="1"' : ''}>${alineacion}</xf>`);
    indice.set(e.id, xfs.length - 1);
  });
  const nf = formatos.length ? `<numFmts count="${formatos.length}">${formatos.join('')}</numFmts>` : '';
  const xml = `${CABECERA_XML}<styleSheet xmlns="${NS}">${nf}<fonts count="${fuentes.length}">${fuentes.join('')}</fonts><fills count="${rellenos.length}">${rellenos.join('')}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return { xml, indice };
}

/* ── Celdas ───────────────────────────────────────────────────────────── */

function atributoEstilo(xf: number): string {
  return xf ? ` s="${xf}"` : '';
}

function celdaTexto(ref: string, t: string, xf: number): string {
  const corto = t.length > MAX_TEXTO ? t.slice(0, MAX_TEXTO) : t;
  const borde = corto !== corto.trim() || corto.includes('\n');
  return `<c r="${ref}"${atributoEstilo(xf)} t="inlineStr"><is><t${borde ? ' xml:space="preserve"' : ''}>${escaparXml(corto)}</t></is></c>`;
}

/** Celda tipada: numeros y booleanos nativos, fechas como serial, lo demas texto. */
function celdaValor(ref: string, v: unknown, texto: string | null, xf: number): string {
  if (v == null || v === '') return texto ? celdaTexto(ref, texto, xf) : '';
  if (typeof v === 'number') return Number.isFinite(v) ? `<c r="${ref}"${atributoEstilo(xf)}><v>${v}</v></c>` : '';
  if (typeof v === 'bigint') return `<c r="${ref}"${atributoEstilo(xf)}><v>${v}</v></c>`;
  if (typeof v === 'boolean') return `<c r="${ref}"${atributoEstilo(xf)} t="b"><v>${v ? 1 : 0}</v></c>`;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return `<c r="${ref}"${atributoEstilo(xf || XF_FECHA)}><v>${serialFecha(v)}</v></c>`;
  return celdaTexto(ref, texto ?? String(v), xf);
}

function filaXml(numero: number, celdas: string, attrs = ''): string {
  return `<row r="${numero}"${attrs}>${celdas}</row>`;
}

function filaLibreXml(fila: FilaLibre, numero: number, estilos: Map<string, number>, fusiones: string[]): string {
  let col = 0;
  let celdas = '';
  for (const c of fila.cells as CeldaLibre[]) {
    const ref = `${letraColumna(col)}${numero}`;
    const xf = c.styleId ? estilos.get(c.styleId) ?? 0 : 0;
    const tipo = c.data?.type;
    const v = c.data?.value;
    celdas += celdaValor(ref, tipo === 'Number' ? Number(v) : v, null, xf);
    if (c.mergeAcross) {
      fusiones.push(`${ref}:${letraColumna(col + c.mergeAcross)}${numero}`);
      col += c.mergeAcross;
    }
    col++;
  }
  return filaXml(numero, celdas);
}

function anchoColumna(ancho: number | undefined, base: ColExport): string {
  return ((ancho ?? base.ancho) / 7).toFixed(2);
}

function panelXml(op: ParamsExport, columnas: readonly ColExport[], antes: number): string {
  const encabezado = op.skipColumnHeaders ? 0 : 1;
  const filas = op.freezeRows === 'headers' ? antes + encabezado : op.freezeRows ?? 0;
  const cols = op.freezeColumns === 'pinned' ? columnas.filter((c) => c.fijada).length : op.freezeColumns ?? 0;
  if (!filas && !cols) return '';
  const celda = `${letraColumna(cols)}${filas + 1}`;
  const panel = filas && cols ? 'bottomRight' : filas ? 'bottomLeft' : 'topRight';
  return `<pane${cols ? ` xSplit="${cols}"` : ''}${filas ? ` ySplit="${filas}"` : ''} topLeftCell="${celda}" activePane="${panel}" state="frozen"/><selection pane="${panel}"/>`;
}

/** XML de una hoja. Es lo que `getSheetDataForExcel` devuelve y las multiples hojas reutilizan. */
export function hojaAXml(hoja: HojaExcel, estilos: Map<string, number>): string {
  const { columnas, filas, antes, despues, opciones: op } = hoja;
  const fusiones: string[] = [];
  const partes: string[] = [];
  const contorno = op.suppressRowOutline !== true;
  const altoFila = op.rowHeight ? ` ht="${op.rowHeight}" customHeight="1"` : '';
  const altoEnc = op.headerRowHeight ? ` ht="${op.headerRowHeight}" customHeight="1"` : '';
  let n = 1;
  let nivelMax = 0;
  for (const f of antes) partes.push(filaLibreXml(f, n++, estilos, fusiones));
  const inicioEncabezado = n;
  if (!op.skipColumnHeaders) {
    let celdas = '';
    for (let c = 0; c < columnas.length; c++) {
      const col = columnas[c] as ColExport;
      celdas += celdaTexto(`${letraColumna(c)}${n}`, col.encabezado, col.claseEncabezado ? estilos.get(col.claseEncabezado) ?? XF_ENCABEZADO : XF_ENCABEZADO);
    }
    partes.push(filaXml(n++, celdas, altoEnc));
  }
  const letras = columnas.map((_, c) => letraColumna(c));
  const xfs = columnas.map((c) => (c.clase ? estilos.get(c.clase) ?? XF_NORMAL : XF_NORMAL));
  const limite = Math.min(filas.length, MAX_FILAS - n - despues.length);
  for (let i = 0; i < limite; i++) {
    const f = filas[i] as FilaExport;
    let celdas = '';
    const resaltar = f.tipo !== 'hoja';
    for (let c = 0; c < letras.length; c++) celdas += celdaValor(`${letras[c]}${n}`, f.valores[c], f.textos[c] ?? null, resaltar ? (xfs[c] as number) || XF_GRUPO : (xfs[c] as number));
    let attrs = altoFila;
    if (contorno && f.nivel > 0) {
      attrs += ` outlineLevel="${Math.min(f.nivel, 7)}"`;
      if (f.nivel > nivelMax) nivelMax = f.nivel;
      if (f.contraida) attrs += ' hidden="1"';
    }
    partes.push(filaXml(n++, celdas, attrs));
  }
  const ultimaDatos = n - 1;
  for (const f of despues) partes.push(filaLibreXml(f, n++, estilos, fusiones));
  const anchos = columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${anchoColumna(op.columnWidth, c)}" customWidth="1"/>`).join('');
  const panel = panelXml(op, columnas, antes.length);
  const vista = `<sheetViews><sheetView workbookViewId="0">${panel}</sheetView></sheetViews>`;
  const fmt = `<sheetFormatPr defaultRowHeight="15"${nivelMax ? ` outlineLevelRow="${Math.min(nivelMax, 7)}"` : ''}/>`;
  const merge = fusiones.length ? `<mergeCells count="${fusiones.length}">${fusiones.map((f) => `<mergeCell ref="${f}"/>`).join('')}</mergeCells>` : '';
  const filtro = op.exportAsExcelTable && !op.skipColumnHeaders && columnas.length ? `<autoFilter ref="A${inicioEncabezado}:${letraColumna(columnas.length - 1)}${ultimaDatos}"/>` : '';
  const props = nivelMax ? '<sheetPr><outlinePr summaryBelow="0"/></sheetPr>' : '';
  const cols = anchos ? `<cols>${anchos}</cols>` : '';
  return `${CABECERA_XML}<worksheet xmlns="${NS}" xmlns:r="${NS_R}">${props}${vista}${fmt}${cols}<sheetData>${partes.join('')}</sheetData>${filtro}${merge}</worksheet>`;
}

/* ── Paquete ──────────────────────────────────────────────────────────── */

function tiposXml(n: number): string {
  let hojas = '';
  for (let i = 1; i <= n; i++) hojas += `<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  return `${CABECERA_XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${hojas}</Types>`;
}

function libroXml(nombres: readonly string[]): string {
  const hojas = nombres.map((nombre, i) => `<sheet name="${escaparXml(nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
  return `${CABECERA_XML}<workbook xmlns="${NS}" xmlns:r="${NS_R}"><sheets>${hojas}</sheets></workbook>`;
}

function relacionesLibro(n: number): string {
  let rel = '';
  for (let i = 1; i <= n; i++) rel += `<Relationship Id="rId${i}" Type="${NS_R}/worksheet" Target="worksheets/sheet${i}.xml"/>`;
  return `${CABECERA_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rel}<Relationship Id="rId${n + 1}" Type="${NS_R}/styles" Target="styles.xml"/></Relationships>`;
}

function nucleoXml(autor: string): string {
  const fecha = new Date().toISOString().slice(0, 19);
  return `${CABECERA_XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>${escaparXml(autor)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${fecha}Z</dcterms:created></cp:coreProperties>`;
}

/** Nombres unicos: Excel rechaza el libro con dos hojas iguales sin distinguir mayusculas. */
function nombresUnicos(nombres: readonly string[]): string[] {
  const vistos = new Set<string>();
  return nombres.map((nombre) => {
    let actual = nombre;
    let n = 2;
    while (vistos.has(actual.toLowerCase())) {
      const sufijo = ` (${n++})`;
      actual = `${nombre.slice(0, 31 - sufijo.length)}${sufijo}`;
    }
    vistos.add(actual.toLowerCase());
    return actual;
  });
}

/** Reune hojas ya serializadas en las entradas del paquete. */
export function entradasLibro(nombres: readonly string[], hojasXml: readonly string[], estilos: string, autor = 'iswc-ag-grid'): EntradaZip[] {
  const cod = new TextEncoder();
  const unicos = nombresUnicos(nombres);
  const parte = (nombre: string, xml: string): EntradaZip => ({ nombre, datos: cod.encode(xml) });
  const n = hojasXml.length;
  const rels = `${CABECERA_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS_R}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const entradas = [parte('[Content_Types].xml', tiposXml(n)), parte('_rels/.rels', rels), parte('docProps/core.xml', nucleoXml(autor)), parte('xl/workbook.xml', libroXml(unicos)), parte('xl/_rels/workbook.xml.rels', relacionesLibro(n)), parte('xl/styles.xml', estilos)];
  hojasXml.forEach((xml, i) => entradas.push(parte(`xl/worksheets/sheet${i + 1}.xml`, xml)));
  return entradas;
}

export function crearEstilos(estilos: readonly EstiloExcel[] = [], tamFuente = 11): { xml: string; indice: Map<string, number> } {
  return estilosXml(estilos, tamFuente);
}

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function libroABlob(entradas: readonly EntradaZip[]): Blob {
  return new Blob([zipGuardado(entradas) as BlobPart], { type: TIPO_XLSX });
}

export async function libroABlobComprimido(entradas: readonly EntradaZip[]): Promise<Blob> {
  return new Blob([await zipComprimido(entradas) as BlobPart], { type: TIPO_XLSX });
}
