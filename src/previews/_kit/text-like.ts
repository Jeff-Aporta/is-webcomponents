/**
 * text-like.ts — helper para campos de texto multi-línea.
 *
 * Tras la refactor W43 (limpieza de `\n` en JSON), los campos que pueden ser
 * multi-línea (`html`, `code`, `styles`, `lede`, `content`, `equivHtml`,
 * `equivFlow`, etc.) admiten dos shapes:
 *
 *   - string: una sola línea
 *   - string[]: una línea por elemento (lo que devuelve el split por `\n`)
 *
 * Los consumidores (render, audit, tests) deben pasar por `asText()` para
 * obtener el string original.
 *
 * El tipo `TextLike` está declarado en `types.d.ts` para que esté visible
 * desde todos los consumidores sin necesidad de un import runtime.
 */

/**
 * Une un `TextLike` en un string. Si es string, lo devuelve tal cual.
 * Si es array, lo une con `\n` (preservando los saltos originales).
 * Devuelve `''` para `null` / `undefined`.
 */
export function asText(v: unknown): string {
  if (v == null) return '';
  return Array.isArray(v) ? v.join('\n') : String(v);
}
