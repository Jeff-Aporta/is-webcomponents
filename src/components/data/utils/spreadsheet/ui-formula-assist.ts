// @contexto INDICE.md · src/components/data/README.md
// formula-assist.ts — ayudas del editor de fórmulas: autocompletado, firma de la función en curso,
// referencias a colorear y modo apuntar. Puro: trabaja con texto y posiciones.
import type { Rect } from './address.schemas.js';
import { aliasOf, lookupFn, suggest } from './fn-registry.js';
import type { FnDef } from './fn-registry.schemas.js';
import { tokenize } from './tokenizer.js';
import type { Token } from './tokenizer.schemas.js';
import { colName } from './address.js';
import type { Suggestion } from './ui-formula-assist.schemas.js';

/** Paleta de referencias del editor (el mismo orden en celdas y barra). */
const REF_COLORS = ['#3b82f6', '#ef4444', '#a855f7', '#16a34a', '#f59e0b', '#06b6d4', '#ec4899', '#65a30d'];

/** Tokens de la fórmula con posiciones absolutas. */
function tokensOf(text: string): Token[] {
  const lead = /^\s*=/.exec(text);
  if (!lead) return [];
  return tokenize(text.slice(lead[0].length), lead[0].length);
}

/** Palabra en curso al final del texto, si no está dentro de una cadena. */
function wordAt(text: string, caret: number): { word: string; start: number } | null {
  const before = text.slice(0, caret);
  if ((before.match(/"/g)?.length ?? 0) % 2 === 1) return null;
  const m = /[\p{L}_][\p{L}\p{N}_.]*$/u.exec(before);
  if (!m) return null;
  const prev = before[m.index - 1];
  if (prev === '!' || prev === "'") return null;
  return { word: m[0], start: m.index };
}

/** Sugerencias de funciones y nombres para la palabra bajo el cursor. */
export function suggestionsAt(text: string, caret: number, locale: 'es' | 'en', names: string[]): { items: Suggestion[]; start: number; end: number } | null {
  if (!/^\s*=/.test(text)) return null;
  const w = wordAt(text, caret);
  if (!w || w.word.length < 1) return null;
  const up = w.word.toUpperCase();
  const fn = suggest(w.word, locale, 10).map((s): Suggestion => ({ label: s.label, hint: s.def.desc, insert: `${s.label}(` }));
  const nm = names.filter((n) => n.toUpperCase().startsWith(up)).slice(0, 4).map((n): Suggestion => ({ label: n, hint: 'Nombre definido', insert: n }));
  const items = [...nm, ...fn];
  if (!items.length || (items.length === 1 && items[0].label === up)) return null;
  return { items, start: w.start, end: caret };
}

/** Función cuyo paréntesis contiene el cursor y número de argumento. */
export function signatureAt(text: string, caret: number): { def: FnDef; arg: number } | null {
  const stack: { name: string | null; arg: number }[] = [];
  let pendingFn: string | null = null;
  for (const t of tokensOf(text)) {
    if (t.pos >= caret) break;
    if (t.type === 'func') { pendingFn = t.text; continue; }
    if (t.type === 'lp') {
      stack.push({ name: pendingFn, arg: 0 });
      pendingFn = null;
      continue;
    }
    pendingFn = null;
    if (t.type === 'rp') stack.pop();
    else if (t.type === 'sep' && stack.length) stack[stack.length - 1].arg++;
  }
  for (let i = stack.length - 1; i >= 0; i--) {
    const f = stack[i];
    if (!f.name) continue;
    const def = lookupFn(f.name);
    return def ? { def, arg: f.arg } : null;
  }
  return null;
}

/** HTML-seguro: partes de la firma con el argumento activo señalado. */
export function signatureParts(def: FnDef, arg: number, locale: 'es' | 'en'): { name: string; params: { text: string; active: boolean }[] } {
  const params = def.sig.split(',').map((p) => p.trim()).filter(Boolean);
  const last = params.length - 1;
  const repeat = params[last] === '...' ? Math.max(0, last - 1) : -1;
  const at = arg <= last ? arg : repeat >= 0 ? repeat : last;
  return { name: locale === 'es' ? aliasOf(def.name) : def.name, params: params.map((text, i) => ({ text, active: i === at || (repeat >= 0 && arg >= last && i === repeat) })) };
}

/** Referencias de la fórmula, cada una con su color. */
export function formulaRefs(text: string): { pos: number; end: number; sheet?: string; rect: Rect; color: string }[] {
  const seen = new Map<string, string>();
  const out: { pos: number; end: number; sheet?: string; rect: Rect; color: string }[] = [];
  for (const t of tokensOf(text)) {
    if (t.type !== 'ref') continue;
    const a = t.a!;
    const b = t.b ?? a;
    const rect = { r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) };
    const key = `${t.sheet ?? ''}!${JSON.stringify(rect)}`;
    if (!seen.has(key)) seen.set(key, REF_COLORS[seen.size % REF_COLORS.length]);
    out.push({ pos: t.pos, end: t.end, sheet: t.sheet, rect, color: seen.get(key)! });
  }
  return out;
}

/** ¿El cursor admite insertar una referencia apuntando? */
export function canPoint(text: string, caret: number): boolean {
  if (!/^\s*=/.test(text)) return false;
  const before = text.slice(0, caret).trimEnd();
  if ((before.match(/"/g)?.length ?? 0) % 2 === 1) return false;
  const ch = before[before.length - 1];
  return ch !== undefined && '=+-*/^&<>,;(%:'.includes(ch);
}

/** Referencia que toca el cursor, para F4. */
export function refAtCaret(text: string, caret: number): { pos: number; end: number } | null {
  for (const r of formulaRefs(text)) if (caret >= r.pos && caret <= r.end) return { pos: r.pos, end: r.end };
  return null;
}

/** Cicla `$` en una referencia: A1 → $A$1 → A$1 → $A1 → A1. */
export function cycleAbsolute(ref: string): string {
  const bang = ref.lastIndexOf('!');
  const prefix = bang >= 0 ? ref.slice(0, bang + 1) : '';
  const body = bang >= 0 ? ref.slice(bang + 1) : ref;
  return prefix + body.split(':').map((part) => {
    const m = /^(\$?)([A-Za-z]+)(\$?)(\d+)$/.exec(part);
    if (!m) return part;
    const [, ca, col, ra, row] = m;
    if (!ca && !ra) return `$${col}$${row}`;
    if (ca && ra) return `${col}$${row}`;
    if (!ca && ra) return `$${col}${row}`;
    return `${col}${row}`;
  }).join(':');
}

/** Texto A1 de un rectángulo con prefijo de hoja opcional. */
export function rectText(x: Rect, sheetPrefix: string): string {
  const a = `${colName(x.c1)}${x.r1 + 1}`;
  const b = `${colName(x.c2)}${x.r2 + 1}`;
  return sheetPrefix + (a === b ? a : `${a}:${b}`);
}
