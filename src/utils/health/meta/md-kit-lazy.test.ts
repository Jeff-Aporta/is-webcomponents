/**
 * QUÉ garantiza el render de markdown con componentes del kit y su carga perezosa.
 *
 *   K1 los renders por defecto montan componentes iswc (código + copiar, tabla, aviso, separador, imagen, tarea)
 *      y anotan esos tags; el texto queda legible dentro como respaldo
 *   K2 el hook del consumidor gana: su HTML no se anota; si envuelve `porDefecto()`, sí lo del estándar
 *   K3 `componentes: false` (superficie editable) devuelve HTML plano sin tags del kit
 *   K4 md-hydrate pide solo los tags anotados que siguen en el árbol: livianos al pintar
 *      (con sus dependencias), pesados al entrar en vista
 *   K5 ensureElement: N pedidos del mismo tag = 1 carga; ya definido → respuesta inmediata compartida
 *   K6 ISWebComponentsLoader.ensure: N pedidos = 1 load(); ya definido → no vuelve a cargar
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { mdToHtml } from '../../../components/helpers/md-lite.ts';
import { hidratarMd, planHidratacion, tagsPresentes } from '../../../components/helpers/md-hydrate.ts';
import type { CrearVigiaMd, NodoMd, RaizMd } from '../../../components/helpers/md-hydrate.schemas.ts';
import { ensureElement } from '../../../cdn/ensure-element.ts';

// ── Registro de custom elements mínimo (Deno no trae DOM) ──────────────────────
const definidos = new Map<string, object>();
const esperas = new Map<string, Array<() => void>>();
const registro = {
  get: (t: string) => definidos.get(t),
  define: (t: string, c: object) => {
    definidos.set(t, c);
    for (const r of esperas.get(t) ?? []) r();
    esperas.delete(t);
  },
  whenDefined: (t: string) => (definidos.has(t)
    ? Promise.resolve(definidos.get(t)!)
    : new Promise<object>((r) => esperas.set(t, [...(esperas.get(t) ?? []), () => r(definidos.get(t)!)]))),
};
Object.defineProperty(globalThis, 'customElements', { value: registro, configurable: true });
class Falso extends EventTarget {}
const definir = (tag: string) => registro.define(tag, Falso);

const MD = [
  '# Título',
  '',
  'Texto con `codigo` y ![logo](img/a.svg).',
  '',
  '| A | B |',
  '|---|---|',
  '| 1 | 2 |',
  '',
  '- [x] hecho',
  '',
  '> [!TIP] Ojo',
  '> cuidado',
  '',
  '---',
  '',
  '```ts',
  'const x = "<a>";',
  '```',
  '',
  '```iswc-flowchart',
  '{"nodes":[]}',
  '```',
].join('\n');

test('K1 renders por defecto con componentes del kit', () => {
  const tags = new Set<string>();
  const html = mdToHtml(MD, { tags });
  assert.match(html, /<h1 id="titulo">Título<\/h1>/, 'el heading sigue nativo con id (TOC)');
  assert.match(html, /<iswc-code class="md-code md-code--inline"[^>]*value="codigo">codigo<\/iswc-code>/);
  assert.match(html, /<iswc-theme-img class="md-img" src-dark="img\/a.svg" src-light="img\/a.svg" alt="logo"[^>]*><img alt="logo" src="img\/a.svg"/);
  assert.match(html, /<iswc-scroller class="md-table-wrap"[^>]*><table>/);
  assert.match(html, /<iswc-checkbox class="md-check" readonly checked>hecho<\/iswc-checkbox>/);
  assert.match(html, /<iswc-callout class="md-callout md-callout--tip" color="success" variant="accent"[^>]*><p class="md-callout__title">Ojo<\/p>/);
  assert.match(html, /<iswc-divider class="md-hr"/);
  assert.match(html, /<iswc-code class="md-code" readonly[^>]*lang="ts" value="const x = &quot;&lt;a&gt;&quot;;"><pre class="md-iswc-code"/);
  assert.match(html, /<iswc-copy-button class="md-copy" value="const x = &quot;&lt;a&gt;&quot;;"/);
  assert.match(html, /<iswc-flowchart class="md-iswc-diagram"/);
  assert.deepEqual([...tags].sort(), [
    'iswc-callout', 'iswc-checkbox', 'iswc-code', 'iswc-copy-button', 'iswc-divider',
    'iswc-flowchart', 'iswc-scroller', 'iswc-theme-img',
  ]);
});

test('K2 los hooks del consumidor ganan y sus tags no se anotan', () => {
  const tags = new Set<string>();
  const html = mdToHtml(MD, {
    tags,
    renderers: {
      image: ({ src }) => `<iswc-lightbox data-src="${src}"></iswc-lightbox>`,
      code: ({ code }) => `<code class="propio">${code}</code>`,
      codeblock: () => '<pre class="propio"></pre>',
      callout: (_d, porDefecto) => `<section class="envuelto">${porDefecto()}</section>`,
    },
  });
  assert.match(html, /<iswc-lightbox data-src="img\/a.svg">/);
  assert.match(html, /<code class="propio">codigo<\/code>/);
  assert.match(html, /<section class="envuelto"><iswc-callout/);
  assert.ok(!tags.has('iswc-lightbox'), 'el tag del hook no es asunto de md');
  assert.ok(!tags.has('iswc-code') && !tags.has('iswc-copy-button') && !tags.has('iswc-theme-img'), 'estándares reemplazados no se anotan');
  assert.ok(tags.has('iswc-callout'), 'porDefecto() envuelto sí se anota');
});

test('K3 HTML plano para la superficie editable', () => {
  const tags = new Set<string>();
  const html = mdToHtml(MD, { componentes: false, tags });
  assert.doesNotMatch(html.replace(/<iswc-flowchart[\s\S]*?<\/iswc-flowchart>/, ''), /<iswc-/);
  assert.match(html, /<div class="md-table-wrap"><table>/);
  assert.match(html, /<hr>/);
  assert.match(html, /<div class="md-callout md-callout--tip" role="note">/);
  assert.match(html, /<code class="md-iswc-code" data-mode="inline">codigo<\/code>/);
  assert.deepEqual([...tags], ['iswc-flowchart'], 'solo el diagrama (siempre es componente)');
});

/** Árbol falso: un nodo por tag presente. */
function arbol(presentes: string[]): RaizMd<NodoMd> {
  const els = new Map(presentes.map((t) => [t, [{ localName: t }]]));
  return {
    querySelector: (sel) => els.get(sel)?.[0] ?? null,
    querySelectorAll: (sel) => els.get(sel) ?? [],
  };
}

