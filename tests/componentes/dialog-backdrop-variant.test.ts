// tests/dialog-backdrop-variant.test.ts
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCssCompilado } from './_css-compilado.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const js = readFileSync(join(ROOT, 'src/components/layout/dialog.ts'), 'utf8');
// CSS compilado, normalizado: Sass emite [backdrop-variant=basic] sin comillas.
const css = leerCssCompilado(ROOT, 'src/components/layout/dialog.css');

test('iswc-dialog observa backdrop-variant', () => {
  assert.match(js, /backdrop-variant/);
  assert.match(js, /backdropVariant/);
  assert.match(js, /fromJSON/);
  assert.match(js, /toJSON/);
});

test('default none: backdrop transparente sin blur', () => {
  assert.match(css, /--iswc-dialog-backdrop-color:\s*transparent/);
  assert.match(css, /--iswc-dialog-backdrop-blur:\s*0px/);
});

test('basic: oscuridad + blur', () => {
  assert.match(css, /backdrop-variant=["']basic["']/);
  assert.match(css, /backdrop-filter:\s*blur/);
  assert.match(css, /rgba\(0,\s*0,\s*0,\s*0\.55\)/);
});

export default lista();
