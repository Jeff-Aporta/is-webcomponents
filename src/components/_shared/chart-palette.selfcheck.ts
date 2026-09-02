// apps/AppWebcomponents/components/_shared/chart-palette.selfcheck.mjs
import assert from 'node:assert';
import { resolvePaletteKey, resolveMode } from './chart-palette.js';

assert.strictEqual(resolvePaletteKey('contapyme'), 'contapyme');
assert.strictEqual(resolvePaletteKey('nonexistent'), 'contapyme');
assert.strictEqual(resolvePaletteKey(null), 'contapyme');
assert.strictEqual(resolveMode(true), 'light');
assert.strictEqual(resolveMode(false), 'dark');

console.log('chart-palette self-check: PASS');
