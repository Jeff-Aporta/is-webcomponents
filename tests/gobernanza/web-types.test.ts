// @contexto INDICE.md · tests/gobernanza/README.md
﻿// web-types.test.ts — los metadatos del kit para los editores.
//
// VS Code (y los que leen su formato) y JetBrains (WebStorm) quieren saber de cada componente sus
// props, sus slots, sus CSS parts y sus eventos. Eso sale de las fuentes, asi que se genera:
//
//   dist/cdn/vscode.html-custom-data.json
//   dist/cdn/web-types.json
//
// Los dos se descargan al abrir el editor: van minificados (B.3).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(dirname(here));
const CDN = join(ROOT, 'dist', 'cdn');
const VSCODE = join(CDN, 'vscode.html-custom-data.json');
const WEBTYPES = join(CDN, 'web-types.json');

/** Los tags del manifest. */
function tagsDelManifiesto(): string[] {
  const texto = readFileSync(join(ROOT, 'src', 'manifest.ts'), 'utf8');
  return [...texto.matchAll(/\{ tag: '(iswc-[a-z0-9-]+)'/g)].map((m) => m[1]);
}

test('gobernanza/web-types: los dos archivos se publican', () => {
  if (!existsSync(CDN)) {
    console.log('  dist/cdn no existe: se salta (corre `deno task build` antes del gate)');
    return;
  }
  assert.ok(existsSync(VSCODE), 'falta dist/cdn/vscode.html-custom-data.json');
  assert.ok(existsSync(WEBTYPES), 'falta dist/cdn/web-types.json');
});

test('gobernanza/web-types: van minificados', () => {
  if (!existsSync(VSCODE)) return;
  for (const p of [VSCODE, WEBTYPES]) {
    const x = readFileSync(p, 'utf8');
    assert.equal(x, JSON.stringify(JSON.parse(x)), p + ' no va minificado');
  }
});

test('gobernanza/web-types: sale un tag por cada componente del manifest', () => {
  if (!existsSync(VSCODE)) return;
  const vscode = JSON.parse(readFileSync(VSCODE, 'utf8'));
  const webtypes = JSON.parse(readFileSync(WEBTYPES, 'utf8'));
  const tags = tagsDelManifiesto();
  assert.ok(tags.length > 200, 'el manifiesto debe listar los componentes');
  const enVscode = new Set(vscode.tags.map((t) => t.name));
  const enWebtypes = new Set(webtypes.contributions.html.elements.map((e) => e.name));
  const faltan = tags.filter((t) => !enVscode.has(t) || !enWebtypes.has(t));
  assert.deepEqual(faltan, [], 'estos componentes no estan en los metadatos del editor');
});

test('gobernanza/web-types: las props vienen de los @prop de verdad', () => {
  if (!existsSync(VSCODE)) return;
  const vscode = JSON.parse(readFileSync(VSCODE, 'utf8'));
  const entrada = vscode.tags.find((t) => t.name === 'iswc-input');
  assert.ok(entrada, 'iswc-input debe estar');
  assert.ok(entrada.attributes.some((a) => a.name === 'clearable'), 'iswc-input declara @prop clearable');
  assert.ok(entrada.attributes.every((a) => a.description), 'toda prop dice su tipo');
});

test('gobernanza/web-types: los eventos y los slots tambien estan', () => {
  if (!existsSync(VSCODE)) return;
  const vscode = JSON.parse(readFileSync(VSCODE, 'utf8'));
  const entrada = vscode.tags.find((t) => t.name === 'iswc-input');
  assert.ok(entrada.events.length > 0, 'iswc-input declara eventos');
  assert.ok(entrada.slots.length > 0, 'iswc-input declara slots');
  assert.ok(entrada.cssProperties.length > 0, 'iswc-input declara CSS parts');
});

export default lista();
