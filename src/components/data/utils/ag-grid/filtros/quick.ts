/**
 * quick — Quick filter: palabras en mayusculas y todas deben aparecer en el texto de la fila.
 */

/** Separa en palabras en mayusculas; quickFilterParser reemplaza el reparto. */
export function partesQuick(texto: string, parser?: ((t: string) => string[]) | null): string[] {
  const limpio = (texto ?? '').toUpperCase();
  if (!limpio.trim()) return [];
  if (parser) return parser(limpio);
  return limpio.trim().split(/\s+/);
}

/** ¿La fila pasa? quickFilterMatcher reemplaza la logica de comparacion. */
export function coincideQuick(partes: string[], textoFila: string, matcher?: ((p: string[], t: string) => boolean) | null): boolean {
  if (!partes.length) return true;
  if (matcher) return matcher(partes, textoFila);
  return partes.every((p) => textoFila.includes(p));
}
