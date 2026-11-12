// @contexto INDICE.md · src/core/README.md
// intl.ts — las listas y los plurales de `Intl` (opt-in).
//
// `Intl.ListFormat` y `Intl.PluralRules` no estan en todos los navegadores que soporta el kit,
// y cargarlos siempre pesa. Este modulo los trae con un respaldo a mano, para que quien los
// necesite los cargue y quien no, no.
//
//   import { lista, plural } from './intl.js';
//
//   lista(['uno', 'dos', 'tres']);            // 'uno, dos y tres'
//   plural(2, ['un archivo', 'varios archivos']);  // 'varios archivos'

/** Une una lista con el formato del idioma (con coma y «y» al final). */
export function lista(partes: readonly string[], locale?: string): string {
  const limpio = partes.map((p) => String(p).trim()).filter(Boolean);
  if (!limpio.length) return '';
  if (limpio.length === 1) return limpio[0]!;
  const IntlList = (Intl as unknown as { ListFormat?: typeof Intl.ListFormat }).ListFormat;
  if (typeof IntlList === 'function') {
    try {
      return new IntlList(locale, { style: 'long', type: 'conjunction' }).format(limpio);
    } catch {
      /* el navegador no sabe ese locale: al respaldo */
    }
  }
  return limpio.slice(0, -1).join(', ') + ' y ' + limpio[limpio.length - 1]!;
}

/**
 * Elige la forma segun la cantidad. `formas` es [singular, plural]; con tres, la tercera es
 * el plural de 0.
 */
export function plural(cantidad: number, formas: readonly string[], locale?: string): string {
  if (!formas.length) return '';
  const n = Math.abs(cantidad);
  if (formas.length === 1) return formas[0]!;
  if (n === 0 && formas.length > 2) return formas[2]!;
  const IntlPlural = (Intl as unknown as { PluralRules?: typeof Intl.PluralRules }).PluralRules;
  if (typeof IntlPlural === 'function') {
    try {
      const regla = new IntlPlural(locale);
      return regla.select(cantidad) === 'one' ? formas[0]! : formas[1]!;
    } catch {
      /* al respaldo */
    }
  }
  return n === 1 ? formas[0]! : formas[1]!;
}
