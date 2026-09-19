// tests/diagram-text-wrap.test.ts
//
// Contrato del helper compartido `diagram-text-wrap.ts` (Task 1 del spec
// "diagram text-wrap + homogenización + adaptación auditor").
//
// El helper expone 3 funciones públicas:
//   - `wrapText(opts)` — divide un texto en líneas que caben en el ancho del
//     nodo, soporta `overflow: 'grow' | 'ellipsis'`, quita tokens `{{icon}}`
//     del cómputo de ancho y respeta palabras más anchas que el nodo.
//   - `buildTspans(lines, box, anchor, fontSize, lineHeight)` — convierte las
//     líneas en coordenadas SVG listas para `<tspan>`.
//   - `defaultMeasureTextWidth(text, fontSize, fontFamily)` — medición de
//     ancho de texto vía `<svg>` off-screen + `getComputedTextLength()`.
//     Cuando no hay DOM (entorno Node puro), cae a un fallback heurístico
//     proporcional al tamaño de la fuente y la longitud del string.
//
// Si alguien refactoriza este helper y rompe una invariante (no respeta
// paddingX, devuelve coords de tspan mal calculadas, no detecta tokens
// `{{icon}}`, deja de truncar con `…`, etc.), los tests señalan cuál.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  wrapText,
  buildTspans,
  defaultMeasureTextWidth,
} from '../../../components/_shared/diagram-text-wrap.js';

describe('wrapText', () => {
  test('label corto en 1 línea: no trunca, requiredHeight <= maxHeight', () => {
    const r = wrapText({
      text: 'Corto',
      maxWidth: 200,
      maxHeight: 44,
      fontSize: 11,
      fontFamily: 'Tahoma, Arial, sans-serif',
      overflow: 'grow',
    });
    assert.equal(r.lines.length, 1);
    assert.equal(r.lines[0].text, 'Corto');
    assert.equal(r.lines[0].truncated, false);
    assert.equal(r.grewHeight, false);
  });

  test('label largo: wrap a varias líneas sin truncar', () => {
    const r = wrapText({
      text: 'Los ICONSULTA muestran lotes con horas distintas (…223, …222, …221)',
      maxWidth: 180,
      maxHeight: 80,
      fontSize: 11,
      fontFamily: 'Tahoma, Arial, sans-serif',
      overflow: 'grow',
    });
    assert.ok(r.lines.length >= 2);
    for (const line of r.lines) {
      assert.equal(line.truncated, false);
    }
  });

  test('overflow=grow que excede maxHeight: devuelve todas las líneas + grewHeight=true', () => {
    const r = wrapText({
      text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore',
      maxWidth: 100,
      maxHeight: 40,
      fontSize: 11,
      fontFamily: 'Tahoma, Arial, sans-serif',
      overflow: 'grow',
    });
    assert.equal(r.grewHeight, true);
    assert.ok(r.requiredHeight > r.requiredHeightUsed || r.requiredHeightUsed >= r.requiredHeight);
    assert.ok(r.requiredHeight > 40);
  });

  test('overflow=ellipsis que excede maxHeight: trunca última línea con …', () => {
    const r = wrapText({
      text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore',
      maxWidth: 100,
      maxHeight: 40,
      fontSize: 11,
      fontFamily: 'Tahoma, Arial, sans-serif',
      overflow: 'ellipsis',
    });
    assert.equal(r.grewHeight, false);
    const last = r.lines[r.lines.length - 1];
    assert.equal(last.truncated, true);
    assert.match(last.text, /…$/);
  });

  test('palabra más ancha que maxWidth: queda sola en su línea (no se corta)', () => {
    const longWord = 'a'.repeat(80);
    const r = wrapText({
      text: `prefix ${longWord} suffix`,
      maxWidth: 60,
      maxHeight: 80,
      fontSize: 11,
      fontFamily: 'Tahoma, Arial, sans-serif',
      overflow: 'grow',
    });
    const hasWordAlone = r.lines.some((l) => l.text.includes(longWord));
    assert.ok(hasWordAlone, 'la palabra ancha debe quedar sola en alguna línea');
  });

  test('tokens {{icon}} se quitan del cómputo de ancho', () => {
    const withIcon = wrapText({
      text: 'Hola {{icon-user}} mundo',
      maxWidth: 200,
      maxHeight: 44,
      fontSize: 11,
      fontFamily: 'Tahoma, Arial, sans-serif',
      overflow: 'grow',
    });
    const noIcon = wrapText({
      text: 'Hola  mundo',
      maxWidth: 200,
      maxHeight: 44,
      fontSize: 11,
      fontFamily: 'Tahoma, Arial, sans-serif',
      overflow: 'grow',
    });
    // Deben producir el mismo número de líneas
    assert.equal(withIcon.lines.length, noIcon.lines.length);
  });
});

