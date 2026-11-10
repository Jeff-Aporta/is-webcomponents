// @contexto INDICE.md · tests/gobernanza/README.md
/**
 * tests/cdn-loader.test.ts — contrato del iswcLoader.
 */
import { readFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { fillHostTemplate } from '../../src/core/cdn-ref.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });


const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const src = join(root, 'src', 'cdn', 'loader.ts');
const dist = join(root, 'dist', 'cdn', 'core', 'loader.min.mjs');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');

test('src/cdn/loader.ts expone API pública + mirrors/pin + has/getLoaded', () => {
  const code = readFileSync(src, 'utf8');
  assert.match(code, /export const iswcLoader/);
  // W52: loadCSSBase se elimino; el loader auto-carga is-base.min.css.
  // Palettes: alias iswc-palettes-default vía loadPageStyles (no loadCSSPalettesDefault).
  assert.doesNotMatch(code, /loadCSSPalettesDefault\s*\(/);
  assert.match(code, /iswc-palettes-default/);
  assert.match(code, /async load\s*\(/);
  assert.match(code, /loadPageStyles/);
  assert.match(code, /loadPageModules/);
  assert.match(code, /registerPageStyle/);
  assert.match(code, /\bpin\s*\(/);
  assert.match(code, /\bunpin\s*\(/);
  assert.match(code, /configure\s*\(/);
  assert.match(code, /\bhost\b/);
  assert.match(code, /\bwithQuery\b|searchParams|query\.v/);
  assert.match(code, /\bhas\s*\(/);
  assert.match(code, /getLoaded/);
  assert.match(code, /planLoads/);
  assert.match(code, /cdn-ref\.js/);
  assert.match(code, /__IS_LOADER_CATALOG__/);
  assert.match(code, /__IS_ASSET_HASHES__/);
  assert.match(code, /__IS_BUILD_SHA__/);
  assert.match(code, /hostDefault/);
  assert.match(code, /shaDefault/);
  assert.match(code, /shaFromUrl|shaFromImportUrl|BOOT_HOST|hostFromSha/);
  assert.match(code, /cdnUrlDefault/);
  assert.match(code, /assetUrl/);
  // F4: la memoria del asset-store (IndexedDB) sale del arranque: vive en la capa 2 (`loader-store`), que el núcleo
  // solo pide con import() y en reposo.
  assert.doesNotMatch(code, /from\s+['"][^'"]*asset-store/);
  assert.match(code, /import\('@jeff-aporta\/iswc-base\/cdn\/loader-store\.js'\)/);
  assert.match(readFileSync(join(root, 'src', 'cdn', 'loader-store.ts'), 'utf8'), /syncHashMemory/);
});

test('dist/cdn/core/loader.min.mjs y loader.md existen; banner con docs', () => {
  assert.ok(existsSync(dist), 'falta dist/cdn/core/loader.min.mjs — corre deno task build');
  assert.ok(existsSync(join(root, 'dist', 'cdn', 'core', 'loader.md')), 'falta dist/cdn/core/loader.md');
  // Build único (F3): el loader importa chunks compartidos (cdn-ref, asset-url…). Se lee su cierre completo, el que
  // sale de dist/cdn/deps.json (`core.loader`). El catálogo va DENTRO del loader (F4) y compacto: categorías.
  const cierre: string[] = JSON.parse(readFileSync(join(root, 'dist', 'cdn', 'deps', 'core.json'), 'utf8')).core.loader;
  assert.ok(cierre.includes('core/loader.min.mjs'), 'deps/core.json: core.loader incluye el loader');
  const code = cierre.map((r) => readFileSync(join(root, 'dist', 'cdn', r), 'utf8')).join('\n');
  assert.ok(code.length < 120_000, `loader.min.mjs + su cierre demasiado grande (${code.length} B)`);
  assert.match(code, /iswcLoader/);
  // W52: loadCSSBase se elimino; el loader auto-carga is-base.min.css.
  assert.match(code, /jsdelivr|Jeff-Aporta\/is-webcomponents/);
  assert.match(code, /categories:\{[^}]*actions:\[[^\]]*"button"/);
  assert.match(code, /src\/cdn\/loader\.md|loader\.md/);
  // El build incrusta el SHA del commit sobre el que se compiló; al commitear el propio build, HEAD
  // avanza. Contrato: es un commit real del historial de HEAD (no un SHA inventado ni de otra rama).
  const shas = [...code.matchAll(/[0-9a-f]{40}/g)].map((m) => m[0]);
  const delHistorial = shas.filter((s) => {
    try { execSync(`git merge-base --is-ancestor ${s} HEAD`, { cwd: root, stdio: 'ignore' }); return true; } catch { return false; }
  });
  assert.ok(delHistorial.length > 0, `shaDefault del bundle es un commit del historial de HEAD (SHAs en el bundle: ${shas.join(', ') || 'ninguno'})`);
  assert.match(code, /\{\{cdnUrl\}\}@\{\{sha\}\}\/dist\/cdn/);
});

test('fillHostTemplate sustituye {{sha}} y {{cdnUrl}}', () => {
  const host = fillHostTemplate('{{cdnUrl}}@{{sha}}/dist/cdn', {
    cdnUrl: 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents',
    sha: 'abc',
  });
  assert.equal(host, 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@abc/dist/cdn');
  assert.equal(fillHostTemplate('{{otro}}', {}), '{{otro}}');
});

test('min.js de componente lleva banner de docs MD', () => {
  // Consolidación 2026-09-07: el banner ya no apunta a LLM.md per-carpeta
  // (eliminado); apunta a specs/componentes.md (índice global consolidado).
  const btn = readFileSync(join(root, 'dist', 'cdn', 'actions', 'button.min.mjs'), 'utf8');
  assert.match(btn, /^\/\*!/);
  assert.match(btn, /src\/components\/actions\/button\.md/);
  assert.match(btn, /specs\/componentes\.md/);
  assert.match(btn, /src\/cdn\/loader\.md/);
  assert.match(btn, /is-cdn-install\/SKILL\.md/);
});

test('index.html arranca con loader module (sin all.min; CSS vía loader)', () => {
  assert.match(indexHtml, /loader\.min\.mjs/);
  assert.match(indexHtml, /loadPageModules\s*\(\s*\[[\s\S]*iswc-doc-demo-host/);
  assert.doesNotMatch(indexHtml, /doc-demo-boot\.min\.m?js/);
  assert.match(indexHtml, /<iswc-doc-demo/);
  assert.doesNotMatch(indexHtml, /<link\s+rel="stylesheet"\s+href="dist\/cdn\/is-base\.min\.css/);
  assert.doesNotMatch(indexHtml, /L\.load\(['"]all['"]\)/);
  assert.doesNotMatch(indexHtml, /<script type="module" src="dist\/cdn\/all\.min\.js"/);
});

test('index.html no reimporta preview-component ni icon desde src/ (Pages 404)', () => {
  // preview-component se importa desde dist/cdn; src/ arrastra icon-loader → lucide 404.
  assert.doesNotMatch(
    indexHtml,
    /loadPageModules\([\s\S]*preview-component\.js/,
  );
  assert.doesNotMatch(indexHtml, /src\/components\/layout\/preview-component\.js/);
  assert.doesNotMatch(indexHtml, /src\/components\/media\/icon\.js/);
  assert.doesNotMatch(indexHtml, /src\/components\/_shared\/icon-loader\.js/);
});

test('specs/cdn.md documenta pin/mirrors (consolidación 2026-09-07)', () => {
  // Antes: dist/cdn/LLM.md documentaba el loader + pin + mirrors.
  // Consolidación 2026-09-07: LLM.md eliminado; el contenido vive en
  // specs/cdn.md § "Detalle operativo". El guardián migró.
  const cdn = readFileSync(join(root, 'specs', 'cdn.md'), 'utf8');
  assert.match(cdn, /loader\.min\.mjs/);
  // W52: loadCSSBase se elimino del loader; iswcLoader es el contrato.
  assert.match(cdn, /iswcLoader/);
  assert.match(cdn, /pin|SHA|branch/i);
  assert.match(cdn, /mirrors|jsDelivr|Pages/i);
  assert.ok(!existsSync(join(root, 'dist', 'cdn', 'README.txt')), 'README.txt retirado — specs/cdn.md es el índice');
});

test('configure acepta host + local + v/query (cache-bust)', () => {
  const code = readFileSync(src, 'utf8');
  const schemas = readFileSync(join(root, 'src', 'cdn', 'schemas', 'loader.schemas.ts'), 'utf8');
  // Los campos del shape migran a loader.schemas.ts (Zod); el comportamiento
  // runtime sigue en loader.ts.
  assert.match(schemas, /host:\s*z\.string\(\)\.nullable\(\)/);
  assert.match(schemas, /local:\s*z\.boolean\(\)\.optional\(\)/);
  assert.match(schemas, /query:/);
  assert.match(schemas, /\bv:\s*z\.union/);
  assert.match(code, /githack/);
  assert.match(code, /state\.host/);
  assert.match(code, /state\.query/);
  assert.match(code, /mirrorsExplicit/);
  assert.match(code, /resolveHostInput/);
});

// WHAT (D7): importOnce es dedupe + import() y nada más. El fetch previo a Cache Storage pedía cada
// `.min.js` dos veces en frío (105 fetch extra en la portada de Avatar) y serializaba un salto de red
// por nivel; la caché HTTP (jsDelivr immutable / `?v=`) ya cubre la revisita.
test('importOnce: solo import() deduplicado, sin fetch ni Cache Storage de módulos', () => {
  const code = readFileSync(src, 'utf8');
  const cuerpo = code.match(/function importOnce\([\s\S]*?\n\}/)?.[0] ?? '';
  assert.ok(cuerpo, 'falta importOnce');
  assert.match(cuerpo, /jsDone\.get\(href\)/);
  assert.match(cuerpo, /import\(/);
  assert.doesNotMatch(cuerpo, /\bfetch\(|\bcaches\b/);
  assert.doesNotMatch(code, /is-wc-modules-v1/);
});

test('fallback CDN: jsDelivr → githack → Pages + stickyBase', async () => {
  const code = readFileSync(src, 'utf8');
  // Orden canónico en MIRRORS (WHAT: lo que devuelve el módulo; la URL de
  // Pages ya no va literal en el fuente, se deriva de GH_REPO).
  const { MIRRORS, fallbackBases } = await import('../../src/core/cdn-ref.ts');
  assert.deepEqual(MIRRORS.map((m) => m.id), ['jsdelivr', 'githack', 'pages'], 'MIRRORS: jsdelivr → githack → pages');
  const [jd, gh, pg] = fallbackBases('abc123');
  assert.match(jd, /^https:\/\/cdn\.jsdelivr\.net\/gh\/Jeff-Aporta\/is-webcomponents@abc123\//);
  assert.match(gh, /^https:\/\/raw\.githack\.com\/Jeff-Aporta\/is-webcomponents\/abc123\//);
  assert.match(pg, /^https:\/\/jeff-aporta\.github\.io\/is-webcomponents\//);
  // F4: la cadena y el sticky viven en la capa 2 (`loader-mirrors`); el núcleo conserva la lista por defecto
  // (`L.mirrors` es síncrono) y solo pide la capa si su raíz falla.
  assert.match(code, /DEFAULT_MIRRORS/);
  assert.match(code, /import\('@jeff-aporta\/iswc-base\/cdn\/loader-mirrors\.js'\)/);
  const espejos = readFileSync(join(root, 'src', 'cdn', 'loader-mirrors.ts'), 'utf8');
  assert.match(espejos, /let stickyBase/);
  assert.match(espejos, /export function rememberBase/);
  assert.match(espejos, /export function orderBases/);
  assert.match(espejos, /jsDelivr → githack → Pages/);
});

// WHAT (D2, F4): la extensión declara el tipo. `load(href)` fuera del catálogo: `.js` → `<script src>` clásico (con
// promesa de carga), `.mjs` → `import()`. `registerPageModule` infiere igual; `classic:`/`module:` fuerzan el tipo.
test('F4 inferencia por extensión: .js → <script> clásico, .mjs → import(), overrides classic:/module:', async () => {
  const g = globalThis as Record<string, unknown>;
  g.__IS_LOADER_CATALOG__ ??= { tags: {}, categories: {}, aliases: {} };
  g.__IS_ASSET_HASHES__ ??= {};
  g.__IS_BUILD_SHA__ ??= 'test';
  type Nodo = { tagName: string; src?: string; type?: string; dataset: Record<string, string>; onload?: () => void; setAttribute: (k: string, v: string) => void; remove: () => void };
  const creados: Nodo[] = [];
  const crear = (tag: string): Nodo => ({ tagName: tag.toUpperCase(), dataset: {}, setAttribute() {}, remove() {} });
  g.document = {
    head: { appendChild(n: Nodo) { creados.push(n); setTimeout(() => n.onload?.(), 0); return n; } },
    createElement: crear,
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  const dir = mkdtempSync(join(tmpdir(), 'iswc-f4-ext-'));
  const mjs = join(dir, 'modulo.mjs');
  writeFileSync(mjs, 'globalThis.__f4Mjs = (globalThis.__f4Mjs ?? 0) + 1;\n');
  try {
    const { iswcLoader: L } = await import('../../src/cdn/loader.ts');
    const clasico = 'https://iswc-f4.test/a/boton.classic.js';
    const r = await L.load(clasico, pathToFileURL(mjs).href);
    assert.equal(r.loaded.length, 2, 'los dos hrefs cuentan como cargados');
    const scripts = creados.filter((n) => n.tagName === 'SCRIPT');
    assert.equal(scripts.length, 1, 'solo el .js va por <script>');
    assert.equal(scripts[0]!.src, clasico);
    assert.notEqual(scripts[0]!.type, 'module', '<script> clásico, sin type="module"');
    assert.equal(g.__f4Mjs, 1, 'el .mjs se importó (una vez)');
    await L.load(clasico);
    assert.equal(creados.filter((n) => n.tagName === 'SCRIPT').length, 1, 'el clásico no se repite');
    const tipo = (alias: string, href: string) => {
      L.registerPageModule(alias, href);
      return L.getPageModules()[alias]!.type;
    };
    assert.equal(tipo('f4-js', 'x/y.min.js'), 'classic');
    assert.equal(tipo('f4-mjs', 'x/y.min.mjs'), 'module');
    assert.equal(tipo('f4-sin-ext', 'https://x.test/modulo'), 'module');
    assert.equal(tipo('f4-module', 'module:x/y.js'), 'module');
    assert.equal(tipo('f4-classic', 'classic:x/y.mjs'), 'classic');
  } finally {
    delete g.document;
  }
});

export default lista();
