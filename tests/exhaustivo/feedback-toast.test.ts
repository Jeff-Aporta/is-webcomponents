// @contexto INDICE.md · tests/exhaustivo/README.md
/**
 * toast.test.ts — Tier A (10 aserciones) para `<iswc-toast>`.
 *
 * Notificaciones apilables con placement, helpers estáticos,
 * atajo .promise(), singleton host(), normalizeIntent.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  exists,
  leerConBase,
  extraerObservados,
  tieneJsDoc,
} from '../_shared/exhaustivo.js';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TS = 'src/components/feedback/toast.ts';
const JSON_PATH = join(ROOT, 'src/components/feedback/toast.json');

void async function () {
  await import('../../src/components/feedback/toast.ts').catch(() => {});
}();

test('iswc-toast: toast: 1. módulo existe', () => {
  assert.ok(exists(TS));
});

test('iswc-toast: JSON existe y respeta iswc-preview/v1', () => {
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, 'iswc-toast');
  assert.equal(json['$schema'], 'iswc-preview/v1');
});

test('iswc-toast: CSS hermano existe', () => {
  assert.ok(existsSync(join(ROOT, '.tmp-scss/src/components/feedback/toast.css')));
});

test('iswc-toast: integra con iswc-toast-item (light DOM o shadow)', () => {
  const src = leerConBase(TS);
  // Importa o usa <iswc-toast-item>.
  assert.ok(
    /toast-item/.test(src) || /['"]iswc-toast-item['"]/.test(src),
    'debe integrar con iswc-toast-item',
  );
});

test('iswc-toast: OBSERVED incluye placement', () => {
  const obs = extraerObservados(TS);
  assert.ok(obs.includes('placement'), `OBSERVED debe incluir placement, actual=${obs.join(',')}`);
});

test('iswc-toast: placement cubre 6 posiciones (top/bottom × start/center/end)', () => {
  const src = leerConBase(TS);
  for (const v of ['top-start', 'top-center', 'top-end', 'bottom-start', 'bottom-center', 'bottom-end']) {
    assert.ok(src.includes(`'${v}'`) || src.includes(`"${v}"`), `placement acepta "${v}"`);
  }
});

test('iswc-toast: método create(message, options?) para crear toast imperativo', () => {
  const src = leerConBase(TS);
  assert.ok(/create\s*\(/.test(src));
});

test('iswc-toast: helpers estáticos: error / success / loading', () => {
  const src = leerConBase(TS);
  for (const m of ['error(', 'success(', 'loading(']) {
    assert.ok(src.includes(m), `debe exponer estático ${m}`);
  }
});

test('iswc-toast: atajo de promesa (IswcToast.promise)', () => {
  const src = leerConBase(TS);
  assert.ok(/promise\s*\(/.test(src));
});

test('iswc-toast: helper estático host() devuelve el singleton del documento', () => {
  const src = leerConBase(TS);
  assert.ok(/static\s+host\s*\(/.test(src));
});

test('iswc-toast: usa normalizeIntent para mapear colores', () => {
  const src = leerConBase(TS);
  assert.ok(/normalizeIntent/.test(src));
});

test('iswc-toast: custom element registrado y preview.ts existe', () => {
  const src = leerConBase(TS);
  assert.ok(/(?:defineElement\s*\(\s*|static\s+(?:override\s+)?tag\s*=\s*|createObserverElement\(\s*'\w+',\s*)['"]iswc-toast['"]/.test(src));
  assert.ok(existsSync(join(ROOT, 'src/components/feedback/utils/toast.preview.ts')));
});

test('iswc-toast: JSDoc de cabecera', () => {
  assert.ok(tieneJsDoc(leerConBase(TS)));
});

export default lista();
