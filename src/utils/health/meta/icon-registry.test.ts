// icon-registry.test.ts — QUÉ hace la cadena de mapas de íconos de <iswc-icon> (src/components/_shared/icon-loader.ts),
// como caja negra sobre `resolveIconRaw` con la red simulada.
//   R1 un ícono de un mapa registrado sale de la carpeta junto a su iconify.json.
//   R2 la cola global `__ISWC_ICONS__` llenada ANTES de cargar el módulo se respeta (registradores de apps).
//   R3 si la carpeta junto al json no es accesible, se usa la misma ruta bajo el `host` publicado.
//   R4 la cadena va en orden de registro: la primera app que tiene el ícono gana; el kit va al final.
//   R5 si ningún mapa lo sirve (no está o el archivo da 404), cae a la API de Iconify.
//   R6 un mapa registrado dos veces se pide una sola vez, y solo cuando hace falta.
import { assert, assertEquals } from 'jsr:@std/assert@1';

type Ruta = (url: string) => Response | Promise<Response>;
const rutas = new Map<string, Ruta>();
const pedidos: string[] = [];
const svg = (marca: string) => `<svg viewBox="0 0 24 24"><path d="${marca}"/></svg>`;
const mapa = (host: string | null, icons: Record<string, string[]>) => ({ v: 1, app: 'x', host, ruta: 'assets/iconify.json', base: 'iconify/', icons });

globalThis.fetch = (async (input: string | URL | Request) => {
  const url = String(input instanceof Request ? input.url : input);
  pedidos.push(url);
  const r = rutas.get(url);
  if (r) return r(url);
  if (url.startsWith('https://api.iconify.design/')) return new Response(svg(`api:${url.slice(27)}`));
  return new Response('', { status: 404 });
}) as typeof fetch;

// R2: el registrador de una app corrió antes que el kit.
rutas.set('https://temprana.example/assets/iconify.json', () => Response.json(mapa(null, { mdi: ['bell'] })));
rutas.set('https://temprana.example/assets/iconify/mdi/bell.svg', () => new Response(svg('temprana')));
(globalThis as Record<string, unknown>).__ISWC_ICONS__ = ['https://temprana.example/assets/iconify.json'];

const { registerIcons, resolveIconRaw } = await import('../../../components/_shared/icon-loader.ts');

Deno.test('icon-registry: R1 mapa registrado → carpeta junto al json; R2 la cola previa a la carga cuenta', async () => {
  rutas.set('https://app1.example/assets/iconify.json', () => Response.json(mapa('https://app1.example/', { mdi: ['home'] })));
  rutas.set('https://app1.example/assets/iconify/mdi/home.svg', () => new Response(svg('app1')));
  registerIcons('https://app1.example/assets/iconify.json');
  assert((await resolveIconRaw('mdi', 'home'))?.includes('app1'), 'R1');
  assert((await resolveIconRaw('mdi', 'bell'))?.includes('temprana'), 'R2');
});

Deno.test('icon-registry: R3 carpeta inaccesible → misma ruta bajo el host publicado', async () => {
  // El json se sirvió desde un espejo (CDN) cuya carpeta de SVG falla; el host (Pages) sí responde.
  rutas.set('https://espejo.example/app2/assets/iconify.json', () => Response.json(mapa('https://app2.example/', { tabler: ['bolt'] })));
  rutas.set('https://espejo.example/app2/assets/iconify/tabler/bolt.svg', () => { throw new TypeError('CORS'); });
  rutas.set('https://app2.example/assets/iconify/tabler/bolt.svg', () => new Response(svg('host2')));
  registerIcons('https://espejo.example/app2/assets/iconify.json');
  assert((await resolveIconRaw('tabler', 'bolt'))?.includes('host2'), 'R3');
});

Deno.test('icon-registry: R4 orden de registro — la primera app con el ícono gana', async () => {
  rutas.set('https://a4.example/assets/iconify.json', () => Response.json(mapa(null, { solar: ['sun'] })));
  rutas.set('https://b4.example/assets/iconify.json', () => Response.json(mapa(null, { solar: ['sun'] })));
  rutas.set('https://a4.example/assets/iconify/solar/sun.svg', () => new Response(svg('a4')));
  rutas.set('https://b4.example/assets/iconify/solar/sun.svg', () => new Response(svg('b4')));
  registerIcons('https://a4.example/assets/iconify.json');
  registerIcons('https://b4.example/assets/iconify.json');
  assert((await resolveIconRaw('solar', 'sun'))?.includes('a4'), 'R4');
});

Deno.test('icon-registry: R5 sin mapa que lo sirva → API de Iconify', async () => {
  rutas.set('https://a5.example/assets/iconify.json', () => Response.json(mapa(null, { fluent: ['roto'] })));
  registerIcons('https://a5.example/assets/iconify.json'); // declara el ícono pero el archivo da 404
  assert((await resolveIconRaw('fluent', 'roto'))?.includes('api:fluent/roto.svg'), 'R5 archivo 404 → API');
  assert((await resolveIconRaw('fluent', 'nadie-lo-tiene'))?.includes('api:fluent/nadie-lo-tiene.svg'), 'R5 en ningún mapa → API');
});

Deno.test('icon-registry: R6 mismo mapa dos veces → un solo pedido, y no antes de resolver un ícono', async () => {
  const url = 'https://a6.example/assets/iconify.json';
  rutas.set(url, () => Response.json(mapa(null, { mdi: ['six'] })));
  rutas.set('https://a6.example/assets/iconify/mdi/six.svg', () => new Response(svg('a6')));
  registerIcons(url);
  registerIcons(url);
  assertEquals(pedidos.filter((p) => p === url).length, 0, 'R6 perezoso');
  assert((await resolveIconRaw('mdi', 'six'))?.includes('a6'));
  await resolveIconRaw('mdi', 'otro-six');
  assertEquals(pedidos.filter((p) => p === url).length, 1, 'R6 un solo pedido');
});

Deno.test('icon-registry: R7 SVG incrustado en el mapa → se pinta sin pedir el archivo', async () => {
  const url = 'https://a7.example/assets/iconify.json';
  rutas.set(url, () => Response.json({ ...mapa(null, { mdi: ['siete'] }), svg: { mdi: { siete: svg('incrustado7') } } }));
  registerIcons(url);
  assert((await resolveIconRaw('mdi', 'siete'))?.includes('incrustado7'), 'R7');
  assertEquals(pedidos.filter((p) => p.endsWith('/siete.svg')), [], 'R7 cero pedidos de archivo');
});
