/**
 * tests/load-plan.test.mjs — anti-redundancia del planificador CDN.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRegistry,
  planLoads,
  commitLoads,
  isTagCovered,
  tagKey,
} from '../src/cdn/load-plan.js';

const catalog = {
  aliases: { charts: 'data-viz' },
  categories: {
    actions: ['button', 'button-group'],
    'data-viz': ['chart'],
  },
  tags: {
    'is-button': { category: 'actions', file: 'button' },
    button: { category: 'actions', file: 'button' },
    'is-button-group': { category: 'actions', file: 'button-group' },
    'button-group': { category: 'actions', file: 'button-group' },
    'is-chart': { category: 'data-viz', file: 'chart' },
    chart: { category: 'data-viz', file: 'chart' },
  },
};

test('categoría expande a tags individuales y cubre hijos del mismo lote', () => {
  const reg = createRegistry();
  const { jobs, skipped } = planLoads(['actions', 'is-button'], reg, catalog);
  assert.equal(jobs.length, 2, 'categoría no puede quedar cubierta antes de empujar jobs');
  assert.ok(jobs.every((j) => j.kind === 'tag'));
  assert.deepEqual(skipped, ['is-button']);
});

test('tras commit de categoría (todos sus tags), load de tag no genera job', () => {
  const reg = createRegistry();
  const first = planLoads(['actions'], reg, catalog);
  commitLoads(first.jobs, reg, catalog);
  assert.ok(isTagCovered(catalog.tags['is-button'], reg));
  const second = planLoads(['is-button', 'is-button-group'], reg, catalog);
  assert.equal(second.jobs.length, 0);
  assert.deepEqual(second.skipped, ['is-button', 'is-button-group']);
});

test('all cubre todo', () => {
  const reg = createRegistry();
  const { jobs } = planLoads(['all'], reg, catalog);
  commitLoads(jobs, reg, catalog);
  assert.ok(reg.all);
  const again = planLoads(['actions', 'is-chart', 'all'], reg, catalog);
  assert.equal(again.jobs.length, 0);
  assert.ok(again.skipped.includes('all'));
});

test('tagKey estable', () => {
  assert.equal(tagKey(catalog.tags['is-button']), 'actions/button');
});
