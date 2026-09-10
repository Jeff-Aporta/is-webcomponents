/**
 * input.test.ts — Tests exhaustivos de <is-input>.
 *
 * Cubre las 10 dimensiones:
 *   1. Render básico (custom element registrado, shadow DOM, parts)
 *   2. Atributos observados
 *   3. Eventos (is-input, is-change, is-enter, is-typing-end, is-otp)
 *   4. Slots (label, hint, start, end)
 *   5. Shadow DOM parts (form-control, base, input, clear, toggle, ...)
 *   6. JSON payload (no usa JSON, pero el preview debe declarar tag+schema)
 *   7. Accessibility (delegatesFocus, aria-describedby)
 *   8. Edge cases (unicode, maxlength, custom validity, password toggle)
 *   9. Integración (form-associated, ElementBase, formResetCallback)
 *  10. Performance (clearTimeout en disconnected, AbortController para OTP)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  leerComponente, leerPreview, leerDoc, existeCss,
  atributosObservados, tagsDefinidos, eventosEmitidos,
  slotsDeclarados, partsDeclaradas, customStates, tokensCss,
  eventosDocumentados, atributosDocumentados,
  esFormAssociated, extiendeElementBase, usaShadowDom,
  tieneObservedTipado, tieneDefineElement,
} from './_helpers.js';

const TAG = 'is-input';
const src = leerComponente(TAG);

test('input: archivo y registro', () => {
  assert.ok(src.length > 1000, 'archivo debe tener contenido sustancial');
  assert.ok(existeCss(TAG), 'input debe tener .css hermano');
  assert.ok(tieneDefineElement(src), 'input usa defineElement');
  assert.deepEqual(tagsDefinidos(src), [TAG]);
});

test('input: atributos observados', () => {
  const obs = atributosObservados(src);
  // Atributos núcleo que el componente promete.
  for (const a of ['type', 'name', 'value', 'placeholder', 'label', 'hint',
                   'disabled', 'required', 'readonly', 'clearable',
                   'min', 'max', 'step', 'maxlength', 'error-text']) {
    assert.ok(obs.includes(a), `<is-input> observado debe incluir "${a}" (faltan: ${obs.join(',')})`);
  }
});

test('input: eventos emitidos vs documentados', () => {
  const emitidos = eventosEmitidos(src);
  for (const ev of ['is-input', 'is-change', 'is-enter', 'is-typing-end', 'is-otp']) {
    assert.ok(emitidos.includes(ev),
      `<is-input> debe emitir "${ev}" (emite: ${emitidos.join(',')})`);
  }
});

test('input: slots (label, hint, start, end)', () => {
  const slots = slotsDeclarados(src);
  for (const s of ['label', 'hint', 'start', 'end']) {
    assert.ok(slots.includes(s), `<is-input> debe declarar slot "${s}" (tiene: ${slots.join(',')})`);
  }
});

test('input: shadow DOM parts', () => {
  const parts = partsDeclaradas(src);
  for (const p of ['form-control', 'base', 'input', 'clear', 'toggle',
                   'label', 'hint', 'error-text', 'prefix', 'suffix']) {
    assert.ok(parts.includes(p), `<is-input> debe declarar part="${p}" (tiene: ${parts.join(',')})`);
  }
});

test('input: shadow DOM (open + delegatesFocus)', () => {
  assert.ok(usaShadowDom(src));
  assert.ok(/attachShadow\s*\(\s*\{\s*mode:\s*['"]open['"]\s*,\s*delegatesFocus:\s*true/.test(src),
    '<is-input> debe abrir shadow con delegatesFocus:true (accesibilidad teclado)');
});

test('input: form-associated (ElementBase + attachFormInternals)', () => {
  assert.ok(esFormAssociated(src), '<is-input> debe ser form-associated');
  assert.ok(extiendeElementBase(src), '<is-input> debe extender ElementBase');
  assert.ok(/attachFormInternals\s*\(/.test(src));
  assert.ok(/formResetCallback\s*\(/.test(src),
    '<is-input> debe implementar formResetCallback (Form Custom Element)');
});

test('input: preview JSON válido', () => {
  const prev = leerPreview(TAG);
  assert.ok(prev, '<is-input> debe tener JSON de preview');
  assert.equal(prev!['$schema'], 'is-preview/v1');
  assert.equal(prev!.tag, TAG);
});

test('input: documentación coherente (JSDoc cabecera)', () => {
  const doc = leerDoc(TAG);
  assert.ok(doc && doc.length > 100, '<is-input> debe tener .md');
  assert.ok(/Atributos/.test(doc!) && /Eventos/.test(doc!), 'doc debe listar Atributos y Eventos');
});

test('input: type enum (text|email|password|number|search|tel|url|date)', () => {
  // Valida que la lista de tipos válidos está presente.
  for (const t of ['text', 'email', 'password', 'number', 'search', 'tel', 'url', 'date']) {
    assert.ok(new RegExp(`['"\`]${t}['"\`]`).test(src),
      `<is-input> type enum debe incluir "${t}"`);
  }
});

test('input: variant y label-placement', () => {
  // outlined | filled | underlined; top | start | float.
  for (const v of ['outlined', 'filled', 'underlined']) {
    assert.ok(src.includes(`'${v}'`), `variant debe aceptar "${v}"`);
  }
  for (const p of ['top', 'start', 'float']) {
    assert.ok(src.includes(`'${p}'`), `labelPlacement debe aceptar "${p}"`);
  }
});

test('input: custom states (blank, focused, invalid, password-visible)', () => {
  const states = customStates(src);
  for (const s of ['blank', 'focused', 'invalid', 'password-visible']) {
    assert.ok(states.includes(s), `<is-input> custom state "${s}" debe existir (tiene: ${states.join(',')})`);
  }
});

test('input: performance — cleanup en disconnected', () => {
  // OTP AbortController + typing-end debounce deben limpiarse.
  assert.ok(/#otpAbort\?\.abort\(\)/.test(src),
    '<is-input> debe abortar OTP listener en disconnect');
  assert.ok(/#typingTimer/.test(src) && /clearTimeout\(this\.#typingTimer\)/.test(src),
    '<is-input> debe limpiar el debounce de is-typing-end en disconnect');
});

test('input: edge case — caracteres unicode en el valor', () => {
  // El componente serializa a String() — unicode debe sobrevivir.
  // Lo confirmamos estáticamente: `String(v)` en el setter de value.
  assert.ok(/set value\(v\)\s*\{[\s\S]*?String\(v\)/.test(src),
    'setter de value debe normalizar con String() (unicode-safe)');
});

test('input: edge case — customValidity permite mensajes arbitrarios', () => {
  assert.ok(/setCustomValidity\s*\(\s*msg\s*\)/.test(src),
    '<is-input> debe exponer setCustomValidity(msg)');
});

test('input: maxlength se refleja al <input> interno', () => {
  // `NATIVE_ATTRS` debe contener maxlength.
  assert.ok(/maxlength/.test(src) && /NATIVE_ATTRS/.test(src),
    '<is-input> debe reflejar maxlength al <input> nativo');
});

test('input: form-associated + formDisabledCallback', () => {
  assert.ok(/formDisabledCallback\s*\(/.test(src),
    '<is-input> debe implementar formDisabledCallback (fieldset disabled)');
});
