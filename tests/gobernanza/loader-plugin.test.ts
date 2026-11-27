// @contexto INDICE.md · tests/gobernanza/README.md
/**
 * loader-plugin.test.ts — el enrutador de plugins del loader (`iswcLoader.loadPlugin`, capa 2 `loader-plugin`).
 *
 *   (a) el núcleo pide la capa con `import()` (nunca en estático), el build la publica con nombre estable, la capa no
 *       importa el núcleo y el contrato está documentado en `loader.md`;
 *   (b) la petición se valida: SHA de 40 hex, prefijo con guion final y distinto de `iswc-`, tags con el prefijo;
 *   (c) `cargarPlugin` importa `<prefijo>Loader.min.mjs` de la app (jsDelivr → githack, o `host`), lee de `getAppComponents()` los
 *       tags que quedaron con el prefijo, es idempotente y rechaza otro SHA para la misma app, un prefijo ajeno, un
 *       loader mudo y un import caído;
 *   (d) el autoloader pide también los tags de los prefijos de plugin.
 *
 * Sin red: el import del loader de la app es simulado y el loader es un doble con la forma que usa la capa.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { CAPAS_LOADER } from '../../src/cdn/build/bundle-kit.ts';
import type { PluginInfo, PluginLoaderApi } from '../../src/cdn/schemas/plugin.schemas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const CDN = join(import.meta.dirname ?? '.', '..', '..', 'src', 'cdn');
const SHA = 'abcdef0123456789abcdef0123456789abcdef01';
const SHA2 = '0123456789abcdef0123456789abcdef01234567';
const RAIZ = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/crm@${SHA}/dist/cdn/`;
const PETICION = { app: 'crm', repo: 'Jeff-Aporta/crm', sha: SHA, prefijo: 'crm-' };

/** Doble del loader: guarda lo que registra la capa. */
function simularLoader(): PluginLoaderApi & { registrado: Record<string, { href: string; css?: string[] }>; ops: unknown[]; cargados: string[] } {
  const registrado: Record<string, { href: string; css?: string[] }> = {};
  const ops: unknown[] = [];
  const cargados: string[] = [];
  return {
    registrado, ops, cargados,
    registerApp(map, opts) { Object.assign(registrado, map); ops.push(opts); return this; },
    getAppComponents: () => registrado,
    load(...ids: string[]) { cargados.push(...ids); return Promise.resolve({}); },
  };
}

const ctx = { routeHref: (h: string) => h };

