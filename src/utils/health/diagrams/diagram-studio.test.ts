import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  DIAGRAM_KINDS,
  buildShareUrl,
  decodeJsonParam,
  encodeJsonParam,
} from '../../../components/diagrams/diagram-studio.ts';

test('el parámetro json sobrevive acentos y no reescribe la dirección de origen', () => {
  const abierta = 'https://jeff-aporta.github.io/is-webcomponents/demos/diagramas/app/edit.html?kind=er&json=VIEJO';
  const doc = { title: 'Facturación', note: 'sí' };
  const enlace = buildShareUrl(abierta, 'flowchart', doc);
  assert.equal(abierta.includes('json=VIEJO'), true);
  assert.notEqual(enlace, abierta);
  const url = new URL(enlace);
  assert.equal(url.searchParams.get('kind'), 'flowchart');
  assert.deepEqual(decodeJsonParam(url.searchParams.get('json') || ''), doc);
  assert.equal(decodeJsonParam(encodeJsonParam(doc)).note, 'sí');
});

test('hay un kind por cada diagrama publicado', () => {
  assert.equal(DIAGRAM_KINDS.length, 17);
  assert.equal(DIAGRAM_KINDS.some((k) => k.kind === 'er' && k.editor), true);
});

test('el estudio no reescribe la URL al mutar el diagrama', () => {
  const src = readFileSync(new URL('../../../components/diagrams/diagram-studio.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /history\.(replaceState|pushState)|location\.(assign|replace)\(|location\.href\s*=/);
});
