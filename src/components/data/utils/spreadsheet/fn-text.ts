// @contexto INDICE.md · src/components/data/README.md
// fn-text.ts — funciones de texto.
import type { Ctx } from './evaluator.schemas.js';
import { formatValue } from './numfmt.js';
import { wildcardRegex } from './criteria.js';
import { CellError, ERR, parseNumberText, toBool, toNumber, toText } from './values.js';
import type { EvalValue, Matrix, Scalar } from './values.schemas.js';
import { flat, forEach, lifted, matrix, optBool, optNum, scalar, str } from './fn-helpers.js';
import { roundTo } from './fn-math.js';
import { def } from './fn-registry.js';

const CAT = 'Texto';
const d = (name: string, sig: string, desc: string, fn: (a: EvalValue[], c: Ctx) => EvalValue): void => def(CAT, name, sig, desc, fn);
const t1 = (name: string, desc: string, fn: (s: string) => Scalar): void => d(name, 'texto', desc, lifted(([x]) => fn(toText(x))));
const optN = (x: Scalar, dflt: number): number => (x === undefined || x === null ? dflt : toNumber(x));

/** Concatena todo lo recibido. */
function join(a: EvalValue[], c: Ctx): string {
  let s = '';
  for (const x of a) forEach(x, c, (v) => { s += toText(v); });
  return s;
}

/** Posición de una ocurrencia dentro de un texto. */
function nth(text: string, pat: string, n: number, fromEnd: boolean, ci: boolean): number {
  const t = ci ? text.toLowerCase() : text;
  const p = ci ? pat.toLowerCase() : pat;
  let pos = fromEnd ? t.length : -1;
  for (let i = 0; i < n; i++) {
    pos = fromEnd ? t.lastIndexOf(p, pos - 1) : t.indexOf(p, pos + 1);
    if (pos < 0) return -1;
  }
  return pos;
}

/** RegExp del usuario, o #VALUE!. */
function userRegex(pattern: string, flags: string): RegExp {
  try { return new RegExp(pattern, flags); } catch { throw ERR.VALUE; }
}

