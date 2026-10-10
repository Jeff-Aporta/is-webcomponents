// oklch.test.ts — rotar el tono en OKLCH (src/components/_shared/oklch.ts), usado para dar a cada
// símbolo del flowchart insoft su propio color.
//   K1 0° devuelve el mismo color; ida y vuelta hex → OKLCH → hex es exacta.
//   K2 rotar conserva la luminosidad (el texto encima mantiene el contraste).
//   K3 los primeros tonos por ángulo áureo son todos distintos entre sí.
//   K4 lo que no es hex se devuelve tal cual.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { ANGULO_AUREO, hexToOklch, rotarTono } from '../../../components/_shared/oklch.ts';

const BASE = '#7acff4';

Deno.test('oklch: K1 identidad y K2 misma luminosidad al rotar', () => {
  assertEquals(rotarTono(BASE, 0), BASE);
  assertEquals(rotarTono('#3a8fb5', 360), '#3a8fb5');
  const L0 = hexToOklch(BASE)![0];
  for (let i = 1; i < 12; i++) {
    const L = hexToOklch(rotarTono(BASE, ANGULO_AUREO * i))![0];
    assert(Math.abs(L - L0) < 0.01, `tono ${i}: L ${L.toFixed(3)} vs ${L0.toFixed(3)}`);
  }
});

Deno.test('oklch: K3 tonos distintos y K4 no-hex intacto', () => {
  const tonos = Array.from({ length: 8 }, (_, i) => rotarTono(BASE, ANGULO_AUREO * i));
  assertEquals(new Set(tonos).size, 8, tonos.join(' '));
  assertEquals(rotarTono('var(--x)', 90), 'var(--x)');
});
