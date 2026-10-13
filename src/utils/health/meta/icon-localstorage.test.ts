// icon-localstorage.test.ts — QUÉ hace <iswc-icon> con localStorage (src/components/_shared/icon-loader.ts),
// caja negra sobre `resolveIconRaw` con red y storage simulados. Cadena: memoria → localStorage →
// carpeta local de la app → API de Iconify; todo SVG resuelto se persiste.
//   P1 un ícono resuelto por la API queda en localStorage y la siguiente página (memoria vacía) lo lee
//      de ahí sin ningún fetch.
//   P2 un ícono resuelto desde la carpeta local también se persiste.
//   P3 un fallo (null) NO se persiste: la siguiente página vuelve a intentarlo.
//   P4 `clearPersistedIcons()` borra solo las claves `iswc-icon:*`.
import { assert, assertEquals } from 'jsr:@std/assert@1';

// Deno trae un localStorage real (no se puede sustituir): se usa ese, limpio antes de empezar.
const datos = {
  get: (k: string) => localStorage.getItem(k) ?? undefined,
  has: (k: string) => localStorage.getItem(k) !== null,
  set: (k: string, v: string) => localStorage.setItem(k, v),
  keys: () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? ''),
};
localStorage.clear();

const pedidos: string[] = [];
const svg = (marca: string) => `<svg viewBox="0 0 24 24"><path d="${marca}"/></svg>`;
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = String(input instanceof Request ? input.url : input);
  pedidos.push(url);
  if (url === 'https://app.example/assets/iconify.json') return Response.json({ v: 1, app: 'x', host: null, ruta: 'assets/iconify.json', base: 'iconify/', icons: { mdi: ['home'] } });
  if (url === 'https://app.example/assets/iconify/mdi/home.svg') return new Response(svg('local-home'));
  if (url.startsWith('https://api.iconify.design/solar/')) return new Response(svg(`api:${url.slice(27)}`));
  return new Response('', { status: 404 });
}) as typeof fetch;
(globalThis as Record<string, unknown>).__ISWC_ICONS__ = ['https://app.example/assets/iconify.json'];

const { resolveIconRaw, clearRawCache, clearPersistedIcons } = await import('../../../components/_shared/icon-loader.ts');

Deno.test('P1 lo que vino de la API queda en localStorage y luego no hay fetch', async () => {
  pedidos.length = 0;
  const a = await resolveIconRaw('solar', 'bolt');
  assert(a?.includes('api:solar/bolt.svg'));
  assertEquals(datos.get('iswc-icon:solar:bolt'), a);
  clearRawCache(); // "otra página": memoria vacía, storage lleno
  pedidos.length = 0;
  assertEquals(await resolveIconRaw('solar', 'bolt'), a);
  assertEquals(pedidos, [], 'sin ningún fetch: sale de localStorage');
});

Deno.test('P2 lo local también se persiste', async () => {
  const a = await resolveIconRaw('mdi', 'home');
  assert(a?.includes('local-home'));
  assertEquals(datos.get('iswc-icon:mdi:home'), a);
});

Deno.test('P3 un fallo no se persiste', async () => {
  assertEquals(await resolveIconRaw('mdi', 'no-existe'), null);
  assertEquals(datos.has('iswc-icon:mdi:no-existe'), false);
  clearRawCache();
  pedidos.length = 0;
  await resolveIconRaw('mdi', 'no-existe');
  assert(pedidos.length > 0, 'otra página vuelve a intentarlo');
});

Deno.test('P4 clearPersistedIcons borra solo iswc-icon:*', () => {
  datos.set('otra:clave', 'x');
  clearPersistedIcons();
  assertEquals(datos.keys().filter((k) => k.startsWith('iswc-icon:')), []);
  assertEquals(datos.get('otra:clave'), 'x');
});
