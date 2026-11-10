// @contexto INDICE.md · src/components/data/README.md
// input-parse.ts — de lo que escribe el usuario a contenido de celda: número, fecha, porcentaje,
// moneda, lógico, fórmula o texto.
import { parseDateText } from './dates.js';
import type { ParsedInput } from './input-parse.schemas.js';

/** Cierra paréntesis y comillas que quedaron abiertos, como hace Excel al confirmar. */
function balance(formula: string): string {
  let depth = 0;
  let quote = false;
  for (const ch of formula) {
    if (ch === '"') quote = !quote;
    else if (!quote && ch === '(') depth++;
    else if (!quote && ch === ')') depth--;
  }
  return formula + (quote ? '"' : '') + ')'.repeat(Math.max(0, depth));
}

/** Número en el formato local, o NaN. En `es` admite `1.234,56` y `12,5`. */
function parseLocaleNumber(text: string, locale: 'es' | 'en'): number {
  let s = text.trim();
  if (locale === 'es' && /^[+-]?(\d{1,3}(\.\d{3})+|\d+),\d+$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (locale === 'es' && /^[+-]?\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, '');
  else if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) ? Number(s) : NaN;
}

/** Interpreta un texto escrito en una celda. */
export function parseInput(text: string, locale: 'es' | 'en' = 'es', keepText = false): ParsedInput {
  if (text === '') return {};
  if (keepText) return { v: text };
  if (text.startsWith("'")) return { v: text.slice(1) };
  if (text.length > 1 && text.trimStart().startsWith('=')) return { f: balance(text.trimStart()) };
  const t = text.trim();
  if (/^(true|verdadero)$/i.test(t)) return { v: true };
  if (/^(false|falso)$/i.test(t)) return { v: false };
  const n = parseLocaleNumber(t, locale);
  if (!Number.isNaN(n)) return { v: n };
  const pct = /^([+-]?[\d.,]+)\s*%$/.exec(t);
  if (pct) {
    const p = parseLocaleNumber(pct[1], locale);
    if (!Number.isNaN(p)) return { v: p / 100, numFmt: /[.,]\d/.test(pct[1]) ? '0.00%' : '0%' };
  }
  const cur = /^([+-]?)\s*([$€£])\s*([\d.,]+)$/.exec(t);
  if (cur) {
    const c = parseLocaleNumber(cur[3], locale);
    if (!Number.isNaN(c)) return { v: cur[1] === '-' ? -c : c, numFmt: `${cur[2]}#,##0${/[.,]\d{1,2}$/.test(cur[3]) ? '.00' : ''}` };
  }
  if (/^[\d/:\- ]+(a\.?m\.?|p\.?m\.?)?$/i.test(t) && /[/:-]/.test(t)) {
    const d = parseDateText(t, locale === 'es');
    if (d) {
      const dateFmt = locale === 'es' ? 'dd/mm/yyyy' : 'mm/dd/yyyy';
      return { v: d.value, numFmt: d.kind === 'date' ? dateFmt : d.kind === 'time' ? 'hh:mm' : `${dateFmt} hh:mm` };
    }
  }
  if (/^#(REF!|DIV\/0!|VALUE!|NAME\?|N\/A|NUM!|NULL!)$/i.test(t)) return { f: `=${t.toUpperCase()}` };
  return { v: text };
}
