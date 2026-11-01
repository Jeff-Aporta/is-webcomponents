// criteria.ts — criterios de COUNTIF/SUMIF/filtros de base de datos: operadores y comodines.
import { parseDateText } from './dates.js';
import { CellError, compare, parseNumberText } from './values.js';
import type { Scalar } from './values.schemas.js';
import type { Predicate } from './criteria.schemas.js';


/** Regex de un patrón con comodines `*`, `?` y escape `~`. */
export function wildcardRegex(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '~' && (pattern[i + 1] === '*' || pattern[i + 1] === '?' || pattern[i + 1] === '~')) re += `\\${pattern[++i]}`;
    else if (ch === '*') re += '[\\s\\S]*';
    else if (ch === '?') re += '[\\s\\S]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 'i');
}

/** Valor numérico de un operando de criterio, o NaN. */
function operandNumber(t: string): number {
  const n = parseNumberText(t);
  if (!Number.isNaN(n)) return n;
  return parseDateText(t)?.value ?? NaN;
}

/** Construye la prueba de un criterio. */
export function criterion(c: Scalar): Predicate {
  if (c === null) return (v) => v === null || v === '';
  if (typeof c === 'number') return (v) => typeof v === 'number' && compare(v, c) === 0;
  if (typeof c === 'boolean') return (v) => v === c;
  if (c instanceof CellError) return (v) => v === c;
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(c)!;
  const op = m[1] ?? '=';
  const rest = m[2];
  const n = operandNumber(rest);
  if (!Number.isNaN(n)) {
    const test = (v: Scalar): boolean => {
      if (typeof v !== 'number') return false;
      const d = compare(v, n);
      return op === '=' ? d === 0 : op === '<>' ? d !== 0 : op === '<' ? d < 0 : op === '>' ? d > 0 : op === '<=' ? d <= 0 : d >= 0;
    };
    return op === '<>' ? (v) => typeof v !== 'number' || test(v) : test;
  }
  if (op === '=' || op === '<>') {
    if (rest === '') return op === '=' ? (v) => v === null || v === '' : (v) => v !== null && v !== '';
    const re = wildcardRegex(rest);
    const match = (v: Scalar): boolean => typeof v === 'string' && re.test(v);
    return op === '=' ? match : (v) => !match(v);
  }
  return (v) => {
    if (typeof v !== 'string') return false;
    const d = compare(v, rest);
    return op === '<' ? d < 0 : op === '>' ? d > 0 : op === '<=' ? d <= 0 : d >= 0;
  };
}
