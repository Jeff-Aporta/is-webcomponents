/**
 * toast.test.ts — Tier A (10 aserciones) para `<is-toast>`.
 *
 * Notificaciones apilables con placement, helpers estáticos,
 * atajo .promise(), singleton host(), normalizeIntent.
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
  tieneJsDoc,
} from '../_helpers.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TS = 'src/components/feedback/toast.ts';
const JSON_PATH = join(ROOT, 'src/components/feedback/toast.json');

void async function () {
  await import('../../../../components/feedback/toast.ts').catch(() => {});
}();

test('1. módulo existe', () => {
  assert.ok(exists(TS));
});

test('2. JSON existe y respeta is-preview/v1', () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, 'is-toast');
  assert.equal(json['$schema'], 'is-preview/v1');
});

test('3. CSS hermano existe', () => {
  assert.ok(existsSync(join(ROOT, 'src/components/feedback/toast.css')));
});

test('4. integra con is-toast-item (light DOM o shadow)', () => {
  const src = leerConBase(TS);
  // Importa o usa <is-toast-item>.
  assert.ok(
    /toast-item/.test(src) || /['"]is-toast-item['"]/.test(src),
    'debe integrar con is-toast-item',
  );
});

test('5. OBSERVED incluye placement', () => {
  const obs = extraerObservados(TS);
  assert.ok(obs.includes('placement'), `OBSERVED debe incluir placement, actual=${obs.join(',')}`);
});

test('6. placement cubre 6 posiciones (top/bottom × start/center/end)', () => {
  const src = leerConBase(TS);
  for (const v of ['top-start', 'top-center', 'top-end', 'bottom-start', 'bottom-center', 'bottom-end']) {
    assert.ok(src.includes(`'${v}'`) || src.includes(`"${v}"`), `placement acepta "${v}"`);
  }
});

test('7. método create(message, options?) para crear toast imperativo', () => {
  const src = leerConBase(TS);
  assert.ok(/create\s*\(/.test(src));
});

test('8. helpers estáticos: error / success / loading', () => {
  const src = leerConBase(TS);
  for (const m of ['error(', 'success(', 'loading(']) {
    assert.ok(src.includes(m), `debe exponer estático ${m}`);
  }
});

test('9. atajo de promesa (IsToast.promise)', () => {
  const src = leerConBase(TS);
  assert.ok(/promise\s*\(/.test(src));
});

test('10. helper estático host() devuelve el singleton del documento', () => {
  const src = leerConBase(TS);
  assert.ok(/static\s+host\s*\(/.test(src));
});

test('11. usa normalizeIntent para mapear colores', () => {
  const src = leerConBase(TS);
  assert.ok(/normalizeIntent/.test(src));
});

test('12. custom element registrado y preview.ts existe', () => {
  const src = leerConBase(TS);
  assert.ok(/defineElement\s*\(\s*['"]is-toast['"]/.test(src));
  assert.ok(existsSync(join(ROOT, 'src/components/feedback/toast.preview.ts')));
});

test('13. JSDoc de cabecera', () => {
  assert.ok(tieneJsDoc(leerConBase(TS)));
});
