// tour-deploy-guardian.test.ts — Guardian del tour pre/post-push.
// Verifica que las listas críticas del tour-deploy.mjs NO queden
// desincronizadas con bundle-scripts.mjs (causa más común de 404s en
// deploy).
//
// Patrón: el tour tiene dos `const`s en la cabecera (SCRIPTS_BUNDLES,
// PAGES_BUNDLES) que tienen que coincidir EXACTAMENTE con `scripts` y
// `pages` en bundle-scripts.mjs. Si añades un script o page nuevo en
// cualquier lugar, este guardian falla con un mensaje claro.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const __filename = new URL(import.meta.url).pathname.replace(/^\//, '');
const RAIZ = join(__filename, '..', '..', '..', '..', '..');

function extractArrayLiteral(src: string, name: string): string[] {
  // Busca `const NAME = [\n  'a',\n  'b',\n]` y captura cada string entre comillas.
  const re = new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`);
  const match = src.match(re);
  if (!match) throw new Error(`const ${name} = [...] no encontrado`);
  const inner = match[1];
  const items: string[] = [];
  for (const m of inner.matchAll(/['"`]([a-z0-9-]+)['"`]/g)) {
    items.push(m[1]);
  }
  return items;
}

test('guard: tour-deploy CRITICAL_PATHS sincronizado con bundle-scripts.mjs', () => {
  const tourSrc = readFileSync(join(RAIZ, 'scripts', 'tour-deploy.mjs'), 'utf8');
  const bundleSrc = readFileSync(join(RAIZ, 'scripts', 'bundle-scripts.mjs'), 'utf8');

  // 1. SCRIPTS_BUNDLES (tour) == scripts (bundle)
  const tourScripts = extractArrayLiteral(tourSrc, 'SCRIPTS_BUNDLES');
  const bundleScripts = extractArrayLiteral(bundleSrc, 'scripts');
  assert.deepEqual(
    tourScripts.sort(),
    bundleScripts.sort(),
    `SCRIPTS_BUNDLES en tour-deploy.mjs (${tourScripts.join(',')}) no coincide con 'scripts' en bundle-scripts.mjs (${bundleScripts.join(',')})`,
  );

  // 2. PAGES_BUNDLES (tour) == pages (bundle)
  const tourPages = extractArrayLiteral(tourSrc, 'PAGES_BUNDLES');
  const bundlePages = extractArrayLiteral(bundleSrc, 'pages');
  assert.deepEqual(
    tourPages.sort(),
    bundlePages.sort(),
    `PAGES_BUNDLES en tour-deploy.mjs (${tourPages.join(',')}) no coincide con 'pages' en bundle-scripts.mjs (${bundlePages.join(',')})`,
  );

  // 3. CRITICAL_PATHS incluye todos los scripts + pages (literalmente
// O mediante `.map()`/`.flatMap()` sobre SCRIPTS_BUNDLES/PAGES_BUNDLES).
  // Acepta generators porque el tour tiende a escribirlos como
// `...SCRIPTS_BUNDLES.map(s => `dist/scripts/${s}.min.js`)`.
  const criticalHasLiteral: string[] = [];
  for (const m of tourSrc.matchAll(/['"`]([a-z0-9./_-]+\.[a-z]+)['"`]/g)) {
    criticalHasLiteral.push(m[1]);
  }
  const criticalUsesMaps =
    tourSrc.includes('SCRIPTS_BUNDLES.map') &&
    tourSrc.includes('PAGES_BUNDLES') &&
    (tourSrc.includes('.map(') || tourSrc.includes('.flatMap('));
  assert.ok(
    criticalHasLiteral.length > 0 || criticalUsesMaps,
    'CRITICAL_PATHS no encontrado en tour-deploy.mjs',
  );
  for (const s of tourScripts) {
    const expected = `dist/scripts/${s}.min.js`;
    const ok = criticalHasLiteral.includes(expected) || criticalUsesMaps;
    assert.ok(ok, `CRITICAL_PATHS debería incluir '${expected}'`);
  }
  for (const p of tourPages) {
    for (const suffix of ['.min.js', '.json']) {
      const expected = `dist/pages/${p}${suffix}`;
      const ok = criticalHasLiteral.includes(expected) || criticalUsesMaps;
      assert.ok(ok, `CRITICAL_PATHS debería incluir '${expected}'`);
    }
  }
});

test('guard: bundle-scripts.mjs tiene al menos 1 script + 3 pages declarados', () => {
  const bundleSrc = readFileSync(join(RAIZ, 'scripts', 'bundle-scripts.mjs'), 'utf8');
  const scripts = extractArrayLiteral(bundleSrc, 'scripts');
  const pages = extractArrayLiteral(bundleSrc, 'pages');
  assert.ok(scripts.length >= 1, `Esperaba >=1 script, hay ${scripts.length}`);
  assert.ok(pages.length >= 3, `Esperaba >=3 pages, hay ${pages.length}`);
});

test('guard: bundle-scripts.mjs contiene sección de previews', () => {
  const bundleSrc = readFileSync(join(RAIZ, 'scripts', 'bundle-scripts.mjs'), 'utf8');
  assert.ok(bundleSrc.includes('allPreviews'), 'bundle-scripts.mjs debería iterar allPreviews');
  assert.ok(bundleSrc.includes('previews/'), 'bundle-scripts.mjs debería escribir a dist/previews/');
  assert.ok(bundleSrc.includes('preview.min.js'), 'bundle-scripts.mjs debería bundlear *.preview.min.js');
});

test('guard: catalog.ts referencia dist/previews/ para behaviors y JSONs', () => {
  const catalogSrc = readFileSync(join(RAIZ, 'src', 'previews', 'catalog.ts'), 'utf8');
  // Tras los bugs de 404, el catalog debe apuntar a dist/previews/.
  const oldPattern = (catalogSrc.match(/"\.{1,2}\/components\/[^"]+"/g) ?? []).length;
  assert.equal(
    oldPattern,
    0,
    `catalog.ts aún tiene paths source '../components/...': ${oldPattern} ocurrencias. Cámbialos a '../../dist/previews/...'`,
  );
  const newPattern = (catalogSrc.match(/dist\/previews\//g) ?? []).length;
  assert.ok(newPattern > 50, `catalog.ts debería tener >50 paths 'dist/previews/', tiene ${newPattern}`);
});
