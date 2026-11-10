// @contexto INDICE.md · src/components/data/README.md
// rewrite.ts — reescritura de fórmulas a nivel de token: conserva mayúsculas, espacios y
// alias tal como los escribió el usuario y solo cambia las referencias afectadas.
import { colName, quoteSheet } from './address.js';
import type { RefEnd, Token } from './tokenizer.schemas.js';
import { tokenize } from './tokenizer.js';
import type { StructuralOp } from './rewrite.schemas.js';

const REF_ERROR = '#REF!';

/** Texto de un extremo de referencia. */
function endText(e: RefEnd): string {
  const col = e.c < 0 ? '' : `${e.ca ? '$' : ''}${colName(e.c)}`;
  const row = e.r < 0 ? '' : `${e.ra ? '$' : ''}${e.r + 1}`;
  return col + row;
}

/** Texto de una referencia completa. */
function refText(sheet: string | undefined, a: RefEnd, b?: RefEnd): string {
  const prefix = sheet === undefined ? '' : `${quoteSheet(sheet)}!`;
  return prefix + endText(a) + (b ? `:${endText(b)}` : '');
}

/** Sustituye tokens de la fórmula (con `=` opcional); devolver undefined conserva el token. */
export function mapTokens(formula: string, fn: (t: Token) => string | undefined): string {
  const lead = /^\s*=/.exec(formula);
  const base = lead ? lead[0].length : 0;
  const toks = tokenize(formula.slice(base), base);
  let out = '';
  let last = 0;
  for (const t of toks) {
    const rep = fn(t);
    if (rep === undefined) continue;
    out += formula.slice(last, t.pos) + rep;
    last = t.end;
  }
  return out + formula.slice(last);
}

/** Desplaza las referencias relativas, como al copiar o rellenar. Salirse de la hoja da #REF!. */
export function shiftFormula(formula: string, dr: number, dc: number, maxRows = 1048576, maxCols = 16384): string {
  if (dr === 0 && dc === 0) return formula;
  const move = (e: RefEnd): RefEnd | null => {
    const r = e.r < 0 || e.ra ? e.r : e.r + dr;
    const c = e.c < 0 || e.ca ? e.c : e.c + dc;
    if ((e.r >= 0 && (r < 0 || r >= maxRows)) || (e.c >= 0 && (c < 0 || c >= maxCols))) return null;
    return { ...e, r, c };
  };
  return mapTokens(formula, (t) => {
    if (t.type !== 'ref') return undefined;
    const a = move(t.a!);
    const b = t.b ? move(t.b) : undefined;
    if (!a || b === null) return REF_ERROR;
    return refText(t.sheet, a, b);
  });
}

/** Ajusta un intervalo [lo, hi] a un borrado; null si desaparece. */
function deleted(lo: number, hi: number, at: number, n: number): [number, number] | null {
  const end = at + n - 1;
  if (lo >= at && hi <= end) return null;
  const a = lo > end ? lo - n : lo >= at ? at : lo;
  const b = hi > end ? hi - n : hi >= at ? at - 1 : hi;
  return [a, b];
}

/** Reescribe una fórmula que vive en la hoja `own` tras insertar o borrar filas o columnas. */
export function adjustFormula(formula: string, own: string, op: StructuralOp): string {
  const row = op.axis === 'row';
  const get = (e: RefEnd): number => (row ? e.r : e.c);
  const put = (e: RefEnd, v: number): RefEnd => (row ? { ...e, r: v } : { ...e, c: v });
  return mapTokens(formula, (t) => {
    if (t.type !== 'ref') return undefined;
    if ((t.sheet ?? own).toLowerCase() !== op.sheet.toLowerCase()) return undefined;
    const a = t.a!;
    const b = t.b;
    const lo = get(a);
    if (lo < 0) return undefined;
    const hi = b ? get(b) : lo;
    if (op.insert) {
      const shift = (v: number): number => (v >= op.at ? v + op.count : v);
      return refText(t.sheet, put(a, shift(lo)), b ? put(b, shift(hi)) : undefined);
    }
    const span = deleted(lo, hi, op.at, op.count);
    if (!span) return REF_ERROR;
    return refText(t.sheet, put(a, span[0]), b ? put(b, span[1]) : undefined);
  });
}

/** Actualiza referencias explícitas a una hoja renombrada. */
export function renameSheetInFormula(formula: string, from: string, to: string): string {
  return mapTokens(formula, (t) => {
    if (t.type !== 'ref' || t.sheet === undefined) return undefined;
    if (t.sheet.toLowerCase() !== from.toLowerCase()) return undefined;
    return refText(to, t.a!, t.b);
  });
}

/** Las referencias a una hoja eliminada pasan a #REF!. */
export function dropSheetInFormula(formula: string, name: string): string {
  return mapTokens(formula, (t) => {
    if (t.type !== 'ref' || t.sheet === undefined) return undefined;
    return t.sheet.toLowerCase() === name.toLowerCase() ? REF_ERROR : undefined;
  });
}
