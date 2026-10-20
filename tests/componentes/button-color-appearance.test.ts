// button-color-appearance.test.ts
//
// 5-ago-2026: filled/outlined de info y error se veían rotos (fondo/borde
// inexistentes) y brand filled salía azul mientras outlined/plain seguían la
// paleta (roja en insoft). Causa: button.css hablaba escala numérica
// (-600/-500) que is-base ya no define, con matriz color×variant N×M.
//
// Contrato ortogonal que este test clava:
//   1) color  → solo enlaza roles --_tone-*
//   2) variant → solo consume --_tone-* (sin repetir nombres de color)
//
// Extensión: *.test.mjs (tests/ se commitea; no .test.ts sin pipeline TS).
// Uso: deno test -A --no-check tests/button-color-appearance.test.ts

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { leerCssCompilado } from './_css-compilado.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// CSS compilado (lo que llega al navegador), con los selectores de atributo
// normalizados a comillas dobles: Sass emite `[color=brand]`.
const css = leerCssCompilado(root, 'src/components/actions/button.css');

const COLORS = ['brand', 'success', 'warning', 'danger', 'info', 'error', 'neutral'];
const VARIANTS = ['filled', 'outlined', 'plain', 'ghost', 'soft', 'text'];
const TONE_ROLES = [
  '--_tone:',
  '--_tone-strong:',
  '--_tone-stronger:',
  '--_tone-text:',
  '--_tone-soft:',
  '--_tone-on:',
];

// filled genérico: `:host([color][variant="filled"])`, `:host([color]:not([variant]))`
// o la forma agrupada `:host(:is([color]:not([variant]), …, [color][variant="filled"]))`.
const FILLED_GENERICO =
  /:host\((?::is\([^{]*?)?\[color\](?:\[variant="filled"\]|:not\(\[variant\]\))/;

test('cada color semántico enlaza roles --_tone-*', () => {
  for (const c of COLORS) {
    const block = css.match(new RegExp(`:host\\(\\[color="${c}"\\]\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
    assert.ok(block, `falta :host([color="${c}"]) — añadir color = una regla de enlace a --_tone-*`);
    for (const role of TONE_ROLES) {
      assert.ok(
        block[1].includes(role),
        `color="${c}" no define ${role.trim()} — las apariencias no pueden resolver el tono`,
      );
    }
  }
});

test('las apariencias consumen --_tone-* sin matriz por color', () => {
  for (const v of ['outlined', 'plain', 'ghost', 'soft', 'text', 'filled']) {
    // Regla genérica :host([color][variant="…"]) o filled default
    const generic =
      v === 'filled'
        ? FILLED_GENERICO.test(css)
        : new RegExp(`:host\\(\\[color\\]\\[variant="${v}"\\]\\)`).test(css);
    assert.ok(generic, `falta regla genérica de variant="${v}" sobre [color] + --_tone-*`);
  }

  // Prohibido volver a la matriz N×M.
  // Excepción permitida: neutral×ghost (hover invierte contra --iswc-bg, no --_tone-on).
  const ALLOW_MATRIX = new Set(['neutral×ghost']);
  const matrixHits = [];
  for (const c of COLORS) {
    for (const v of VARIANTS) {
      const key = `${c}×${v}`;
      if (ALLOW_MATRIX.has(key)) continue;
      const re = new RegExp(`:host\\(\\[color="${c}"\\]\\[variant="${v}"\\]\\)`);
      if (re.test(css)) matrixHits.push(key);
    }
  }
  assert.deepEqual(
    matrixHits,
    [],
    `matriz color×variant otra vez (${matrixHits.join(', ')}). ` +
      `Añadir apariencia = una regla genérica; añadir color = solo el enlace --_tone-*. ` +
      `No rehacer N×M.`,
  );
});

test('button.css no consume escala numérica de familias semánticas', () => {
  // info/error nunca tuvieron -600 en el tema → filled/outlined transparentes.
  // success/warning/danger tampoco deben volver a -N si el tema es relativo.
  const stale = [
    ...css.matchAll(/var\(\s*(--iswc-color-(?:info|error|success|warning|danger|brand)-\d+)/g),
  ].map((m) => m[1]);
  assert.deepEqual(
    [...new Set(stale)],
    [],
    `button.css aún pide tokens numerados: ${[...new Set(stale)].join(', ')}. ` +
      `Usar --iswc-color-X-strong / -stronger / base / -pale / -paler (o hex en el 2º arg de var).`,
  );
});

test('filled y outlined del mismo color comparten la misma familia de tono', () => {
  // El bug brand: filled caía a hex azul hardcodeado y outlined a --iswc-brand-text.
  // Ambos deben pasar por --_tone-*.
  const filledIdx = css.search(FILLED_GENERICO);
  const outlinedIdx = css.search(/:host\(\[color\]\[variant="outlined"\]\)/);
  assert.ok(filledIdx >= 0, 'no encuentro selector filled genérico');
  assert.ok(outlinedIdx >= 0, 'no encuentro selector outlined genérico');
  const afterFilled = css.slice(filledIdx, filledIdx + 500);
  const afterOutlined = css.slice(outlinedIdx, outlinedIdx + 400);
  assert.match(afterFilled, /--_tone-strong/, 'filled debe pintar con --_tone-strong');
  assert.match(afterOutlined, /--_tone-text/, 'outlined debe usar --_tone-text (misma familia que filled)');
  assert.match(afterOutlined, /--_border:\s*var\(--_tone\)/, 'outlined debe bordear con --_tone');
});

export default lista();
