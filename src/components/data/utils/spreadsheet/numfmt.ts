// numfmt.ts — lenguaje de formatos numéricos de Excel: secciones, condiciones, colores,
// miles, escala, porcentaje, científico, fracciones, fechas y horas.
import { DAYS_EN, DAYS_ES, fromSerial, MONTHS_EN, MONTHS_ES } from './dates.js';
import { CellError, displayValue, formatGeneral } from './values.js';
import type { Scalar } from './values.js';

/** Sección de un formato. */
interface Section { raw: string; body: string; color?: string; cond?: { op: string; v: number }; kind: 'general' | 'number' | 'date' | 'text' }

/** Formato compilado. */
interface Compiled { sections: Section[] }

/** Resultado de formatear. */
export interface Formatted { text: string; color?: string }

const COLORS: Record<string, string> = {
  red: '#d32f2f', rojo: '#d32f2f', green: '#2e7d32', verde: '#2e7d32', blue: '#1565c0', azul: '#1565c0',
  yellow: '#c49000', amarillo: '#c49000', magenta: '#c2185b', cyan: '#00838f', white: '#ffffff', blanco: '#ffffff', black: '#000000', negro: '#000000',
};

const CACHE = new Map<string, Compiled>();

/** Divide por `;` fuera de comillas y corchetes. */
function splitSections(fmt: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote = false;
  let bracket = false;
  for (let i = 0; i < fmt.length; i++) {
    const ch = fmt[i];
    if (ch === '\\') { cur += ch + (fmt[++i] ?? ''); continue; }
    if (ch === '"') quote = !quote;
    if (!quote && ch === '[') bracket = true;
    if (!quote && ch === ']') bracket = false;
    if (ch === ';' && !quote && !bracket) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/** Quita lo entrecomillado para clasificar. */
function bare(s: string): string {
  return s.replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/\[[^\]]*\]/g, '');
}

function compileSection(raw: string): Section {
  let body = raw;
  let color: string | undefined;
  let cond: Section['cond'];
  body = body.replace(/\[([^\]]+)\]/g, (whole, inner: string) => {
    const low = inner.toLowerCase();
    if (COLORS[low]) { color = COLORS[low]; return ''; }
    const c = /^(<=|>=|<>|<|>|=)\s*(-?[\d.]+)$/.exec(inner);
    if (c) { cond = { op: c[1], v: Number(c[2]) }; return ''; }
    const cur = /^\$([^-\]]*)(-[0-9A-Fa-f]+)?$/.exec(inner);
    if (cur) return `"${cur[1]}"`;
    return /^[hms]+$/i.test(inner) ? whole : '';
  });
  const plain = bare(body);
  let kind: Section['kind'] = 'number';
  if (/^\s*(general|estándar|estandar)\s*$/i.test(plain)) kind = 'general';
  else if (/[ymdhs]/i.test(plain.replace(/E[+-]/gi, ''))) kind = 'date';
  else if (plain.includes('@') && !/[0#?]/.test(plain)) kind = 'text';
  return { raw, body, color, cond, kind };
}

function compile(fmt: string): Compiled {
  const hit = CACHE.get(fmt);
  if (hit) return hit;
  const c: Compiled = { sections: splitSections(fmt).map(compileSection) };
  CACHE.set(fmt, c);
  return c;
}

/** Elige la sección de un número. */
function pick(c: Compiled, n: number): { s: Section; abs: boolean } {
  const list = c.sections;
  if (list.some((x) => x.cond)) {
    for (const s of list) {
      const k = s.cond;
      if (!k) return { s, abs: false };
      const ok = k.op === '<' ? n < k.v : k.op === '>' ? n > k.v : k.op === '<=' ? n <= k.v : k.op === '>=' ? n >= k.v : k.op === '=' ? n === k.v : n !== k.v;
      if (ok) return { s, abs: list.indexOf(s) > 0 };
    }
    return { s: list[list.length - 1], abs: true };
  }
  if (list.length === 1) return { s: list[0], abs: false };
  if (list.length === 2 || list[2].kind === 'text') return n < 0 ? { s: list[1], abs: true } : { s: list[0], abs: false };
  if (n < 0) return { s: list[1], abs: true };
  if (n === 0) return { s: list[2], abs: true };
  return { s: list[0], abs: false };
}

/** Parte de una plantilla numérica. */
type Part = { k: 'lit'; v: string } | { k: 'ph'; v: string } | { k: 'dot' } | { k: 'exp'; v: string } | { k: 'slash' };

/** Separa literales y marcadores. */
function partsOf(body: string): { parts: Part[]; percent: number; scale: number; grouped: boolean } {
  const parts: Part[] = [];
  let percent = 0;
  let scale = 0;
  let grouped = false;
  const lit = (v: string): void => { parts.push({ k: 'lit', v }); };
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"') {
      const j = body.indexOf('"', i + 1);
      lit(body.slice(i + 1, j < 0 ? body.length : j));
      i = j < 0 ? body.length : j;
    } else if (ch === '\\') lit(body[++i] ?? '');
    else if (ch === '_') { lit(' '); i++; } else if (ch === '*') { i++; } else if (ch === '0' || ch === '#' || ch === '?') parts.push({ k: 'ph', v: ch });
    else if (ch === '.') parts.push({ k: 'dot' });
    else if (ch === ',') {
      const before = /[0#?]/.test(body[i - 1] ?? '');
      const after = /[0#?]/.test(body[i + 1] ?? '');
      if (before && after) grouped = true;
      else if (before) {
        let j = i;
        while (body[j] === ',') { scale++; j++; }
        i = j - 1;
      } else lit(',');
    } else if (ch === '%') { percent++; lit('%'); } else if ((ch === 'E' || ch === 'e') && /[+-]/.test(body[i + 1] ?? '')) { parts.push({ k: 'exp', v: body[i + 1] }); i++; } else if (ch === '/') parts.push({ k: 'slash' });
    else lit(ch);
  }
  return { parts, percent, scale, grouped };
}

/** Coloca dígitos en los marcadores enteros (de derecha a izquierda). */
function fillInteger(digits: string, marks: string[], grouped: boolean): string[] {
  const out: string[] = new Array(marks.length).fill('');
  let d = digits === '0' ? '' : digits;
  let count = 0;
  const sep = (s: string): string => {
    count++;
    return grouped && count > 1 && (count - 1) % 3 === 0 ? `${s},` : s;
  };
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i];
    if (d.length > 0) {
      let take = d[d.length - 1];
      d = d.slice(0, -1);
      take = sep(take);
      if (i === 0) {
        while (d.length > 0) {
          const nx = sep(d[d.length - 1]);
          d = d.slice(0, -1);
          take = nx + take;
        }
      }
      out[i] = take;
    } else if (m === '0') out[i] = sep('0');
    else if (m === '?') out[i] = ' ';
  }
  return out;
}

