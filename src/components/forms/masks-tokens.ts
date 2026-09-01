/**
 * Mask tokens — tabla canónica del significado de cada carácter.
 *  0  dígito requerido               (slot numérico, debe rellenarse)
 *  9  dígito opcional
 *  A  letra A-Z mayúscula
 *  a  letra a-z minúscula
 *  *  alfanumérico
 *  Cualquier otro carácter cuenta como literal (se imprime tal cual).
 */
export const MASK_TOKENS = {
  '0': { re: /\d/,       transform: (c) => c, required: true  },
  '9': { re: /\d/,       transform: (c) => c, required: false },
  'A': { re: /[A-Za-z]/, transform: (c: string) => c.toUpperCase(), required: true },
  'a': { re: /[a-z]/,    transform: (c) => c, required: false },
  '*': { re: /[A-Za-z0-9]/, transform: (c) => c, required: false },
};

/**
 * Devuelve los slots del patrón con su carácter literal.
 * Cada slot = { kind:'token'|'literal', char, required }.
 * Los literales se imprimen a medida que el usuario rellena sus slots previos.
 */
export function tokenize(pattern) {
  const slots = [];
  for (const ch of String(pattern || '')) {
    if (MASK_TOKENS[ch]) slots.push({ kind: 'token', char: ch, ...MASK_TOKENS[ch] });
    else slots.push({ kind: 'literal', char: ch });
  }
  return slots;
}

/**
 * Aplica un valor bruto sobre el patrón y devuelve el texto formateado.
 *
 * - Mantiene la posición del cursor alineada con los slots rellenados.
 * - Los literales del patrón se imprimen automáticamente cuando hay un slot
 *   previo que el usuario ha rellenado (no antes).
 * - Devuelve string vacío si aún no hay nada.
 */
export function apply(raw, pattern) {
  const slots = tokenize(pattern);
  const clean = String(raw || '').replace(/[^A-Za-z0-9]/g, '');
  let out = '';
  let ci = 0; // cursor sobre clean
  for (const slot of slots) {
    if (slot.kind === 'literal') {
      if (ci > 0 || out.length > 0) out += slot.char;
      continue;
    }
    // encuentra siguiente carácter válido
    while (ci < clean.length && !slot.re.test(clean[ci])) ci++;
    if (ci >= clean.length) break;
    out += slot.transform(clean[ci]);
    ci++;
  }
  return out;
}

/**
 * ¿La entrada actual cubre todos los slots requeridos?
 */
export function isComplete(value, pattern) {
  const slots = tokenize(pattern);
  const required = slots.filter((s) => s.kind === 'token' && s.required).length;
  const got = String(value || '').replace(/[^A-Za-z0-9]/g, '').length;
  return got >= required;
}
