/**
 * w24-color-tokens-helper.test.ts — Guardian del contrato W24.
 *
 * Estandar W24 (zod-migration): existe un helper canonico en
 * `src/styles/color-tokens.ts` que define las 5 variantes tonal (paler/
 * pale/strong/stronger/strongest) y los ratios de mezcla para todas las
 * familias semanticas del kit ISWC. Las 7 familias (success, warning,
 * danger, info, error, neutral, brand) deben adherirse a este helper:
 *
 *   - Las 6 de color-mix (success, warning, danger, info, error, neutral)
 *     derivan sus variantes con `color-mix(in srgb, base X%, target)` y
 *     usan EXACTAMENTE los ratios 12/28/82/62/45 contra white/black del
 *     helper (ISWC_COLOR_MIX).
 *
 *   - Brand es la excepcion parametrizable: vive en palettes.css y se
 *     deriva con `hsl(from base h s ...)` para preservar hue/saturacion
 *     al cambiar la paleta. La interfaz publica (los 6 tokens por familia)
 *     es IDENTICA a las de color-mix.
 *
 * Este guardian verifica:
 *
 *   1. El helper existe y exporta las constantes canonicas (ISWC_COLOR_VARIANTS,
 *      ISWC_COLOR_MIX, ISWC_COLOR_MIX_FAMILIES, ISWC_COLOR_FAMILIES).
 *   2. El helper satisface su propio contrato interno (assertColorMixContract).
 *   3. Las 6 familias de color-mix en is-base.css tienen EXACTAMENTE las 5
 *      variantes, con los ratios del helper y los targets correctos (white/black).
 *   4. Brand tiene 5 variantes en palettes.css con la matematica HSL esperada.
 *   5. La salida del helper (`colorMixFamilyBlock`, `brandFamilyBlock`,
 *      `brandVariantRule`) coincide literalmente con lo escrito en los archivos
 *      CSS — si alguien edita a mano sin pasar por el helper, este test lo
 *      caza antes de que el cambio llegue a produccion.
 *   6. palette-build.ts (BRAND_DERIVE) reusa el helper (single source of truth).
 *
 * Si cualquier check falla, el guardian apunta al archivo y la linea para
 * que el refactor sea de un solo lugar (el helper) y no de N bloques dispersos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertColorMixContract,
  ISWC_COLOR_VARIANTS,
  ISWC_COLOR_MIX,
  ISWC_COLOR_MIX_FAMILIES,
  ISWC_COLOR_FAMILIES,
  iswcColorTokenName,
  colorMixRule,
  colorMixFamilyBlock,
  colorMixVariantMap,
  brandVariantRule,
  brandFamilyBlock,
  ISWC_BRAND_LIGHTNESS,
  type IswcColorVariant,
} from '../../../styles/color-tokens.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');

const HELPER_TS = join(root, 'src/styles/color-tokens.ts');
const IS_BASE_CSS = join(root, 'src/styles/is-base.css');
const PALETTES_CSS = join(root, 'src/styles/palettes.css');
const PALETTE_BUILD_TS = join(root, 'src/styles/palette-build.ts');

const isBase = readFileSync(IS_BASE_CSS, 'utf8');
const palettes = readFileSync(PALETTES_CSS, 'utf8');
const paletteBuildTs = readFileSync(PALETTE_BUILD_TS, 'utf8');

/* --------------------------------------------------------------------------
 * 1) El helper existe y exporta la API publica
 * ------------------------------------------------------------------------*/

test('W24: el helper color-tokens.ts existe', () => {
  assert.ok(existsSync(HELPER_TS), `falta ${HELPER_TS}`);
});

test('W24: ISWC_COLOR_VARIANTS son exactamente 5 en el orden canonico', () => {
  assert.deepEqual(
    [...ISWC_COLOR_VARIANTS],
    ['paler', 'pale', 'strong', 'stronger', 'strongest'],
    `orden canonico del helper: ${[...ISWC_COLOR_VARIANTS].join(', ')}`,
  );
});

