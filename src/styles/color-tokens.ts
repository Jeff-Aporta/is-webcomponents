/**
 * color-tokens.ts — Helper comun para refactor de tokens (Phase W24).
 *
 * Define la firma canonica de las 5 variantes tonal que usa el kit ISWC:
 *
 *   --iswc-color-{family}            el tono canonico de la familia (base)
 *   --iswc-color-{family}-paler      pastel de fondo
 *   --iswc-color-{family}-pale       pastel activo
 *   --iswc-color-{family}-strong     relleno (tono casi puro, leve oscurecimiento)
 *   --iswc-color-{family}-stronger   hover del relleno
 *   --iswc-color-{family}-strongest  active del relleno (mas oscuro)
 *
 * Cada familia semantica del kit (success, warning, danger, info, error,
 * neutral, brand) se adhiere a esta firma. Asi un componente que pide
 * `var(--iswc-color-{family}-{variant})` resuelve siempre, sin importar la
 * familia, y un refactor de tokens futuros (mover un shade, ajustar un
 * ratio) toca este helper en vez de N bloques dispersos por is-base.css
 * y palettes.css.
 *
 * Hay dos implementaciones del patron, segun si la familia tiene un base
 * FIJO o PARAMETRIZABLE:
 *
 *   - **color-mix** (success, warning, danger, info, error, neutral): el
 *     base es un literal (`#888`, `#40c057`, `red`, etc.). Las 5 variantes
 *     se derivan con `color-mix(in srgb, base X%, target)` donde `target`
 *     es `white` (paler/pale) o `black` (strong/stronger/strongest).
 *
 *   - **hsl-from** (brand): el base depende de h/s/b que cambian por
 *     paleta. Las 5 variantes se derivan con `hsl(from base h s ...)` que
 *     preserva hue y saturacion y solo ajusta lightness. Esto vive en
 *     `palette-build.ts` (BRAND_DERIVE) por razones historicas y porque el
 *     builder lo usa en runtime via `applyBrandVars`.
 *
 * La interfaz publica (los 6 tokens por familia) es IDENTICA en los dos
 * casos; el codigo consumidor no nota la diferencia.
 *
 * Por que un helper comun (y no cinco bloques sueltos):
 *
 *   1. Antes de W24 cada familia tenia ratios DIFERENTES (success 12/28/82/62,
 *      danger 8/22/84/63, info 10/24/84/62, error 6/18/86/66). El "relleno"
 *      de danger era perceptualmente mas oscuro que el de success aunque
 *      ambos fueran 600. El helper fija los ratios en 12/28/82/62/45 para
 *      que la familia X y la familia Y sean intercambiables sin sorpresas.
 *
 *   2. Si el diseno pide "un poquito mas fuerte el strongest", antes
 *      tocabas 6 lineas en is-base.css. Ahora tocas ISWC_COLOR_MIX.strongest
 *      y se propaga a las 6 familias.
 *
 *   3. Los tests guardian (w24-color-tokens-helper.test.ts) verifican que
 *      el CSS escrito a mano coincide con el output del helper. Si alguien
 *      re-introduce una escala numerica (50/100/600/700/800) o cambia un
 *      ratio a mano, el guardian lo caza antes de que llegue a produccion.
 */

// ─── Variantes canonicas ───────────────────────────────────────────────────

/** Las 5 variantes tonal, en el orden del kit (paler → strongest). */
import type { ColorMixSpec, IswcColorMixFamily, IswcColorVariant } from "./color-tokens.schemas.js";
export const ISWC_COLOR_VARIANTS = ['paler', 'pale', 'strong', 'stronger', 'strongest'] as const;

/** Firma de una variante: target (white|black) y ratio (0-100). */

/**
 * Ratio canonico de mezcla para cada variante.
 *
 *   paler/pale      → mezclan contra `white` (van hacia el blanco).
 *   strong/stronger/strongest → mezclan contra `black` (van hacia el negro).
 *
 * Los ratios son la firma del kit. Cualquier base —incluso `#888` (gris
 * neutro), `red` (rojo puro) o `crimson` (rojo carmin)— cae en este
 * espectro sin que la cromaticidad del tono se altere perceptiblemente.
 *
 * Reglas que cumple:
 *   - paler < pale   (paler es mas blanco = mas claro)
 *   - strong > stronger > strongest   (mas base = menos negro = mas claro)
 *   - Los saltos entre vecinos son parejos (~12–17 puntos) para que la
 *     escala perceptual sea continua.
 *
 * El W23 prueba que los ratios de `neutral` siguen este mismo patron.
 */
export const ISWC_COLOR_MIX: Record<IswcColorVariant, ColorMixSpec> = {
  paler: { target: 'white', pct: 12 },
  pale: { target: 'white', pct: 28 },
  strong: { target: 'black', pct: 82 },
  stronger: { target: 'black', pct: 62 },
  strongest: { target: 'black', pct: 45 },
};

