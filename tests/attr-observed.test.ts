// tests/attr-observed.test.ts
//
// Los @attr* registran el nombre en un WeakMap vía addInitializer (al
// construir). customElements.define congela observedAttributes en ese
// instante. Sin materializar antes del define, open/placement/… nunca
// disparan attributeChangedCallback (is-dropdown marcaba open sin abrir).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

test('defineElement materializa @attr* antes de customElements.define', () => {
  const src = readFileSync(join(root, 'src/core/element.ts'), 'utf8');
  assert.ok(
    /materializarAtributos\(ctor\)/.test(src),
    'defineElement debe llamar materializarAtributos(ctor) antes del define',
  );
  const mat = src.indexOf('materializarAtributos(ctor)');
  const def = src.indexOf('customElements.define(tag, ctor)');
  assert.ok(mat >= 0 && def > mat, 'materializarAtributos debe ir antes de customElements.define');
});

test('attrs.ts documenta y exporta materializarAtributos', () => {
  const src = readFileSync(join(root, 'src/core/attrs.ts'), 'utf8');
  assert.ok(
    /export function materializarAtributos/.test(src),
    'debe existir materializarAtributos exportada',
  );
  assert.ok(
    /new Clase\(\)/.test(src),
    'materializarAtributos debe construir una instancia throwaway',
  );
});

test('dropdown observa open vía atributosDeclarados (no lista hardcodeada rota)', () => {
  const src = readFileSync(join(root, 'src/components/actions/dropdown.ts'), 'utf8');
  assert.ok(/atributosDeclarados\(this\)/.test(src), 'dropdown usa atributosDeclarados');
  assert.ok(/@attrBool\s+accessor open/.test(src), 'open es @attrBool');
});
