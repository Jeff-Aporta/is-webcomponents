// @contexto INDICE.md · tests/gobernanza/README.md
/**
 * loader-plugin-externo.test.ts — `iswcLoader.cargarPlugin({ usuario, repo, sha, tipo })` (capa 2 `loader-plugin-externo`)
 * y el registro de paletas de plugins (`styles/palette-registry`).
 *
 *   (a) el núcleo pide la capa con `import()`, el build la publica, la capa no importa el núcleo y el contrato (rutas fijas)
 *       está documentado en `loader.md`;
 *   (b) la petición se valida: SHA de 40 hex (nunca rama, main ni corto), usuario y repo sin barras, `host` http(s);
 *   (c) carga OK con un manifiesto falso servido por `fetch` simulado: rutas FIJAS (`dist/cdn/plugin.json`,
 *       `palettes/<nombre>.json`), componentes por `loadPlugin`, paletas en el registro del selector y herramientas;
 *   (d) `tipo` carga solo lo pedido; caché por SHA (manifiesto, componentes, paletas, herramientas una sola vez) y otro SHA
 *       baja otro manifiesto;
 *   (e) un manifiesto o una paleta que no cumple falla con la lista de campos (Zod); colisiones de paletas;
 *   (f) paleta por defecto y cambio en caliente (con un `document` mínimo);
 *   (g) forma declarativa: el HTML declara el plugin (`[data-iswc-plugin]`) y el loader lo carga al arrancar; una
 *       entrada rota no tumba la página.
 *
 * Sin red: `fetchJson`, `importar` y `loadPlugin` son dobles inyectados.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { CAPAS_LOADER } from '../../src/cdn/build/bundle-kit.ts';
import type { PluginExternoDeps } from '../../src/cdn/schemas/plugin-externo.schemas.ts';
import type { PluginInfo, PluginOpts } from '../../src/cdn/schemas/plugin.schemas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const CDN = join(import.meta.dirname ?? '.', '..', '..', 'src', 'cdn');
const SHA = 'abcdef0123456789abcdef0123456789abcdef01';
const SHA2 = '0123456789abcdef0123456789abcdef01234567';
const raizDe = (sha: string) => `https://cdn.jsdelivr.net/gh/Jeff-Aporta/crm@${sha}/dist/cdn/`;
const PETICION = { usuario: 'Jeff-Aporta', repo: 'crm', sha: SHA };

const MANIFIESTO = {
  schema: 'iswc-plugin/v1', app: 'crm', repo: 'Jeff-Aporta/crm', prefijo: 'crm-', titulo: 'CRM', version: '1.2.0', loader: 'crmLoader.min.mjs',
  kit: { repo: 'Jeff-Aporta/is-webcomponents', sha: SHA2 },
  tags: { 'crm-chat': 'js/components/crm/crm-chat.min.mjs' },
  paletas: [{ nombre: 'peligro-1', ruta: 'palettes/peligro-1.json' }, { nombre: 'suspendida', ruta: 'palettes/suspendida.json' }],
  herramientas: [{ nombre: 'exportar', ruta: 'js/tools/exportar.min.mjs' }],
  vistas: { app: ['crm-chat'] },
};
const PELIGRO = { label: 'Peligro 1', mood: 'Naranja de aviso.', h: 35, s: '95%', b: '52%', tint: 0.6 };
const SUSPENDIDA = { label: 'Suspendida', h: 0, s: '0%', b: '50%', tint: 0 };

type Mundo = ReturnType<typeof mundo>;

/** Fetch, import y loadPlugin simulados; cuentan sus pedidos. */
function mundo(manifiestos: Record<string, unknown> = { [SHA]: MANIFIESTO }) {
  const pedidos: string[] = [];
  const importados: string[] = [];
  const cargas: PluginOpts[] = [];
  const respuestas: Record<string, unknown> = {};
  for (const [sha, m] of Object.entries(manifiestos)) {
    respuestas[`${raizDe(sha)}plugin.json`] = m;
    respuestas[`${raizDe(sha)}palettes/peligro-1.json`] = PELIGRO;
    respuestas[`${raizDe(sha)}palettes/suspendida.json`] = SUSPENDIDA;
  }
  const deps: PluginExternoDeps = {
    routeHref: (h) => h,
    fetchJson(url) {
      pedidos.push(url);
      return url in respuestas ? Promise.resolve(respuestas[url]) : Promise.reject(new Error('HTTP 404'));
    },
    importar(url) { importados.push(url); return Promise.resolve({ ruta: url }); },
    loadPlugin(o) {
      cargas.push(o);
      const info: PluginInfo = { app: o.app, repo: o.repo, sha: o.sha, prefijo: o.prefijo, raiz: raizDe(o.sha), tags: ['crm-chat'], alias: {} };
      return Promise.resolve(info);
    },
  };
  return { pedidos, importados, cargas, respuestas, deps };
}

