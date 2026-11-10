// brand-casing.test.ts — la marca del kit se escribe SIEMPRE en minúscula: «iswc».
//
// La marca es `iswc`, como el nombre del paquete (`@jeff-aporta/iswc-base`) y como el
// prefijo de los tags (`iswc-button`). Antes la marca se escribía con la S mayúscula y
// el repo mezclaba grafías; hoy la regla es una sola: minúscula, siempre.
//
// Este guardián NO busca la marca: busca sus VARIANTES (`Iswc`, `ISWC`, `isWc`). En
// un archivo .ts puede aparecer `ISWC` como constante (p. ej. `const ISWC = {...}`), y
// por eso solo mira prosa y estilos (.html, .md, .js, .mjs, .css).
//
// El guardián de identidad (identidad.test.ts) es el que prohibe la marca que el kit ya
// no tiene; este solo vigila que la que tiene se escriba siempre igual.
//
// Uso:  node tests/brand-casing.test.ts

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

/** Grafías que NO son la marca: la correcta es «ISWC» (mayúsculas, como el paquete). */
const VARIANTES = /\b(Iswc|isWc|ISwc|isWC)\b/g;

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
  for (const p of files) {
    let src;
    try { src = await readFile(p, 'utf8'); } catch { continue; }
    for (const m of src.matchAll(VARIANTES)) {
      const line = src.slice(0, m.index).split('\n').length;
      offenders.push(`${relative(root, p)}:${line}`);
    }
  }

  assert.equal(
    offenders.length,
    0,
    'la marca se escribe «iswc», en minúscula. Corregir en:\n  ' +
      offenders.slice(0, 25).join('\n  ') +
      (offenders.length > 25 ? `\n  ...y ${offenders.length - 25} más` : ''),
  );

  // El wordmark no se escribe inline en la app: sale de un solo sitio.
  const galleryApp = await readFile(join(root, 'src/app/app.ts'), 'utf8');
  assert.ok(!/['"`](?:Iswc|isWc|ISwc)['"`]/.test(galleryApp), 'app/app.ts no escribe el wordmark inline');

  console.log(`OK brand-casing — ${files.length} archivos, marca «iswc» siempre igual`);
});

export default lista();
