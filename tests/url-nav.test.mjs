/**
 * url-nav.test.mjs — memoria de tabs solo dentro de ?s= (b64url JSON).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const navHref = pathToFileURL(join(raiz, 'src/components/_shared/url-nav.js')).href;

test('url-nav.js solo toca ?s= (sin storage ni params sueltos)', async () => {
  const raw = await readFile(join(raiz, 'src/components/_shared/url-nav.js'), 'utf8');
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
  const href0 = 'https://example.test/gallery?s=eyJjb21wb25lbnQiOiJpcy1idXR0b24ifQ&docs=legacy';
  // eyJjb21wb25lbnQiOiJpcy1idXR0b24ifQ = {"component":"is-button"}
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
  assert.equal(readUrlState().component, 'is-button');
  assert.equal(readUrlState().docs, 'api');

  const u = new URL(href);
  assert.equal(u.searchParams.has('docs'), false, 'no debe quedar ?docs= suelto');
  assert.ok(u.searchParams.get('s'), 'debe existir ?s=');
  const decoded = JSON.parse(b64urlDecode(u.searchParams.get('s')));
  assert.deepEqual(decoded, { component: 'is-button', docs: 'api' });

  writeUrlNav('docs', null);
  assert.equal(readUrlNav('docs'), null);
  assert.equal(readUrlState().component, 'is-button');
});

test('is-tab-group: url-key opt-in', async () => {
  const src = await readFile(join(raiz, 'src/components/navigation/tab-group.js'), 'utf8');
  assert.match(src, /url-key/);
  assert.match(src, /readUrlNav|writeUrlNav/);
  assert.match(src, /get urlKey/);
  assert.match(src, /#restoreFromUrl|#persistToUrl/);
  assert.match(src, /\?s=/);
});

test('snippet CDN loader: script src + loadCSS/load', async () => {
  const src = await readFile(join(raiz, 'src/components/feedback/cdn-snippet.js'), 'utf8');
  assert.match(src, /#buildLoaderSnippet/);
  assert.match(src, /#loaderHref/);
  assert.match(src, /loader\.min\.js/);
  assert.match(src, /type="module" src=/);
  assert.match(src, /loadCSSBase/);
  assert.match(src, /await L\.load\(/);
  assert.doesNotMatch(src, /#buildBootSnippet/);
});

test('is-cdn-snippet url-key persiste alcance tag|category|all', async () => {
  const src = await readFile(join(raiz, 'src/components/feedback/cdn-snippet.js'), 'utf8');
  assert.match(src, /'url-key'/);
  assert.match(src, /#persistScopeToUrl|#restoreScopeFromUrl/);
  assert.match(src, /tag['"]\s*\|\s*['"]category['"]\s*\|\s*['"]all|SCOPES/);
  assert.match(src, /\?s=/);
});

test('galería mergea nav keys al actualizar component en ?s=', async () => {
  const html = await readFile(join(raiz, 'index.html'), 'utf8');
  assert.match(html, /readStateParam\(\)\s*\|\|\s*\{\}/);
  assert.match(html, /\.\.\.prev,\s*component:/);
  assert.match(html, /delete next\.theme/);
});
