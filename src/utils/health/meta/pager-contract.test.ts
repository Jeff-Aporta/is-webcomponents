/**
 * pager-contract.test.ts — contrato de `<iswc-pager>`: 4 archivos hermanos, entrada en el
 * manifest, demo con playground y la API que consume el visor de documentos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ComponentJsonSchema } from '../../../previews/_kit/component.schemas.ts';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');
const BASE = join(RAIZ, 'src', 'components', 'navigation', 'pager');

test('iswc-pager: .ts + .scss + .md + .json hermanos', () => {
  for (const ext of ['.ts', '.scss', '.md', '.json']) assert.ok(existsSync(BASE + ext), `falta pager${ext}`);
});

test('iswc-pager: registrado en el manifest con su página', () => {
  const manifest = readFileSync(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
  assert.match(manifest, /tag: 'iswc-pager', title: 'Pager', category: 'navigation', script: 'components\/navigation\/pager\.js', style: 'components\/navigation\/pager\.css', page: 'components\/navigation\/pager\.json'/);
});

test('iswc-pager: demo iswc-preview/v1 válida con playground', () => {
  const doc = ComponentJsonSchema.parse(JSON.parse(readFileSync(BASE + '.json', 'utf8')));
  assert.equal(doc.tag, 'iswc-pager');
  const demos = doc.sections.flatMap((s) => s.blocks).filter((b) => b.kind === 'demo');
  assert.ok(demos.some((b) => b.kind === 'demo' && (b.controls ?? []).length >= 3), 'el demo necesita controles de playground');
});

test('iswc-pager: API (prev/next, href, rótulos, evento cancelable, parts)', () => {
  const ts = readFileSync(BASE + '.ts', 'utf8');
  for (const a of ['prev', 'next', 'prev-href', 'next-href', 'prev-label', 'next-label', 'label']) {
    assert.ok(ts.includes(`'${a}'`), `atributo observado ${a}`);
  }
  assert.match(ts, /emitCancelable\(this, 'iswc-pager-navigate'/);
  for (const part of ['base', 'prev', 'next', 'label', 'title']) assert.ok(ts.includes(`part="${part}"`), `part ${part}`);
});
