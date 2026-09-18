// jsonpreview-sections-guardian.test.ts — Guardian del bug §3.A del handoff.
//
// Síntoma: el sitio renderiza vacío en casi todos los demos (salvo los que tienen
// un behavior que pinte algo por su cuenta, como is-button).
//
// Causa raíz confirmada: JsonPreview.constructor sobreescribía `sections: []`
// literal, pisando las sections que registry.ts había cargado del JSON.
//
// Estos tests:
//   1. (runtime) Verifican que JsonPreview preserva las sections del definition.
//   2. (regresión) Verifican que el código fuente NO contiene `sections: []`
//      literal que pise el spread `...definition`.
//   3. (precondición) Verifican que el spread `...definition` está presente.
//
// Si reintroduces `sections: []` en JsonPreview.ts, el test #2 falla con un
// mensaje claro. Si eliminas el spread, el test #3 falla.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { JsonPreview } from '../../../previews/_kit/JsonPreview.js';

const __filename = new URL(import.meta.url).pathname.replace(/^\//, '');
const RAIZ = join(__filename, '..', '..', '..', '..', '..');

test('JsonPreview preserva las sections del definition (runtime)', () => {
  const definition = {
    tag: 'is-fake-test',
    $schema: 'is-preview/v1',
    category: 'test',
    sections: [
      { id: 'intro', blocks: [] },
      { id: 'variants', blocks: [] },
      { id: 'reference', blocks: [] },
    ],
  };
  const preview = new JsonPreview(definition, null);
  assert.equal(
    preview.definition.sections.length,
    3,
    `JsonPreview debe preservar las 3 sections del definition; tiene ${preview.definition.sections.length}. ` +
      `Bug §3.A del handoff: 'sections: []' en el constructor pisa las sections del JSON.`,
  );
  assert.deepEqual(
    preview.definition.sections.map((s) => s.id),
    ['intro', 'variants', 'reference'],
    'JsonPreview debe conservar el orden y los id de las sections del definition',
  );
});

test('JsonPreview conserva prelude, mainClass, styles del definition', () => {
  const definition = {
    tag: 'is-fake-test-2',
    $schema: 'is-preview/v1',
    category: 'test',
    prelude: '<style>:root { --x: red; }</style>',
    mainClass: 'preview-main demo-page',
    styles: 'h1 { color: red; }',
    sections: [{ id: 'a', blocks: [] }],
  };
  const preview = new JsonPreview(definition, null);
  assert.equal(preview.definition.prelude, definition.prelude);
  assert.equal(preview.definition.mainClass, definition.mainClass);
  assert.equal(preview.definition.styles, definition.styles);
  assert.equal(preview.definition.sections.length, 1);
});

test('guard: JsonPreview.ts NO contiene la línea literal `sections: []` (regresión §3.A)', () => {
  const src = readFileSync(join(RAIZ, 'src', 'previews', '_kit', 'JsonPreview.ts'), 'utf8');
  // El bug era: `sections: [],` como override que pisaba `...definition.sections`.
  // Esta regex detecta `sections:` seguido de array vacío literal en cualquier
  // posición de la línea. Si reintroduces el bug, este test falla con mensaje claro.
  const matches = src.match(/^\s*sections\s*:\s*\[\s*\]/gm) ?? [];
  assert.equal(
    matches.length,
    0,
    `JsonPreview.ts contiene ${matches.length} líneas literales 'sections: []' (bug §3.A del handoff). ` +
      `Si necesitas un array vacío, usa 'sections: definition.sections ?? []' para preservar el JSON.`,
  );
});

test('guard: JsonPreview.ts hace spread de `...definition` antes de overrides (precondición)', () => {
  const src = readFileSync(join(RAIZ, 'src', 'previews', '_kit', 'JsonPreview.ts'), 'utf8');
  assert.ok(
    src.includes('...definition'),
    'JsonPreview.ts debe hacer spread `...definition` antes de cualquier override; ' +
      'sin él, los campos del JSON (sections, prelude, etc.) no llegan al constructor de ISComponentPreview.',
  );
});
