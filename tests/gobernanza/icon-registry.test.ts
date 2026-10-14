// icon-registry.test.ts — QUÉ hace <iswc-icon> para resolver un ícono (src/core/icon-loader.ts),
// como caja negra sobre `resolveIconRaw` con la red simulada. Sin mapa: localStorage → web publicada
// de la app (`<html data-icons>`, URL absoluta) → API de Iconify.
//   R1 con `data-icons` el ícono se pide a `<base><set>/<n>.svg` (la web publicada de la app).
//   R2 no está publicado (404) → API, y UN aviso por ícono `[iswc-icon] falta en local: <set>:<n>`
//      aunque lo pidan muchos a la vez; un solo fetch en vuelo por ícono.
//   R3 el archivo publicado no responde (red/CORS) → API con el mismo aviso.
//   R4 sin `data-icons` → API directo: ni pedido local ni aviso.
//   R5 un `data-icons` relativo no se usa (la base es siempre absoluta).
//   R6 abortar a un llamador no cancela el fetch compartido de los demás.
import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const denoTest = denoTestCon(test);


type Ruta = (url: string) => Response | Promise<Response>;
const rutas = new Map<string, Ruta>();
const pedidos: string[] = [];
const avisos: string[] = [];
const svg = (marca: string) => `<svg viewBox="0 0 24 24"><path d="${marca}"/></svg>`;
const BASE = 'https://app.example/assets/iconify/';

/** localStorage en memoria: el real de Deno se comparte entre archivos de test en paralelo. */
function storageEnMemoria(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => m.clear(),
  };
}
Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: storageEnMemoria() });
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = String(input instanceof Request ? input.url : input);
  pedidos.push(url);
  const r = rutas.get(url);
  if (r) return r(url);
  if (url.startsWith('https://api.iconify.design/')) return new Response(svg(`api:${url.slice(27)}`));
  return new Response('', { status: 404 });
}) as typeof fetch;
const warnOriginal = console.warn;
console.warn = (...xs: unknown[]) => { avisos.push(xs.map(String).join(' ')); };

// `<html data-icons>` simulado (en Deno no hay DOM).
const html = { dataset: {} as Record<string, string | undefined> };
const g = globalThis as { document?: { documentElement: typeof html } };
g.document = { documentElement: html };

rutas.set(`${BASE}mdi/home.svg`, () => new Response(svg('local-home')));
rutas.set(`${BASE}mdi/roto.svg`, () => { throw new TypeError('sin red'); });
rutas.set(`${BASE}mdi/lento.svg`, () => new Promise((ok) => setTimeout(() => ok(new Response(svg('lento'))), 20)));

const { resolveIconRaw, resolveIconSvg, resolveIconBase, clearRawCache, AVISO_FALTA_LOCAL } = await import('../../src/core/icon-loader.ts');

const reiniciar = (base: string | undefined) => {
  html.dataset.icons = base;
  clearRawCache();
  localStorage.clear();
  pedidos.length = 0;
  avisos.length = 0;
};

denoTest('icon-registry: R1 data-icons → web publicada de la app', async () => {
  reiniciar(BASE);
  assertEquals(resolveIconBase(), BASE);
  assert((await resolveIconRaw('mdi', 'home'))?.includes('local-home'));
  assertEquals(pedidos, [`${BASE}mdi/home.svg`]);
  assertEquals(await resolveIconSvg('mdi', 'home'), `${BASE}mdi/home.svg`);
  assertEquals(avisos, []);
});

denoTest('icon-registry: R2 no publicado → API con UN aviso y un solo fetch en vuelo', async () => {
  reiniciar(BASE);
  const rs = await Promise.all([1, 2, 3].map(() => resolveIconRaw('fluent', 'cat-24-regular')));
  for (const r of rs) assert(r?.includes('api:fluent/cat-24-regular.svg'));
  assertEquals(pedidos, [`${BASE}fluent/cat-24-regular.svg`, 'https://api.iconify.design/fluent/cat-24-regular.svg']);
  assertEquals(avisos, [`${AVISO_FALTA_LOCAL} fluent:cat-24-regular`]);
  assertEquals(AVISO_FALTA_LOCAL, '[iswc-icon] falta en local:');
  await resolveIconRaw('fluent', 'cat-24-regular');
  assertEquals(avisos.length, 1, 'no se repite');
});

denoTest('icon-registry: R3 el archivo publicado no responde → API con aviso', async () => {
  reiniciar(BASE);
  assert((await resolveIconRaw('mdi', 'roto'))?.includes('api:mdi/roto.svg'));
  assertEquals(avisos, ['[iswc-icon] falta en local: mdi:roto']);
});

denoTest('icon-registry: R4 sin data-icons → API directo, sin aviso', async () => {
  reiniciar(undefined);
  assertEquals(resolveIconBase(), null);
  assert((await resolveIconRaw('mdi', 'home'))?.includes('api:mdi/home.svg'));
  assertEquals(pedidos, ['https://api.iconify.design/mdi/home.svg']);
  assertEquals(await resolveIconSvg('mdi', 'x'), 'https://api.iconify.design/mdi/x.svg');
  assertEquals(avisos, []);
});

denoTest('icon-registry: R5 data-icons relativo no se usa', async () => {
  reiniciar('assets/iconify/');
  assertEquals(resolveIconBase(), null);
  assert((await resolveIconRaw('mdi', 'home'))?.includes('api:mdi/home.svg'));
  assertEquals(avisos, []);
});

denoTest('icon-registry: R6 abortar a uno no cancela a los demás', async () => {
  reiniciar(BASE);
  const ctrl = new AbortController();
  const a = resolveIconRaw('mdi', 'lento', ctrl.signal);
  const b = resolveIconRaw('mdi', 'lento');
  ctrl.abort();
  await assertRejects(() => a, DOMException);
  assert((await b)?.includes('lento'));
  assertEquals(pedidos.filter((p) => p.endsWith('mdi/lento.svg')).length, 1, 'un solo fetch');
});

denoTest('icon-registry: fin (restaura console.warn)', () => {
  console.warn = warnOriginal;
  localStorage.clear();
});

export default lista();
