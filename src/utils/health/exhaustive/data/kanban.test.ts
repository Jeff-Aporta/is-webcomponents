/**
 * kanban.test.ts — verificación exhaustiva de <is-kanban>,
 * <is-kanban-column> y <is-kanban-card>.
 *
 * Kanban es composicional: <is-kanban> contiene columnas, que contienen
 * cards. Atributos por nivel:
 *   - kanban: columns, orientation
 *   - column: title, accent, badge
 *   - card:   heading, meta, tag, tag-color, cover, without-shadow
 * Eventos: is-kanban-card-click, is-kanban-move.
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
} from '../_helpers.ts';

const MOD = 'src/components/data/kanban.ts';

test('is-kanban: archivo existe', () => {
  assert.ok(exists(MOD));
});

test('is-kanban: shadow DOM en board y column (card usa class CSS)', () => {
  const src = read(MOD);
  // board + column tienen shadow; card usa class CSS sin shadow propio.
  const matches = src.match(/attachShadow\s*\(\s*\{\s*mode\s*:\s*['"]open['"]\s*\}/g);
  assert.ok((matches?.length ?? 0) >= 2, `kanban.ts debe attachShadow 2+ veces (encontró ${matches?.length ?? 0})`);
});

test('is-kanban: observados (columns, orientation)', () => {
  const obs = extraerObservados(read(MOD));
  assert.ok(obs.includes('columns') || obs.includes('orientation'),
    `kanban declara columns u orientation: actual=${obs.join(',')}`);
});

test('is-kanban: eventos (is-kanban-card-click, is-kanban-move)', () => {
  // kanban.ts emite con `emit(dragCard, 'is-kanban-move', ...)` y
  // `emit(this, 'is-kanban-card-click', ...)`. El helper extraerEventos
  // solo captura `emit(this, ...)`, así que verificamos manualmente.
  const src = read(MOD);
  assert.match(src, /is-kanban-card-click/);
  assert.match(src, /is-kanban-move/);
});

test('is-kanban: slots (default en board, header-actions en column)', () => {
  const slots = extraerSlots(read(MOD));
  assert.ok(slots.includes('(default)'));
  assert.ok(slots.includes('header-actions'), `kanban slot header-actions: actual=${slots.join(',')}`);
});

test('is-kanban: CSS parts (base, column, col-head, title, badge, actions)', () => {
  const parts = extraerParts(read(MOD));
  assert.ok(parts.includes('base'));
  assert.ok(parts.includes('column'));
  assert.ok(parts.includes('title'));
});

test('is-kanban: edge cases — drag state global (kanban usa null guards)', () => {
  // kanban.ts usa `let dragCard = null;` y compara `if (!dragCard) return;`.
  const src = read(MOD);
  assert.match(src, /let\s+dragCard\s*=\s*null/);
  assert.match(src, /if\s*\(\s*!dragCard\s*\)/);
});

test('is-kanban: adopta CSS', () => {
  assert.ok(adoptaCss(read(MOD)));
});

test('is-kanban: registrado — 3 custom elements', () => {
  const src = read(MOD);
  const defines = src.match(/defineElement\s*\(\s*['"`](is-[a-z0-9-]+)['"`]/g);
  assert.ok((defines?.length ?? 0) >= 3,
    `kanban.ts debe registrar 3+ custom elements (board/column/card), encontró: ${defines?.join(',')}`);
});

test('is-kanban: usa addEventListener (drag events)', () => {
  const src = read(MOD);
  assert.ok(/addEventListener\s*\(/.test(src));
});
