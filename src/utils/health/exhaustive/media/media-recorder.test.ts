/**
 * media-recorder.test.ts — Tier A (12 aserciones) para `<is-media-recorder>`.
 *
 * (Nombre en la consigna era "audio-recorder", pero el componente real es
 * `<is-media-recorder>` — soporta source=camera|mic|display).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-media-recorder';
const TS  = join(ROOT, 'src', 'components', 'media', 'media-recorder.ts');
const CSS = join(ROOT, 'src', 'components', 'media', 'media-recorder.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'media', 'media-recorder.json');

test('1. módulo existe', async () => {
  assert.ok(existsSync(TS));
});

test('2. CSS hermano existe', async () => {
  assert.ok(existsSync(CSS));
});

test('3. JSON existe y respeta is-preview/v1', async () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json['$schema'], 'is-preview/v1');
});

test('4. OBSERVED incluye source, disabled', async () => {
  // Pasa la ruta RELATIVA a la raíz del repo (no absoluta), porque
  // `extraerObservados` usa `readFileSync(join(ROOT, ruta))` internamente.
  const { extraerObservados } = await import('../_helpers.js');
  const REL_TS = TS.slice(ROOT.length + 1).replace(/\\/g, '/');
  const list = extraerObservados(REL_TS);
  for (const a of ['source', 'disabled']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('5. attributeChangedCallback presente (no solo declarativo)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/attributeChangedCallback\s*\(/.test(src));
});

test('6. usa getUserMedia o getDisplayMedia para captura', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/getUserMedia/.test(src) || /getDisplayMedia/.test(src));
});

test('7. usa MediaRecorder API', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/MediaRecorder/.test(src));
});

test('8. emite is-start, is-stop, is-error', async () => {
  const { extraerEventos } = await import('../_helpers.js');
  const REL_TS = TS.slice(ROOT.length + 1).replace(/\\/g, '/');
  const evs = extraerEventos(readFileSync(TS, 'utf8'));
  for (const ev of ['is-start', 'is-stop', 'is-error']) {
    assert.ok(evs.includes(ev), `debe emitir ${ev}`);
  }
});

test('9. tiene métodos start() y stop() públicos', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/start\s*\(\s*\)/.test(src));
  assert.ok(/stop\s*\(\s*\)/.test(src));
});

test('10. atributo source acepta "camera" | "mic" | "display"', async () => {
  const src = readFileSync(TS, 'utf8');
  for (const v of ['camera', 'mic', 'display']) {
    assert.ok(src.includes(`'${v}'`) || src.includes(`"${v}"`), `source acepta "${v}"`);
  }
});

test('11. expone parte preview y download', async () => {
  const { extraerParts } = await import('../_helpers.js');
  const parts = extraerParts(readFileSync(TS, 'utf8'));
  for (const p of ['preview', 'download']) {
    assert.ok(parts.includes(p), `debe exponer part="${p}"`);
  }
});

test('12. custom element registrado', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/customElements\.define\s*\(\s*['"]is-media-recorder['"]/.test(src) ||
             /defineElement\s*\(\s*['"]is-media-recorder['"]/.test(src));
});
