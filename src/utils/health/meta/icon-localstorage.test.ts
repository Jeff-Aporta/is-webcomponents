// icon-localstorage.test.ts — QUÉ hace <iswc-icon> con localStorage (src/components/_shared/icon-loader.ts),
// caja negra sobre `resolveIconRaw` con red simulada. Cadena: memoria → localStorage → web publicada de
// la app (`data-icons`) → API de Iconify; todo SVG resuelto se persiste bajo `iswc:icon:`.
//   P1 un ícono resuelto por la API queda en localStorage y la siguiente página (memoria vacía) lo lee
//      de ahí sin ningún fetch.
//   P2 un ícono resuelto desde la web publicada también se persiste.
//   P3 un fallo (null) NO se persiste: la siguiente página vuelve a intentarlo.
//   P4 `clearPersistedIcons()` borra solo las claves `iswc:icon:*`.
//   P5 vida máxima 15 días: un SVG guardado hace 16 días no sirve (se vuelve a pedir y se renueva) y
//      `purgarIconosVencidos()` lo retira del storage.
//   P6 `clearIswcStorage()` (lo que usa <iswc-prefs-clear>) borra los íconos guardados Y la memoria:
//      la siguiente resolución vuelve a la red, como en la primera carga.
import { assert, assertEquals } from 'jsr:@std/assert@1';


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
const llaves = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '');

const pedidos: string[] = [];
const svg = (marca: string) => `<svg viewBox="0 0 24 24"><path d="${marca}"/></svg>`;
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = String(input instanceof Request ? input.url : input);
  pedidos.push(url);
  if (url === 'https://app.example/assets/iconify/mdi/home.svg') return new Response(svg('local-home'));
  if (url.startsWith('https://api.iconify.design/solar/')) return new Response(svg(`api:${url.slice(27)}`));
  return new Response('', { status: 404 });
}) as typeof fetch;
const g = globalThis as { document?: { documentElement: { dataset: Record<string, string> } } };
g.document = { documentElement: { dataset: { icons: 'https://app.example/assets/iconify/' } } };
const warnOriginal = console.warn;
console.warn = () => {}; // los avisos «falta en local» los cubre icon-registry

const { resolveIconRaw, clearRawCache, clearPersistedIcons, purgarIconosVencidos, LS_TTL_MS } = await import('../../../components/_shared/icon-loader.ts');
const { clearIswcStorage } = await import('../../../core/iswc-storage.ts');

Deno.test('P1 lo que vino de la API queda en localStorage y luego no hay fetch', async () => {
  pedidos.length = 0;
  const a = await resolveIconRaw('solar', 'bolt');
  assert(a?.includes('api:solar/bolt.svg'));
  assertEquals(JSON.parse(localStorage.getItem('iswc:icon:solar:bolt')!).s, a);
  clearRawCache(); // "otra página": memoria vacía, storage lleno
  pedidos.length = 0;
  assertEquals(await resolveIconRaw('solar', 'bolt'), a);
  assertEquals(pedidos, [], 'sin ningún fetch: sale de localStorage');
});

Deno.test('P2 lo de la web publicada también se persiste', async () => {
  const a = await resolveIconRaw('mdi', 'home');
  assert(a?.includes('local-home'));
  assertEquals(JSON.parse(localStorage.getItem('iswc:icon:mdi:home')!).s, a);
});

Deno.test('P3 un fallo no se persiste', async () => {
  assertEquals(await resolveIconRaw('mdi', 'no-existe'), null);
  assertEquals(localStorage.getItem('iswc:icon:mdi:no-existe'), null);
  clearRawCache();
  pedidos.length = 0;
  await resolveIconRaw('mdi', 'no-existe');
  assert(pedidos.length > 0, 'otra página vuelve a intentarlo');
});

Deno.test('P4 clearPersistedIcons borra solo iswc:icon:*', () => {
  localStorage.setItem('otra:clave', 'x');
  localStorage.setItem('iswc:app-cfg', '{}');
  clearPersistedIcons();
  assertEquals(llaves().filter((k) => k.startsWith('iswc:icon:')), []);
  assertEquals(localStorage.getItem('otra:clave'), 'x');
  assertEquals(localStorage.getItem('iswc:app-cfg'), '{}');
});

Deno.test('P5 vida máxima de 15 días y purga', async () => {
  clearRawCache();
  const viejo = Date.now() - LS_TTL_MS - 24 * 60 * 60 * 1000; // 16 días
  localStorage.setItem('iswc:icon:solar:viejo', JSON.stringify({ t: viejo, s: svg('viejo') }));
  localStorage.setItem('iswc:icon:solar:fresco', JSON.stringify({ t: Date.now(), s: svg('fresco') }));
  pedidos.length = 0;
  const r = await resolveIconRaw('solar', 'viejo');
  assert(r?.includes('api:solar/viejo.svg'), 'vencido: se vuelve a pedir');
  assert(JSON.parse(localStorage.getItem('iswc:icon:solar:viejo')!).t > viejo, 'y se renueva la fecha');
  localStorage.setItem('iswc:icon:solar:viejo2', JSON.stringify({ t: viejo, s: svg('viejo2') }));
  assertEquals(purgarIconosVencidos(), 1);
  assertEquals(localStorage.getItem('iswc:icon:solar:viejo2'), null);
  assert(localStorage.getItem('iswc:icon:solar:fresco') !== null, 'lo fresco se queda');
});

Deno.test('P6 clearIswcStorage deja los íconos como en la primera carga', async () => {
  await resolveIconRaw('solar', 'sol');
  assert(localStorage.getItem('iswc:icon:solar:sol') !== null);
  const r = clearIswcStorage();
  assert(r.local.includes('iswc:icon:solar:sol'));
  assert(r.memorias >= 1, 'vació la caché en memoria del resolvedor');
  assertEquals(llaves().filter((k) => k.startsWith('iswc:')), []);
  assertEquals(localStorage.getItem('otra:clave'), 'x', 'lo ajeno al kit no se toca');
  pedidos.length = 0;
  await resolveIconRaw('solar', 'sol');
  assertEquals(pedidos.length, 2, 'vuelve a la red: web publicada (404) y luego la API');
  console.warn = warnOriginal;
  localStorage.clear();
});