async function modulos() {
  const ext = await import('../../src/cdn/loader-plugin-externo.ts');
  const reg = await import('../../src/styles/palette-registry.ts');
  ext.reiniciarExternos();
  reg.reiniciarPaletas();
  return { ...ext, ...reg };
}

test('gobernanza/loader-plugin-externo: el nucleo pide la capa con import(); el build la publica; las rutas fijas estan documentadas', () => {
  const nucleo = readFileSync(join(CDN, 'loader.ts'), 'utf8');
  assert.match(nucleo, /import\('@jeff-aporta\/iswc-base\/cdn\/loader-plugin-externo\.js'\)/);
  assert.doesNotMatch(nucleo, /^import\s+(?!type\b)[^;]*from\s+['"][^'"]*loader-plugin-externo/m);
  assert.ok(CAPAS_LOADER.includes('plugin-externo'), 'CAPAS_LOADER debe incluir la capa plugin-externo');
  const capa = readFileSync(join(CDN, 'loader-plugin-externo.ts'), 'utf8');
  assert.doesNotMatch(capa, /from\s+['"][^'"]*\/loader(\.js|\.ts)?['"]/, 'la capa importa el núcleo (ciclo)');
  const md = readFileSync(join(CDN, 'loader.md'), 'utf8');
  for (const clave of ['L.cargarPlugin(', 'dist/cdn/plugin.json', 'palettes/<nombre>.json', 'fijarPaletaDefecto', 'cambiarPaleta', 'peligro-1', 'suspendida']) {
    assert.ok(md.includes(clave), `loader.md no documenta ${clave}`);
  }
});

test('gobernanza/loader-plugin-externo: validarPeticion exige SHA de 40 hex y usuario/repo sin barras', async () => {
  const { validarPeticion } = await modulos();
  assert.deepEqual(validarPeticion({ ...PETICION, sha: SHA.toUpperCase() }), { ...PETICION, tipo: 'todo' }, 'normaliza el SHA y por defecto carga todo');
  const malos: Array<[string, Record<string, unknown>, RegExp]> = [
    ['SHA corto', { sha: SHA.slice(0, 7) }, /sha: SHA de 40 hex/],
    ['main', { sha: 'main' }, /sha: SHA de 40 hex/],
    ['rama', { sha: 'refs/heads/main' }, /sha/],
    ['repo con usuario', { repo: 'Jeff-Aporta/crm' }, /repo/],
    ['usuario vacio', { usuario: '' }, /usuario/],
    ['tipo ajeno', { tipo: 'todos' }, /tipo/],
    ['host no http', { host: 'file:///C:/x/' }, /host/],
  ];
  for (const [que, cambio, patron] of malos) assert.throws(() => validarPeticion({ ...PETICION, ...cambio }), patron, `debio rechazar: ${que}`);
  assert.throws(() => validarPeticion(null), /falta \{ usuario, repo, sha \}/);
});

test('gobernanza/loader-plugin-externo: rutas fijas — jsDelivr con el SHA, respaldo githack, host solo en desarrollo', async () => {
  const { raicesExternas } = await modulos();
  assert.deepEqual(raicesExternas({ ...PETICION }), [raizDe(SHA), `https://raw.githack.com/Jeff-Aporta/crm/${SHA}/dist/cdn/`]);
  assert.deepEqual(raicesExternas({ ...PETICION, host: 'http://localhost:4300/dist/cdn' }), ['http://localhost:4300/dist/cdn/']);
});

test('gobernanza/loader-plugin-externo: tipo todo carga componentes, paletas (al registro del selector) y herramientas', async () => {
  const m = await modulos();
  const w: Mundo = mundo();
  const avisos: string[][] = [];
  m.escucharPaletas((v) => avisos.push(v));
  const info = await m.cargarPluginExterno({ ...PETICION, tags: ['crm-chat'] }, w.deps);
  assert.equal(w.pedidos[0], `${raizDe(SHA)}plugin.json`, 'el manifiesto sale de la ruta fija con el SHA');
  assert.deepEqual(w.pedidos.slice(1).sort(), [`${raizDe(SHA)}palettes/peligro-1.json`, `${raizDe(SHA)}palettes/suspendida.json`]);
  assert.equal(w.cargas[0]!.app, 'crm');
  assert.equal(w.cargas[0]!.repo, 'Jeff-Aporta/crm');
  assert.equal(w.cargas[0]!.prefijo, 'crm-');
  assert.equal(w.cargas[0]!.sha, SHA);
  assert.deepEqual(w.cargas[1]!.tags, ['crm-chat'], 'los tags pedidos se cargan de inmediato');
  assert.deepEqual(info.paletas, ['peligro-1', 'suspendida']);
  assert.deepEqual(m.paletasExternas().map((p) => p.value), ['peligro-1', 'suspendida'], 'quedan en el registro que lee el selector');
  const p1 = m.paletasExternas()[0]!;
  assert.deepEqual([p1.label, p1.family, p1.h, p1.s, p1.b, p1.tint], ['Peligro 1', 'CRM', 35, '95%', '52%', 0.6], 'el grupo por defecto es el título de la app');
  assert.deepEqual(avisos, [['peligro-1', 'suspendida']], 'el selector se entera del alta');
  assert.deepEqual(w.importados, [`${raizDe(SHA)}js/tools/exportar.min.mjs`]);
  assert.deepEqual(info.herramientas, { exportar: { ruta: `${raizDe(SHA)}js/tools/exportar.min.mjs` } });
  assert.deepEqual([info.nombre, info.version, info.prefijo, info.raiz], ['crm', '1.2.0', 'crm-', raizDe(SHA)]);
  assert.deepEqual(info.cargado, { componentes: true, paletas: true, herramientas: true });
  await assert.rejects(() => m.cargarPluginExterno({ ...PETICION, tags: ['crm-nada'] }, w.deps), /no trae crm-nada/);
});

test('gobernanza/loader-plugin-externo: tipo carga solo lo pedido', async () => {
  const m = await modulos();
  const w: Mundo = mundo();
  const solo = await m.cargarPluginExterno({ ...PETICION, tipo: 'paletas' }, w.deps);
  assert.deepEqual([w.cargas.length, w.importados.length], [0, 0], 'paletas no importa loader ni herramientas');
  assert.deepEqual(solo.cargado, { componentes: false, paletas: true, herramientas: false });
  const w2: Mundo = mundo();
  m.reiniciarExternos();
  m.reiniciarPaletas();
  const comp = await m.cargarPluginExterno({ ...PETICION, tipo: 'componentes' }, w2.deps);
  assert.deepEqual(w2.pedidos, [`${raizDe(SHA)}plugin.json`], 'componentes no baja paletas');
  assert.equal(m.paletasExternas().length, 0);
  assert.deepEqual([comp.cargado.componentes, comp.tags], [true, ['crm-chat']]);
  const w3: Mundo = mundo();
  m.reiniciarExternos();
  const tools = await m.cargarPluginExterno({ ...PETICION, tipo: 'herramientas' }, w3.deps);
  assert.deepEqual([w3.cargas.length, w3.importados.length, tools.cargado.herramientas], [0, 1, true]);
});

test('gobernanza/loader-plugin-externo: cache por SHA — una sola bajada por pieza; otro SHA baja otro manifiesto', async () => {
  const m = await modulos();
  const w: Mundo = mundo({ [SHA]: MANIFIESTO, [SHA2]: { ...MANIFIESTO, version: '2.0.0' } });
  await m.cargarPluginExterno(PETICION, w.deps);
  const total = w.pedidos.length;
  await m.cargarPluginExterno(PETICION, w.deps);
  await m.cargarPluginExterno({ ...PETICION, sha: SHA.toUpperCase(), tipo: 'paletas' }, w.deps);
  await m.cargarPluginExterno({ ...PETICION, tipo: 'herramientas' }, w.deps);
  assert.equal(w.pedidos.length, total, 'repetir (o pedir un tipo ya cargado) no vuelve a la red');
  assert.equal(w.importados.length, 1);
  assert.equal(w.cargas.length, 1);
  const otro = await m.cargarPluginExterno({ ...PETICION, sha: SHA2, tipo: 'paletas' }, w.deps);
  assert.equal(otro.version, '2.0.0', 'otro SHA = otro manifiesto');
  assert.ok(w.pedidos.includes(`${raizDe(SHA2)}plugin.json`));
  assert.deepEqual(m.paletasExternas().map((p) => p.value), ['peligro-1', 'suspendida'], 'el mismo plugin reemplaza sus paletas sin chocar consigo mismo');
  // Un fallo no se cachea: tras reparar el manifiesto se reintenta.
  const w2: Mundo = mundo({});
  m.reiniciarExternos();
  await assert.rejects(() => m.cargarPluginExterno(PETICION, w2.deps), /no se pudo bajar dist\/cdn\/plugin\.json/);
  const w3: Mundo = mundo();
  assert.ok((await m.cargarPluginExterno(PETICION, w3.deps)).paletas.length === 2);
});

test('gobernanza/loader-plugin-externo: un manifiesto que no cumple falla con los campos (Zod)', async () => {
  const m = await modulos();
  const malos: Array<[string, unknown, RegExp]> = [
    ['esquema ajeno', { ...MANIFIESTO, schema: 'otro/v9' }, /schema/],
    ['prefijo del kit', { ...MANIFIESTO, prefijo: 'iswc-' }, /prefijo: iswc- es del kit/],
    ['prefijo sin guion', { ...MANIFIESTO, prefijo: 'crm' }, /prefijo/],
    ['loader con otro nombre', { ...MANIFIESTO, loader: 'x.min.mjs' }, /loader: debe ser crmLoader\.min\.mjs/],
    ['tag fuera del prefijo', { ...MANIFIESTO, tags: { 'iswc-button': 'x.mjs' } }, /tags\.iswc-button: el tag debe empezar por crm-/],
    ['paleta con ruta libre', { ...MANIFIESTO, paletas: [{ nombre: 'a', ruta: 'x/a.json' }] }, /paletas\.0\.ruta: ruta fija palettes/],
    ['herramienta con ..', { ...MANIFIESTO, herramientas: [{ nombre: 'x', ruta: '../x.mjs' }] }, /herramientas\.0\.ruta/],
    ['sin tags', { ...MANIFIESTO, tags: undefined }, /tags/],
  ];
  for (const [que, manifiesto, patron] of malos) {
    const w: Mundo = mundo({ [SHA]: manifiesto });
    m.reiniciarExternos();
    await assert.rejects(() => m.cargarPluginExterno(PETICION, w.deps), patron, que);
  }
  const ajeno: Mundo = mundo({ [SHA]: { ...MANIFIESTO, repo: 'otro/repo' } });
  m.reiniciarExternos();
  await assert.rejects(() => m.cargarPluginExterno(PETICION, ajeno.deps), /declara el repo otro\/repo, no Jeff-Aporta\/crm/);
  const sinPaletas: Mundo = mundo({ [SHA]: { ...MANIFIESTO, paletas: undefined } });
  m.reiniciarExternos();
  await assert.rejects(() => m.cargarPluginExterno({ ...PETICION, tipo: 'paletas' }, sinPaletas.deps), /no publica paletas/);
});

test('gobernanza/loader-plugin-externo: paletas invalidas o repetidas se rechazan', async () => {
  const m = await modulos();
  const w: Mundo = mundo();
  w.respuestas[`${raizDe(SHA)}palettes/peligro-1.json`] = { ...PELIGRO, h: 400 };
  await assert.rejects(() => m.cargarPluginExterno({ ...PETICION, tipo: 'paletas' }, w.deps), /palettes\/peligro-1\.json no cumple: h/);
  w.respuestas[`${raizDe(SHA)}palettes/peligro-1.json`] = { ...PELIGRO, s: 'rojo' };
  m.reiniciarExternos();
  await assert.rejects(() => m.cargarPluginExterno({ ...PETICION, tipo: 'paletas' }, w.deps), /s: porcentaje/);
  w.respuestas[`${raizDe(SHA)}palettes/peligro-1.json`] = { ...PELIGRO, value: 'otra' };
  m.reiniciarExternos();
  await assert.rejects(() => m.cargarPluginExterno({ ...PETICION, tipo: 'paletas' }, w.deps), /debe coincidir con el nombre/);
  // Choque con una paleta del kit.
  const kit = mundo({ [SHA]: { ...MANIFIESTO, paletas: [{ nombre: 'delfin', ruta: 'palettes/delfin.json' }] } });
  kit.respuestas[`${raizDe(SHA)}palettes/delfin.json`] = PELIGRO;
  m.reiniciarExternos();
  await assert.rejects(() => m.cargarPluginExterno({ ...PETICION, tipo: 'paletas' }, kit.deps), /la paleta delfin ya es del kit/);
  // Choque con otro plugin.
  m.reiniciarExternos();
  m.reiniciarPaletas();
  m.registrarPaletas('otro/app', [{ value: 'peligro-1', label: 'x', family: 'x', origin: '', mood: '', h: 1, s: '1%', b: '1%' }]);
  await assert.rejects(() => m.cargarPluginExterno({ ...PETICION, tipo: 'paletas' }, mundo().deps), /ya la registró otro\/app/);
});

test('gobernanza/loader-plugin-externo: paleta por defecto y cambio en caliente', async () => {
  const g = globalThis as Record<string, unknown>;
  const original = g.document;
  const hoja = { dataset: {} as Record<string, string>, textContent: '', isConnected: true, remove() { this.isConnected = false; } };
  const eventos: string[] = [];
  g.document = {
    documentElement: { dataset: {} as Record<string, string> },
    head: { appendChild: (n: unknown) => n },
    createElement: () => hoja,
    dispatchEvent: (e: Event) => { eventos.push(e.type); return true; },
  };
  try {
    const m = await modulos();
    const raiz = (g.document as { documentElement: { dataset: Record<string, string> } }).documentElement.dataset;
    m.fijarPaletaDefecto('peligro-1');
    assert.equal(m.paletaDefecto(), 'peligro-1');
    assert.equal(raiz.palette, undefined, 'el plugin aún no llegó: no se pinta una paleta sin CSS');
    m.fijarPaletaDefecto('turquesa');
    assert.equal(raiz.palette, 'turquesa', 'una del kit se aplica ya (sin elección del usuario)');
    m.fijarPaletaDefecto('peligro-1');
    const w: Mundo = mundo();
    await m.cargarPluginExterno({ ...PETICION, tipo: 'paletas' }, w.deps);
    assert.equal(raiz.palette, 'peligro-1', 'al llegar el plugin se aplica el defecto fijado antes');
    await m.cargarPluginExterno({ ...PETICION, tipo: 'paletas', paletaDefecto: 'suspendida' }, w.deps);
    assert.equal(m.paletaDefecto(), 'suspendida');
    assert.equal(raiz.palette, 'suspendida');
    assert.match(hoja.textContent, /\[data-palette="peligro-1"\]\{--iswc-brand-h:35;--iswc-brand-s:95%;--iswc-brand-b:52%;--iswc-contrast-h:35;/);
    assert.match(hoja.textContent, /\[data-palette="suspendida"\]\{--iswc-brand-h:0;--iswc-brand-s:0%;.*--iswc-tint:0;--iswc-font-tint:0\}/, 'tinte 0 = grises');
    assert.ok(eventos.includes('iswc-palettes-change'), 'el documento recibe el aviso');
    m.cambiarPaleta('peligro-1');
    assert.equal(raiz.palette, 'peligro-1', 'cambio en caliente');
    assert.throws(() => m.cambiarPaleta('Rojo Fuerte'), /value inválido/);
    await assert.rejects(() => m.cargarPluginExterno({ ...PETICION, tipo: 'paletas', paletaDefecto: 'nada' }, w.deps), /no es del kit ni de este plugin/);
  } finally {
    if (original === undefined) delete g.document;
    else g.document = original;
  }
});

test('gobernanza/loader-plugin-externo: la forma declarativa carga lo que declara el HTML (una entrada rota no tumba)', async () => {
  const m = await modulos();
  const w: Mundo = mundo({ [SHA]: MANIFIESTO, [SHA2]: MANIFIESTO });
  const nodos = [
    { tagName: 'SCRIPT', texto: JSON.stringify({ ...PETICION, tags: ['crm-chat'] }), attr: null as string | null },
    { tagName: 'SCRIPT', texto: JSON.stringify([{ ...PETICION, sha: SHA2, tipo: 'paletas' }]), attr: null as string | null },
    { tagName: 'SCRIPT', texto: '{ roto', attr: null as string | null },
    { tagName: 'DIV', texto: '', attr: JSON.stringify({ ...PETICION, sha: 'corto' }) },
  ];
  const raiz = {
    querySelectorAll: (sel: string) => {
      assert.equal(sel, '[data-iswc-plugin]', 'el loader lee los bloques declarativos por su atributo');
      return nodos.map((n) => ({
        tagName: n.tagName,
        textContent: n.texto,
        getAttribute: (a: string) => (a === 'data-iswc-plugin' ? n.attr : null),
      }));
    },
  } as unknown as ParentNode;
  const r = await m.cargarDeclarativos(w.deps, raiz);
  assert.equal(r.cargados.length, 2, 'las dos entradas válidas se cargan');
  assert.equal(r.errores.length, 2, 'el bloque roto y el SHA corto no tumban la página');
  assert.match(r.errores[0].error.message, /no es JSON válido/);
  assert.match(r.errores[1].error.message, /sha: SHA de 40 hex/);
  assert.deepEqual(r.cargados[0].cargado, { componentes: true, paletas: true, herramientas: true });
  assert.deepEqual(r.cargados[1].cargado, { componentes: false, paletas: true, herramientas: false }, 'la segunda entrada pide solo paletas');
  assert.deepEqual(r.cargados[0].paletas, ['peligro-1', 'suspendida']);
  assert.ok(w.pedidos.includes(`${raizDe(SHA)}plugin.json`) && w.pedidos.includes(`${raizDe(SHA2)}plugin.json`), 'cada entrada baja su manifiesto');
  // El núcleo arranca solo con los bloques declarados.
  const nucleo = readFileSync(join(CDN, 'loader.ts'), 'utf8');
  assert.match(nucleo, /data-iswc-plugin/, 'el núcleo busca los bloques declarativos');
  assert.match(nucleo, /cargarDeclarativos/, 'el núcleo los carga al arrancar');
});

test('gobernanza/loader-plugin-externo: leerDeclarativos acepta un objeto o una lista y salta lo vacío', async () => {
  const m = await modulos();
  const raiz = {
    querySelectorAll: () => [
      { tagName: 'SCRIPT', textContent: JSON.stringify({ usuario: 'Jeff-Aporta' }), getAttribute: () => null },
      { tagName: 'SCRIPT', textContent: '   ', getAttribute: () => null },
      { tagName: 'SCRIPT', textContent: JSON.stringify([{ usuario: 'a' }, { usuario: 'b' }]), getAttribute: () => null },
    ],
  } as unknown as ParentNode;
  const leidas = m.leerDeclarativos(raiz);
  assert.equal(leidas.length, 3, 'el bloque vacío se salta; la lista se despliega');
  assert.deepEqual(leidas.map((l) => l.entrada), [{ usuario: 'Jeff-Aporta' }, { usuario: 'a' }, { usuario: 'b' }]);
  assert.equal(leidas[0].error, undefined);
});

export default lista();
