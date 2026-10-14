/**
 * Hash de 6 caracteres y sello `?v=` entre archivos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashBase, hashCss, hashHtml, hashJs, hashPorRuta, hashesRepetidos, HASH_LEN } from '../../../cdn/build/hash.ts';
import { cambiosDeHash, reemplazarHashes } from '../../../cdn/build/sync-hashes.ts';
import { stampHashTexts } from '../../../cdn/build/stamp-hashes.ts';
import { withAssetHash, lookupHash } from '../../../cdn/build/asset-url.ts';

test('hashBase: 6 chars y cambia con el contenido', () => {
  const a = hashBase('hola');
  assert.equal(a.length, HASH_LEN);
  assert.equal(a, hashBase('hola'));
  assert.notEqual(a, hashBase('holb'));
  assert.match(a, /^[0-9a-z]{6}$/);
});

test('hashJs/hashCss/hashHtml: solo cambian con lo ejecutable', () => {
  const js = 'const a = 1; // nota\nexport { a };';
  assert.equal(hashJs(js), hashJs('/* doc */\n\tconst  a = 1;\n\n export { a };'), 'comentarios y blanco no cuentan');
  assert.notEqual(hashJs(js), hashJs('const a = 2; export { a };'), 'el código sí');
  assert.notEqual(hashJs("const u = 'http://x//y';"), hashJs("const u = 'http://x//z';"), 'un // dentro de una cadena es código');
  assert.equal(hashCss('a { color: red; }'), hashCss('/* x */ a {\n  color: red;\n}'));
  assert.notEqual(hashCss('a { color: red; }'), hashCss('a { color: blue; }'));
  assert.equal(hashHtml('<p>x</p>'), hashHtml('<!-- c --><p>x</p>\n'));
  assert.notEqual(hashPorRuta('a/x.css', ''), hashPorRuta('b/x.css', ''), 'la ruta entra al hash');
});

test('hashesRepetidos: dos archivos con el mismo hash, salvo alias del mismo nombre', () => {
  assert.deepEqual(hashesRepetidos({ 'loader.min.js': 'aaaaaa', 'core/loader.min.js': 'aaaaaa', 'x.css': 'bbbbbb' }), []);
  assert.equal(hashesRepetidos({ 'a.js': 'cccccc', 'b.js': 'cccccc' }).length, 1);
});

test('sync-hashes: ?v=viejo → ?v=nuevo, sin tocar otras cadenas ni hashes ambiguos', () => {
  const cambios = cambiosDeHash({ 'a.js': 'aaaaaa', 'b.js': 'bbbbbb' }, { 'a.js': 'a2a2a2', 'b.js': 'bbbbbb' });
  const html = '<script src="a.js?v=aaaaaa"></script><link href="b.css?x=1&v=bbbbbb"> aaaaaa ?v=aaaaaax';
  assert.equal(reemplazarHashes(html, cambios), '<script src="a.js?v=a2a2a2"></script><link href="b.css?x=1&v=bbbbbb"> aaaaaa ?v=aaaaaax');
  assert.equal(cambiosDeHash({ 'x.js': 'dddddd', 'y.js': 'dddddd' }, { 'x.js': '111111', 'y.js': '222222' }).size, 0, 'ambiguo: no se toca');
});

test('stampHashTexts: el padre lleva el hash del hijo y el suyo cambia si el hijo cambia', () => {
  const first = stampHashTexts({
    'media/icon.min.js': 'export const icon = 1;\n',
    'actions/button.min.js': 'import"../media/icon.min.js";\nexport const button = 1;\n',
  });
  assert.equal(first.hashes['media/icon.min.js'].length, 6);
  assert.match(first.texts['actions/button.min.js'], new RegExp(`icon\\.min\\.js\\?v=${first.hashes['media/icon.min.js']}`));
  assert.notEqual(first.hashes['actions/button.min.js'], first.hashes['media/icon.min.js']);

  const second = stampHashTexts({
    'media/icon.min.js': 'export const icon = 2;\n',
    'actions/button.min.js': 'import"../media/icon.min.js";\nexport const button = 1;\n',
  });
  assert.notEqual(second.hashes['media/icon.min.js'], first.hashes['media/icon.min.js']);
  assert.notEqual(second.hashes['actions/button.min.js'], first.hashes['actions/button.min.js']);
});

test('stampHashTexts: en un ciclo de imports todos los importadores usan la MISMA URL de cada archivo', () => {
  // sesion <-> api (ciclo); vista y cabecera importan ambos. Con URLs distintas el
  // navegador carga dos instancias de `sesion.js` (estado duplicado).
  const { texts, hashes } = stampHashTexts({
    'js/sesion.js': "import { api } from './api.js'; export let s = null;",
    'js/api.js': "import { s } from './sesion.js'; export const api = () => s;",
    'view/chat.js': "import { s } from '../js/sesion.js'; import { api } from '../js/api.js';",
    'view/cabecera.js': "import { s } from '../js/sesion.js';",
  });
  const urls = (archivo: string) => new Set(Object.values(texts).flatMap((t) => t.split(`${archivo}?v=`).slice(1).map((resto) => resto.slice(0, 6))));
  for (const archivo of ['sesion.js', 'api.js']) {
    const vistas = urls(archivo);
    assert.equal(vistas.size, 1, `${archivo}: una sola URL (${[...vistas].join(', ')})`);
    assert.equal([...vistas][0], hashes[`js/${archivo}`], `${archivo}: la URL usa el hash publicado`);
  }
  const otra = stampHashTexts({
    'js/sesion.js': "import { api } from './api.js'; export let s = 1;",
    'js/api.js': "import { s } from './sesion.js'; export const api = () => s;",
  });
  assert.notEqual(otra.hashes['js/api.js'], hashes['js/api.js'], 'un cambio dentro del ciclo cambia el hash de todo el ciclo');
});

test('lookupHash prefiere el sufijo mas largo', () => {
  const files = {
    'host-base.css': 'aaaaaa',
    'actions/host-base.css': 'bbbbbb',
  };
  assert.equal(lookupHash(files, 'https://x/dist/cdn/actions/host-base.css'), 'bbbbbb');
  assert.equal(lookupHash(files, 'actions/button.min.js'), null);
  assert.equal(withAssetHash('../media/icon.min.js', 'abc123'), '../media/icon.min.js?v=abc123');
  assert.equal(withAssetHash('../media/icon.min.js?h=old', 'abc123'), '../media/icon.min.js?v=abc123', 'el ?h= legado se reemplaza por ?v=');
  assert.equal(withAssetHash('../media/icon.min.js?v=old', 'abc123'), '../media/icon.min.js?v=abc123');
});
