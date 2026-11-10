// @contexto INDICE.md · src/components/data/README.md
// tokenizer.ts — convierte el texto de una fórmula en tokens con su posición, para que
// parser, reescritura de referencias y coloreado del editor compartan una sola lectura.
import { colIndex } from './address.js';
import type { RefEnd, TokenType, Token } from './tokenizer.schemas.js';




const ERRORS = ['#DIV/0!', '#VALUE!', '#CYCLE!', '#SPILL!', '#NAME?', '#CALC!', '#NULL!', '#REF!', '#NUM!', '#N/A'];
const CELL = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/;
const CELL_AT = /^\$?[A-Za-z]{1,3}\$?\d{1,7}(?![\p{L}\p{N}_.(])/u;
const IDENT_START = /[\p{L}_]/u;
const IDENT_CHAR = /[\p{L}\p{N}_.]/u;

/** Lee un extremo A1. */
function readEnd(text: string): RefEnd | null {
  const m = CELL.exec(text);
  if (!m) return null;
  const r = Number(m[2]) - 1;
  if (r < 0 || r >= 1048576) return null;
  const c = colIndex(m[1]);
  if (c >= 16384) return null;
  return { r, c, ra: text.lastIndexOf('$') > 0, ca: text.startsWith('$') };
}

/** Lee `$A` de una columna completa. */
function readCol(text: string): RefEnd | null {
  const m = /^(\$?)([A-Za-z]{1,3})$/.exec(text);
  if (!m) return null;
  return { r: -1, c: colIndex(m[2]), ra: false, ca: m[1] === '$' };
}

/** Lee `$3` de una fila completa. */
function readRow(text: string): RefEnd | null {
  const m = /^(\$?)(\d{1,7})$/.exec(text);
  if (!m || Number(m[2]) < 1) return null;
  return { r: Number(m[2]) - 1, c: -1, ra: m[1] === '$', ca: false };
}

/** Fin del identificador que empieza en i. */
function identEnd(s: string, i: number): number {
  let j = i;
  while (j < s.length && IDENT_CHAR.test(s[j])) j++;
  return j;
}

/** Tokeniza. `s` no debe llevar el `=` inicial; `base` desplaza las posiciones. */
export function tokenize(s: string, base = 0): Token[] {
  const out: Token[] = [];
  let i = 0;
  const push = (type: TokenType, end: number, extra: Partial<Token> = {}): void => {
    out.push({ type, text: s.slice(i, end), pos: i + base, end: end + base, ...extra });
    i = end;
  };
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') {
      let j = i + 1;
      while (j < s.length) {
        if (s[j] === '"') {
          if (s[j + 1] === '"') { j += 2; continue; }
          break;
        }
        j++;
      }
      if (j >= s.length) { push('bad', s.length); break; }
      push('str', j + 1);
      continue;
    }
    if (ch === '#') {
      const e = ERRORS.find((x) => s.slice(i, i + x.length).toUpperCase() === x);
      if (e) { push('err', i + e.length); continue; }
      push('hash', i + 1);
      continue;
    }
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(s[i + 1] ?? ''))) {
      const row = /^\$?\d{1,7}:\$?\d{1,7}/.exec(s.slice(i, i + 20));
      if (row) {
        const [x, y] = row[0].split(':');
        const a = readRow(x);
        const b = readRow(y);
        if (a && b) { push('ref', i + row[0].length, { a, b }); continue; }
      }
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
      push('num', i + (m ? m[0].length : 1));
      continue;
    }
    if (ch === '$' || ch === "'" || IDENT_START.test(ch)) {
      const ref = readReference(s, i);
      if (ref) { push('ref', ref.end, ref.extra); continue; }
      if (ch === "'" || ch === '$') { push('bad', i + 1); continue; }
      const j = identEnd(s, i);
      let k = j;
      while (s[k] === ' ') k++;
      const word = s.slice(i, j);
      if (s[k] === '(') { push('func', j); continue; }
      if (/^(TRUE|FALSE|VERDADERO|FALSO)$/i.test(word)) { push('bool', j); continue; }
      push('name', j);
      continue;
    }
    if (ch === '(') { push('lp', i + 1); continue; }
    if (ch === ')') { push('rp', i + 1); continue; }
    if (ch === '{') { push('lb', i + 1); continue; }
    if (ch === '}') { push('rb', i + 1); continue; }
    if (ch === ',' || ch === ';') { push('sep', i + 1); continue; }
    const two = s.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '<>') { push('op', i + 2); continue; }
    if ('+-*/^&=<>%:@'.includes(ch)) { push('op', i + 1); continue; }
    push('bad', i + 1);
  }
  return out;
}

/** Intenta leer una referencia (con hoja y rango) en i. */
function readReference(s: string, i: number): { end: number; extra: Partial<Token> } | null {
  let p = i;
  let sheet: string | undefined;
  if (s[p] === "'") {
    let j = p + 1;
    let name = '';
    while (j < s.length) {
      if (s[j] === "'") {
        if (s[j + 1] === "'") { name += "'"; j += 2; continue; }
        break;
      }
      name += s[j++];
    }
    if (s[j] !== "'" || s[j + 1] !== '!') return null;
    sheet = name;
    p = j + 2;
  } else if (s[p] !== '$') {
    const j = identEnd(s, p);
    if (s[j] === '!') { sheet = s.slice(p, j); p = j + 1; }
  }
  const tail = s.slice(p);
  const first = CELL_AT.exec(tail);
  if (first) {
    const a = readEnd(first[0]);
    if (a) {
      const after = p + first[0].length;
      if (s[after] === ':') {
        const second = CELL_AT.exec(s.slice(after + 1));
        const b = second ? readEnd(second[0]) : null;
        if (b) return { end: after + 1 + second![0].length, extra: { sheet, a, b } };
      }
      return { end: after, extra: { sheet, a } };
    }
  }
  const cols = /^(\$?[A-Za-z]{1,3}):(\$?[A-Za-z]{1,3})(?![\p{L}\p{N}_.(])/u.exec(tail);
  if (cols) {
    const a = readCol(cols[1]);
    const b = readCol(cols[2]);
    if (a && b) return { end: p + cols[0].length, extra: { sheet, a, b } };
  }
  const rows = /^(\$?\d{1,7}):(\$?\d{1,7})/.exec(tail);
  if (rows && sheet !== undefined) {
    const a = readRow(rows[1]);
    const b = readRow(rows[2]);
    if (a && b) return { end: p + rows[0].length, extra: { sheet, a, b } };
  }
  return null;
}
