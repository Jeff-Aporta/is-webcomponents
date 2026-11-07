// tests/attr-observed.test.ts
//
// `customElements.define` congela `observedAttributes` en ese instante. Desde F8 los atributos declarados por campo
// salen de `@prop` (core/iswc-reactive.ts), que los guarda en `Clase[Symbol.metadata]` al evaluar la clase: el getter
// estático `observedAttributes` de `IswcReactive` ya los ve en el `define`, sin cola ni `new Clase()` (Illegal
// constructor antes del define). Los antiguos `@attrBool/@attrStr/@attrEnum/@attrNum` se borraron al migrar
// `iswc-dropdown`, su único usuario. La parte de runtime (herencia, enum, num, bool) la cubre `navegador/core-f8`.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(here));
const leer = (r: string) => readFileSync(join(root, r), 'utf8');

test('IswcReactive suma los @prop a observedAttributes desde los metadatos de la clase', () => {
  const src = leer('src/core/iswc-reactive.ts');
  assert.ok(/static override get observedAttributes\(\)[\s\S]{0,200}definiciones\(this\)/.test(src), 'observedAttributes debe unir definiciones(this)');
  assert.ok(/Symbol\.metadata/.test(src), 'los @prop viven en Symbol.metadata (sin cola global)');
});

test('el molde ya no tiene cola de @attr* (borrados en F8)', () => {
  const attrs = leer('src/core/attrs.ts');
  const molde = leer('src/core/iswc-element.ts');
  for (const n of ['attrBool', 'attrStr', 'attrEnum', 'attrNum', 'materializarAtributos', 'atributosDeclarados']) {
    assert.ok(!new RegExp(`export function ${n}\\b`).test(attrs), `${n} debió borrarse de attrs.ts`);
    assert.ok(!new RegExp(`\\b${n}\\b`).test(molde), `iswc-element.ts no debe usar ${n}`);
  }
});

test('dropdown declara open/placement/distance/skidding con @prop sobre IswcReactive', () => {
  const src = leer('src/components/actions/dropdown.ts');
  assert.ok(/extends withStyleAttrs\(IswcReactive\)/.test(src), 'dropdown extiende withStyleAttrs(IswcReactive)');
  assert.ok(/@prop\(\{ type: 'bool' \}\) accessor open = false/.test(src), 'open es @prop bool');
  assert.ok(/@prop\(\{ enum: PLACEMENTS_AUTO \}\) accessor placement/.test(src), 'placement es @prop enum');
  for (const n of ['distance', 'skidding']) assert.ok(new RegExp(`@prop\\(\\{ type: 'num' \\}\\) accessor ${n} = 0`).test(src), `${n} es @prop num`);
  assert.ok(!/static observed = \[[^\]]*'open'/.test(src), 'open no se lista a mano en static observed');
});

export default lista();
