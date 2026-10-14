/**
 * md-docs-vault-contract.test.ts — contrato del lector de documentación y sus satélites
 * (`<iswc-md-docs-vault>`, `<iswc-doc-layout>`, `<iswc-doc-index>`): 4 archivos hermanos, ruta en el
 * manifest (de ahí sale el catálogo del loader), demo con playground y datos declarativos válidos.
 *
 * Los satélites que el lector muestra (figura, ficha de metadatos, paginador, markdown) y los que
 * una app documental pone en su barra (tema, paleta, escoba) también viven en el kit con sus
 * hermanos y su ruta: así ningún consumidor necesita una copia local (`docs/lab/*.js`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { ComponentJsonSchema } from '../../../previews/_kit/schemas/component.schemas.ts';
import { MdDocsVaultListaSchema } from '../../../components/layout/schemas/md-docs-vault.schemas.ts';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');
const COMPONENTES = [
  { tag: 'iswc-md-docs-vault', base: ['layout', 'md-docs-vault'], categoria: 'layout' },
  { tag: 'iswc-doc-layout', base: ['layout', 'doc-layout'], categoria: 'layout' },
  { tag: 'iswc-doc-index', base: ['navigation', 'doc-index'], categoria: 'navigation' },
];
/** El demo con playground de la ficha (si ninguno tiene controles, el primero). */
const demoDe = (ruta: string) => {
  const doc = ComponentJsonSchema.parse(JSON.parse(readFileSync(ruta, 'utf8')));
  const demos = doc.sections.flatMap((s) => s.blocks).filter((b) => b.kind === 'demo');
  const demo = demos.find((b) => b.kind === 'demo' && (b.controls ?? []).length >= 1) ?? demos[0];
  assert.ok(demo && demo.kind === 'demo', `${ruta}: bloque demo`);
  return { demo, html: Array.isArray(demo.html) ? demo.html.join('\n') : String(demo.html ?? '') };
};