test('gobernanza/loader-plugin: el nucleo pide la capa con import(); el build la publica; el contrato esta documentado', () => {
  const nucleo = readFileSync(join(CDN, 'loader.ts'), 'utf8');
  assert.match(nucleo, /import\('@jeff-aporta\/iswc-base\/cdn\/loader-plugin\.js'\)/);
  assert.doesNotMatch(nucleo, /^import\s+(?!type\b)[^;]*from\s+['"][^'"]*loader-plugin/m);
  assert.ok(CAPAS_LOADER.includes('plugin'), 'CAPAS_LOADER debe incluir la capa plugin');
  const capa = readFileSync(join(CDN, 'loader-plugin.ts'), 'utf8');
  assert.doesNotMatch(capa, /from\s+['"][^'"]*\/loader(\.js|\.ts)?['"]/, 'la capa importa el nucleo (ciclo)');
  const md = readFileSync(join(CDN, 'loader.md'), 'utf8');
  for (const clave of ['L.loadPlugin(', 'iswc-plugin/v1', 'plugin.json', 'getPlugins']) assert.ok(md.includes(clave), `loader.md no documenta ${clave}`);
});

test('gobernanza/loader-plugin: validarOpts exige SHA de 40 hex, prefijo propio y tags con el prefijo', async () => {
  const { validarOpts } = await import('../../src/cdn/loader-plugin.ts');
  assert.deepEqual(validarOpts({ ...PETICION, sha: SHA.toUpperCase(), tags: ['crm-chat'] }), { ...PETICION, tags: ['crm-chat'] }, 'normaliza el SHA a minusculas');
  const malos: Array<[string, Record<string, unknown>]> = [
    ['SHA corto', { sha: SHA.slice(0, 7) }],
    ['main', { sha: 'main' }],
    ['prefijo sin guion', { prefijo: 'crm' }],
    ['prefijo del kit', { prefijo: 'iswc-' }],
    ['repo sin dueño', { repo: 'crm' }],
    ['app con mayusculas', { app: 'CRM' }],
    ['tag de otro prefijo', { tags: ['iswc-button'] }],
    ['host no http', { host: 'file:///C:/x/' }],
  ];
  for (const [que, cambio] of malos) assert.throws(() => validarOpts({ ...PETICION, ...cambio }), TypeError, `debio rechazar: ${que}`);
  assert.throws(() => validarOpts(null), TypeError);
});

/** `importar` simulado: al importar el loader de la app, este "se registra" (como `crmLoader.min.mjs`). */
function simularImport(L: ReturnType<typeof simularLoader>, fallan: string[] = []): { urls: string[]; importar(url: string): Promise<unknown> } {
  const urls: string[] = [];
  return {
    urls,
    importar(url: string) {
      urls.push(url);
      if (fallan.some((p) => url.startsWith(p))) return Promise.reject(new Error(`404 ${url}`));
      L.registrado['crm-chat'] = { href: `${url}#chat` };
      L.registrado['crm-chat-lista'] = { href: `${url}#lista` };
      return Promise.resolve({});
    },
  };
}

test('gobernanza/loader-plugin: cargarPlugin importa el loader de la app, lee sus tags y es idempotente', async () => {
  const { cargarPlugin, reiniciarPlugins } = await import('../../src/cdn/loader-plugin.ts');
  const L = simularLoader();
  const im = simularImport(L);
  const plugins: PluginInfo[] = [];
  try {
    const info = await cargarPlugin(L, ctx, plugins, { ...PETICION, tags: ['crm-chat'] }, im.importar);
    assert.deepEqual(im.urls, [`${RAIZ}crmLoader.min.mjs`], 'un solo import, a jsDelivr con el SHA');
    assert.deepEqual(info.tags, ['crm-chat', 'crm-chat-lista']);
    assert.deepEqual(info.alias, { '@crm/': RAIZ });
    assert.deepEqual(L.cargados, ['crm-chat'], 'carga de inmediato lo pedido en tags');
    assert.deepEqual(plugins.map((p) => p.prefijo), ['crm-'], 'el prefijo queda para el autoloader');
    await cargarPlugin(L, ctx, plugins, PETICION, im.importar);
    assert.equal(im.urls.length, 1, 'idempotente: ni otro import');
    assert.equal(plugins.length, 1);
    await assert.rejects(() => cargarPlugin(L, ctx, plugins, { ...PETICION, tags: ['crm-nada'] }, im.importar), /no trae crm-nada/);
  } finally {
    reiniciarPlugins(plugins);
  }
});

test('gobernanza/loader-plugin: cae a githack si jsDelivr falla y devuelve esa raiz', async () => {
  const { cargarPlugin, reiniciarPlugins } = await import('../../src/cdn/loader-plugin.ts');
  const githack = `https://raw.githack.com/Jeff-Aporta/crm/${SHA}/dist/cdn/`;
  const L = simularLoader();
  const im = simularImport(L, ['https://cdn.jsdelivr.net']);
  const plugins: PluginInfo[] = [];
  try {
    const info = await cargarPlugin(L, ctx, plugins, PETICION, im.importar);
    assert.equal(info.raiz, githack);
    assert.deepEqual(im.urls, [`${RAIZ}crmLoader.min.mjs`, `${githack}crmLoader.min.mjs`]);
  } finally {
    reiniciarPlugins(plugins);
  }
});

test('gobernanza/loader-plugin: rechaza otro SHA para la app, un prefijo ajeno, un loader mudo y un import caido', async () => {
  const { cargarPlugin, reiniciarPlugins } = await import('../../src/cdn/loader-plugin.ts');
  const L = simularLoader();
  const im = simularImport(L);
  const plugins: PluginInfo[] = [];
  try {
    await cargarPlugin(L, ctx, plugins, PETICION, im.importar);
    await assert.rejects(() => cargarPlugin(L, ctx, plugins, { ...PETICION, sha: SHA2 }, im.importar), /ya está cargado/);
    await assert.rejects(() => cargarPlugin(L, ctx, plugins, { app: 'otro', repo: 'Jeff-Aporta/otro', sha: SHA, prefijo: 'crm-' }, im.importar), /prefijo crm- ya es de la app crm/);
    reiniciarPlugins(plugins);
    // Loader que no registra ningun tag con el prefijo.
    const mudo = simularLoader();
    await assert.rejects(() => cargarPlugin(mudo, ctx, plugins, PETICION, () => Promise.resolve({})), /no registró ningún tag crm-/);
    // Ninguna raiz responde.
    await assert.rejects(() => cargarPlugin(simularLoader(), ctx, plugins, PETICION, () => Promise.reject(new Error('caido'))), /no se pudo importar crmLoader\.min\.mjs/);
  } finally {
    reiniciarPlugins(plugins);
  }
});

test('gobernanza/loader-plugin: con host alterno (desarrollo) usa solo ese origen; aliasDe arma la entrada del import map', async () => {
  const { cargarPlugin, reiniciarPlugins, raicesDe, aliasDe } = await import('../../src/cdn/loader-plugin.ts');
  assert.deepEqual(raicesDe({ ...PETICION, host: 'http://localhost:4300/dist/cdn' }), ['http://localhost:4300/dist/cdn/']);
  assert.deepEqual(raicesDe(PETICION), [RAIZ, `https://raw.githack.com/Jeff-Aporta/crm/${SHA}/dist/cdn/`]);
  assert.deepEqual(aliasDe(PETICION), { '@crm/': RAIZ });
  const L = simularLoader();
  const im = simularImport(L);
  const plugins: PluginInfo[] = [];
  try {
    const info = await cargarPlugin(L, ctx, plugins, { ...PETICION, host: 'http://localhost:4300/dist/cdn' }, im.importar);
    assert.equal(info.raiz, 'http://localhost:4300/dist/cdn/');
    assert.deepEqual(im.urls, ['http://localhost:4300/dist/cdn/crmLoader.min.mjs']);
  } finally {
    reiniciarPlugins(plugins);
  }
});

test('gobernanza/loader-plugin: el autoloader pide tambien los tags de los prefijos de plugin', async () => {
  const g = globalThis as Record<string, unknown>;
  const definidos = new Set<string>();
  g.customElements = { get: (tag: string) => (definidos.has(tag) ? class {} : undefined) };
  g.MutationObserver = class { constructor(public cb: unknown) {} observe() {} disconnect() {} };
  try {
    const { observar, listos } = await import('../../src/cdn/loader-autoload.ts');
    const el = (localName: string, hijos: unknown[] = []) => ({ nodeType: 1, localName, querySelectorAll: () => hijos });
    const raiz = el('div', [el('crm-chat'), el('iswc-button'), el('span')]) as unknown as ParentNode;
    const pedidos: string[] = [];
    const ensure = (tag: string): Promise<boolean> => { pedidos.push(tag); definidos.add(tag); return Promise.resolve(true); };
    assert.equal(listos(raiz), false, 'iswc-button sin definir');
    assert.equal(listos(raiz, ['crm-']), false);
    observar(raiz, ensure);
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(pedidos, ['iswc-button'], 'sin prefijos de plugin solo observa iswc-');
    definidos.clear();
    pedidos.length = 0;
    observar(raiz, ensure, () => ['crm-']);
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(pedidos.sort(), ['crm-chat', 'iswc-button'], 'con el prefijo del plugin tambien pide crm-chat');
    assert.equal(listos(raiz, ['crm-']), true);
  } finally {
    delete g.customElements;
    delete g.MutationObserver;
  }
});

export default lista();
