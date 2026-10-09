// icon-registry.test.ts — QUÉ hace <iswc-icon> para resolver un ícono (src/components/_shared/icon-loader.ts),
// como caja negra sobre `resolveIconRaw` con la red simulada. Dos fuentes: local o API.
//   R1 el ícono está en el mapa registrado de la app → se pide a su carpeta local (junto al json).
//   R2 la cola global `__ISWC_ICONS__` llenada ANTES de cargar el módulo se respeta (registrador del build).
//   R3 el ícono no está en el mapa → API de Iconify, sin tocar la carpeta local.
//   R4 está en el mapa pero el archivo local no responde → API de Iconify.
//   R5 un mapa registrado dos veces se pide una sola vez, y solo cuando hace falta.
import { assert, assertEquals } from 'jsr:@std/assert@1';

type Ruta = (url: string) => Response | Promise<Response>;
const rutas = new Map<string, Ruta>();
const pedidos: string[] = [];
const svg = (marca: string) => `<svg viewBox="0 0 24 24"><path d="${marca}"/></svg>`;
const mapa = (icons: Record<string, string[]>) => ({ v: 1, app: 'x', host: null, ruta: 'assets/iconify.json', base: 'iconify/', icons });

globalThis.fetch = (async (input: string | URL | Request) => {
  const url = String(input instanceof Request ? input.url : input);
  pedidos.push(url);
  const r = rutas.get(url);
  if (r) return r(url);
  if (url.startsWith('https://api.iconify.design/')) return new Response(svg(`api:${url.slice(27)}`));
  return new Response('', { status: 404 });
}) as typeof fetch;

// R2: el registrador de la app corrió antes que el kit.
rutas.set('https://app.example/assets/iconify.json', () => Response.json(mapa({ mdi: ['home', 'roto'], tabler: ['bolt'] })));
rutas.set('https://app.example/assets/iconify/mdi/home.svg', () => new Response(svg('local-home')));
rutas.set('https://app.example/assets/iconify/tabler/bolt.svg', () => new Response(svg('local-bolt')));
rutas.set('https://app.example/assets/iconify/mdi/roto.svg', () => { throw new TypeError('sin red'); });
(globalThis as Record<string, unknown>).__ISWC_ICONS__ = ['https://app.example/assets/iconify.json'];

const { registerIcons, resolveIconRaw, resolveIconSvg, hasIconLocal } = await import('../../../components/_shared/icon-loader.ts');

Deno.test('icon-registry: R1/R2 en el mapa → archivo local de la app', async () => {
  assert((await resolveIconRaw('mdi', 'home'))?.includes('local-home'), 'R1');
  assert((await resolveIconRaw('tabler', 'bolt'))?.includes('local-bolt'), 'R1 otro set');
  assertEquals(await resolveIconSvg('mdi', 'home'), 'https://app.example/assets/iconify/mdi/home.svg');
  assert(await hasIconLocal('mdi', 'home'));
});

Deno.test('icon-registry: R3 fuera del mapa → API, sin buscar en local', async () => {
  assert((await resolveIconRaw('fluent', 'cat-24-regular'))?.includes('api:fluent/cat-24-regular.svg'), 'R3');
  assertEquals(pedidos.filter((p) => p.includes('app.example/assets/iconify/fluent')), [], 'R3 cero pedidos locales');
  assertEquals(await resolveIconSvg('fluent', 'x'), 'https://api.iconify.design/fluent/x.svg');
  assert(!(await hasIconLocal('fluent', 'x')));
});

Deno.test('icon-registry: R4 en el mapa pero el archivo no responde → API', async () => {
  assert((await resolveIconRaw('mdi', 'roto'))?.includes('api:mdi/roto.svg'), 'R4');
});

Deno.test('icon-registry: R5 mismo mapa dos veces → un solo pedido, y no antes de resolver un ícono', async () => {
  const url = 'https://otra.example/assets/iconify.json';
  rutas.set(url, () => Response.json(mapa({ mdi: ['six'] })));
  rutas.set('https://otra.example/assets/iconify/mdi/six.svg', () => new Response(svg('six')));
  registerIcons(url);
  registerIcons(url);
  assertEquals(pedidos.filter((p) => p === url).length, 0, 'R5 perezoso');
  assert((await resolveIconRaw('mdi', 'six'))?.includes('six'));
  await resolveIconRaw('mdi', 'otro-six');
  assertEquals(pedidos.filter((p) => p === url).length, 1, 'R5 un solo pedido');
});
