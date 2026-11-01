// host.ts — biblioteca de una macro: lo único que puede tocar. Opera sobre el documento y una
// interfaz mínima de la vista. Cada función tiene nombre en español y alias en inglés.
import { cellName, colIndex, colName, normalize, parseCell, parseRange, rangeName } from '../address.js';
import type { Rect } from '../address.schemas.js';
import type { SpreadsheetDoc } from '../document.js';
import type { Sheet } from '../engine.js';
import { CellError } from '../values.js';
import type { Scalar } from '../values.schemas.js';
import { macroText, MacroDict, MacroInterpreter } from './interp.js';
import type { Builtin, MacroLimits, MacroValue } from './interp.schemas.js';
import type { BorderSide, CellStyle } from '../../../schemas/spreadsheet.schemas.js';
import type { MacroView, MacroResult } from './host.schemas.js';


/** Claves de `formato` → estilo. */
const STYLE_KEYS: Record<string, keyof CellStyle> = {
  negrita: 'bold', bold: 'bold', cursiva: 'italic', italic: 'italic', subrayado: 'underline', underline: 'underline', tachado: 'strike', strike: 'strike',
  color: 'color', relleno: 'bg', fondo: 'bg', bg: 'bg', fuente: 'font', font: 'font', tamano: 'size', 'tamaño': 'size', size: 'size',
  alineacion: 'align', 'alineación': 'align', align: 'align', vertical: 'valign', valign: 'valign', ajustar: 'wrap', wrap: 'wrap', sangria: 'indent', 'sangría': 'indent', indent: 'indent',
  formato: 'numFmt', numFmt: 'numFmt',
};

const ALIGN: Record<string, string> = { izquierda: 'left', centro: 'center', derecha: 'right', arriba: 'top', medio: 'middle', abajo: 'bottom' };

/** Valor de celda a valor de macro. */
const fromCell = (v: Scalar): MacroValue => (v instanceof CellError ? v.code : v);

/** Valor de macro a contenido de celda. */
const toCell = (v: MacroValue | undefined): unknown => (v === null || v === undefined ? '' : typeof v === 'object' ? macroText(v) : v);

/** Texto obligatorio. */
const text = (v: MacroValue | undefined, what: string): string => {
  if (typeof v !== 'string') throw new Error(`${what} debe ser un texto`);
  return v;
};

