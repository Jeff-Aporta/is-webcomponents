/**
 * tests/cdn-loader.test.ts — contrato del ISWebComponentsLoader.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { fillHostTemplate } from '../../../components/_shared/cdn-ref.ts';

const root = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))));
const src = join(root, 'src', 'cdn', 'loader.ts');
const dist = join(root, 'dist', 'cdn', 'core', 'loader.min.js');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');

test('src/cdn/loader.ts expone API pública + mirrors/pin + has/getLoaded', () => {
  const code = readFileSync(src, 'utf8');
  assert.match(code, /export const ISWebComponentsLoader/);
  assert.match(code, /loadCSSBase\s*\(/);
  assert.match(code, /loadCSSPalettesDefault\s*\(/);
  assert.match(code, /async load\s*\(/);
  assert.match(code, /loadPageStyles/);
  assert.match(code, /loadPageModules/);
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
  assert.match(code, /syncHashMemory/);
});

test('dist/cdn/core/loader.min.js y loader.md existen; banner con docs', () => {
  assert.ok(existsSync(dist), 'falta dist/cdn/core/loader.min.js — corre deno task build');
  assert.ok(existsSync(join(root, 'dist', 'cdn', 'core', 'loader.md')), 'falta dist/cdn/core/loader.md');
  const code = readFileSync(dist, 'utf8');
  assert.ok(code.length < 120_000, `loader.min.js demasiado grande (${code.length} B)`);
  assert.match(code, /ISWebComponentsLoader/);
  assert.match(code, /loadCSSBase/);
  assert.match(code, /jsdelivr|Jeff-Aporta\/is-webcomponents/);
  assert.match(code, /"iswc-button"/);
  assert.match(code, /src\/cdn\/loader\.md|loader\.md/);
  const sha = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
  assert.match(code, new RegExp(sha), 'shaDefault del bundle es HEAD');
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
  const btn = readFileSync(join(root, 'dist', 'cdn', 'actions', 'button.min.js'), 'utf8');
  assert.match(btn, /^\/\*!/);
  assert.match(btn, /src\/components\/actions\/button\.md/);
  assert.match(btn, /specs\/componentes\.md/);
  assert.match(btn, /src\/cdn\/loader\.md/);
  assert.match(btn, /is-cdn-install\/SKILL\.md/);
});

test('index.html arranca con loader (sin all.min suelto; CSS dist)', () => {
  assert.match(indexHtml, /loader\.min\.js/);
  assert.match(indexHtml, /<link\s+rel="stylesheet"\s+href="dist\/cdn\/is-base\.min\.css\?h=[0-9a-z]{6}"/);
  assert.doesNotMatch(indexHtml, /L\.load\(['"]all['"]\)/);
  assert.doesNotMatch(indexHtml, /<script type="module" src="dist\/cdn\/all\.min\.js"/);
  // Detalle del orden await/shell → tests/gallery-boot.test.ts (error #43)
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
  assert.match(cdn, /loader\.min\.js/);
  assert.match(cdn, /loadCSSBase|ISWebComponentsLoader/i);
  assert.match(cdn, /pin|SHA|branch/i);
  assert.match(cdn, /mirrors|jsDelivr|Pages/i);
  assert.ok(!existsSync(join(root, 'dist', 'cdn', 'README.txt')), 'README.txt retirado — specs/cdn.md es el índice');
});

test('configure acepta host + v/query (cache-bust)', () => {
  const code = readFileSync(src, 'utf8');
  assert.match(code, /host\?:/);
  assert.match(code, /query\?:/);
  assert.match(code, /\bv\?:/);
  assert.match(code, /githack/);
  assert.match(code, /state\.host/);
  assert.match(code, /state\.query/);
});

test('fallback CDN: jsDelivr → githack → Pages + stickyBase', () => {
  const code = readFileSync(src, 'utf8');
  const ref = readFileSync(
    join(root, 'src', 'components', '_shared', 'cdn-ref.ts'),
    'utf8',
  );
  // Orden canónico en MIRRORS
  const jd = ref.indexOf("id: 'jsdelivr'");
  const gh = ref.indexOf("id: 'githack'");
  const pg = ref.indexOf("id: 'pages'");
  assert.ok(jd >= 0 && gh > jd && pg > gh, 'MIRRORS: jsdelivr → githack → pages');
  assert.match(ref, /raw\.githack\.com/);
  assert.match(ref, /jeff-aporta\.github\.io/);
  // Loader: cadena + sticky para no martillar espejo caído
  assert.match(code, /stickyBase/);
  assert.match(code, /rememberBase/);
  assert.match(code, /orderBases/);
  assert.match(code, /DEFAULT_MIRRORS/);
  assert.match(code, /jsDelivr → githack → Pages/);
});
