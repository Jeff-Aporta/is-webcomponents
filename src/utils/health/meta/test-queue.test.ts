// test-queue.test.ts — garantías de la cola estándar (src/cdn/tools/test-queue.ts).
//   Q1 nunca más de `concurrency` a la vez (default 3) y llega a usarlos.
//   Q2 resultados en el orden de entrada.
//   Q3 testConcurrency: valor válido o 3.
import { assertEquals } from 'jsr:@std/assert@1';
import { runQueue, TEST_CONCURRENCY, testConcurrency } from '../../../cdn/tools/test-queue.ts';

Deno.test('test-queue: 3 a la vez por defecto, orden de entrada, concurrencia configurable', async () => {
  let activos = 0, pico = 0;
  const items = [50, 10, 30, 5, 20, 1, 15];
  const res = await runQueue(items, async (ms, i) => {
    pico = Math.max(pico, ++activos);
    await new Promise((r) => setTimeout(r, ms));
    activos--;
    return i;
  });
  assertEquals(pico, TEST_CONCURRENCY, 'Q1 usa exactamente 3 trabajadores');
  assertEquals(res, [0, 1, 2, 3, 4, 5, 6], 'Q2 orden de entrada');

  pico = 0;
  await runQueue(items, async () => { pico = Math.max(pico, ++activos); await new Promise((r) => setTimeout(r, 5)); activos--; }, { concurrency: 1 });
  assertEquals(pico, 1, 'Q1 concurrency 1 es serial');

  assertEquals(testConcurrency('5'), 5);
  assertEquals(testConcurrency(undefined), 3);
  assertEquals(testConcurrency('x'), 3);
  assertEquals(testConcurrency(0), 3);
});
