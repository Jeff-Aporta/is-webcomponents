/**
 * data-grid-toolbar.test.mjs — invariante del boolean toolbar-tools.
 *
 * Error que mitiga: consumidores (p. ej. jagudeloe tk-table) necesitaban
 * ocultar Columnas/Filtros/Densidad/Exportar y se intentó con CSS o flags
 * inventados. El contrato canónico es toolbar-tools="false".
 *
 *   node --test tests/data-grid-toolbar.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('data-grid.js expone toolbarTools y observa toolbar-tools', async () => {
  const js = await readFile(join(root, 'components/data/data-grid.js'), 'utf8');

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
  const md = await readFile(join(root, 'components/data/data-grid.md'), 'utf8');
  assert.match(md, /toolbar-tools/, 'MD debe listar toolbar-tools');
  assert.match(md, /false/, 'MD debe explicar false = ocultar tools');
});

test('components/data/LLM.md recuerda no ocultar tools con CSS', async () => {
  const md = await readFile(join(root, 'components/data/LLM.md'), 'utf8');
  assert.match(md, /toolbar-tools/, 'LLM data debe mencionar toolbar-tools');
  assert.match(md, /No ocultar|no ocultar|CSS/i, 'LLM debe prohibir ocultar con CSS');
});
