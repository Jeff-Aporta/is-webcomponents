// find.ts — buscar y reemplazar en una hoja o en todo el libro.
import type { SpreadsheetDoc } from './document.js';
import { keyCol, keyRow } from './engine.js';
import type { Sheet } from './engine.js';
import type { FindOptions, FindHit } from './find.schemas.js';



/** Regex de la consulta; null si no es válida. */
function queryRegex(q: string, o: FindOptions, global: boolean): RegExp | null {
  const body = o.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try { return new RegExp(o.wholeCell ? `^(?:${body})$` : body, `${o.matchCase ? '' : 'i'}${global ? 'g' : ''}`); } catch { return null; }
}

/** Todas las coincidencias, en orden de filas. */
export function findAll(doc: SpreadsheetDoc, query: string, o: FindOptions = {}, from: Sheet = doc.sheet): FindHit[] {
  if (!query) return [];
  const re = queryRegex(query, o, false);
  if (!re) return [];
  const hits: FindHit[] = [];
  for (const sheet of o.allSheets ? doc.engine.sheets : [from]) {
    const keys = [...new Set([...sheet.cells.keys(), ...sheet.calc.keys()])].sort((a, b) => a - b);
    for (const k of keys) {
      const r = keyRow(k);
      const c = keyCol(k);
      const text = o.inFormulas ? doc.rawText(sheet, r, c) || doc.displayText(sheet, r, c).text : doc.displayText(sheet, r, c).text;
      if (text && re.test(text)) hits.push({ sheet, r, c, text });
    }
  }
  return hits;
}

/** Reemplaza coincidencias y devuelve cuántas celdas cambió. */
export function replaceAll(doc: SpreadsheetDoc, query: string, by: string, o: FindOptions = {}, from: Sheet = doc.sheet): number {
  const re = queryRegex(query, o, true);
  if (!re) return 0;
  const hits = findAll(doc, query, { ...o, inFormulas: true }, from).filter((h) => doc.engine.getCell(h.sheet, h.r, h.c));
  doc.transact('Reemplazar', () => {
    for (const h of hits) doc.setInput(h.sheet, h.r, h.c, doc.rawText(h.sheet, h.r, h.c).replace(re, by));
  });
  return hits.length;
}