/** Crea la tabla de funciones para un documento. */
export function macroBuiltins(doc: SpreadsheetDoc, view: MacroView = {}): Map<string, Builtin> {
  const fns = new Map<string, Builtin>();
  const sheet = (): Sheet => doc.sheet;
  const rect = (v: MacroValue | undefined): Rect => {
    if (v === undefined || v === null) return view.getSelection?.() ?? { r1: 0, c1: 0, r2: 0, c2: 0 };
    const x = parseRange(text(v, 'La referencia'), sheet().rows, sheet().cols);
    if (!x) throw new Error(`Referencia no válida: ${String(v)}`);
    return x;
  };
  const cell = (v: MacroValue | undefined): { r: number; c: number } => {
    const p = parseCell(text(v, 'La celda'));
    if (!p) throw new Error(`Celda no válida: ${String(v)}`);
    return p;
  };
  const def = (names: string[], fn: Builtin): void => { for (const n of names) fns.set(n, fn); };
  const num = (v: MacroValue | undefined): number => Number(v ?? 0);

  // ---- celdas ----
  def(['leer', 'read'], ([a]) => {
    const x = rect(a);
    if (x.r1 === x.r2 && x.c1 === x.c2) return fromCell(doc.engine.getValue(sheet(), x.r1, x.c1));
    const rows: MacroValue[] = [];
    for (let r = x.r1; r <= x.r2; r++) {
      const row: MacroValue[] = [];
      for (let c = x.c1; c <= x.c2; c++) row.push(fromCell(doc.engine.getValue(sheet(), r, c)));
      rows.push(row);
    }
    return rows;
  });
  def(['escribir', 'write'], ([a, v]) => {
    const x = rect(a);
    if (Array.isArray(v)) {
      v.forEach((row, i) => (Array.isArray(row) ? row : [row]).forEach((w, j) => doc.setValue(sheet(), x.r1 + i, x.c1 + j, toCell(w))));
      return;
    }
    for (let r = x.r1; r <= x.r2; r++) for (let c = x.c1; c <= x.c2; c++) doc.setValue(sheet(), r, c, toCell(v));
  });
  def(['celda', 'cell'], ([f, c]) => fromCell(doc.engine.getValue(sheet(), num(f) - 1, num(c) - 1)));
  def(['poner', 'put'], ([f, c, v]) => doc.setValue(sheet(), num(f) - 1, num(c) - 1, toCell(v)));
  def(['calcular', 'calc'], ([f]) => {
    const v = doc.engine.evalText(text(f, 'La fórmula'), sheet());
    return Array.isArray(v) ? v.map((row) => row.map(fromCell)) : fromCell(v);
  });
  def(['limpiar', 'clear'], ([a]) => doc.clearContents(sheet(), [rect(a)]));
  def(['borrarFormato', 'clearFormat'], ([a]) => doc.clearFormats(sheet(), [rect(a)]));
  def(['comentario', 'comment'], ([a, t]) => { const p = cell(a); doc.setComment(sheet(), p.r, p.c, macroText(t ?? null)); });

  // ---- selección ----
  def(['seleccion', 'selección', 'selection'], () => rangeName(rect(null)));
  def(['seleccionar', 'select'], ([a]) => view.select?.(rect(a)));
  def(['filaActual', 'currentRow'], () => rect(null).r1 + 1);
  def(['columnaActual', 'currentColumn'], () => rect(null).c1 + 1);
  def(['ultimaFila', 'lastRow'], ([c]) => {
    const s = sheet();
    const col = c === undefined ? -1 : typeof c === 'string' ? colIndex(c) : num(c) - 1;
    const b = doc.engine.usedBounds(s);
    for (let r = b.rows - 1; r >= 0; r--) {
      if (col >= 0) { if (doc.engine.getValue(s, r, col) !== null) return r + 1; continue; }
      for (let x = 0; x < b.cols; x++) if (doc.engine.getValue(s, r, x) !== null) return r + 1;
    }
    return 0;
  });
  def(['ultimaColumna', 'lastColumn'], () => doc.engine.usedBounds(sheet()).cols);

  // ---- formato ----
  const styleOf = (d: MacroValue | undefined): CellStyle => {
    if (!(d instanceof MacroDict)) throw new Error('El formato debe ser un diccionario');
    const s: Record<string, unknown> = {};
    for (const [k, v] of d.map) {
      const key = Object.hasOwn(STYLE_KEYS, k) ? STYLE_KEYS[k] : null;
      if (!key) throw new Error(`Formato desconocido: ${k}`);
      s[key] = typeof v === 'string' && Object.hasOwn(ALIGN, v) ? ALIGN[v] : v;
    }
    return s as CellStyle;
  };
  def(['formato', 'format'], ([a, d]) => doc.applyStyle(sheet(), [rect(a)], styleOf(d)));
  def(['formatoNumero', 'numberFormat'], ([a, f]) => doc.applyStyle(sheet(), [rect(a)], { numFmt: text(f, 'El formato') }));
  def(['bordes', 'borders'], ([a, k, st]) => doc.setBorders(sheet(), rect(a), String(k ?? 'all'), { style: (st ?? 'thin') as BorderSide['style'] }));
  def(['combinar', 'merge'], ([a]) => doc.merge(sheet(), rect(a)));
  def(['separar', 'unmerge'], ([a]) => doc.unmerge(sheet(), rect(a)));
  def(['anchoColumna', 'columnWidth'], ([c, w]) => doc.setColWidth(sheet(), [typeof c === 'string' ? colIndex(c) : num(c) - 1], num(w)));
  def(['altoFila', 'rowHeight'], ([f, h]) => doc.setRowHeight(sheet(), [num(f) - 1], num(h)));
  def(['inmovilizar', 'freeze'], ([f, c]) => doc.setFreeze(sheet(), num(f), num(c)));

  // ---- estructura ----
  const structural = (axis: 'row' | 'col', insert: boolean): Builtin => ([at, n]) => doc.structural(sheet(), axis, axis === 'col' && typeof at === 'string' ? colIndex(at) : num(at) - 1, num(n ?? 1), insert);
  def(['insertarFilas', 'insertRows'], structural('row', true));
  def(['borrarFilas', 'deleteRows'], structural('row', false));
  def(['insertarColumnas', 'insertColumns'], structural('col', true));
  def(['borrarColumnas', 'deleteColumns'], structural('col', false));

  // ---- datos ----
  def(['ordenar', 'sort'], ([a, c, desc, head]) => {
    const x = rect(a);
    const col = c === undefined || c === null ? x.c1 : typeof c === 'string' ? colIndex(c) : x.c1 + num(c) - 1;
    doc.sort(sheet(), x, [{ col, desc: !!desc }], !!head);
  });
  def(['rellenar', 'fill'], ([a, b]) => doc.fill(sheet(), rect(a), rect(b)));
  def(['copiar', 'copy'], ([a, b]) => {
    const src = rect(a);
    doc.paste(sheet(), doc.copy(sheet(), src), rect(b));
  });
  def(['definirNombre', 'defineName'], ([n, r]) => { doc.defineName(text(n, 'El nombre'), text(r, 'La referencia')); });
  def(['quitarDuplicados', 'removeDuplicates'], ([a]) => {
    const x = rect(a);
    return doc.removeDuplicates(sheet(), x, Array.from({ length: x.c2 - x.c1 + 1 }, (_, i) => x.c1 + i));
  });

  // ---- hojas ----
  def(['hoja', 'sheet'], ([n]) => {
    if (n === undefined) return sheet().name;
    const s = doc.sheetByName(text(n, 'La hoja'));
    if (!s) throw new Error(`No existe la hoja ${String(n)}`);
    doc.active = doc.engine.sheets.indexOf(s);
    return s.name;
  });
  def(['hojas', 'sheets'], () => doc.engine.sheets.map((s) => s.name));
  def(['nuevaHoja', 'newSheet'], ([n]) => {
    const s = doc.addSheet(n === undefined ? undefined : text(n, 'El nombre'));
    doc.active = doc.engine.sheets.indexOf(s);
    return s.name;
  });

  // ---- mensajes ----
  def(['mensaje', 'alerta', 'message', 'alert'], ([t]) => view.message?.(macroText(t ?? null)));
  def(['imprimir', 'print'], (args) => view.log?.(args.map(macroText).join(' ')));

  // ---- utilidades ----
  def(['abs'], ([x]) => Math.abs(num(x)));
  def(['redondear', 'round'], ([x, d]) => { const p = 10 ** num(d); return Math.round(num(x) * p) / p; });
  def(['piso', 'floor'], ([x]) => Math.floor(num(x)));
  def(['techo', 'ceil'], ([x]) => Math.ceil(num(x)));
  def(['raiz', 'raíz', 'sqrt'], ([x]) => Math.sqrt(num(x)));
  def(['aleatorio', 'random'], () => Math.random());
  const flatNums = (args: MacroValue[]): number[] => args.flatMap((a) => (Array.isArray(a) ? flatNums(a) : typeof a === 'number' ? [a] : []));
  def(['suma', 'sum'], (a) => flatNums(a).reduce((s, x) => s + x, 0));
  def(['min'], (a) => Math.min(...flatNums(a)));
  def(['max'], (a) => Math.max(...flatNums(a)));
  def(['promedio', 'average'], (a) => { const v = flatNums(a); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0; });
  def(['largo', 'length', 'len'], ([x]) => (Array.isArray(x) ? x.length : x instanceof MacroDict ? x.map.size : macroText(x ?? null).length));
  def(['texto', 'text'], ([x]) => macroText(x ?? null));
  def(['numero', 'número', 'number'], ([x]) => num(x));
  def(['mayus', 'upper'], ([x]) => macroText(x ?? null).toUpperCase());
  def(['minus', 'lower'], ([x]) => macroText(x ?? null).toLowerCase());
  def(['recortar', 'trim'], ([x]) => macroText(x ?? null).trim());
  def(['contiene', 'contains'], ([x, y]) => macroText(x ?? null).toLowerCase().includes(macroText(y ?? null).toLowerCase()));
  def(['reemplazar', 'replace'], ([x, a, b]) => macroText(x ?? null).split(macroText(a ?? null)).join(macroText(b ?? null)));
  def(['dividir', 'split'], ([x, s]) => macroText(x ?? null).split(macroText(s ?? ',')));
  def(['unir', 'join'], ([x, s]) => (Array.isArray(x) ? x.map(macroText).join(macroText(s ?? '')) : macroText(x ?? null)));
  def(['agregar', 'push'], ([l, v]) => {
    if (!Array.isArray(l)) throw new Error('agregar necesita una lista');
    l.push(v ?? null);
  });
  def(['columna', 'column'], ([x]) => (typeof x === 'string' ? colIndex(x) + 1 : num(x)));
  def(['letra', 'letter'], ([x]) => colName(num(x) - 1));
  def(['direccion', 'dirección', 'address'], ([f, c]) => cellName(num(f) - 1, num(c) - 1));
  def(['rango', 'range'], ([a, b, c, d]) => rangeName(normalize({ r1: num(a) - 1, c1: num(b) - 1, r2: num(c ?? a) - 1, c2: num(d ?? b) - 1 })));
  return fns;
}


/** Ejecuta código de macro como un único paso de deshacer. */
export function runMacro(doc: SpreadsheetDoc, code: string, label: string, view: MacroView = {}, limits?: MacroLimits): MacroResult {
  const interp = new MacroInterpreter(macroBuiltins(doc, view), limits);
  try {
    const value = doc.transact(`Macro ${label}`, () => interp.run(code));
    view.refresh?.();
    return { ok: true, value };
  } catch (e) {
    view.refresh?.();
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, line: (e as { line?: number }).line };
  }
}
