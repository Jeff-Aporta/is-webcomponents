// tests/brand-casing.test.ts
//
// La marca se escribe **InSoft**: la S va en MAYUSCULA (el logo la pinta en el
// color de marca — "in" + "Soft"). Se escribia "Insoft" en 83 sitios y, peor,
// <iswc-palette-selector> componia el wordmark con `accentLabel: 'soft'`, asi que
// el trigger renderizaba "insoft" en minuscula mientras index.html renderizaba
// "inSoft". Dos grafias distintas para la misma marca en la misma pagina.
//
// OJO — lo que NO se toca:
//   - El identificador de paleta `insoft` (data-palette, value, claves de
//     objeto). Va en minuscula y es una API: renombrarlo rompe el theming.
//   - El dominio `insoft.com.co`.
//
// Uso:  node tests/brand-casing.test.ts

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

test('gobernanza/brand-casing', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = dirname(dirname(here));

  const DIRS = ['previews', 'components', 'scripts', 'styles', 'tests', 'specs'];
  const FILES = ['index.html', 'README.md'];
  const EXT = /\.(html|md|js|mjs|css)$/;

  async function walk(dir, out = []) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { return out; }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist') continue;
        await walk(p, out);
      } else if (EXT.test(e.name)) out.push(p);
    }
    return out;
  }

  const files = [...FILES.map((f) => join(root, f))];
  for (const d of DIRS) await walk(join(root, d), files);

  const offenders = [];
  const SELF = fileURLToPath(import.meta.url);
  for (const p of files) {
    // Este propio test cita la grafía incorrecta para explicarla.
    if (p === SELF) continue;
    let src;
    try { src = await readFile(p, 'utf8'); } catch { continue; }
    // "Insoft" con S minuscula. El identificador `insoft` (todo minusculas) y el
    // dominio no casan con este patron.
    for (const m of src.matchAll(/Insoft/g)) {
      const line = src.slice(0, m.index).split('\n').length;
      offenders.push(`${relative(root, p)}:${line}`);
    }
  }

  assert.equal(
    offenders.length,
    0,
    'La marca es "InSoft" (S mayúscula), no "Insoft". Corregir en:\n  ' +
      offenders.slice(0, 25).join('\n  ') +
      (offenders.length > 25 ? `\n  ...y ${offenders.length - 25} más` : ''),
  );

  // El wordmark compuesto tiene que llevar la S mayúscula en las DOS
  // implementaciones, que hasta ahora divergían.
  //
  // Verificación 1: la paleta 'insoft' declara `accentLabel: 'Soft'`
  // (capitalizada) en el data del componente.
  const catalog = JSON.parse(await readFile(join(root, 'src/styles/palettes.json'), 'utf8'));
  const insoft = catalog.find((p) => p.value === 'insoft');
  assert.equal(insoft?.accentLabel, 'Soft', 'palettes.json debe componer el wordmark con "Soft"');

  // Verificación 2: el wordmark del shell ya no lo pinta app/app.ts a mano
  // (brandAccent/brandLead desaparecieron): lo pinta <iswc-palette-selector>
  // (#brandPalette) desde el data de la paleta. Se afirma que (a) el catálogo
  // que consume el componente (PALETTES de palette-build) trae "Soft", y
  // (b) el componente traslada lead/accentLabel del data al DOM en sus dos
  // caminos (trigger propio vía wordmarkOf y wordmark del slot), sin
  // grafías inline.
  const { PALETTES } = await import('../../src/styles/palette-build.ts');
  assert.equal(
    PALETTES.find((p) => p.value === 'insoft')?.accentLabel,
    'Soft',
    'PALETTES (lo que consume el selector) debe componer el wordmark con "Soft"',
  );
  const selector = await readFile(join(root, 'src/components/feedback/palette-selector.ts'), 'utf8');
  assert.match(selector, /accentLabel:\s*p\.accentLabel/, 'el selector toma accentLabel del catálogo');
  assert.match(selector, /accent\.textContent\s*=\s*current\.accentLabel/, 'el slot pinta el accent desde el data');
  assert.match(selector, /lead\.textContent\s*=\s*current\.lead/, 'el slot pinta el lead desde el data');
  assert.match(selector, /const accent = p\.accentLabel/, 'wordmarkOf compone el accent desde el data');
  const galleryApp = await readFile(join(root, 'src/app/app.ts'), 'utf8');
  assert.ok(!/['"`](?:in)?Soft['"`]/.test(galleryApp), 'app/app.ts no escribe la grafía del wordmark inline');

  // El identificador de paleta sigue en minúsculas: es API, no texto.
  const catalogIds = await readFile(join(root, 'src/styles/palettes.json'), 'utf8');
  assert.match(
    catalogIds,
    /"value": "insoft"/,
    'el identificador de paleta `insoft` debe seguir en minúsculas (data-palette / theming)',
  );

  console.log(`OK brand-casing — ${files.length} archivos, marca "InSoft" consistente`);
});

export default lista();