for (const c of COMPONENTES) {
  const base = join(RAIZ, 'src', 'components', ...c.base);
  test(`${c.tag}: .ts + .scss + .md + .json hermanos, ficha con frontmatter y ruta en el manifest`, () => {
    for (const ext of ['.ts', '.scss', '.md', '.json', '.schemas.ts']) assert.ok(existsSync((ext === '.schemas.ts' ? join(dirname(base), "schemas", basename(base)) : base) + ext), `falta ${c.base.join('/')}${ext}`);
    const ficha = readFileSync(base + '.md', 'utf8');
    assert.match(ficha, new RegExp(`^---[\\s\\S]*tag: ${c.tag}[\\s\\S]*category: ${c.categoria}[\\s\\S]*---`), 'frontmatter de la ficha');
    for (const s of ['## Propósito', '## API', '### Eventos', '## Accesibilidad', '## Reglas para LLM']) assert.ok(ficha.includes(s), `ficha: ${s}`);
    const manifest = readFileSync(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
    assert.match(manifest, new RegExp(`tag: '${c.tag}'[^\\n]*category: '${c.categoria}'[^\\n]*page: 'components/${c.base.join('/')}.json'`), 'entrada del manifest (catálogo del loader)');
  });

  test(`${c.tag}: demo con playground`, () => {
    const { demo, html } = demoDe(base + '.json');
    assert.ok((demo.controls ?? []).length >= 1, 'demo con controles');
    assert.ok(html.includes(`<${c.tag}`), 'el demo monta el componente');
  });
}

/** Satélites del lector: los que monta la hoja y los que una app documental pone en la barra (`slot="actions"`). */
const SATELITES = [
  { tag: 'iswc-figure', base: ['media', 'figure'], categoria: 'media' },
  { tag: 'iswc-meta-list', base: ['data', 'meta-list'], categoria: 'data' },
  { tag: 'iswc-pager', base: ['navigation', 'pager'], categoria: 'navigation' },
  { tag: 'iswc-md-render', base: ['helpers', 'md-render'], categoria: 'helpers' },
  { tag: 'iswc-palette-selector', base: ['feedback', 'palette-selector'], categoria: 'feedback' },
  { tag: 'iswc-prefs-clear', base: ['feedback', 'prefs-clear'], categoria: 'feedback' },
  { tag: 'iswc-theme-toggle', base: ['feedback', 'theme-toggle'], categoria: 'feedback' },
];

for (const c of SATELITES) {
  const base = join(RAIZ, 'src', 'components', ...c.base);
  test(`${c.tag}: satélite del lector con .ts + .scss + .md + .json + .schemas.ts, ficha con frontmatter y ruta en el manifest`, () => {
    for (const ext of ['.ts', '.scss', '.md', '.json', '.schemas.ts']) assert.ok(existsSync((ext === '.schemas.ts' ? join(dirname(base), "schemas", basename(base)) : base) + ext), `falta ${c.base.join('/')}${ext}`);
    const ficha = readFileSync(base + '.md', 'utf8').replace(/^﻿/, '');
    assert.match(ficha, new RegExp(`^---[\\s\\S]*tag: ${c.tag}[\\s\\S]*category: ${c.categoria}[\\s\\S]*---`), 'frontmatter de la ficha');
    const manifest = readFileSync(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
    assert.match(manifest, new RegExp(`tag: '${c.tag}'[^\\n]*category: '${c.categoria}'[^\\n]*page: 'components/${c.base.join('/')}.json'`), 'entrada del manifest (catálogo del loader)');
  });

  test(`${c.tag}: demo con playground`, () => {
    const { demo, html } = demoDe(base + '.json');
    assert.ok((demo.controls ?? []).length >= 1, 'demo con controles');
    assert.ok(html.includes(`<${c.tag}`), 'el demo monta el componente');
  });
}

test('iswc-md-docs-vault: la hoja se compone con piezas del kit (índice, markdown, figuras, paginador, ficha de metadatos)', () => {
  const lector = readFileSync(join(RAIZ, 'src', 'components', 'layout', 'md-docs-vault.ts'), 'utf8');
  // Lo que el lector muestra: navegación del libro, la hoja en markdown, imágenes como figuras,
  // anterior/siguiente y el modal de información. Nada de esto se reimplementa en el lector.
  for (const tag of ['iswc-doc-layout', 'iswc-doc-index', 'iswc-md-render', 'iswc-figure', 'iswc-pager', 'iswc-meta-list', 'iswc-dialog', 'iswc-copy-button']) {
    assert.ok(lector.includes(`<${tag}`), `el lector monta <${tag}>`);
  }
  // Las piezas se importan del kit (el bundle CDN las resuelve por el loader), no de copias locales.
  assert.doesNotMatch(lector, /from '\.\/lab\//, 'sin imports de docs/lab');
  for (const ruta of ['./doc-layout.js', '../navigation/doc-index.js', '../navigation/pager.js', '../media/figure.js', '../data/meta-list.js', '../helpers/md-render.js']) {
    assert.ok(lector.includes(`import '${ruta}'`), `importa ${ruta} del kit`);
  }
});

test('iswc-md-docs-vault: lo que el lector ofrece (hojas embebidas, main reactivo, ?s= compartible, info, búsqueda, flechas, evento de hoja)', () => {
  const lector = readFileSync(join(RAIZ, 'src', 'components', 'layout', 'md-docs-vault.ts'), 'utf8');
  assert.ok(lector.includes('script[type="text/markdown"][data-path]'), 'hojas embebidas sin red');
  assert.match(lector, /observedAttributes[\s\S]*\['main'\]/, '`main` observado: cambiarlo abre esa hoja');
  assert.ok(lector.includes('createSpaState('), 'navegación SPA en la URL (?s=) con atrás/adelante');
  assert.ok(lector.includes('hrefFor('), 'enlaces compartibles a hoja y sección');
  assert.ok(lector.includes('label="Información de la hoja"'), 'modal de información de la hoja');
  assert.ok(lector.includes("e.key === '/'") && lector.includes('focusSearch()'), 'tecla / enfoca la búsqueda');
  assert.ok(lector.includes("'ArrowRight'") && lector.includes("'ArrowLeft'"), 'flechas: hoja anterior/siguiente');
  assert.ok(lector.includes("'iswc-md-docs-vault-page'"), 'evento iswc-md-docs-vault-page al abrir una hoja');
  assert.ok(lector.includes("cache: 'reload'"), 'imágenes revalidadas (un SVG regenerado no se queda en caché)');
  assert.match(lector, /renderers: MdDocsVaultRenderers \| null/, 'renderers del consumidor se suman a los del lector');
});

test('iswc-md-docs-vault: el demo es un libro embebido válido (hojas .md con frontmatter, README como portada)', () => {
  const { html } = demoDe(join(RAIZ, 'src', 'components', 'layout', 'md-docs-vault.json'));
  const hojas = [...html.matchAll(/<script type="text\/markdown" data-path="([^"]+)">([\s\S]*?)<\/script>/g)];
  assert.ok(hojas.length >= 2, 'varias hojas embebidas');
  assert.ok(MdDocsVaultListaSchema.safeParse(hojas.map((h) => h[1])).success, 'rutas .md');
  assert.equal(hojas[0]![1], 'README.md', 'la portada va primero');
  for (const [, ruta, cuerpo] of hojas) assert.match(cuerpo!.trim(), /^---\s*\n[\s\S]*?Titulo:[\s\S]*?\n\s*---/, `${ruta}: frontmatter con Titulo`);
});

test('iswc-doc-index: los ítems declarativos del demo tienen id y título únicos', () => {
  const { html } = demoDe(join(RAIZ, 'src', 'components', 'navigation', 'doc-index.json'));
  const json = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(json, 'ítems en JSON hijo');
  const items = JSON.parse(json[1]!) as Array<{ id: string; title: string }>;
  assert.ok(items.length >= 3 && items.every((i) => i.id && i.title), 'ítems con id y título');
  assert.equal(new Set(items.map((i) => i.id)).size, items.length, 'ids únicos');
});