d('CONCAT', 'texto1, ...', 'Une textos y rangos.', join);
d('CONCATENATE', 'texto1, ...', 'Une textos.', join);
d('TEXTJOIN', 'separador, ignorar_vacios, texto1, ...', 'Une textos con un separador.', (a, c) => {
  const seps = flat(matrix(a[0], c)).map(toText);
  const skip = toBool(scalar(a[1], c));
  const parts: string[] = [];
  for (const x of a.slice(2)) forEach(x, c, (v) => {
    const t = toText(v);
    if (!skip || t !== '') parts.push(t);
  });
  return parts.reduce((s, p, i) => (i ? s + seps[(i - 1) % seps.length] + p : p), '');
});
d('LEFT', 'texto, [cantidad]', 'Primeros caracteres.', lifted(([t, n]) => {
  const k = optN(n, 1);
  if (k < 0) throw ERR.VALUE;
  return toText(t).slice(0, k);
}));
d('RIGHT', 'texto, [cantidad]', 'Últimos caracteres.', lifted(([t, n]) => {
  const s = toText(t);
  const k = optN(n, 1);
  if (k < 0) throw ERR.VALUE;
  return k === 0 ? '' : s.slice(-k);
}));
d('MID', 'texto, inicio, cantidad', 'Caracteres desde una posición.', lifted(([t, p, n]) => {
  const start = toNumber(p);
  const k = toNumber(n);
  if (start < 1 || k < 0) throw ERR.VALUE;
  return toText(t).substr(start - 1, k);
}));
t1('LEN', 'Longitud del texto.', (s) => s.length);
t1('LOWER', 'A minúsculas.', (s) => s.toLowerCase());
t1('UPPER', 'A mayúsculas.', (s) => s.toUpperCase());
t1('PROPER', 'Cada palabra con mayúscula inicial.', (s) => s.toLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()));
t1('TRIM', 'Quita espacios sobrantes.', (s) => s.trim().replace(/ +/g, ' '));
t1('CLEAN', 'Quita caracteres de control.', (s) => s.replace(/[\x00-\x1f]/g, ''));
t1('T', 'Devuelve el texto o vacío.', (s) => s);
t1('CODE', 'Código del primer carácter.', (s) => { if (!s) throw ERR.VALUE; return s.charCodeAt(0); });
t1('UNICODE', 'Punto de código Unicode.', (s) => { if (!s) throw ERR.VALUE; return s.codePointAt(0)!; });
t1('ENCODEURL', 'Codifica para una URL.', encodeURIComponent);
d('CHAR', 'numero', 'Carácter por su código.', lifted(([n]) => { const k = toNumber(n); if (k < 1 || k > 255) throw ERR.VALUE; return String.fromCharCode(k); }));
d('UNICHAR', 'numero', 'Carácter Unicode.', lifted(([n]) => { const k = toNumber(n); if (k < 1 || k > 0x10ffff) throw ERR.VALUE; return String.fromCodePoint(k); }));
d('SUBSTITUTE', 'texto, viejo, nuevo, [ocurrencia]', 'Reemplaza texto por texto.', lifted(([t, o, n, k]) => {
  const s = toText(t);
  const a = toText(o);
  const b = toText(n);
  if (!a) return s;
  if (k === undefined || k === null) return s.split(a).join(b);
  const pos = nth(s, a, toNumber(k), false, false);
  return pos < 0 ? s : s.slice(0, pos) + b + s.slice(pos + a.length);
}));
d('REPLACE', 'texto, inicio, cantidad, nuevo', 'Reemplaza por posición.', lifted(([t, p, n, x]) => {
  const s = toText(t);
  const i = toNumber(p);
  if (i < 1 || toNumber(n) < 0) throw ERR.VALUE;
  return s.slice(0, i - 1) + toText(x) + s.slice(i - 1 + toNumber(n));
}));
d('FIND', 'buscado, texto, [inicio]', 'Posición, distingue mayúsculas.', lifted(([f, t, p]) => {
  const start = optN(p, 1);
  if (start < 1) throw ERR.VALUE;
  const i = toText(t).indexOf(toText(f), start - 1);
  if (i < 0) throw ERR.VALUE;
  return i + 1;
}));
d('SEARCH', 'buscado, texto, [inicio]', 'Posición con comodines, sin distinguir mayúsculas.', lifted(([f, t, p]) => {
  const start = optN(p, 1);
  if (start < 1) throw ERR.VALUE;
  const src = wildcardRegex(toText(f)).source.slice(1, -1);
  const m = new RegExp(src, 'i').exec(toText(t).slice(start - 1));
  if (!m) throw ERR.VALUE;
  return m.index + start;
}));
d('REPT', 'texto, veces', 'Repite un texto.', lifted(([t, n]) => {
  const k = toNumber(n);
  if (k < 0 || k * toText(t).length > 32767) throw ERR.VALUE;
  return toText(t).repeat(k);
}));
d('EXACT', 'texto1, texto2', '¿Textos idénticos?', lifted(([a, b]) => toText(a) === toText(b)));
d('VALUE', 'texto', 'Texto a número.', lifted(([t]) => {
  if (typeof t === 'number') return t;
  const n = parseNumberText(toText(t));
  if (Number.isNaN(n)) throw ERR.VALUE;
  return n;
}));
d('NUMBERVALUE', 'texto, [decimal], [miles]', 'Texto a número con separadores dados.', lifted(([t, dec, gr]) => {
  const g = gr === undefined || gr === null ? ',' : toText(gr);
  const s = toText(t).split(g).join('').replace(dec === undefined || dec === null ? '.' : toText(dec), '.');
  const n = parseNumberText(s);
  if (Number.isNaN(n)) throw ERR.VALUE;
  return n;
}));
d('TEXT', 'valor, formato', 'Aplica un formato numérico.', lifted(([v, f]) => formatValue(v, toText(f)).text));
d('FIXED', 'numero, [decimales], [sin_comas]', 'Número como texto con decimales fijos.', lifted(([x, n, nc]) => {
  const k = optN(n, 2);
  const v = roundTo(toNumber(x), k);
  return formatValue(v, `${nc ? '0' : '#,##0'}${k > 0 ? `.${'0'.repeat(k)}` : ''}`).text;
}));
for (const name of ['DOLLAR', 'USDOLLAR']) {
  d(name, 'numero, [decimales]', 'Número como moneda.', lifted(([x, n]) => {
    const k = optN(n, 2);
    return formatValue(roundTo(toNumber(x), k), `$#,##0${k > 0 ? `.${'0'.repeat(k)}` : ''}`).text;
  }));
}
d('TEXTBEFORE', 'texto, delimitador, [instancia], [ignorar_mayusculas]', 'Texto antes de un delimitador.', (a, c) => {
  const s = str(a[0], c);
  const k = optNum(a[2], c, 1);
  const pos = nth(s, str(a[1], c), Math.abs(k), k < 0, optNum(a[3], c, 0) === 1);
  if (pos < 0) throw ERR.NA;
  return s.slice(0, pos);
});
d('TEXTAFTER', 'texto, delimitador, [instancia], [ignorar_mayusculas]', 'Texto después de un delimitador.', (a, c) => {
  const s = str(a[0], c);
  const del = str(a[1], c);
  const k = optNum(a[2], c, 1);
  const pos = nth(s, del, Math.abs(k), k < 0, optNum(a[3], c, 0) === 1);
  if (pos < 0) throw ERR.NA;
  return s.slice(pos + del.length);
});
d('TEXTSPLIT', 'texto, delimitador_columna, [delimitador_fila], [ignorar_vacios]', 'Divide un texto en una matriz.', (a, c) => {
  const s = str(a[0], c);
  const colD = a[1] === undefined ? '' : str(a[1], c);
  const rowD = a[2] === undefined ? '' : str(a[2], c);
  const skip = optBool(a[3], c, false);
  const rows = (rowD ? s.split(rowD) : [s]).map((row) => {
    const cells = colD ? row.split(colD) : [row];
    return skip ? cells.filter((x) => x !== '') : cells;
  });
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r): Scalar[] => Array.from({ length: w }, (_, i) => r[i] ?? ERR.NA));
});
d('REGEXTEST', 'texto, patron, [ignorar_mayusculas]', '¿El texto coincide con la expresión regular?', lifted(([t, p, ci]) => userRegex(toText(p), ci ? 'i' : '').test(toText(t))));
d('REGEXEXTRACT', 'texto, patron, [modo], [ignorar_mayusculas]', 'Extrae coincidencias: 0 primera, 1 todas, 2 grupos.', (a, c) => {
  const text = str(a[0], c);
  const mode = optNum(a[2], c, 0);
  const flags = optNum(a[3], c, 0) === 1 ? 'i' : '';
  const re = userRegex(str(a[1], c), mode === 1 ? `${flags}g` : flags);
  if (mode === 1) {
    const all = text.match(re);
    if (!all) throw ERR.NA;
    return all.map((x) => [x]);
  }
  const m = re.exec(text);
  if (!m) throw ERR.NA;
  return mode === 2 ? m.slice(1).map((x) => [x ?? '']) : m[0];
});
d('REGEXREPLACE', 'texto, patron, reemplazo, [ocurrencia], [ignorar_mayusculas]', 'Reemplaza con expresión regular.', lifted(([t, p, r, k, ci]) => {
  const which = k === undefined || k === null ? 0 : toNumber(k);
  const re = userRegex(toText(p), `g${ci ? 'i' : ''}`);
  let seen = 0;
  return toText(t).replace(re, (m) => (which === 0 || ++seen === which ? toText(r) : m));
}));
d('VALUETOTEXT', 'valor, [formato]', 'Valor como texto.', lifted(([v, f]) => (typeof v === 'string' && f ? `"${v}"` : toText(v))));
d('ARRAYTOTEXT', 'matriz, [formato]', 'Matriz como texto.', (a, c) => {
  const m: Matrix = matrix(a[0], c);
  if (optNum(a[1], c, 0) === 1) return `{${m.map((r) => r.map((v) => (typeof v === 'string' ? `"${v}"` : v instanceof CellError ? v.code : toText(v))).join(',')).join(';')}}`;
  return flat(m).map((v) => (v instanceof CellError ? v.code : toText(v))).join(', ');
});