test('K4 md-hydrate pide solo lo presente; livianos al pintar, pesados en vista', async () => {
  assert.deepEqual(tagsPresentes(arbol(['iswc-callout', 'iswc-code']), ['iswc-callout', 'iswc-code', 'iswc-divider', 'no-iswc']), ['iswc-callout', 'iswc-code']);
  assert.deepEqual(planHidratacion(['iswc-callout', 'iswc-code', 'iswc-flowchart']), {
    alPintar: ['iswc-callout', 'iswc-icon'],
    enVista: ['iswc-code', 'iswc-flowchart'],
  });

  const pedidos: string[] = [];
  const g = globalThis as { ISWebComponentsLoader?: { ensure(t: string): Promise<boolean> } };
  g.ISWebComponentsLoader = { ensure: (t) => { pedidos.push(t); return Promise.resolve(true); } };
  let alVer: ((n: NodoMd) => void) | null = null;
  const observados: string[] = [];
  const vigia: CrearVigiaMd<NodoMd> = (cb) => {
    alVer = cb;
    return { observar: (n) => { observados.push(n.localName); }, dejar: () => {}, cancelar: () => {} };
  };
  try {
    // La hoja tiene aviso y código; el hook del consumidor puso un lightbox que no se anotó.
    const h = hidratarMd(arbol(['iswc-callout', 'iswc-code', 'iswc-lightbox']), ['iswc-callout', 'iswc-code', 'iswc-divider'], vigia);
    assert.deepEqual(await h.listo, ['iswc-callout', 'iswc-icon']);
    assert.deepEqual(pedidos, ['iswc-callout', 'iswc-icon'], 'al pintar: solo livianos presentes + dependencias');
    assert.deepEqual(observados, ['iswc-code'], 'el pesado espera a verse');
    assert.deepEqual(h.enEspera, ['iswc-code']);
    alVer!({ localName: 'iswc-code' });
    alVer!({ localName: 'iswc-code' });
    assert.deepEqual(pedidos, ['iswc-callout', 'iswc-icon', 'iswc-code'], 'en vista: se pide una vez');
    assert.ok(!pedidos.includes('iswc-lightbox') && !pedidos.includes('iswc-divider'));

    // Ya definido → no se pide.
    definir('iswc-divider');
    pedidos.length = 0;
    await hidratarMd(arbol(['iswc-divider']), ['iswc-divider'], vigia).listo;
    assert.deepEqual(pedidos, []);
  } finally {
    delete g.ISWebComponentsLoader;
  }
});