test('W24: ISWC_COLOR_MIX define los 5 ratios canonicos 12/28/82/62/45', () => {
  // El comentario de cabecera del helper explica que estos son la firma
  // del kit. Cualquier refactor futuro los toca aqui (no en is-base.css).
  assert.equal(ISWC_COLOR_MIX.paler.target, 'white');
  assert.equal(ISWC_COLOR_MIX.paler.pct, 12);
  assert.equal(ISWC_COLOR_MIX.pale.target, 'white');
  assert.equal(ISWC_COLOR_MIX.pale.pct, 28);
  assert.equal(ISWC_COLOR_MIX.strong.target, 'black');
  assert.equal(ISWC_COLOR_MIX.strong.pct, 82);
  assert.equal(ISWC_COLOR_MIX.stronger.target, 'black');
  assert.equal(ISWC_COLOR_MIX.stronger.pct, 62);
  assert.equal(ISWC_COLOR_MIX.strongest.target, 'black');
  assert.equal(ISWC_COLOR_MIX.strongest.pct, 45);
});

test('W24: ISWC_COLOR_MIX_FAMILIES tiene exactamente las 6 familias de color-mix', () => {
  assert.deepEqual(
    [...ISWC_COLOR_MIX_FAMILIES].sort(),
    [...['success', 'warning', 'danger', 'info', 'error', 'neutral']].sort(),
    `familias de color-mix: ${[...ISWC_COLOR_MIX_FAMILIES].join(', ')}`,
  );
});

test('W24: ISWC_COLOR_FAMILIES incluye las 6 de color-mix + brand', () => {
  assert.equal(ISWC_COLOR_FAMILIES.length, 7);
  assert.ok(ISWC_COLOR_FAMILIES.includes('brand'));
  assert.ok(!(ISWC_COLOR_FAMILIES as readonly string[]).includes('text'), 'text es intent (= --iswc-text), no familia --iswc-color-*');
  for (const f of ISWC_COLOR_MIX_FAMILIES) {
    assert.ok(ISWC_COLOR_FAMILIES.includes(f), `falta ${f} en ISWC_COLOR_FAMILIES`);
  }
});

test('W24: assertColorMixContract() pasa sin lanzar', () => {
  // El contrato interno del helper: orden monotono, targets correctos,
  // cantidad de familias. Si rompe, todos los tests downstream daran ruido.
  assert.doesNotThrow(() => assertColorMixContract());
});

/* --------------------------------------------------------------------------
 * 2) Las 6 familias de color-mix en is-base.css siguen el helper
 * ------------------------------------------------------------------------*/

/** Extrae el valor de un token `--iswc-color-X: VALOR;` del bloque CSS.
 *  Captura la PRIMERA declaracion; tolera estar en :root/.theme-dark/[data-theme] */
