// validation.ts — validación de datos: comprueba una entrada contra su regla.
import { parseRange } from './address.js';
import { parseDateText } from './dates.js';
import type { SpreadsheetDoc } from './document.js';
import type { Sheet } from './engine.js';
import { parseInput } from './input-parse.js';
import { shiftFormula } from './rewrite.js';
import { toBool } from './values.js';
import type { Scalar } from './values.schemas.js';
import type { ValidationRule } from '@jeff-aporta/iswc-base/components/data/schemas/spreadsheet.schemas.js';

/** Elementos de una lista: valores escritos o un rango (`=A1:A5`). */
export function listItems(doc: SpreadsheetDoc, sheet: Sheet, rule: ValidationRule): string[] {
  const src = (rule.a ?? '').trim();
  if (src.startsWith('=')) {
    const v = doc.engine.evalText(src, sheet);
    const cells = Array.isArray(v) ? v.flat() : [v];
    return cells.filter((x) => x !== null && x !== '').map(String);
  }
  return src.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
}

/** Operando numérico de una regla. */
function operand(doc: SpreadsheetDoc, sheet: Sheet, text: string | undefined): number {
  const t = (text ?? '').trim();
  if (t.startsWith('=')) {
    const v = doc.engine.evalText(t, sheet);
    return Number(Array.isArray(v) ? v[0][0] : v);
  }
  return parseDateText(t)?.value ?? Number(t);
}

/** Compara con el operador de la regla. */
function inBounds(n: number, rule: ValidationRule, a: number, b: number): boolean {
  switch (rule.op ?? 'between') {
    case 'between': return n >= a && n <= b;
    case 'notBetween': return n < a || n > b;
    case 'eq': return n === a;
    case 'ne': return n !== a;
    case 'gt': return n > a;
    case 'lt': return n < a;
    case 'gte': return n >= a;
    case 'lte': return n <= a;
  }
}

/** ¿El texto escrito cumple la regla? */
export function isValid(doc: SpreadsheetDoc, sheet: Sheet, rule: ValidationRule, r: number, c: number, text: string): boolean {
  if (text === '') return rule.allowBlank !== false;
  const parsed = parseInput(text, doc.locale);
  const value: Scalar = parsed.f !== undefined ? firstOf(doc.engine.evalText(parsed.f, sheet, r, c)) : parsed.v ?? null;
  const a = () => operand(doc, sheet, rule.a);
  const b = () => operand(doc, sheet, rule.b);
  switch (rule.type) {
    case 'list': {
      const v = String(value).toLowerCase();
      return listItems(doc, sheet, rule).some((x) => x.toLowerCase() === v);
    }
    case 'whole': return typeof value === 'number' && Number.isInteger(value) && inBounds(value, rule, a(), b());
    case 'decimal': case 'date': return typeof value === 'number' && inBounds(value, rule, a(), b());
    case 'textLength': return inBounds(String(value).length, rule, a(), b());
    case 'custom': {
      const x = parseRange(rule.range, sheet.rows, sheet.cols);
      const f = shiftFormula(rule.a ?? '', r - (x?.r1 ?? r), c - (x?.c1 ?? c), sheet.rows, sheet.cols);
      const prev = doc.engine.getCell(sheet, r, c);
      doc.engine.setCell(sheet, r, c, { ...prev, f: parsed.f, v: parsed.v });
      doc.engine.recalc();
      const res = firstOf(doc.engine.evalText(f, sheet, r, c));
      doc.engine.setCell(sheet, r, c, prev);
      doc.engine.recalc();
      try { return toBool(res); } catch { return false; }
    }
  }
}

/** Primer valor de un resultado. */
function firstOf(v: Scalar | Scalar[][]): Scalar {
  return Array.isArray(v) ? v[0][0] : v;
}
