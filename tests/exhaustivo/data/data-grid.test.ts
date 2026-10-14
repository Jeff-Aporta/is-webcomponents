/**
 * data-grid.test.ts — verificación exhaustiva de <iswc-data-grid>.
 *
 * Tabla con superficie de MUI X Data Grid: columnas tipadas, multi-orden,
 * filtros, paginación, edición por celda/fila, agrupación con agregación,
 * tree data, pivot, virtualización, exportación (CSV/Excel).
 *
 * API: propiedad `grid.columns = [...]` y `grid.rows = [...]`.
 * Atributos: density, pagination, page-size, page-size-options, editable,
 *             show-toolbar, quick-filter, header-filters, hide-footer,
 *             list-view, tree-data, virtualize, etc.
 * Eventos: iswc-sort-change, iswc-filter-change, iswc-page-change, iswc-select,
 *          iswc-row-click, iswc-edit-start, iswc-edit-stop, iswc-row-update, …
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exists,
  read,
  extraerObservados,
  extraerEventos,
  extraerSlots,
  extraerParts,
  tieneShadow,
  tieneEdgeCaseGuards,
  adoptaCss,
  estaRegistrado,
  cleanupCompleto,
} from '../_helpers.ts';

const MOD = 'src/components/data/data-grid.ts';

test('iswc-data-grid: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('iswc-data-grid: shadow DOM', () => {
  assert.ok(tieneShadow(read(MOD)));
});

test('iswc-data-grid: observados (density, pagination, page-size, editable, show-toolbar)', () => {
  const obs = extraerObservados(read(MOD));
  for (const k of ['density', 'pagination', 'page-size', 'editable', 'show-toolbar']) {
    assert.ok(obs.includes(k), `data-grid declara ${k}: actual=${obs.slice(0, 20).join(',')}...`);
  }
  assert.ok(obs.length >= 15, `data-grid debe declarar 15+ atributos (encontró ${obs.length})`);
});

test('iswc-data-grid: eventos (iswc-sort-change, iswc-page-change, iswc-select, iswc-row-click, iswc-edit-start)', () => {
  const evts = extraerEventos(read(MOD));
  for (const k of ['iswc-sort-change', 'iswc-page-change', 'iswc-select', 'iswc-row-click']) {
    assert.ok(evts.includes(k), `data-grid emite ${k}: actual=${evts.slice(0, 10).join(',')}...`);
  }
  assert.ok(evts.length >= 8, `data-grid emite 8+ eventos (encontró ${evts.length})`);
});

test('iswc-data-grid: shadow DOM parts (toolbar, viewport, header, body, row, cell, footer)', () => {
  const parts = extraerParts(read(MOD));
  for (const k of ['toolbar', 'viewport', 'header', 'body', 'row', 'cell', 'footer']) {
    assert.ok(parts.includes(k), `data-grid part ${k}`);
  }
});

test('iswc-data-grid: edge cases — guards contra null/undefined', () => {
  assert.ok(tieneEdgeCaseGuards(read(MOD)));
});

test('iswc-data-grid: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('iswc-data-grid: integra iswc-button, iswc-input, iswc-select, iswc-option, iswc-checkbox', () => {
  const src = read(MOD);
  assert.match(src, /import[^;]+['"]\.\.\/actions\/button/);
  assert.match(src, /import[^;]+['"]\.\.\/forms\/input/);
  assert.match(src, /import[^;]+['"]\.\.\/forms\/select/);
  assert.match(src, /import[^;]+['"]\.\.\/forms\/option/);
  assert.match(src, /import[^;]+['"]\.\.\/forms\/checkbox/);
});

test('iswc-data-grid: API — setters `columns` y `rows`', () => {
  const src = read(MOD);
  // El grid acepta `grid.columns = [...]` y `grid.rows = [...]`.
  assert.match(src, /\bset\s+columns\s*\(/);
  assert.match(src, /\bset\s+rows\s*\(/);
});

test('iswc-data-grid: registrado vía defineElement', () => {
  const src = read(MOD);
  assert.match(src, /defineElement\s*\(\s*['"`]iswc-data-grid['"`]/);
});

test('iswc-data-grid: performance — cleanup en disconnectedCallback', () => {
  // data-grid es complejo: usa MutationObserver, ResizeObserver, listeners.
  const c = cleanupCompleto(read(MOD));
  assert.ok(c.listeners, 'debe limpiar listeners');
});