function extractToken(css: string, name: string): string {
  // Escapa guiones para regex
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}\\s*:\\s*([^;]+);`, 'i');
  const m = css.match(re);
  assert.ok(m, `is-base.css debe declarar ${name}`);
  return m[1].trim();
}

test('W24: las 6 familias de color-mix tienen base declarado en is-base.css', () => {
  const expected: Record<string, string> = {
    success: '#40c057',
    warning: '#f59f00',
    danger: 'crimson',
    info: '#339af0',
    error: 'red',
    neutral: '#888',
  };
  for (const [family, base] of Object.entries(expected)) {
    const v = extractToken(isBase, `--iswc-color-${family}`);
    assert.equal(
      v.toLowerCase(),
      base.toLowerCase(),
      `--iswc-color-${family} debe ser ${base}; valor actual: ${v}`,
    );
  }
});

test('W24: las 6 familias de color-mix tienen las 5 variantes declaradas', () => {
  for (const family of ISWC_COLOR_MIX_FAMILIES) {
    for (const variant of ISWC_COLOR_VARIANTS) {
      const token = iswcColorTokenName(family, variant);
      const value = extractToken(isBase, token);
      // La firma canonica del helper es color-mix(in srgb, var(...) X%, target)
      assert.ok(
        /color-mix\(in srgb,\s*var\(--iswc-color-/i.test(value),
        `${token} debe seguir la firma color-mix(in srgb, var(--iswc-color-${family}) ...); valor actual: ${value}`,
      );
    }
  }
});

test('W24: las 6 familias usan EXACTAMENTE los ratios 12/28/82/62/45 del helper', () => {
  // Esta es la pieza central de W24: el helper es la fuente canonica
  // y el CSS escrito a mano reproduce su output literal.
  for (const family of ISWC_COLOR_MIX_FAMILIES) {
    for (const variant of ISWC_COLOR_VARIANTS) {
      const expected = colorMixRule(family, variant);
      // expected = "--iswc-color-X-Y: color-mix(...);" — extraemos el valor.
      const m = expected.match(/^--iswc-color-[^:]+:\s*(.+);$/);
      assert.ok(m, `colorMixRule mal formado: ${expected}`);
      const expectedValue = m[1].trim();
      const actual = extractToken(isBase, iswcColorTokenName(family, variant));
      assert.equal(
        actual,
        expectedValue,
        `${iswcColorTokenName(family, variant)} debe coincidir con el helper:\n  esperado: ${expectedValue}\n  actual:   ${actual}`,
      );
    }
  }
});

test('W24: las 6 familias usan los targets white/black del helper', () => {
  // Defensa adicional: aunque alguien cambie un ratio, no debe romper
  // la convencion white/black (paler/pale → white; los 3 strong → black).
  for (const family of ISWC_COLOR_MIX_FAMILIES) {
    for (const variant of ISWC_COLOR_VARIANTS) {
      const mix = ISWC_COLOR_MIX[variant];
      const value = extractToken(isBase, iswcColorTokenName(family, variant));
      assert.ok(
        value.includes(`, ${mix.target})`),
        `${iswcColorTokenName(family, variant)} debe mezclar contra ${mix.target}; valor actual: ${value}`,
      );
    }
  }
});

test('W24: las ratios son monotonas (paler < pale, strong > stronger > strongest)', () => {
  // Replicamos la verificacion geometrica del W23 pero a las 6 familias.
  // Si una familia rompe el orden (ej. stronger mas claro que strong),
  // el guardian lo caza aqui.
  for (const family of ISWC_COLOR_MIX_FAMILIES) {
    const pct: number[] = [];
    for (const variant of ISWC_COLOR_VARIANTS) {
      const v = extractToken(isBase, iswcColorTokenName(family, variant));
      const m = v.match(/(\d+(?:\.\d+)?)%\s*,\s*([a-z]+)\)/i);
      assert.ok(m, `${iswcColorTokenName(family, variant)} firma invalida: ${v}`);
      pct.push(parseFloat(m[1]));
    }
    // paler < pale
    assert.ok(
      pct[0] < pct[1],
      `${family}: paler (${pct[0]}%) debe mezclar MENOS blanco que pale (${pct[1]}%)`,
    );
    // strong > stronger > strongest
    assert.ok(
      pct[2] > pct[3],
      `${family}: strong (${pct[2]}%) debe mezclar MAS base que stronger (${pct[3]}%)`,
    );
    assert.ok(
      pct[3] > pct[4],
      `${family}: stronger (${pct[3]}%) debe mezclar MAS base que strongest (${pct[4]}%)`,
    );
  }
});

/* --------------------------------------------------------------------------
 * 3) Las 5 ratios del helper son IGUALES para todas las familias
 * ------------------------------------------------------------------------*/

test('W24: las 6 familias usan ratios IDENTICOS entre si (helper unifica)', () => {
  // Esta es la pieza que justifica el helper: pre-W24 cada familia
  // tenia ratios distintos (success 12/28/82/62, danger 8/22/84/63, etc.)
  // y el "relleno" de danger era perceptualmente mas oscuro que el de
  // success. Aqui verificamos que las 6 familias usan los MISMOS ratios.
  const perFamily: Record<string, number[]> = {};
  for (const family of ISWC_COLOR_MIX_FAMILIES) {
    perFamily[family] = [];
    for (const variant of ISWC_COLOR_VARIANTS) {
      const v = extractToken(isBase, iswcColorTokenName(family, variant));
      const m = v.match(/(\d+(?:\.\d+)?)%\s*,\s*([a-z]+)\)/i);
      assert.ok(m);
      perFamily[family].push(parseFloat(m[1]));
    }
  }
  // Compara contra la primera familia (success)
  const canon = perFamily.success;
  for (const [family, ratios] of Object.entries(perFamily)) {
    assert.deepEqual(
      ratios,
      canon,
      `${family} debe usar los mismos ratios que success; actual=${ratios.join(',')}`,
    );
  }
});

/* --------------------------------------------------------------------------
 * 4) Brand en palettes.css sigue el helper (HSL parametrizable)
 * ------------------------------------------------------------------------*/

test('W24: brand en palettes.css declara las 5 variantes', () => {
  for (const variant of ISWC_COLOR_VARIANTS) {
    const token = iswcColorTokenName('brand', variant);
    const re = new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;]+);`, 'i');
    const m = palettes.match(re);
    assert.ok(m, `palettes.css debe declarar ${token}`);
  }
});

