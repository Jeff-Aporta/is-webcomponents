/**
 * isp-color.js — resolución de `color` / `mix` para tipografía ISP.
 *
 * Orden de resolución del atributo `color`:
 *   1. Semántico: brand | neutral | info | success | warning | danger
 *      → lo resuelve el CSS `:host([color=…])` a tokens `--is-*`.
 *   2. `current` → `currentColor` (hereda el color tipográfico del contexto,
 *      análogo a los tamaños en `em`).
 *   3. Cualquier otro string → color CSS/HTML tal cual (`#hex`, `rgb()`,
 *      `oklch()`, nombres CSS, `var(--…)`, etc.).
 *
 * `mix` (%): `color-mix` del color base hacia `mix-with` (default: texto del
 * tema). Sirve para atenuar, acercar al texto, o —con `mix-with`— hacia
 * transparent / white / black / otro color.
 */
export const SEMANTIC_COLORS = Object.freeze([
  'brand',
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
]);

const SEMANTIC_SET = new Set(SEMANTIC_COLORS);

/** @param {unknown} raw */
export function normalizeMix(raw: unknown) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/%$/.test(s)) return s;
  const n = Number(s);
  return Number.isFinite(n) ? `${n}%` : s;
}

/**
 * Interpreta el valor de `mix-with`.
 * Atajos: text | transparent | white | black | current
 * Cualquier otra cosa se usa como color CSS.
 * @param {unknown} raw
 * @returns {string | null}
 */
export function resolveMixWith(raw: unknown) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === 'text') return 'var(--is-text, currentColor)';
  if (lower === 'transparent') return 'transparent';
  if (lower === 'white') return '#fff';
  if (lower === 'black') return '#000';
  if (lower === 'current') return 'currentColor';
  return s;
}

/**
 * @typedef {'none' | 'semantic' | 'current' | 'css'} ColorKind
 * @typedef {{ kind: ColorKind, value?: string }} ClassifiedColor
 */

/**
 * @param {unknown} raw
 * @returns {ClassifiedColor}
 */
export function classifyColor(raw: unknown) {
  if (raw == null) return { kind: 'none' };
  const s = String(raw).trim();
  if (!s) return { kind: 'none' };
  const lower = s.toLowerCase();
  if (lower === 'current') return { kind: 'current', value: 'current' };
  if (SEMANTIC_SET.has(lower)) return { kind: 'semantic', value: lower };
  return { kind: 'css', value: s };
}

/**
 * Sincroniza vars CSS en el host a partir de atributos `color` / `mix` / `mix-with`.
 *
 * @param {HTMLElement} el
 * @param {{
 *   colorVar: string,
 *   mixVar?: string,
 *   mixWithVar?: string,
 * }} opts
 */
export function syncIspColor(el: HTMLElement, opts: { colorVar: string; mixVar?: string; mixWithVar?: string }): void {
  const { colorVar, mixVar, mixWithVar } = opts;

  const classified = classifyColor(el.getAttribute('color'));

  // Canonicaliza semánticos / current a minúsculas en el atributo.
  if (
    (classified.kind === 'semantic' || classified.kind === 'current')
    && el.getAttribute('color') !== classified.value
  ) {
    el.setAttribute('color', String(classified.value));
  }

  if (classified.kind === 'none') {
    el.style.removeProperty(colorVar);
    el.removeAttribute('data-color-kind');
  } else if (classified.kind === 'semantic') {
    // El CSS `:host([color=brand])` define la var; no pisar con inline.
    el.style.removeProperty(colorVar);
    el.setAttribute('data-color-kind', 'semantic');
  } else if (classified.kind === 'current') {
    el.style.setProperty(colorVar, 'currentColor');
    el.setAttribute('data-color-kind', 'current');
  } else {
    el.style.setProperty(colorVar, String(classified.value));
    el.setAttribute('data-color-kind', 'css');
  }

  if (mixVar) {
    const mix = normalizeMix(el.getAttribute('mix'));
    if (mix) el.style.setProperty(mixVar, mix);
    else el.style.removeProperty(mixVar);
  }

  if (mixWithVar) {
    const resolved = resolveMixWith(el.getAttribute('mix-with'));
    if (resolved) el.style.setProperty(mixWithVar, resolved);
    else el.style.removeProperty(mixWithVar);
  }
}

export function isSemanticColor(raw: unknown): boolean {
  return classifyColor(raw).kind === 'semantic';
}