/** Familias con base fijo (color-mix). Cobertura: 6 de las 7 del kit. */
export const ISWC_COLOR_MIX_FAMILIES = [
  'success',
  'warning',
  'danger',
  'info',
  'error',
  'neutral',
] as const;

/** Las 7 familias semanticas del kit (incluye brand, que usa hsl-from).
 *  `text` es intent de componente (= --iswc-text), no familia --iswc-color-*. */
export const ISWC_COLOR_FAMILIES = [...ISWC_COLOR_MIX_FAMILIES, 'brand'] as const;

// ─── Generadores de CSS ────────────────────────────────────────────────────

/** Nombre canonico del token CSS para una variante de una familia. */
export function iswcColorTokenName(family: string, variant: IswcColorVariant): string {
  return `--iswc-color-${family}-${variant}`;
}

/**
 * Devuelve la linea CSS de UNA variante para una familia con base fijo.
 * Ej.: `  --iswc-color-neutral-paler: color-mix(in srgb, var(--iswc-color-neutral) 12%, white);`
 */
export function colorMixRule(family: IswcColorMixFamily, variant: IswcColorVariant): string {
  const mix = ISWC_COLOR_MIX[variant];
  return `${iswcColorTokenName(family, variant)}: color-mix(in srgb, var(--iswc-color-${family}) ${mix.pct}%, ${mix.target});`;
}

/**
 * Devuelve el bloque CSS completo (selector + base + 5 variantes) para una
 * familia con base fijo. Pensado para que is-base.css lo reproduzca LITERAL
 * y para que los tests guardian comparen el CSS escrito a mano con el
 * output del helper.
 *
 * Ej. de output:
 *   :root {
 *     --iswc-color-neutral: #888;
 *     --iswc-color-neutral-paler: color-mix(in srgb, var(--iswc-color-neutral) 12%, white);
 *     --iswc-color-neutral-pale: color-mix(in srgb, var(--iswc-color-neutral) 28%, white);
 *     --iswc-color-neutral-strong: color-mix(in srgb, var(--iswc-color-neutral) 82%, black);
 *     --iswc-color-neutral-stronger: color-mix(in srgb, var(--iswc-color-neutral) 62%, black);
 *     --iswc-color-neutral-strongest: color-mix(in srgb, var(--iswc-color-neutral) 45%, black);
 *   }
 */
export function colorMixFamilyBlock(selector: string, family: IswcColorMixFamily, base: string): string {
  const lines = [
    `  --iswc-color-${family}: ${base};`,
    ...ISWC_COLOR_VARIANTS.map((v) => '  ' + colorMixRule(family, v)),
  ];
  return `${selector} {\n${lines.join('\n')}\n}`;
}

/**
 * Devuelve el mapa de tokens canonicos para una familia con base fijo.
 * Util para inspeccion programatica (tests, debug). NO incluye el base.
 */
export function colorMixVariantMap(family: IswcColorMixFamily): Record<IswcColorVariant, string> {
  const out = {} as Record<IswcColorVariant, string>;
  for (const v of ISWC_COLOR_VARIANTS) {
    const mix = ISWC_COLOR_MIX[v];
    out[v] = `color-mix(in srgb, var(--iswc-color-${family}) ${mix.pct}%, ${mix.target})`;
  }
  return out;
}

/**
 * Devuelve la lista de los 5 nombres de token (sin el `--`) para una
 * familia. Pensado para verificar contra CSS que ya escribio alguien a
 * mano.
 */
export function colorMixVariantTokenNames(family: IswcColorMixFamily): string[] {
  return ISWC_COLOR_VARIANTS.map((v) => iswcColorTokenName(family, v));
}

/**
 * Sanity check estructural: las 6 invariantes que SIEMPRE debe respetar el
 * patron. Si cualquier check falla, el helper esta roto y todos los tests
 * downstream daran ruido. Pensado para auto-verificacion al cargar el
 * modulo en tests.
 */
