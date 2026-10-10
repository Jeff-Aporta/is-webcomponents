/**
 * figure-contract.test.ts — contrato de `<iswc-figure>`: 4 archivos hermanos, entrada en el
 * manifest, demo con playground y la API que consumen los visores de documentos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ComponentJsonSchema } from '../../../previews/_kit/component.schemas.ts';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');
const BASE = join(RAIZ, 'src', 'components', 'media', 'figure');

test('iswc-figure: .ts + .scss + .md + .json hermanos', () => {
  for (const ext of ['.ts', '.scss', '.md', '.json']) assert.ok(existsSync(BASE + ext), `falta figure${ext}`);
});

test('iswc-figure: registrado en el manifest con su página', () => {
  const manifest = readFileSync(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
  assert.match(manifest, /tag: 'iswc-figure', title: 'Figure', category: 'media', script: 'components\/media\/figure\.js', style: 'components\/media\/figure\.css', page: 'components\/media\/figure\.json'/);
});

test('iswc-figure: demo iswc-preview/v1 válida con playground', () => {
  const doc = ComponentJsonSchema.parse(JSON.parse(readFileSync(BASE + '.json', 'utf8')));
  assert.equal(doc.tag, 'iswc-figure');
  const demos = doc.sections.flatMap((s) => s.blocks).filter((b) => b.kind === 'demo');
  assert.ok(demos.some((b) => b.kind === 'demo' && (b.controls ?? []).length >= 3), 'el demo necesita controles de playground');
});

test('iswc-figure: API de visor (src, caption, link, href, paper, evento cancelable)', () => {
  const ts = readFileSync(BASE + '.ts', 'utf8');
  for (const a of ['src', 'src-dark', 'src-light', 'alt', 'caption', 'link', 'href', 'link-label', 'fit', 'loading', 'variant', 'paper']) {
    assert.ok(ts.includes(`'${a}'`), `atributo observado ${a}`);
  }
  assert.match(ts, /emitCancelable\(this, 'iswc-figure-open'/);
  assert.match(ts, /target="_blank" rel="noopener"/);
  for (const part of ['frame', 'link', 'caption']) assert.ok(ts.includes(`part="${part}"`), `part ${part}`);
  assert.ok(ts.includes('exportparts="image"'), 'reexporta ::part(image)');
});
