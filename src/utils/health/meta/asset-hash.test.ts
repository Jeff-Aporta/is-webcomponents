/**
 * Hash de 6 caracteres y sello `?h=` entre archivos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentHash, ASSET_HASH_LEN } from '../../../cdn/build/content-hash.ts';
import { stampHashTexts } from '../../../cdn/build/stamp-hashes.ts';
import { withAssetHash, lookupHash } from '../../../cdn/build/asset-url.ts';

test('contentHash: 6 chars y cambia con el contenido', () => {
  const a = contentHash('hola');
  const b = contentHash('hola');
  const c = contentHash('holb');
  assert.equal(a.length, ASSET_HASH_LEN);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-z]{6}$/);
});

test('stampHashTexts: el padre lleva el hash del hijo y el suyo cambia si el hijo cambia', () => {
  const first = stampHashTexts({
    'media/icon.min.js': 'export const icon = 1;\n',
    'actions/button.min.js': 'import"../media/icon.min.js";\nexport const button = 1;\n',
  });
  assert.equal(first.hashes['media/icon.min.js'].length, 6);
  assert.match(first.texts['actions/button.min.js'], new RegExp(`icon\\.min\\.js\\?h=${first.hashes['media/icon.min.js']}`));
  assert.notEqual(first.hashes['actions/button.min.js'], first.hashes['media/icon.min.js']);

  const second = stampHashTexts({
    'media/icon.min.js': 'export const icon = 2;\n',
    'actions/button.min.js': 'import"../media/icon.min.js";\nexport const button = 1;\n',
  });
  assert.notEqual(second.hashes['media/icon.min.js'], first.hashes['media/icon.min.js']);
  assert.notEqual(second.hashes['actions/button.min.js'], first.hashes['actions/button.min.js']);
});

test('lookupHash prefiere el sufijo mas largo', () => {
  const files = {
    'host-base.css': 'aaaaaa',
    'actions/host-base.css': 'bbbbbb',
  };
  assert.equal(lookupHash(files, 'https://x/dist/cdn/actions/host-base.css'), 'bbbbbb');
  assert.equal(lookupHash(files, 'actions/button.min.js'), null);
  assert.equal(withAssetHash('../media/icon.min.js', 'abc123'), '../media/icon.min.js?h=abc123');
  assert.equal(withAssetHash('../media/icon.min.js?h=old', 'abc123'), '../media/icon.min.js?h=abc123');
});
