/**
 * url-nav.test.ts — memoria de tabs solo dentro de ?s= (b64url JSON).
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });


const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const navHref = pathToFileURL(join(raiz, 'src/components/navigation/utils/url-nav.ts')).href;

test('url-nav.ts solo toca ?s= (sin storage ni params sueltos)', async () => {
  const raw = await readFile(join(raiz, 'src/components/navigation/utils/url-nav.ts'), 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.match(src, /export function readUrlNav/);
  assert.match(src, /export function writeUrlNav/);
  assert.match(src, /STATE_PARAM\s*=\s*['"]s['"]/);
  assert.match(src, /b64urlEncode|b64urlDecode/);
  assert.match(src, /replaceState/);
  assert.doesNotMatch(src, /localStorage|sessionStorage/);
  // No debe setear el url-key como query param suelto.
  assert.doesNotMatch(src, /searchParams\.set\(\s*k\s*,/);
  assert.doesNotMatch(src, /searchParams\.set\(\s*key\s*,/);
});

test('read/writeUrlNav mergean keys en ?s= y limpian params legado', async () => {
  // El fixture decía {"component":"is-button"} (prefijo legado) aunque el
  // comentario y las aserciones esperan el tag canónico iswc-button.
  const href0 = 'https://example.test/gallery?s=eyJjb21wb25lbnQiOiJpc3djLWJ1dHRvbiJ9&docs=legacy';
  // eyJjb21wb25lbnQiOiJpc3djLWJ1dHRvbiJ9 = {"component":"iswc-button"}
  let href = href0;
  const history = {
    state: null,
    replaceState(_s, _t, url) { href = String(url); },
  };
  globalThis.location = { get href() { return href; } };
  globalThis.history = history;

  const {
    readUrlNav, writeUrlNav, readUrlState, b64urlDecode,
  } = await import(`${navHref}?t=${Date.now()}`);

  assert.equal(readUrlNav('docs'), null);
  writeUrlNav('docs', 'api');
  assert.equal(readUrlNav('docs'), 'api');
  assert.equal(readUrlState().component, 'iswc-button');
  assert.equal(readUrlState().docs, 'api');

  const u = new URL(href);
  assert.equal(u.searchParams.has('docs'), false, 'no debe quedar ?docs= suelto');
  assert.ok(u.searchParams.get('s'), 'debe existir ?s=');
  const decoded = JSON.parse(b64urlDecode(u.searchParams.get('s')));
  assert.deepEqual(decoded, { component: 'iswc-button', docs: 'api' });

  writeUrlNav('docs', null);
  assert.equal(readUrlNav('docs'), null);
  assert.equal(readUrlState().component, 'iswc-button');
});

test('iswc-tab-group: url-key opt-in', async () => {
  const src = await readFile(join(raiz, 'src/components/navigation/tab-group.ts'), 'utf8');
  assert.match(src, /url-key/);
  assert.match(src, /readUrlNav|writeUrlNav/);
  assert.match(src, /get urlKey/);
  assert.match(src, /#restoreFromUrl|#persistToUrl/);
  assert.match(src, /\?s=/);
});

test('snippet CDN loader: script src + loadCSS/load', async () => {
  const src = await readFile(join(raiz, 'src/components/feedback/cdn-snippet.ts'), 'utf8');
  assert.match(src, /#buildLoaderSnippet/);
  assert.match(src, /#loaderHref/);
  assert.match(src, /loader\.min\.js/);
  assert.match(src, /type="module" src=/);
  // W52: loadCSSBase se elimino; el loader auto-carga is-base.min.css.
  assert.match(src, /await L\.load\(/);
  assert.doesNotMatch(src, /#buildBootSnippet/);
});

test('iswc-cdn-snippet carga solo el tag, sin radio ni url-key', async () => {
  const src = await readFile(join(raiz, 'src/components/feedback/cdn-snippet.ts'), 'utf8');
  assert.doesNotMatch(src, /'url-key'/);
  assert.doesNotMatch(src, /name="cdn-scope"/);
  assert.doesNotMatch(src, /readUrlNav|writeUrlNav/);
  // El argumento de L.load() es solo el atributo `tag` (normalizado is- → iswc-),
  // nunca una categoría ni un alcance elegido en la UI.
  assert.match(src, /#loadArg\(\)\s*\{\s*const tag = \(this\.getAttribute\('tag'\) \|\| ''\)\.trim\(\);\s*return normalizeIswcTag\(tag\);/);
  assert.match(src, /if \(t\.startsWith\('iswc-'\)\) return t;/);
});

test('galería mergea nav keys al actualizar component en ?s=', async () => {
  // La lógica del state vive en el bundle del SPA (app/app.ts), no inline
  // en index.html (la migración del inline JS al bundle cambió dónde están
  // los marcadores — el guardián se actualiza al nuevo contrato).
  const gallery = await readFile(join(raiz, 'src/app/app.ts'), 'utf8');
  assert.match(gallery, /readStateParam\(\)\s*\|\|\s*\{\}/);
  // Mergea: parte de una copia de prev y solo pisa `component`.
  assert.match(gallery, /const next(?::\s*\w+)?\s*=\s*\{\s*\.\.\.prev\s*\};/);
  assert.match(gallery, /next\.component\s*=\s*component\.tag;/);
  assert.match(gallery, /delete next\.theme/);
});

export default lista();