test('K5 ensureElement: N pedidos = 1 carga; definido → inmediato', async () => {
  let cargas = 0;
  const load = async () => { cargas += 1; await Promise.resolve(); definir('x-k5'); };
  const promesas = Array.from({ length: 10 }, () => ensureElement('x-k5', { load }));
  assert.ok(promesas.every((p) => p === promesas[0]), 'en vuelo: la misma promesa');
  assert.deepEqual(await Promise.all(promesas), Array(10).fill(true));
  assert.equal(cargas, 1);
  const a = ensureElement('x-k5', { load });
  const b = ensureElement('X-K5', { load });
  assert.equal(a, b, 'definido: promesa resuelta compartida');
  assert.equal(await a, true);
  assert.equal(cargas, 1, 'nunca recarga');
});

test('K6 ISWebComponentsLoader.ensure: N pedidos = 1 load()', async () => {
  const g = globalThis as Record<string, unknown>;
  g.__IS_LOADER_CATALOG__ = { tags: {}, categories: {}, aliases: {} };
  g.__IS_ASSET_HASHES__ = {};
  g.__IS_BUILD_SHA__ = 'test';
  const dir = mkdtempSync(join(tmpdir(), 'iswc-k6-'));
  const modulo = join(dir, 'x-k6.js');
  writeFileSync(modulo, 'globalThis.__cargasK6 = (globalThis.__cargasK6 ?? 0) + 1; customElements.define("x-k6", class extends EventTarget {});\n');
  const { ISWebComponentsLoader: L } = await import('../../../cdn/loader.ts');
  L.registerApp({ 'x-k6': pathToFileURL(modulo).href }, { installSheets: false });
  let loads = 0;
  const original = L.load.bind(L);
  L.load = (...args: Parameters<typeof L.load>) => { loads += 1; return original(...args); };
  try {
    const rs = await Promise.all(Array.from({ length: 10 }, () => L.ensure('x-k6')));
    assert.deepEqual(rs, Array(10).fill(true));
    assert.equal(loads, 1, 'un solo load() para 10 ensure');
    assert.equal(g.__cargasK6, 1, 'el módulo se evaluó una vez');
    assert.equal(await L.ensure('x-k6'), true);
    assert.equal(L.ensure('x-k6'), L.ensure('x-k6'), 'definido: misma promesa resuelta');
    assert.equal(loads, 1, 'ya definido: no vuelve a cargar');
    assert.equal(await L.ensure('x-desconocido'), false, 'fuera del catálogo y sin href: false sin cargar');
    assert.equal(loads, 1);
  } finally {
    L.load = original;
  }
});
