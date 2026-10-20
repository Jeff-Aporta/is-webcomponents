/**
 * block-layout.test.ts — Tier A (15 aserciones) para `<iswc-block-layout>`.
 *
 * Componente de layout con breakpoints (xs/sm/md/lg/xl), body JSON,
 * geometría API y scroll memory.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const TAG = 'iswc-block-layout';
const TS  = join(ROOT, 'src', 'components', 'isp', 'block-layout.ts');
const CSS = join(ROOT, '.tmp-scss', 'src', 'components', 'isp', 'block-layout.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'isp', 'block-layout.json');

test('block-layout: 1. módulo existe', async () => {
  assert.ok(existsSync(TS));
});

test('block-layout: 2. CSS hermano existe', async () => {
  assert.ok(existsSync(CSS));
});

test('block-layout: 3. JSON existe y respeta iswc-preview/v1', async () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json.$schema, 'iswc-preview/v1');
});

test('4. exporta constantes BREAKPOINTS = [xs, sm, md, lg, xl]', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/export\s+const\s+BREAKPOINTS\s*=\s*\[\s*['"]xs['"]/.test(src));
  assert.ok(/['"]sm['"]/.test(src) && /['"]md['"]/.test(src));
  assert.ok(/['"]lg['"]/.test(src) && /['"]xl['"]/.test(src));
});

test('5. exporta BREAKPOINT_W con anchos numéricos', async () => {
  const src = readFileSync(TS, 'utf8');
  // Admite anotación de tipo TS (`BREAKPOINT_W: Record<string, number> = {`).
  const m = src.match(/export\s+const\s+BREAKPOINT_W\s*(?::[^=\n]*)?=\s*\{([^}]*)\}/);
  assert.ok(m, 'debe exportar BREAKPOINT_W como objeto literal');
  // Cada breakpoint tiene un ancho numérico y los anchos crecen xs→xl.
  const anchos = ['xs', 'sm', 'md', 'lg', 'xl'].map((bp) => {
    const v = m![1].match(new RegExp(`\\b${bp}\\s*:\\s*(\\d+)`));
    assert.ok(v, `BREAKPOINT_W.${bp} debe ser numérico`);
    return Number(v![1]);
  });
  for (let i = 1; i < anchos.length; i++) {
    assert.ok(anchos[i] > anchos[i - 1], `BREAKPOINT_W debe crecer: ${anchos.join(',')}`);
  }
});

test('6. exporta sizewFor(width) para resolver breakpoint desde ancho', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/export\s+function\s+sizewFor\b/.test(src));
});

test('7. emite iswc-breakpoint cuando cambia el sizew', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/['"]iswc-breakpoint['"]/.test(src), 'debe emitir iswc-breakpoint');
});

test('8. tiene API de geometría (getWidth/getHeight/rect)', async () => {
  const src = readFileSync(TS, 'utf8');
  for (const m of ['getWidth', 'getHeight', 'rect']) {
    assert.ok(src.includes(m), `API debe incluir ${m}()`);
  }
});

test('9. usa codec json2html/html2json (round-trip)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/json2html\b/.test(src) && /html2json\b/.test(src), 'codec bidireccional');
});

test('10. soporta scroll memory opt-in (remember-scroll + storage-key)', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/remember-scroll/.test(src) && /storage-key/.test(src));
  assert.ok(/ScrollMemory|scroll-memory/.test(src), 'integra con helper ScrollMemory');
});

test('11. OBSERVED incluye atributos principales', async () => {
  const { extraerObservados } = await import('../../_shared/exhaustivo.js');
  const list = extraerObservados(TS);
  for (const a of ['inline', 'cscroll', 'remember-scroll', 'storage-key']) {
    assert.ok(list.includes(a), `OBSERVED debe incluir "${a}"`);
  }
});

test('12. custom element registrado', async () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/defineElement\s*\(\s*['"]iswc-block-layout['"]/.test(src));
});

test('13. CSS hermano tiene reglas para grid/flex (es un layout)', async () => {
  const css = readFileSync(CSS, 'utf8');
  assert.ok(/display\s*:\s*(grid|flex|block)/.test(css), 'debe tener regla display');
  assert.ok(/--/.test(css), 'debe exponer CSS custom properties');
});

test('14. JSON tiene sección intro con lede (no es solo una tabla)', async () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const intro = (json.sections || [])[0];
  // W43 refactor: `lede` puede ser string o array de strings. Aceptamos ambos.
  const ledeText = Array.isArray(intro?.lede) ? intro.lede.join('\n') : (intro?.lede ?? '');
  assert.ok(intro && typeof ledeText === 'string' && ledeText.length > 30);
});

test('15. preview.ts existe (componente complejo → tiene behavior)', async () => {
  const preview = join(ROOT, 'src', 'components', 'isp', 'utils', 'block-layout.preview.ts');
  assert.ok(existsSync(preview));
});

export default lista();
