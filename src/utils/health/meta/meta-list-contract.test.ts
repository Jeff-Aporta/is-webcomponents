/**
 * meta-list-contract.test.ts — contrato de `<iswc-meta-list>`: 4 archivos hermanos, manifest,
 * demo con playground y render seguro (texto, nunca HTML de los datos).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ComponentJsonSchema } from '../../../previews/_kit/component.schemas.ts';
import { MetaGroupSchema } from '../../../components/data/meta-list.schemas.ts';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');
const BASE = join(RAIZ, 'src', 'components', 'data', 'meta-list');

test('iswc-meta-list: .ts + .scss + .md + .json hermanos y manifest', () => {
  for (const ext of ['.ts', '.scss', '.md', '.json']) assert.ok(existsSync(BASE + ext), `falta meta-list${ext}`);
  const manifest = readFileSync(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
  assert.match(manifest, /tag: 'iswc-meta-list', title: 'Meta List', category: 'data'/);
});

test('iswc-meta-list: demo con playground y datos válidos', () => {
  const doc = ComponentJsonSchema.parse(JSON.parse(readFileSync(BASE + '.json', 'utf8')));
  const demo = doc.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'demo');
  assert.ok(demo && demo.kind === 'demo' && (demo.controls ?? []).length >= 2, 'demo con controles');
  const html = Array.isArray(demo.html) ? demo.html.join('\n') : String(demo.html ?? '');
  const json = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(json, 'el demo trae datos en JSON hijo');
  for (const g of JSON.parse(json[1])) assert.ok(MetaGroupSchema.safeParse(g).success, JSON.stringify(g));
});

test('iswc-meta-list: pinta con textContent (sin innerHTML de datos)', () => {
  const ts = readFileSync(BASE + '.ts', 'utf8');
  const sinTemplate = ts.replace(/TEMPLATE\.innerHTML = [\s\S]*?`;/, '');
  assert.ok(!/innerHTML/.test(sinTemplate), 'los datos no entran como HTML');
  for (const part of ['heading', 'group', 'group-title', 'list', 'label', 'value']) assert.ok(ts.includes(`'${part}'`) || ts.includes(`part="${part}"`), `part ${part}`);
});
