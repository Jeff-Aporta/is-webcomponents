// registry.ts — registro de funciones de hoja. La firma escrita es también la aridad y la
// ayuda: `valor, [precision], ...` da mínimo 1, máximo infinito y el texto del autocompletado.
import type { Node } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/parser.schemas.js';
import type { Ctx } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/evaluator.schemas.js';
import type { EvalValue } from '@jeff-aporta/iswc-base/components/data/utils/spreadsheet/values.schemas.js';
import type { Fn, LazyFn, FnDef } from './registry.schemas.js';




const TABLE = new Map<string, FnDef>();
const ALIASES = new Map<string, string>();

/** Aridad desde la firma. */
function arity(sig: string): { min: number; max: number } {
  const parts = sig.split(',').map((p) => p.trim()).filter(Boolean);
  let min = 0;
  let max = 0;
  for (const p of parts) {
    if (p === '...') { max = Infinity; continue; }
    if (p.startsWith('[')) { max++; continue; }
    min++;
    max++;
  }
  return { min, max };
}

/** Registra una función común. */
export function def(cat: string, name: string, sig: string, desc: string, fn: Fn, opts: { volatile?: boolean } = {}): void {
  TABLE.set(name, { name, sig, desc, cat, ...arity(sig), fn, ...opts });
}

/** Registra una función perezosa (recibe nodos sin evaluar). */
export function defLazy(cat: string, name: string, sig: string, desc: string, lazy: LazyFn): void {
  TABLE.set(name, { name, sig, desc, cat, ...arity(sig), lazy });
}

/** Registra alias: nombre localizado → nombre canónico. */
export function addAliases(map: Record<string, string>): void {
  for (const [alias, canon] of Object.entries(map)) ALIASES.set(alias, canon);
}

/** Nombre canónico en inglés, si existe la función. */
export function canonicalName(name: string): string | null {
  const u = name.toUpperCase().replace(/^_XLFN\.(_XLWS\.)?/, '').replace(/^_XLWS\./, '');
  if (TABLE.has(u)) return u;
  const a = ALIASES.get(u);
  return a && TABLE.has(a) ? a : null;
}

/** Definición por nombre (en inglés o alias), o null. */
export function lookupFn(name: string): FnDef | null {
  const c = canonicalName(name);
  return c ? TABLE.get(c) ?? null : null;
}

/** Todas las funciones. */
export function allFunctions(): FnDef[] {
  return [...TABLE.values()];
}

/** Alias español de un nombre canónico, o el propio nombre. */
export function aliasOf(canon: string): string {
  for (const [alias, c] of ALIASES) if (c === canon) return alias;
  return canon;
}

/** Sugerencias por prefijo, en el idioma dado y sin repetir función. */
export function suggest(prefix: string, locale: 'es' | 'en', limit = 12): { label: string; def: FnDef }[] {
  const p = prefix.toUpperCase();
  if (!p) return [];
  const seen = new Set<string>();
  const out: { label: string; def: FnDef }[] = [];
  const add = (label: string, canon: string): void => {
    if (seen.has(canon) || !label.startsWith(p)) return;
    const d = TABLE.get(canon);
    if (!d) return;
    seen.add(canon);
    out.push({ label, def: d });
  };
  if (locale === 'es') for (const [alias, c] of ALIASES) add(alias, c);
  for (const name of TABLE.keys()) add(name, name);
  return out.sort((a, b) => a.label.localeCompare(b.label)).slice(0, limit);
}
