/**
 * badge.test.ts — Tier A (10 aserciones) para `<is-badge>`.
 *
 * Etiqueta compacta semántica con color/variant/pill/attention.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  exists,
  leerConBase,
  extraerObservados,
  extraerParts,
  tieneJsDoc,
} from '../_helpers.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-badge';
const TS = 'src/components/feedback/badge.ts';
const JSON_PATH = join(ROOT, 'src/components/feedback/badge.json');
const CSS = join(ROOT, 'src/components/feedback/badge.css');

void async function () {
  // Pre-cargar el módulo del componente para que customElements lo registre.
  await import('../../../../components/feedback/badge.ts').catch(() => {});
}();

test('1. módulo existe', () => {
  assert.ok(exists(TS));
});

test('2. CSS hermano existe', () => {
  assert.ok(existsSync(CSS));
});

test('3. JSON existe y respeta is-preview/v1', () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json['$schema'], 'is-preview/v1');
});

test('4. OBSERVED incluye color, variant, pill, attention', () => {
  const obs = extraerObservados(TS);
  for (const a of ['color', 'variant', 'pill', 'attention']) {
    assert.ok(obs.includes(a), `OBSERVED debe incluir "${a}", actual=${obs.join(',')}`);
  }
});

test('5. color acepta brand | neutral | success | warning | danger', () => {
  const src = leerConBase(TS);
  for (const c of ['brand', 'neutral', 'success', 'warning', 'danger']) {
    assert.ok(src.includes(`'${c}'`) || src.includes(`"${c}"`), `color acepta "${c}"`);
  }
});

test('6. variant acepta accent | filled | outlined | filled-outlined', () => {
  const src = leerConBase(TS);
  for (const v of ['accent', 'filled', 'outlined', 'filled-outlined']) {
    assert.ok(src.includes(`'${v}'`) || src.includes(`"${v}"`), `variant acepta "${v}"`);
  }
});

test('7. attention tiene pulse y bounce', () => {
  const src = leerConBase(TS);
  for (const a of ['pulse', 'bounce']) {
    assert.ok(src.includes(`'${a}'`) || src.includes(`"${a}"`), `attention tiene "${a}"`);
  }
});

test('8. expone CSS parts: badge, start, label, end', () => {
  const parts = extraerParts(leerConBase(TS));
  for (const p of ['badge', 'start', 'label', 'end']) {
    assert.ok(parts.includes(p), `parts debe incluir "${p}", actual=${parts.join(',')}`);
  }
});

test('9. slots default + start + end', () => {
  const src = leerConBase(TS);
  assert.ok(/<slot>/.test(src) || /<slot\s*>/.test(src), 'slot default');
  assert.ok(/name=['"]start['"]/.test(src));
  assert.ok(/name=['"]end['"]/.test(src));
});

test('10. custom element registrado', () => {
  const src = leerConBase(TS);
  assert.ok(/defineElement\s*\(\s*['"]is-badge['"]/.test(src));
});

test('11. JSDoc de cabecera', () => {
  assert.ok(tieneJsDoc(leerConBase(TS)));
});