test('W24: brandVariantRule del helper coincide con palettes.css', () => {
  // La rampa brand de palettes.css debe coincidir LITERAL con lo que
  // genera el helper. Si alguien edita a mano sin pasar por el helper,
  // este test lo caza.
  for (const variant of ISWC_COLOR_VARIANTS) {
    const token = iswcColorTokenName('brand', variant);
    const re = new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*(hsl\\([^;]+\\));`, 'i');
    const m = palettes.match(re);
    assert.ok(m, `palettes.css debe declarar ${token} con valor hsl(...)`);
    const expected = brandVariantRule(variant);
    assert.equal(
      m[1].replace(/\s+/g, ' ').trim(),
      expected.replace(/\s+/g, ' ').trim(),
      `${token} debe coincidir con el helper:\n  esperado: ${expected}\n  actual:   ${m[1].trim()}`,
    );
  }
});

test('W24: brand usa fixed para paler/pale y factor para los 3 strong', () => {
  for (const variant of ISWC_COLOR_VARIANTS) {
    const param = ISWC_BRAND_LIGHTNESS[variant];
    if (variant === 'paler' || variant === 'pale') {
      assert.equal(param.mode, 'fixed', `${variant} debe ser mode='fixed'`);
      assert.match(param.value, /^\d+%$/, `${variant} value debe ser N%`);
    } else {
      assert.equal(param.mode, 'factor', `${variant} debe ser mode='factor'`);
      assert.match(param.value, /^0\.\d+$/, `${variant} value debe ser 0.NN`);
    }
  }
});

/* --------------------------------------------------------------------------
 * 5) El output del helper coincide con los archivos CSS (single source of truth)
 * ------------------------------------------------------------------------*/

test('W24: colorMixFamilyBlock del helper matchea is-base.css para neutral', () => {
  // Cogemos el bloque :root,.theme-dark de is-base.css y lo comparamos
  // caracter a caracter con lo que el helper genera. Si alguien edita
  // is-base.css sin pasar por el helper, este test rompe.
  const helperBlock = colorMixFamilyBlock(':root', 'neutral', '#888');
  // Extraemos de is-base.css las 6 lineas (base + 5 variantes) de neutral.
  const lines: string[] = [`  --iswc-color-neutral: #888;`];
  for (const v of ISWC_COLOR_VARIANTS) {
    // colorMixRule devuelve `NAME: VALUE;` — necesitamos solo `VALUE;`.
    const m = colorMixRule('neutral', v).match(/^--iswc-color-[^:]+:\s*(.+);$/);
    assert.ok(m, `colorMixRule mal formado: ${colorMixRule('neutral', v)}`);
    lines.push(`  ${iswcColorTokenName('neutral', v)}: ${m[1]};`);
  }
  const expected = `:root {\n${lines.join('\n')}\n}`;
  assert.equal(helperBlock, expected);
  // Verifica que cada linea del bloque generado esta literalmente en is-base.css.
  for (const line of lines) {
    assert.ok(isBase.includes(line), `is-base.css debe contener literal: ${line}`);
  }
});

test('W24: brandFamilyBlock del helper matchea palettes.css', () => {
  // La rampa brand en palettes.css debe ser el output literal del helper.
  const helperBlock = brandFamilyBlock(':root, [data-palette]');
  // Extraemos las 6 lineas (base + 5 variantes) de brand de palettes.css
  // y verificamos que cada una esta presente.
  for (const variant of ISWC_COLOR_VARIANTS) {
    const line = `  --iswc-color-brand-${variant}: ${brandVariantRule(variant)};`;
    assert.ok(
      helperBlock.includes(line),
      `helper brandFamilyBlock debe contener: ${line}`,
    );
    assert.ok(
      palettes.includes(line),
      `palettes.css debe contener literal: ${line}`,
    );
  }
});

/* --------------------------------------------------------------------------
 * 6) palette-build.ts reusa el helper (single source of truth en runtime)
 * ------------------------------------------------------------------------*/

test('W24: palette-build.ts importa brandRampRules del helper', () => {
  // Si alguien restaura las reglas hardcodeadas en BRAND_DERIVE, este
  // test rompe. La unica fuente de verdad de las 5 variantes brand
  // es color-tokens.ts > brandRampRules().
  assert.match(
    paletteBuildTs,
    /from\s+['"]\.\/color-tokens\.ts['"]/,
    'palette-build.ts debe importar del helper canonico',
  );
  assert.match(
    paletteBuildTs,
    /\bbrandRampRules\s*\(/,
    'palette-build.ts debe llamar brandRampRules() para construir la rampa',
  );
});

test('W24: BRAND_DERIVE tiene los 6 tokens de la familia brand', () => {
  // Extrae BRAND_DERIVE (object literal) de palette-build.ts y verifica
  // que contiene las 5 variantes + el base.
  // El regex captura `{...}` despues de `export const BRAND_DERIVE`.
  const m = paletteBuildTs.match(/export\s+const\s+BRAND_DERIVE[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  assert.ok(m, 'no se encontro la declaracion de BRAND_DERIVE');
  const body = m[1];
  const expectedKeys = [
    '--iswc-color-brand',
    '--iswc-color-brand-paler',
    '--iswc-color-brand-pale',
    '--iswc-color-brand-strong',
    '--iswc-color-brand-stronger',
    '--iswc-color-brand-strongest',
  ];
  for (const key of expectedKeys) {
    assert.ok(
      body.includes(`'${key}'`),
      `BRAND_DERIVE debe contener ${key}`,
    );
  }
});

/* --------------------------------------------------------------------------
 * 7) Cobertura global: las 7 familias del helper estan representadas en CSS
 * ------------------------------------------------------------------------*/

test('W24: las 7 familias (6 color-mix + brand) tienen 5 variantes en CSS', () => {
  // Cobertura global: cada familia declarada en ISWC_COLOR_FAMILIES debe
  // tener sus 5 variantes en is-base.css (color-mix) o palettes.css (brand).
  // Esto cierra el contrato "el helper unifica TODAS las familias".
  for (const family of ISWC_COLOR_FAMILIES) {
    const css = family === 'brand' ? palettes : isBase;
    for (const variant of ISWC_COLOR_VARIANTS) {
      const token = iswcColorTokenName(family, variant);
      const re = new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`, 'i');
      assert.ok(
        re.test(css),
        `${token} debe estar declarado en ${family === 'brand' ? 'palettes.css' : 'is-base.css'}`,
      );
    }
  }
});

test('W24: summary — 7 familias × 5 variantes = 35 tokens unificados', () => {
  // Recuento de cobertura final, util para reportar PASS con dato duro.
  const total = ISWC_COLOR_FAMILIES.length * ISWC_COLOR_VARIANTS.length;
  assert.equal(total, 7 * 5);
  console.log(`  W24 cobertura: ${ISWC_COLOR_FAMILIES.length} familias × ${ISWC_COLOR_VARIANTS.length} variantes = ${total} tokens`);
  console.log(`  ISWC_COLOR_VARIANTS = ${[...ISWC_COLOR_VARIANTS].join(', ')}`);
  console.log(`  ISWC_COLOR_MIX = 12/28/82/62/45 (white/black)`);
});