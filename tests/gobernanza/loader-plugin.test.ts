// @contexto INDICE.md · tests/gobernanza/README.md
/**
 * loader-plugin.test.ts — el enrutador de plugins del loader (`iswcLoader.loadPlugin`, capa 2 `loader-plugin`).
 *
 *   (a) el núcleo pide la capa con `import()` (nunca en estático), el build la publica con nombre estable, la capa no
 *       importa el núcleo y el contrato está documentado en `loader.md`;
 *   (b) la petición se valida: SHA de 40 hex, prefijo con guion final y distinto de `iswc-`, tags con el prefijo;
 *   (c) `cargarPlugin` baja `plugin.json` (jsDelivr → githack), lo comprueba, registra los tags con rutas absolutas y
 *       el prefijo, es idempotente y rechaza otro SHA para la misma app, un prefijo ajeno, un tag fuera de prefijo o de
 *       origen y un tag ya registrado por otro módulo;
 *   (d) el autoloader pide también los tags de los prefijos de plugin.
 *
 * Sin red: `fetch` es simulado y el loader es un doble con la forma que usa la capa.
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

const MANIFIESTO = {
  schema: 'iswc-plugin/v1', app: 'crm', repo: 'Jeff-Aporta/crm', prefijo: 'crm-', kit: { repo: 'Jeff-Aporta/is-webcomponents', sha: SHA2 },
  tags: { 'crm-chat': 'js/components/crm/crm-chat.min.mjs', 'crm-chat-lista': { href: 'js/components/crm/crm-chat-lista.min.mjs', css: ['styles/chat.css'] } },
  deps: { 'crm-chat': ['_chunks/chunk-AAAA.mjs'] },
};

/** `fetch` simulado: `respuestas` por URL; lo no listado responde 404. */
function simularFetch(respuestas: Record<string, unknown>): { pedidos: string[]; restaurar(): void } {
  const g = globalThis as Record<string, unknown>;
  const original = g.fetch;
  const pedidos: string[] = [];
  g.fetch = (url: string) => {
    pedidos.push(String(url));
    const cuerpo = respuestas[String(url)];
    return Promise.resolve({ ok: cuerpo !== undefined, status: cuerpo === undefined ? 404 : 200, json: () => Promise.resolve(cuerpo) });
  };
  return { pedidos, restaurar: () => { g.fetch = original; } };
}

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

test('gobernanza/loader-plugin: cargarPlugin registra los tags con rutas absolutas y es idempotente', async () => {
  const { cargarPlugin, reiniciarPlugins } = await import('../../src/cdn/loader-plugin.ts');
  const f = simularFetch({ [`${RAIZ}plugin.json`]: MANIFIESTO });
  const L = simularLoader();
  const plugins: PluginInfo[] = [];
  try {
    const info = await cargarPlugin(L, ctx, plugins, { ...PETICION, tags: ['crm-chat'] });
    assert.deepEqual(f.pedidos, [`${RAIZ}plugin.json`], 'un solo pedido, a jsDelivr con el SHA');
    assert.equal(L.registrado['crm-chat']!.href, `${RAIZ}js/components/crm/crm-chat.min.mjs`);
    assert.deepEqual(L.registrado['crm-chat-lista']!.css, [`${RAIZ}styles/chat.css`], 'las hojas tambien se vuelven absolutas');
    assert.deepEqual(L.ops[0], { installSheets: true, deps: { 'crm-chat': [`${RAIZ}_chunks/chunk-AAAA.mjs`] } }, 'cache de hojas solo porque hay css; cierre absoluto');
    assert.deepEqual(L.cargados, ['crm-chat'], 'carga de inmediato lo pedido en tags');
    assert.deepEqual(info.tags, ['crm-chat', 'crm-chat-lista']);
    assert.deepEqual(info.alias, { '@crm/': RAIZ });
    assert.deepEqual(info.kit, MANIFIESTO.kit);
    assert.deepEqual(plugins.map((p) => p.prefijo), ['crm-'], 'el prefijo queda para el autoloader');
    // Idempotente: misma peticion, ni otro fetch ni otro registro.
    await cargarPlugin(L, ctx, plugins, PETICION);
    assert.equal(f.pedidos.length, 1);
    assert.equal(plugins.length, 1);
    // Tag que el plugin no trae.
    await assert.rejects(() => cargarPlugin(L, ctx, plugins, { ...PETICION, tags: ['crm-nada'] }), /no trae crm-nada/);
  } finally {
    f.restaurar();
    reiniciarPlugins(plugins);
  }
});

