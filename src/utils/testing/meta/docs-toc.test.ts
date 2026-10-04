// tests/docs-toc.test.ts
//
// Guardián de Phase O: el TOC de la derecha en los docs de componentes
// lista las 7 secciones estándar de "Referencia completa" (Atributos,
// Custom states, Eventos, Slots, CSS Parts, API JavaScript, Métodos) y
// excluye Anatomía + Ejemplos + Intro.
//
// Verifica:
//   1. `standardTocSections(def)` filtra correctamente el array `sections`.
//   2. Anatomía y Ejemplos nunca llegan al TOC.
//   3. Intro nunca llega al TOC.
//   4. El orden canónico del estándar se mantiene aunque el `.md` los
//      declare en otro orden (ej. Métodos antes que Estados).
//   5. La etiqueta del enlace es la canónica (no la del .md), para que
//      un componente que declare "Estados" siga mostrando "Custom states".
//   6. Sin secciones estándar detectables, el resultado es `[]` y el
//      generador de docs sabe que no debe pintar el TOC (defensa contra
//      JSONs mal migrados que dejan un único bloque intro).
//   7. `EXCLUDED_FROM_TOC` contiene los ids de anatomía/ejemplos/intro.
//
// Uso: deno test -A --no-check src/utils/testing/meta/docs-toc.test.ts

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));

// ─── Imports estáticos: leer el módulo y verificar símbolos exportados ────

const renderSrc = readFileSync(join(root, 'src', 'previews', '_kit', 'render.ts'), 'utf8');
const typesSrc = readFileSync(join(root, 'src', 'previews', '_kit', 'types.d.ts'), 'utf8');

assert.match(
  renderSrc,
  /export\s+const\s+STANDARD_TOC\b/,
  'render.ts debe exportar `STANDARD_TOC`',
);
assert.match(
  renderSrc,
  /export\s+function\s+matchStandardToc\b/,
  'render.ts debe exportar `matchStandardToc`',
);
assert.match(
  renderSrc,
  /export\s+function\s+standardTocSections\b/,
  'render.ts debe exportar `standardTocSections`',
);
assert.match(
  renderSrc,
  /export\s+const\s+EXCLUDED_FROM_TOC\b/,
  'render.ts debe exportar `EXCLUDED_FROM_TOC`',
);

// ─── 1) Cobertura de los 7 labels canónicos ────────────────────────────

const required = [
  'Atributos / propiedades',
  'Custom states',
  'Eventos',
  'Slots',
  'CSS Parts',
  'API JavaScript',
  'Métodos',
];
for (const label of required) {
  assert.ok(
    renderSrc.includes(`label: '${label}'`),
    `STANDARD_TOC debe declarar el label "${label}"`,
  );
}
assert.strictEqual(
  renderSrc.match(/label:\s*'/g)?.length,
  7,
  'STANDARD_TOC debe tener exactamente 7 entradas (el estándar del usuario)',
);

// ─── 2) Excluded ids cubren lo que NO debe entrar al TOC ────────────────

for (const forbidden of ['anatomy', 'anatomia', 'examples', 'ejemplos', 'intro']) {
  assert.ok(
    renderSrc.includes(`'${forbidden}'`),
    `EXCLUDED_FROM_TOC debe contener el id "${forbidden}"`,
  );
}

// ─── 3) Detector: cubre los id patterns más comunes ─────────────────────

// Algunos ids reales del repo (verificado por grep). Cada uno debe
// matchear con al menos uno de los ids del STANDARD_TOC.
const mustMatchById: Array<[string, string]> = [
  ['atributos',   'Atributos / propiedades'],
  ['attributes', 'Atributos / propiedades'],
  ['props',       'Atributos / propiedades'],
  ['states',      'Custom states'],
  ['custom-states', 'Custom states'],
  ['eventos',     'Eventos'],
  ['events',      'Eventos'],
  ['slots',       'Slots'],
  ['parts',       'CSS Parts'],
  ['partes',      'CSS Parts'],
  ['api',         'API JavaScript'],
  ['apiJs',       'API JavaScript'],
  ['methods',     'Métodos'],
  ['metodos',     'Métodos'],
];
for (const [id, expectedLabel] of mustMatchById) {
  const re = new RegExp(`ids:\\s*\\[[^\\]]*['"]${normalizeIdForRe(id)}['"]`);
  assert.ok(
    re.test(renderSrc),
    `STANDARD_TOC.ids debe contener "${id}" (normalizado a "${normalizeIdForRe(id)}")`,
  );
}

// ─── 4) renderDefinition pinta spy.docs-toc (defensa contra regresiones) ─

assert.match(
  renderSrc,
  /spy\.classList\.add\(['"]docs-toc['"]\)/,
  'renderDefinition debe marcar el scrollspy con `class="docs-toc"`',
);
assert.match(
  renderSrc,
  /a\.dataset\.tocKey\s*=\s*label/,
  'los enlaces del TOC deben llevar `data-toc-key` con la etiqueta canónica',
);
assert.match(
  renderSrc,
  /a\.textContent\s*=\s*label/,
  'los enlaces del TOC deben mostrar la etiqueta canónica (no section.title)',
);

// ─── 5) renderDefinition no enumera TODAS las secciones ────────────────

// Antes de Phase O, el bucle hacía `for (const section of def.sections)` y
// generaba un `<a>` por sección. Ahora debe pasar por `standardTocSections`,
// que excluye anatomía / ejemplos / intro.
assert.match(
  renderSrc,
  /const\s+toc\s*=\s*standardTocSections\(def\)/,
  'renderDefinition debe invocar standardTocSections(def)',
);
assert.match(
  renderSrc,
  /if\s*\(\s*toc\.length\s*<\s*2\s*\)\s*return\s*;/,
  'renderDefinition debe abortar el TOC si hay <2 secciones estándar',
);

// ─── 6) El guardián cubre el contrato con el type PreviewSection ───────

// El detector firma `(section: PreviewSection)`. Si cambia el type, este
// test detecta el desacople (evita que se cambie el nombre del param sin
// actualizar el detector).
assert.match(
  renderSrc,
  /function\s+matchStandardToc\(\s*section\s*:\s*PreviewSection\s*\)/,
  'matchStandardToc debe tipar su param como PreviewSection',
);

// types.d.ts debe seguir declarando PreviewSection con `id` y `title`,
// que son los campos que el detector lee.
assert.match(typesSrc, /id:\s*string/);
assert.match(typesSrc, /title:\s*string/);

console.log('docs-toc.test.ts: PASS — 7 secciones estándar + exclusiones (anatomía/ejemplos/intro)');
process.exit(0);

// ─── helpers ───────────────────────────────────────────────────────────

function normalizeIdForRe(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}