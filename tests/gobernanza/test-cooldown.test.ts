// test-cooldown.test.ts — garantías del cooldown de tests (src/vendor-distributions/shared/testing/test-cooldown.ts).
//   C1 verde de 1 min -> 24 h de skip; a los 1441 min vuelve a correr.
//   C2 un rojo guarda until -1 (auditado, sin cooldown) y se relanza.
//   C3 la memoria persiste en el JSON.
//   C4 `disabled` corre todo y no escribe.
//   C5 proporcional (x1440): 1 min -> 24 h, 1 s -> 24 min, 13 ms -> 18.720 ms.
//   C6 varias instancias sobre el mismo JSON: record() fusiona sobre el archivo fresco, nunca pisa (gate + runner).
//   C7 factorCooldown por prueba estira la ventana: x3 -> 1 min verde = 72 h (la entrada lo anota); el rojo no cambia.
//   Q1-Q3 la cola estándar (runQueue, testConcurrency) vive en el mismo archivo.
import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { COOLDOWN_FACTOR, cooldownMs, createTestCooldown, runQueue, TEST_CONCURRENCY, testConcurrency, testId } from '../../src/vendor-distributions/shared/testing/test-cooldown.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const denoTest = denoTestCon(test);


const MIN = 60_000;
const HORA = 60 * MIN;

denoTest('test-cooldown: verde de 1 min -> 24 h de skip (x1440); rojo corre siempre; memoria en JSON', async () => {
  const dir = await Deno.makeTempDir({ prefix: 'cooldown-' });
  const dbPath = join(dir, 'db.json');
  let t = 1_000_000;
  const now = () => t;
  const id = testId('tests\\x.test.ts', 'mi test');
  assertEquals(id, 'tests/x.test.ts::mi test');

  const cd = createTestCooldown({ dbPath, now });
  const r1 = await cd.run(id, () => { t += MIN; });
  assert(!r1.skipped && r1.durationMs === MIN, 'C1 primera corrida ejecuta y mide 1 min');
  t += 1439 * MIN;
  assert(cd.check(id).skip, 'C1 a los 1439 min se salta');
  t += 2 * MIN;
  assert(!cd.check(id).skip, 'C1 a los 1441 min vuelve a correr');

  await cd.run(id, () => { t += MIN; });
  assert(createTestCooldown({ dbPath, now }).check(id).skip, 'C3 otra instancia lee el JSON');
  assertEquals(createTestCooldown({ dbPath, now }).entries()[id].cooldownMin, 1440, 'C5 el verde anota los minutos de cooldown (1 min x1440 = 1440 min)');

  await assertRejects(() => createTestCooldown({ dbPath, now: () => t + 1441 * MIN }).run(id, () => { throw new Error('rojo'); }));
  assert(!createTestCooldown({ dbPath, now }).check(id).skip, 'C2 tras un rojo no hay cooldown');
  const rojo = createTestCooldown({ dbPath, now }).entries()[id];
  assertEquals(rojo.until, -1, 'C2 el rojo queda registrado con until -1');
  assertEquals(rojo.okAt, null, 'C2 el rojo no tiene okAt');
  assert(typeof rojo.failAt === 'number', 'C2 el rojo registra failAt');

  const offPath = join(dir, 'off.json');
  const off = createTestCooldown({ dbPath: offPath, now, disabled: true });
  await off.run(id, () => { t += MIN; });
  assert(!off.check(id).skip && !existsSync(offPath), 'C4 disabled no se salta ni escribe');

  assertEquals(COOLDOWN_FACTOR, 1440, 'C5 factor estándar x1440');
  assertEquals(cooldownMs(MIN), 24 * HORA, 'C5 1 min -> 24 h');
  assertEquals(cooldownMs(1_000), 24 * MIN, 'C5 1 s -> 24 min');
  assertEquals(cooldownMs(13), 18_720, 'C5 13 ms -> 18.720 ms');
  assertEquals(cooldownMs(HORA, 0.5), 30 * MIN, 'C5 factor inyectable (x0,5 = regla vieja)');
});

denoTest('test-cooldown: C6 dos instancias sobre el mismo JSON no se pisan (record fusiona sobre el archivo fresco)', async () => {
  const dir = await Deno.makeTempDir({ prefix: 'cooldown-' });
  const dbPath = join(dir, 'db.json');
  let t = 1_000_000;
  const now = () => t;
  const A = createTestCooldown({ dbPath, now });
  A.check('x'); // A carga (caché vacía) y se queda viva, como el gate del sync.
  const B = createTestCooldown({ dbPath, now });
  for (let i = 0; i < 5; i++) B.record(`B${i}`, 1000, true); // el runner (otro proceso) graba lo suyo.
  A.record('A', 500, true); // la instancia vieja graba después: antes pisaba todo lo de B.
  const fresco = createTestCooldown({ dbPath, now }).entries();
  assertEquals(Object.keys(fresco).sort(), ['A', 'B0', 'B1', 'B2', 'B3', 'B4'], 'C6 el archivo conserva lo de ambas');
  assertEquals(Object.keys(A.entries()).length, 6, 'C6 entries() también lee fresco');
  assert(B.check('B0').skip, 'C6 la caché de check sigue sirviendo');
  t += 1000 * 1440 + 1;
  assert(!createTestCooldown({ dbPath, now }).check('B0').skip);
});

denoTest('test-cooldown: C7 factorCooldown x3 -> 1 min verde = 72 h; sin factor sigue en 24 h', async () => {
  const dir = await Deno.makeTempDir({ prefix: 'cooldown-' });
  const dbPath = join(dir, 'db.json');
  let t = 1_000_000;
  const now = () => t;
  const cd = createTestCooldown({ dbPath, now });
  cd.record('openai', MIN, true, 3);
  cd.record('normal', MIN, true);
  const e = createTestCooldown({ dbPath, now }).entries();
  assertEquals(e.openai.until - t, 72 * HORA, 'C7 x3: 1 min -> 72 h');
  assertEquals(e.openai.cooldownMin, 3 * 1440, 'C7 cooldownMin anota la ventana estirada');
  assertEquals(e.openai.factorCooldown, 3, 'C7 la entrada anota el factor');
  assertEquals(e.normal.until - t, 24 * HORA, 'C7 sin factor: 24 h');
  assertEquals(e.normal.factorCooldown, undefined, 'C7 factor 1 no se anota');
  t += 25 * HORA;
  const d = createTestCooldown({ dbPath, now });
  assert(d.check('openai').skip && !d.check('normal').skip, 'C7 a las 25 h la x3 sigue en cooldown y la normal ya corre');
  t += 48 * HORA;
  assert(!createTestCooldown({ dbPath, now }).check('openai').skip, 'C7 a las 73 h la x3 vuelve a correr');
  cd.record('openai', MIN, false, 3);
  assertEquals(createTestCooldown({ dbPath, now }).entries().openai.until, -1, 'C7 el rojo no tiene cooldown aunque traiga factor');
});

// Cola estándar (antes test-queue.test.ts):
//   Q1 nunca más de `concurrency` a la vez (default 3) y llega a usarlos.
//   Q2 resultados en el orden de entrada.
//   Q3 testConcurrency: valor válido o 3.
denoTest('test-cooldown: Q1-Q3 cola estándar: 3 a la vez por defecto, orden de entrada, concurrencia configurable', async () => {
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

export default lista();