export function assertColorMixContract(): void {
  // paler < pale (paler mas claro que pale)
  if (ISWC_COLOR_MIX.paler.pct >= ISWC_COLOR_MIX.pale.pct) {
    throw new Error(`ISWC_COLOR_MIX: paler.pct debe ser < pale.pct (got ${ISWC_COLOR_MIX.paler.pct} vs ${ISWC_COLOR_MIX.pale.pct})`);
  }
  // strong > stronger > strongest (mas oscuro cuanto menos base)
  if (ISWC_COLOR_MIX.strong.pct <= ISWC_COLOR_MIX.stronger.pct) {
    throw new Error(`ISWC_COLOR_MIX: strong.pct debe ser > stronger.pct`);
  }
  if (ISWC_COLOR_MIX.stronger.pct <= ISWC_COLOR_MIX.strongest.pct) {
    throw new Error(`ISWC_COLOR_MIX: stronger.pct debe ser > strongest.pct`);
  }
  // paler/pale mezclan contra white; los 3 strong contra black
  for (const v of ['paler', 'pale'] as const) {
    if (ISWC_COLOR_MIX[v].target !== 'white') {
      throw new Error(`ISWC_COLOR_MIX.${v}.target debe ser 'white'`);
    }
  }
  for (const v of ['strong', 'stronger', 'strongest'] as const) {
    if (ISWC_COLOR_MIX[v].target !== 'black') {
      throw new Error(`ISWC_COLOR_MIX.${v}.target debe ser 'black'`);
    }
  }
  // Las 6 familias de color-mix
  if (ISWC_COLOR_MIX_FAMILIES.length !== 6) {
    throw new Error(`ISWC_COLOR_MIX_FAMILIES debe tener 6 entradas (got ${ISWC_COLOR_MIX_FAMILIES.length})`);
  }
}

// ─── Familia BRAND (caso especial: hsl-from, parametrizable) ────────────────

/**
 * Parametro de luminosidad para cada variante tonal de brand.
 *
 * Brand NO usa color-mix() porque su base cambia con la paleta
 * (h/s/b vienen de `<html data-palette="...">`). Para preservar hue y
 * saturacion al oscurecer, la rampa se calcula con `hsl(from base ...)`
 * de dos formas:
 *
 *   - paler/pale: la L se FIJA al valor (97% / 93%). El "fondo pastel"
 *     del brand quiere llegar cerca del blanco sin perder el hue.
 *
 *   - strong/stronger/strongest: la L se MULTIPLICA por un factor
 *     descendente (0.88 → 0.72 → 0.56). Asi la escala es monotona
 *     (mas oscuro cuanto menor factor) y respeta la L original del
 *     tono de marca.
 *
 * Estos parametros viven aqui (y por herencia en palette-build.ts >
 * BRAND_DERIVE) porque el builder los usa en runtime via applyBrandVars()
 * cuando una pieza del UI necesita pintarse con la rampa brand desde JS
 * (menu de paletas, chip de seleccion, etc.).
 *
 * La interfaz publica (los 6 tokens por familia) es IDENTICA a la de
 * color-mix; solo cambia la matematica del derivado.
 */
export const ISWC_BRAND_LIGHTNESS: Record<IswcColorVariant, { mode: 'fixed' | 'factor'; value: string }> = {
  paler: { mode: 'fixed', value: '97%' },
  pale: { mode: 'fixed', value: '93%' },
  strong: { mode: 'factor', value: '0.88' },
  stronger: { mode: 'factor', value: '0.72' },
  strongest: { mode: 'factor', value: '0.56' },
};

/**
 * Devuelve la linea CSS de UNA variante brand (la forma `hsl(from base ...)`
 * que palettes.css + palette-build.ts escriben).
 */
export function brandVariantRule(variant: IswcColorVariant): string {
  const param = ISWC_BRAND_LIGHTNESS[variant];
  const l = param.mode === 'fixed'
    ? param.value
    : `calc(l * ${param.value})`;
  return `hsl(from var(--iswc-color-brand) h s ${l})`;
}

/** Las 5 lineas CSS (sin selector) que forman la rampa brand. */
export function brandRampRules(): string[] {
  return ISWC_COLOR_VARIANTS.map((v) => `  --iswc-color-brand-${v}: ${brandVariantRule(v)};`);
}

/**
 * Bloque CSS completo (selector + base + 5 variantes) para la rampa brand.
 * Output:
 *   :root, [data-palette] {
 *     --iswc-color-brand: hsl(calc(var(--iswc-brand-h) * 1deg) var(--iswc-brand-s) var(--iswc-brand-b));
 *     --iswc-color-brand-paler: hsl(from var(--iswc-color-brand) h s 97%);
 *     --iswc-color-brand-pale: hsl(from var(--iswc-color-brand) h s 93%);
 *     --iswc-color-brand-strong: hsl(from var(--iswc-color-brand) h s calc(l * 0.88));
 *     --iswc-color-brand-stronger: hsl(from var(--iswc-color-brand) h s calc(l * 0.72));
 *     --iswc-color-brand-strongest: hsl(from var(--iswc-color-brand) h s calc(l * 0.56));
 *   }
 */
export function brandFamilyBlock(selector: string): string {
  const lines = [
    '  --iswc-color-brand: hsl(calc(var(--iswc-brand-h) * 1deg) var(--iswc-brand-s) var(--iswc-brand-b));',
    ...brandRampRules(),
  ];
  return `${selector} {\n${lines.join('\n')}\n}`;
}