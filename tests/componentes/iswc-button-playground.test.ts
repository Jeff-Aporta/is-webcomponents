/**
 * iswc-button-playground.test.ts — el playground debe tener behavior cableado.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });


const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('catalog registra behavior de iswc-button', async () => {
  // catalog.ts es AUTO-GENERADO: tag → { json, behavior?, category }. Se
  // importa (WHAT) en vez de buscar texto: lo que importa es la entrada viva.
  const { default: catalog } = await import(new URL('../../src/previews/catalog.ts', import.meta.url).href);
  const entry = catalog['iswc-button'];
  assert.ok(entry, 'catalog.ts debe registrar iswc-button');
  assert.equal(entry.category, 'actions');
  assert.match(entry.json, /\/previews\/actions\/button\.json$/);
  assert.match(entry.behavior ?? '', /\/previews\/actions\/button\.preview(?:\.min)?\.js$/,
    'iswc-button debe tener behavior (button.preview) registrado');
  assert.ok(existsSync(join(root, 'src/components/actions/utils/button.preview.ts')));
});

test('playground usa color/variant (no appearance legacy) y apunta a un iswc-button vivo', () => {
  // El playground ya no es markup a mano (#pgColor/#pgVariant/#pgOut): es el
  // <iswc-playground> único que render.ts monta sobre un demo con
  // `target` + `controls[]`.
  const json = JSON.parse(read('src/components/actions/button.json'));
  assert.equal(json.hasBehavior, true);
  const asText = (h) => (Array.isArray(h) ? h.join('\n') : h || '');
  const block = json.sections.flatMap((s) => s.blocks ?? [])
    .find((b) => b.kind === 'demo' && b.target && Array.isArray(b.controls) && b.controls.length);
  assert.ok(block, 'button.json debe tener un demo con target + controls (playground)');
  const html = asText(block.html);
  const id = /^#([\w-]+)$/.exec(block.target)?.[1];
  assert.ok(id, `target debe ser un #id (es ${block.target})`);
  assert.match(html, new RegExp(`<iswc-button\\b[^>]*\\bid="${id}"`), `el target ${block.target} debe ser un <iswc-button> del demo`);

  const props = block.controls.map((c) => c.prop);
  assert.ok(props.includes('attr:color'), 'el playground debe exponer color');
  assert.ok(props.includes('attr:variant'), 'el playground debe exponer variant');
  assert.ok(!props.some((p) => /appearance/.test(p)), 'nada de appearance legacy');

  // Las opciones de variant son exactamente valores que iswc-button acepta
  // (JSDoc de button.ts), y color no ofrece apariencias como si fueran tonos.
  const src = read('src/components/actions/button.ts');
  const doc = (attr) => new Set(
    (src.match(new RegExp(`^\\s*\\*\\s+${attr}\\s+([^\\n(]+)`, 'm'))?.[1] ?? '')
      .split('|').map((v) => v.trim()).filter(Boolean),
  );
  const variants = doc('variant');
  const colors = doc('color');
  const opts = (prop) => (block.controls.find((c) => c.prop === prop)?.options ?? [])
    .map((o) => (typeof o === 'string' ? o : o.value));
  for (const v of opts('attr:variant')) assert.ok(variants.has(v), `variant "${v}" no es un valor de iswc-button`);
  for (const c of opts('attr:color')) {
    assert.ok(colors.has(c) || /^#[\da-f]{3,8}$/i.test(c), `color "${c}" no es semántico ni CSS`);
  }
});

test('behavior aplica color/variant/pill al #pgBtn', () => {
  const src = read('src/components/actions/utils/button.preview.ts');
  assert.match(src, /setAttribute\(\s*['"]color['"]/);
  assert.match(src, /setAttribute\(\s*['"]variant['"]/);
  assert.match(src, /toggleAttribute\(\s*['"]pill['"]/);
  assert.match(src, /wirePlayground/);
  assert.match(src, /setAttribute\(\s*['"]slot['"]/);
  assert.match(src, /makeIcon\([^,]+,\s*['"]start['"]\)/);
});

export default lista();