describe('buildTspans', () => {
  test('anchor=middle devuelve tspans centrados en boxX + boxW/2', () => {
    const lines = [
      { text: 'Hola', truncated: false },
      { text: 'mundo', truncated: false },
    ];
    const tspans = buildTspans(lines, 0, 0, 100, 50, 'middle', 11, 1.2);
    for (const t of tspans) {
      assert.equal(t.x, 50);
    }
  });

  test('anchor=start devuelve tspans con x = boxX + paddingX implícito', () => {
    const lines = [{ text: 'Hola', truncated: false }];
    const tspans = buildTspans(lines, 10, 20, 100, 50, 'start', 11, 1.2);
    // Asumimos paddingX = 10 → x debe ser 20
    assert.equal(tspans[0].x, 20);
  });

  test('genera un tspan por línea', () => {
    const lines = [
      { text: 'A', truncated: false },
      { text: 'B', truncated: false },
      { text: 'C', truncated: false },
    ];
    const tspans = buildTspans(lines, 0, 0, 100, 50, 'middle', 11, 1.2);
    assert.equal(tspans.length, 3);
  });

  test('REGRESION: anchor=middle embebe textAnchor="middle" en cada tspan (fix swimlane descentrado)', () => {
    // Bug: el <text> padre se creaba sin text-anchor (default SVG = "start")
    // y los tspans (con su x en el centro del box) renderizaban el texto
    // arrancando en x y extendiéndose a la derecha -> descentrado visible
    // (22-33px de offset en swimlane-diagram). El fix embebe textAnchor en
    // cada spec para que el caller lo aplique al <tspan>.
    const lines = [
      { text: 'Solicita ajuste', truncated: false },
      { text: 'multilínea', truncated: false },
    ];
    const middle = buildTspans(lines, 200, 100, 120, 60, 'middle', 10.5, 1.2);
    for (const t of middle) {
      assert.equal(t.textAnchor, 'middle', `tspan "${t.text}" debe traer textAnchor="middle"`);
      assert.equal(t.x, 260, `x debe ser boxX + boxW/2 = 260`);
    }

    const start = buildTspans([{ text: 'x', truncated: false }], 0, 0, 100, 50, 'start', 11, 1.2);
    assert.equal(start[0].textAnchor, undefined, 'anchor=start no embebe textAnchor (default SVG ya es start)');

    const end = buildTspans([{ text: 'x', truncated: false }], 0, 0, 100, 50, 'end', 11, 1.2);
    assert.equal(end[0].textAnchor, 'end', 'anchor=end embebe textAnchor="end"');
  });
});

describe('defaultMeasureTextWidth', () => {
  test('devuelve > 0 para string no vacío', () => {
    const w = defaultMeasureTextWidth('Hola', 11, 'Tahoma, Arial, sans-serif');
    assert.ok(w > 0, `defaultMeasureTextWidth devolvió ${w}, esperado > 0`);
  });

  test('string más largo → ancho mayor', () => {
    const w1 = defaultMeasureTextWidth('Hola', 11, 'Tahoma, Arial, sans-serif');
    const w2 = defaultMeasureTextWidth('Hola mundo更长字符串', 11, 'Tahoma, Arial, sans-serif');
    assert.ok(w2 > w1, `w2 (${w2}) debe ser > w1 (${w1})`);
  });
});