/** Fracción aproximada por continuas. */
function fraction(x: number, maxDen: number): [number, number] {
  let h0 = 0; let h1 = 1; let k0 = 1; let k1 = 0;
  let b = x;
  for (let i = 0; i < 32; i++) {
    const a = Math.floor(b);
    const k2 = a * k1 + k0;
    if (k2 > maxDen) break;
    const h2 = a * h1 + h0;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (Math.abs(x - h1 / k1) < 1e-10) break;
    const rest = b - a;
    if (rest === 0) break;
    b = 1 / rest;
  }
  return [h1, k1];
}

function renderFraction(n: number, parts: Part[]): string {
  const slash = parts.findIndex((p) => p.k === 'slash');
  const before = parts.slice(0, slash);
  const after = parts.slice(slash + 1);
  const denDigits = after.filter((p) => p.k === 'ph').length;
  const fixed = after.map((p) => (p.k === 'lit' ? p.v : '')).join('').match(/\d+/);
  const lastLit = before.map((p) => p.k).lastIndexOf('lit');
  const hasWhole = lastLit > 0 && before.slice(0, lastLit).some((p) => p.k === 'ph');
  const whole = hasWhole ? Math.floor(n) : 0;
  const rest = hasWhole ? n - whole : n;
  const maxDen = fixed ? Number(fixed[0]) : 10 ** Math.max(1, denDigits) - 1;
  const [p, q] = fixed ? [Math.round(rest * maxDen), maxDen] : fraction(rest, maxDen);
  const prefix = before.filter((x) => x.k === 'lit').slice(0, hasWhole ? -1 : undefined).map((x) => (x as { v: string }).v).join('');
  if (p === 0) return `${prefix}${hasWhole ? whole : 0}`;
  return `${prefix}${hasWhole && whole ? `${whole} ` : ''}${p}/${q}`;
}

