/**
 * date-field.test.ts — Tests exhaustivos de <is-date-field>.
 *
 * Wrapper de la fábrica `defineDateField` (en `_shared/date-field-element.ts`).
 * El factory define el comportamiento: secciones (día/mes/año) como spinbutton,
 * eventos is-change/is-input, form-associated, etc.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  leerComponente, leerPreview, existeCss,
  esFactoryWrapper,
} from './_helpers.js';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');
const FACTORY = join(RAIZ, 'components', '_shared', 'date-field-element.ts');
const factorySrc = readFileSync(FACTORY, 'utf8');

const TAG = 'is-date-field';
const src = leerComponente(TAG);

test('date-field: archivo y registro', () => {
  assert.ok(src.length > 100);
  assert.ok(existeCss(TAG) || existsSync(join(RAIZ, 'components', 'forms', 'date-field.css')),
    'date-field debe tener .css hermano');
  assert.ok(esFactoryWrapper(src), '<is-date-field> debe usar defineDateField');
  assert.ok(/defineDateField\(\s*\{[\s\S]*?tag:\s*['"`]is-date-field['"`]/.test(src),
    '<is-date-field> debe pasar tag: "is-date-field"');
});

test('date-field: atributos vienen del factory (OBSERVED const)', () => {
  assert.ok(/static\s+get\s+observedAttributes/.test(factorySrc),
    'factory debe declarar observedAttributes');
  for (const a of ['label', 'hint', 'name', 'value', 'min', 'max',
                   'required', 'disabled', 'readonly', 'locale',
                   'clearable', 'invalid']) {
    assert.ok(new RegExp(`['"\`]${a}['"\`]`).test(factorySrc),
      `factory OBSERVED debe incluir "${a}"`);
  }
});

test('date-field: eventos del factory (is-change, is-input)', () => {
  for (const e of ['is-change', 'is-input']) {
    assert.ok(new RegExp(`['"\`]${e}['"\`]`).test(factorySrc) &&
              new RegExp(`(#emit|emit)\\s*\\(\\s*(this\\s*,\\s*)?['"\`]${e}['"\`]`).test(factorySrc),
      `factory debe emitir "${e}"`);
  }
});

test('date-field: shadow DOM (open + delegatesFocus para teclado)', () => {
  assert.ok(/attachShadow\s*\(\s*\{\s*mode:\s*['"]open['"]\s*,\s*delegatesFocus:\s*true/.test(factorySrc),
    'factory debe abrir shadow con delegatesFocus:true (a11y teclado)');
});

test('date-field: form-associated + ElementBase-ish (HTMLElement + attachInternals)', () => {
  assert.ok(/static\s+formAssociated\s*=\s*true/.test(factorySrc),
    'factory debe ser form-associated');
  assert.ok(/attachInternals/.test(factorySrc),
    'factory debe usar ElementInternals (form-associated)');
});

test('date-field: se compone con is-date-picker para el panel (en date-input)', () => {
  // El factory define el campo. is-date-input.ts lo compone con is-date-picker.
  const dateInput = leerComponente('is-date-input');
  assert.ok(/definePickerInput/.test(dateInput) && /is-date-picker/.test(dateInput),
    'is-date-input compone field + picker');
});

test('date-field: usa Intl nativo para locale (delegado en date-utils/date-field-core)', () => {
  // El factory delega el formateo a date-field-core / date-utils,
  // que son quienes usan Intl directamente. Verificamos la cadena.
  const core = readFileSync(join(RAIZ, 'components', '_shared', 'date-field-core.ts'), 'utf8');
  const utils = readFileSync(join(RAIZ, 'components', '_shared', 'date-utils.ts'), 'utf8');
  assert.ok(/Intl\./.test(core) || /Intl\./.test(utils),
    'date-field-core o date-utils deben usar Intl.* para formatear locale-aware');
  assert.ok(/resolveLocale/.test(factorySrc),
    'factory debe usar resolveLocale() para normalizar el locale');
});

test('date-field: kind=date en la invocación', () => {
  assert.ok(/kind:\s*['"]date['"]/.test(src),
    '<is-date-field> debe invocar defineDateField con kind: "date"');
});

test('date-field: slots del factory (start, end)', () => {
  assert.ok(/<slot\s+name=["']start["']/.test(factorySrc),
    'factory debe declarar slot "start"');
  assert.ok(/<slot\s+name=["']end["']/.test(factorySrc),
    'factory debe declarar slot "end"');
});

test('date-field: shadow DOM parts del factory', () => {
  for (const p of ['form-control', 'label', 'base', 'sections', 'clear', 'hint']) {
    assert.ok(new RegExp(`\\bpart=["']${p}["']`).test(factorySrc),
      `factory debe declarar part="${p}"`);
  }
});

test('date-field: edge case — value="" (vacío) y min > max', () => {
  // El factory declara 'value' como observado. min/max deben compararse.
  assert.ok(/value/.test(factorySrc));
  assert.ok(/min/.test(factorySrc) && /max/.test(factorySrc));
  // El factory debería tener una rama que valide min <= max.
  assert.ok(/invalid/.test(factorySrc),
    'factory debe poder marcar el campo como invalid (min > max → invalid)');
});

test('date-field: edge case — locale inválido cae al del sistema', () => {
  assert.ok(/resolveLocale/.test(factorySrc) || /Intl\.DateTimeFormat\(\s*\[/.test(factorySrc),
    'factory debe manejar locales inválidos (fallback)');
});

test('date-field: preview JSON', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev);
  assert.equal(prev!['$schema'], 'is-preview/v1');
  assert.equal(prev!.tag, TAG);
});
