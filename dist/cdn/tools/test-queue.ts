// OBSOLETO: nombre anterior de ISTestQueue.ts (vendorice ISTestQueue.ts).
// test-queue.ts — Cola estándar de tests de los proyectos is-*: N trabajadores
// (3 por defecto) toman la siguiente tarea apenas terminan la anterior.
//
// Transversal (Node y Deno), sin dependencias ni imports relativos.
// Vendor: copiar `dist/cdn/tools/test-queue.ts` al proyecto (ISS, ISW).
//
//   const res = await runQueue(tests, (t) => correr(t));      // 3 a la vez
//   const res = await runQueue(tests, correr, { concurrency: testConcurrency(env.X) });
//
// Para runners que delegan el paralelismo (p. ej. `deno test --parallel`),
// `testConcurrency()` es el valor a pasar (DENO_JOBS). El entorno lo cambia
// con TEST_CONCURRENCY=<n>.

import process from "node:process";

/** Tests a la vez por defecto en todos los proyectos is-*. */
export const TEST_CONCURRENCY = 3;

/** Concurrencia efectiva: el valor dado (o env TEST_CONCURRENCY) si es un entero >= 1; si no, 3. */
export function testConcurrency(value: string | number | null | undefined = process.env.TEST_CONCURRENCY): number {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= 1 ? n : TEST_CONCURRENCY;
}

/**
 * Corre `worker` sobre cada item con a lo sumo `concurrency` a la vez.
 * Devuelve los resultados en el orden de `items` (no en el de terminación).
 * Si un worker lanza, `runQueue` rechaza; captura dentro del worker para
 * seguir con el resto.
 */
export async function runQueue<T, R>(
    items: readonly T[],
    worker: (item: T, index: number) => Promise<R>,
    opts: { concurrency?: number } = {},
): Promise<R[]> {
    const out = new Array<R>(items.length);
    let siguiente = 0;
    const n = Math.min(testConcurrency(opts.concurrency), items.length);
    await Promise.all(Array.from({ length: n }, async () => {
        while (siguiente < items.length) {
            const i = siguiente++;
            out[i] = await worker(items[i], i);
        }
    }));
    return out;
}
