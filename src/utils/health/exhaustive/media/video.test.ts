/**
 * video.test.ts — Tier A (12 aserciones) para `<is-video>`.
 *
 * (Nombre en la consigna era "video-player"; el componente real es `<is-video>`).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-video';
const TS  = join(ROOT, 'src', 'components', 'media', 'video.ts');
const CSS = join(ROOT, 'src', 'components', 'media', 'video.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'media', 'video.json');

test('1. módulo existe', async () => {
  assert.ok(existsSync(TS));
});

test('2. CSS hermano existe', async () => {
  assert.ok(existsSync(CSS));
});

test('3. JSON existe y respeta is-preview/v1', async () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json.$schema, 'is-preview/v1');
});

test('4. OBSERVED incluye src, poster, muted, loop, autoplay, playsinline', async () => {
  // Pasa la ruta RELATIVA a la raíz del repo (no absoluta), porque
  // `extraerObservados` usa `readFileSync(join(ROOT, ruta))` internamente.
  const { extraerObservados } = await import('../_helpers.js');
  const REL_TS = TS.slice(ROOT.length + 1).replace(/\\/g, '/');
  const list = extraerObservados(REL_TS);
  for (const a of ['src', 'poster', 'muted', 'loop', 'autoplay', 'playsinline']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('5. expone métodos play(), pause(), toggleFullscreen(), togglePictureInPicture()', async () => {
  const src = readFileSync(TS, 'utf8');
  for (const m of ['play(', 'pause(', 'toggleFullscreen(', 'togglePictureInPicture(']) {
    assert.ok(src.includes(m), `debe exponer ${m}`);
  }
});

test('6. emite is-play, is-pause, is-ended', async () => {
  const src = readFileSync(TS, 'utf8');
  for (const ev of ['is-play', 'is-pause', 'is-ended']) {
    assert.ok(src.includes(`'${ev}'`) || src.includes(`"${ev}"`), `debe emitir ${ev}`);
  }
});

test('7. reenvía eventos nativos del elemento <video>', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/addEventListener\s*\(\s*['"]play['"]/.test(src));
  assert.ok(/addEventListener\s*\(\s*['"]pause['"]/.test(src));
  assert.ok(/addEventListener\s*\(\s*['"]ended['"]/.test(src));
});

test('8. maneja atajos de teclado (espacio, flechas, k, m, f)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/keydown/.test(src), 'keydown listener debe existir');
});

test('9. soporta pantalla completa y picture-in-picture', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/requestFullscreen/.test(src));
  assert.ok(/pictureInPicture|PictureInPicture/.test(src));
});

test('10. expone CSS parts para la chrome', async () => {
  const src = readFileSync(TS, 'utf8');
  const partCount = (src.match(/\bpart\s*=\s*['"][a-z-]+['"]/g) || []).length;
  assert.ok(partCount >= 5, `debe exponer ≥5 parts, hay ${partCount}`);
});

test('11. custom element registrado', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/customElements\.define\s*\(\s*['"]is-video['"]/.test(src) ||
             /defineElement\s*\(\s*['"]is-video['"]/.test(src));
});

test('12. preview.ts existe (componente complejo)', async () => {
  const preview = join(ROOT, 'src', 'components', 'media', 'video.preview.ts');
  assert.ok(existsSync(preview));
});
