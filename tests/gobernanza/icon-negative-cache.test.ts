// icon-negative-cache.test.ts — QUÉ hace <iswc-icon> con un ícono que NO se puede resolver
// (src/core/icon-loader.ts), caja negra sobre `resolveIconRaw` con la red simulada.
//   N1 un ícono que falla en local y en la API devuelve null y se pide UNA sola vez: el segundo
//      `resolveIconRaw` del mismo id no genera ningún fetch (caché negativo; evita el bucle de consola
//      cuando un componente se repinta por timer y la CSP bloquea la API).
//   N2 un abort NO se cachea: la siguiente petición sí vuelve a salir.
//   N3 `clearRawCache()` olvida el fallo y permite reintentar.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const denoTest = denoTestCon(test);


const pedidos: string[] = [];
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  pedidos.push(url);
  if (init?.signal?.aborted) throw Object.assign(new Error('abortado'), { name: 'AbortError' });
  return new Response('', { status: 404 }); // nada resuelve: ni local ni API
}) as typeof fetch;

const { resolveIconRaw, clearRawCache } = await import('../../src/core/icon-loader.ts');

denoTest('N1 un ícono irresoluble se pide una sola vez por página', async () => {
  pedidos.length = 0;
  assertEquals(await resolveIconRaw('solar', 'no-existe'), null);
  const primera = pedidos.length;
  assert(primera >= 1, 'la primera vez sí sale a la red');
  assertEquals(await resolveIconRaw('solar', 'no-existe'), null);
  assertEquals(await resolveIconRaw('solar', 'no-existe'), null);
  assertEquals(pedidos.length, primera, 'las siguientes no generan fetch');
});

denoTest('N2 un abort no se cachea como fallo', async () => {
  pedidos.length = 0;
  const ac = new AbortController();
  ac.abort();
  await resolveIconRaw('solar', 'abortado', ac.signal).catch(() => null);
  const antes = pedidos.length;
  await resolveIconRaw('solar', 'abortado').catch(() => null);
  assert(pedidos.length > antes, 'tras un abort, la siguiente petición vuelve a salir');
});

denoTest('N3 clearRawCache permite reintentar', async () => {
  pedidos.length = 0;
  await resolveIconRaw('mdi', 'tampoco');
  const n = pedidos.length;
  await resolveIconRaw('mdi', 'tampoco');
  assertEquals(pedidos.length, n);
  clearRawCache();
  await resolveIconRaw('mdi', 'tampoco');
  assert(pedidos.length > n);
});

export default lista();