function renderNumber(value: number, body: string): string {
  const { parts, percent, scale, grouped } = partsOf(body);
  let n = value * 100 ** percent / 1000 ** scale;
  if (parts.some((p) => p.k === 'slash')) return (n < 0 ? '-' : '') + renderFraction(Math.abs(n), parts);
  const exp = parts.findIndex((p) => p.k === 'exp');
  const head = exp >= 0 ? parts.slice(0, exp) : parts;
  const tail = exp >= 0 ? parts.slice(exp + 1) : [];
  const dot = head.findIndex((p) => p.k === 'dot');
  const intParts = dot >= 0 ? head.slice(0, dot) : head;
  const decParts = dot >= 0 ? head.slice(dot + 1) : [];
  const intMarks = intParts.flatMap((p) => (p.k === 'ph' ? [p.v] : []));
  const decMarks = decParts.flatMap((p) => (p.k === 'ph' ? [p.v] : []));
  let power = 0;
  if (exp >= 0 && n !== 0) {
    const step = Math.max(1, intMarks.length);
    power = Math.floor(Math.floor(Math.log10(Math.abs(n))) / step) * step;
    n /= 10 ** power;
  }
  const neg = n < 0;
  const abs = Math.abs(n);
  const fixed = abs >= 1e21 ? BigInt(Math.round(abs)).toString() : abs.toFixed(Math.min(decMarks.length, 100));
  const [intStr, decStr = ''] = fixed.split('.');
  const filled = fillInteger(intStr, intMarks, grouped);
  let i = 0;
  let out = neg && /[1-9]/.test(fixed) ? '-' : '';
  for (const p of intParts) out += p.k === 'lit' ? p.v : p.k === 'ph' ? filled[i++] : '';
  if (dot >= 0) {
    let keep = decStr.length;
    while (keep > 0 && decStr[keep - 1] === '0' && decMarks[keep - 1] !== '0') keep--;
    if (decMarks.length === 0 || keep > 0 || decMarks[0] === '0' || decMarks.includes('?')) out += '.';
    else if (intMarks.length) out += '.';
    let j = 0;
    for (const p of decParts) {
      if (p.k === 'lit') { out += p.v; continue; }
      if (p.k !== 'ph') continue;
      if (j < keep) out += decStr[j];
      else if (p.v === '?') out += ' ';
      j++;
    }
  }
  if (exp >= 0) {
    const sign = power < 0 ? '-' : (parts[exp] as { v: string }).v === '+' ? '+' : '';
    const digits = tail.filter((p) => p.k === 'ph').length;
    out += `E${sign}${String(Math.abs(power)).padStart(digits, '0')}`;
    out += tail.flatMap((p) => (p.k === 'lit' ? [p.v] : [])).join('');
  }
  return out;
}

/** Renderiza una sección de fecha u hora. */
function renderDate(n: number, body: string, locale: 'es' | 'en'): string {
  if (n < 0) return '#'.repeat(8);
  const hasSubsec = /s\.0+/i.test(bare(body));
  const p = fromSerial(hasSubsec ? n : n + 0.5 / 86400);
  const months = locale === 'es' ? MONTHS_ES : MONTHS_EN;
  const days = locale === 'es' ? DAYS_ES : DAYS_EN;
  const ampm = /a\/?p|am\/pm/i.test(bare(body));
  const h12 = p.hh % 12 === 0 ? 12 : p.hh % 12;
  const tokens: { t: string; v: string }[] = [];
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    const low = ch.toLowerCase();
    if (ch === '"') {
      const j = body.indexOf('"', i + 1);
      tokens.push({ t: 'lit', v: body.slice(i + 1, j < 0 ? body.length : j) });
      i = (j < 0 ? body.length : j) + 1;
    } else if (ch === '\\') { tokens.push({ t: 'lit', v: body[i + 1] ?? '' }); i += 2; } else if (ch === '_') { tokens.push({ t: 'lit', v: ' ' }); i += 2; } else if (ch === '*') i += 2;
    else if (ch === '[') {
      const j = body.indexOf(']', i);
      const inner = body.slice(i + 1, j).toLowerCase();
      const total = n * 24;
      const v = inner[0] === 'h' ? Math.floor(total) : inner[0] === 'm' ? Math.floor(total * 60) : Math.floor(total * 3600);
      tokens.push({ t: 'lit', v: String(v).padStart(inner.length, '0') });
      i = j + 1;
    } else if (/^a\/p/i.test(body.slice(i, i + 3))) { tokens.push({ t: 'lit', v: p.hh < 12 ? 'a' : 'p' }); i += 3; } else if (/^am\/pm/i.test(body.slice(i, i + 5))) { tokens.push({ t: 'lit', v: p.hh < 12 ? 'a. m.' : 'p. m.' }); i += 5; } else if ('ymdhs'.includes(low)) {
      let j = i;
      while (body[j]?.toLowerCase() === low) j++;
      tokens.push({ t: low, v: body.slice(i, j) });
      i = j;
    } else if (ch === '.' && /^\.0+/.test(body.slice(i)) && hasSubsec) {
      const z = /^\.0+/.exec(body.slice(i))![0];
      tokens.push({ t: 'lit', v: `.${String(p.ms).padStart(3, '0').slice(0, z.length - 1)}` });
      i += z.length;
    } else { tokens.push({ t: 'lit', v: ch }); i++; }
  }
  let out = '';
  tokens.forEach((tok, x) => {
    const len = tok.v.length;
    if (tok.t === 'lit') { out += tok.v; return; }
    if (tok.t === 'y') { out += len <= 2 ? String(p.y % 100).padStart(2, '0') : String(p.y); return; }
    if (tok.t === 'd') {
      out += len === 1 ? p.d : len === 2 ? String(p.d).padStart(2, '0') : len === 3 ? days[p.wd].slice(0, 3) : days[p.wd];
      return;
    }
    if (tok.t === 'h') { const h = ampm ? h12 : p.hh; out += len === 1 ? h : String(h).padStart(2, '0'); return; }
    if (tok.t === 's') { out += len === 1 ? p.ss : String(p.ss).padStart(2, '0'); return; }
    const prev = tokens.slice(0, x).reverse().find((q) => q.t !== 'lit');
    const next = tokens.slice(x + 1).find((q) => q.t !== 'lit');
    const isMinute = prev?.t === 'h' || (next?.t === 's');
    if (isMinute) { out += len === 1 ? p.mm : String(p.mm).padStart(2, '0'); return; }
    out += len === 1 ? p.m : len === 2 ? String(p.m).padStart(2, '0') : len === 3 ? months[p.m - 1].slice(0, 3) : len === 5 ? months[p.m - 1][0] : months[p.m - 1];
  });
  return out;
}

