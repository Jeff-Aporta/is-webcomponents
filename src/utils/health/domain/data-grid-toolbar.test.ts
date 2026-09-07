/**
 * data-grid-toolbar.test.ts — invariante del boolean toolbar-tools.
 *
 * Error que mitiga: consumidores (p. ej. jagudeloe tk-table) necesitaban
 * ocultar Columnas/Filtros/Densidad/Exportar y se intentó con CSS o flags
 * inventados. El contrato canónico es toolbar-tools="false".
 *
 *   node --test tests/data-grid-toolbar.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

test('data-grid.ts expone toolbarTools y observa toolbar-tools', async () => {
  const js = await readFile(join(root, 'src/components/data/data-grid.ts'), 'utf8');

  assert.match(js, /['"]toolbar-tools['"]/, 'atributo toolbar-tools debe estar observado');
  assert.match(js, /get toolbarTools\s*\(/, 'propiedad toolbarTools (getter)');
  assert.match(
    js,
    /getAttribute\(\s*['"]toolbar-tools['"]\s*\)\s*!==\s*['"]false['"]/,
    'toolbarTools es true salvo toolbar-tools="false"',
  );
  assert.match(js, /const showTools\s*=\s*this\.toolbarTools/, 'render usa showTools desde toolbarTools');
});

test('data-grid.md documenta toolbar-tools', async () => {
  const md = await readFile(join(root, 'src/components/data/data-grid.md'), 'utf8');
  assert.match(md, /toolbar-tools/, 'MD debe listar toolbar-tools');
  assert.match(md, /false/, 'MD debe explicar false = ocultar tools');
});

test('specs/componentes.md recuerda no ocultar tools con CSS', async () => {
  // Antes: src/components/data/LLM.md documentaba la regla. Consolidación
  // 2026-09-07: el contenido vive ahora en specs/componentes.md (catálogo
  // consolidado). El guardián migró a esa ubicación.
  const md = await readFile(join(root, 'specs', 'componentes.md'), 'utf8');
  assert.match(md, /toolbar-tools/, 'specs debe mencionar toolbar-tools');
  assert.match(md, /No ocultar|no ocultar|CSS/i, 'specs debe prohibir ocultar tools con CSS');
});
