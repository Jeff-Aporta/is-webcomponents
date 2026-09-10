/**
 * format-date.test.ts — Tier A (15 aserciones) para `<is-format-date>`.
 *
 * Estrategia: análisis estático del .ts. No levantamos DOM porque el módulo
 * toca HTMLElement en element-base.ts y eso requiere jsdom. Las pruebas
 * validan estructura, contrato y consistencia con el JSDoc.
 *
 * Cómo correr:
 *   node --import ./scripts/ts-resolve-hook.ts --test \
 *     src/utils/health/exhaustive/helpers/format-date.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..', '..');
const TAG = 'is-format-date';
const TS  = join(ROOT, 'src', 'components', 'helpers', 'format-date.ts');
const CSS = join(ROOT, 'src', 'components', 'helpers', 'format-date.css');
const JSON_PATH = join(ROOT, 'src', 'components', 'helpers', 'format-date.json');

test('1. el módulo .ts existe y es legible', () => {
  assert.ok(existsSync(TS), `debe existir ${TS}`);
  const src = readFileSync(TS, 'utf8');
  assert.ok(src.length > 100, 'el módulo debe tener contenido real');
});

test('2. CSS hermano existe (.css)', () => {
  assert.ok(existsSync(CSS), `debe existir ${CSS}`);
});

test('3. JSON existe, declara el tag y respeta el esquema is-preview/v1', () => {
  assert.ok(existsSync(JSON_PATH));
  const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  assert.equal(json.tag, TAG);
  assert.equal(json.$schema, 'is-preview/v1');
  assert.ok(Array.isArray(json.sections) && json.sections.length > 0, 'sections[] debe estar');
});

test('4. static observedAttributes incluye TODOS los atributos documentados en JSDoc', () => {
  const src = readFileSync(TS, 'utf8');
  const m = src.match(/OBSERVED\s*=\s*\[([^\]]+)\]/);
  assert.ok(m, 'debe haber un OBSERVED = [...]');
  const list = m![1].replace(/['"\s]/g, '').split(',').filter(Boolean);
  const esperados = ['date', 'weekday', 'era', 'year', 'month', 'day', 'hour', 'minute', 'second', 'time-zone', 'time-zone-name', 'hour-format', 'locale'];
  for (const e of esperados) {
    assert.ok(list.includes(e), `OBSERVED debe incluir "${e}"`);
  }
});

test('5. la clase reacciona a cambios de atributo (override o via ElementBase.onAttributeChanged)', () => {
  const src = readFileSync(TS, 'utf8');
  const ok =
    /attributeChangedCallback\s*\(/.test(src) ||
    /extends\s+ElementBase\b/.test(src) ||
    /onAttributeChanged\s*\(/.test(src);
  assert.ok(ok, 'debe reaccionar a cambios de atributo (override, ElementBase o onAttributeChanged)');
});

test('6. la clase llama adoptCss() con import.meta.url', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(
    /adoptCss\s*\(\s*[^,)]+,\s*import\.meta\.url/.test(src),
    'adoptCss(shadow, import.meta.url) debe estar presente',
  );
});

test('7. Shadow DOM contiene <time part="date">', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/<time[^>]*part=["']date["']/.test(src), 'el template debe exponer part="date"');
});

test('8. la clase está registrada con defineElement o customElements.define', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(
    /customElements\.define\s*\(\s*['"]is-format-date['"]/.test(src) ||
    /defineElement\s*\(\s*['"]is-format-date['"]/.test(src),
    'debe haber registro del custom element',
  );
});

test('9. parseLooseDate() exporta la función de parseo laxo', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/export\s+function\s+parseLooseDate\s*\(/.test(src), 'parseLooseDate debe estar exportada');
});

test('10. parseLooseDate() maneja YYYY-MM-DD como fecha local', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/const\s+only\s*=\s*\/\^\(\\d\{4\}\)-/.test(src), 'regex de YYYY-MM-DD debe estar');
  assert.ok(/new\s+Date\(\+only\[1\],\s*\+only\[2\]\s*-\s*1,\s*\+only\[3\]\)/.test(src), 'parseo local debe estar');
});

test('11. parseLooseDate() maneja timestamp numérico', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/new\s+Date\(Number\(s\)\)/.test(src), 'timestamp numérico → Date debe estar');
});

test('12. parseLooseDate() delega en new Date() para ISO completo', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/new\s+Date\(s\)/.test(src), 'delegación a Date(s) debe estar');
});

test('13. parseLooseDate() devuelve null en entradas inválidas', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/Number\.isNaN\(d\.getTime\(\)\)\s*\?\s*null\s*:\s*d/.test(src), 'NaN → null debe estar');
});

test('14. la clase expone getters/setters para los atributos principales', () => {
  const src = readFileSync(TS, 'utf8');
  // Al menos getter/setter para `date` y `locale`
  assert.ok(/get\s+date\s*\(\)/.test(src), 'getter date() debe existir');
  assert.ok(/set\s+date\s*\(/.test(src), 'setter date() debe existir');
  assert.ok(/get\s+locale\s*\(\)/.test(src), 'getter locale() debe existir');
});

test('15. OPT_ATTRS mapea kebab-case a camelCase para Intl.DateTimeFormat', () => {
  const src = readFileSync(TS, 'utf8');
  assert.ok(/OPT_ATTRS\s*=\s*\{/.test(src), 'OPT_ATTRS debe estar');
  assert.ok(/['"]time-zone['"]\s*:\s*['"]timeZone['"]/.test(src), 'time-zone → timeZone');
  assert.ok(/['"]time-zone-name['"]\s*:\s*['"]timeZoneName['"]/.test(src), 'time-zone-name → timeZoneName');
});