/** Texto literal de una sección de texto (`@`). */
function renderText(v: string, body: string): string {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"') {
      const j = body.indexOf('"', i + 1);
      out += body.slice(i + 1, j < 0 ? body.length : j);
      i = j < 0 ? body.length : j;
    } else if (ch === '\\') out += body[++i] ?? '';
    else if (ch === '_') { out += ' '; i++; } else if (ch === '@') out += v;
    else out += ch;
  }
  return out;
}

/** Aplica un formato a un valor. */
export function formatValue(v: Scalar, fmt: string | undefined, locale: 'es' | 'en' = 'es'): Formatted {
  if (v === null) return { text: '' };
  if (v instanceof CellError) return { text: v.code };
  if (!fmt || fmt === 'General') return { text: typeof v === 'boolean' ? displayValue(v) : displayValue(v) };
  const c = compile(fmt);
  if (typeof v === 'string') {
    const s = c.sections[3] ?? c.sections.find((x) => x.kind === 'text');
    return s ? { text: renderText(v, s.body), color: s.color } : { text: v };
  }
  if (typeof v === 'boolean') return { text: displayValue(v) };
  const { s, abs } = pick(c, v);
  const n = abs ? Math.abs(v) : v;
  if (s.kind === 'general') return { text: formatGeneral(n), color: s.color };
  if (s.kind === 'text') return { text: renderText(formatGeneral(n), s.body), color: s.color };
  if (s.kind === 'date') return { text: renderDate(n, s.body, locale), color: s.color };
  return { text: renderNumber(n, s.body), color: s.color };
}

/** ¿El formato es de fecha u hora? */
export function isDateFormat(fmt: string | undefined): boolean {
  return !!fmt && fmt !== 'General' && compile(fmt).sections[0].kind === 'date';
}

/** Cambia los decimales de un formato. */
export function adjustDecimals(fmt: string | undefined, delta: number): string {
  const base = !fmt || fmt === 'General' ? (delta > 0 ? '0' : '0') : fmt;
  return base.split(';').map((sec) => {
    const m = /(0|#)(\.0*)?(?![\s\S]*[0#])/.exec(sec);
    if (!m) return sec;
    const dec = m[2] ? m[2].length - 1 : 0;
    const next = Math.max(0, dec + delta);
    const text = next ? `.${'0'.repeat(next)}` : '';
    return sec.slice(0, m.index + 1) + text + sec.slice(m.index + m[0].length);
  }).join(';');
}

/** Formatos de la lista rápida. */
export const NUMBER_FORMATS: { id: string; label: string; fmt: string }[] = [
  { id: 'general', label: 'General', fmt: 'General' },
  { id: 'number', label: 'Número', fmt: '#,##0.00' },
  { id: 'currency', label: 'Moneda', fmt: '$#,##0.00' },
  { id: 'accounting', label: 'Contabilidad', fmt: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)' },
  { id: 'date', label: 'Fecha corta', fmt: 'dd/mm/yyyy' },
  { id: 'longdate', label: 'Fecha larga', fmt: 'dddd, d "de" mmmm "de" yyyy' },
  { id: 'time', label: 'Hora', fmt: 'hh:mm:ss' },
  { id: 'percent', label: 'Porcentaje', fmt: '0.00%' },
  { id: 'fraction', label: 'Fracción', fmt: '# ?/?' },
  { id: 'scientific', label: 'Científico', fmt: '0.00E+00' },
  { id: 'text', label: 'Texto', fmt: '@' },
];
