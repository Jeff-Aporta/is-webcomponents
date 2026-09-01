// tests/dialog-backdrop-variant.test.ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const js = readFileSync(join(ROOT, 'src/components/layout/dialog.ts'), 'utf8');
const css = readFileSync(join(ROOT, 'src/components/layout/dialog.css'), 'utf8');

test('is-dialog observa backdrop-variant', () => {
  assert.match(js, /backdrop-variant/);
  assert.match(js, /backdropVariant/);
  assert.match(js, /fromJSON/);
  assert.match(js, /toJSON/);
});

test('default none: backdrop transparente sin blur', () => {
  assert.match(css, /--is-dialog-backdrop-color:\s*transparent/);
  assert.match(css, /--is-dialog-backdrop-blur:\s*0px/);
});

test('basic: oscuridad + blur', () => {
  assert.match(css, /backdrop-variant=["']basic["']/);
  assert.match(css, /backdrop-filter:\s*blur/);
  assert.match(css, /rgba\(0,\s*0,\s*0,\s*0\.55\)/);
});