test('gobernanza/loader-plugin: cae a githack si jsDelivr falla y registra con esa raiz', async () => {
  const { cargarPlugin, reiniciarPlugins } = await import('../../src/cdn/loader-plugin.ts');
  const githack = `https://raw.githack.com/Jeff-Aporta/crm/${SHA}/dist/cdn/`;
  const f = simularFetch({ [`${githack}plugin.json`]: MANIFIESTO });
  const L = simularLoader();
  const plugins: PluginInfo[] = [];
  try {
    const info = await cargarPlugin(L, ctx, plugins, PETICION);
    assert.equal(info.raiz, githack);
    assert.equal(L.registrado['crm-chat']!.href, `${githack}js/components/crm/crm-chat.min.mjs`, 'los modulos salen del mismo origen que el manifiesto');
  } finally {
    f.restaurar();
    reiniciarPlugins(plugins);
  }
});

test('gobernanza/loader-plugin: rechaza otro SHA para la app, un prefijo ajeno y manifiestos que no cuadran', async () => {
  const { cargarPlugin, reiniciarPlugins } = await import('../../src/cdn/loader-plugin.ts');
  const L = simularLoader();
  const plugins: PluginInfo[] = [];
  const f = simularFetch({
    [`${RAIZ}plugin.json`]: MANIFIESTO,
    [`https://cdn.jsdelivr.net/gh/Jeff-Aporta/otro@${SHA}/dist/cdn/plugin.json`]: { ...MANIFIESTO, repo: 'Jeff-Aporta/crm', app: 'otro' },
  });
  try {
    await cargarPlugin(L, ctx, plugins, PETICION);
    await assert.rejects(() => cargarPlugin(L, ctx, plugins, { ...PETICION, sha: SHA2 }), /ya está cargado/);
    await assert.rejects(() => cargarPlugin(L, ctx, plugins, { app: 'otro', repo: 'Jeff-Aporta/otro', sha: SHA, prefijo: 'crm-' }), /prefijo crm- ya es de la app crm/);
    reiniciarPlugins(plugins);
    // El manifiesto debe ser del repo pedido, con el prefijo pedido y con todos los tags bajo ese prefijo.
    const malos: Array<[string, unknown, RegExp]> = [
      ['repo ajeno', { ...MANIFIESTO, repo: 'Jeff-Aporta/otro' }, /es de Jeff-Aporta\/otro/],
      ['prefijo distinto', { ...MANIFIESTO, prefijo: 'xx-' }, /declara el prefijo xx-/],
      ['esquema ajeno', { ...MANIFIESTO, schema: 'otro/v9' }, /no es iswc-plugin\/v1/],
      ['tag fuera del prefijo', { ...MANIFIESTO, tags: { 'iswc-button': 'x.mjs' } }, /no empieza por crm-/],
      ['href en otro origen', { ...MANIFIESTO, tags: { 'crm-chat': 'https://evil.example/x.mjs' } }, /fuera del origen/],
    ];
    for (const [que, manifiesto, patron] of malos) {
      const g = simularFetch({ [`${RAIZ}plugin.json`]: manifiesto });
      try {
        await assert.rejects(() => cargarPlugin(simularLoader(), ctx, plugins, PETICION), patron, que);
      } finally {
        g.restaurar();
      }
      // Tras un fallo la app queda libre para reintentar.
      reiniciarPlugins(plugins);
    }
    // Un tag ya registrado por otro modulo no se pisa en silencio.
    const ocupado = simularLoader();
    ocupado.registrado['crm-chat'] = { href: 'https://otro.example/crm-chat.mjs' };
    await assert.rejects(() => cargarPlugin(ocupado, ctx, plugins, PETICION), /ya lo registró otro módulo/);
    // Sin manifiesto en ningun espejo.
    reiniciarPlugins(plugins);
    f.restaurar();
    const vacio = simularFetch({});
    try {
      await assert.rejects(() => cargarPlugin(simularLoader(), ctx, plugins, PETICION), /no se pudo bajar plugin\.json/);
    } finally {
      vacio.restaurar();
    }
  } finally {
    f.restaurar();
    reiniciarPlugins(plugins);
  }
});

test('gobernanza/loader-plugin: con host alterno (desarrollo) usa solo ese origen; aliasDe arma la entrada del import map', async () => {
  const { cargarPlugin, reiniciarPlugins, raicesDe, aliasDe } = await import('../../src/cdn/loader-plugin.ts');
  assert.deepEqual(raicesDe({ ...PETICION, host: 'http://localhost:4300/dist/cdn' }), ['http://localhost:4300/dist/cdn/']);
  assert.deepEqual(raicesDe(PETICION), [RAIZ, `https://raw.githack.com/Jeff-Aporta/crm/${SHA}/dist/cdn/`]);
  assert.deepEqual(aliasDe(PETICION), { '@crm/': RAIZ });
  const f = simularFetch({ 'http://localhost:4300/dist/cdn/plugin.json': MANIFIESTO });
  const plugins: PluginInfo[] = [];
  try {
    const info = await cargarPlugin(simularLoader(), ctx, plugins, { ...PETICION, host: 'http://localhost:4300/dist/cdn' });
    assert.equal(info.raiz, 'http://localhost:4300/dist/cdn/');
  } finally {
    f.restaurar();
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
