// test-cooldown.test.ts — garantías del cooldown de tests (src/cdn/tools/test-cooldown.ts).
//   C1 verde de 1 min -> 60 min de skip; a los 61 min vuelve a correr.
//   C2 un rojo guarda until -1 (auditado, sin cooldown) y se relanza.
//   C3 la memoria persiste en el JSON.
//   C4 `disabled` corre todo y no escribe.
//   C5 proporcional (x60): 1 min -> 60 min, 1 s -> 1 min, 13 ms -> 780 ms.
import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { COOLDOWN_FACTOR, cooldownMs, createTestCooldown, testId } from '../../../cdn/tools/test-cooldown.ts';

const MIN = 60_000;
const HORA = 60 * MIN;

Deno.test('test-cooldown: verde de 1 min -> 60 min de skip (x60); rojo corre siempre; memoria en JSON', async () => {
  const dir = await Deno.makeTempDir({ prefix: 'cooldown-' });
  const dbPath = join(dir, 'db.json');
  let t = 1_000_000;
  const now = () => t;
  const id = testId('tests\\x.test.ts', 'mi test');
  assertEquals(id, 'tests/x.test.ts::mi test');

  const cd = createTestCooldown({ dbPath, now });
  const r1 = await cd.run(id, () => { t += MIN; });
  assert(!r1.skipped && r1.durationMs === MIN, 'C1 primera corrida ejecuta y mide 1 min');
  t += 59 * MIN;
  assert(cd.check(id).skip, 'C1 a los 59 min se salta');
  t += 2 * MIN;
  assert(!cd.check(id).skip, 'C1 a los 61 min vuelve a correr');

  await cd.run(id, () => { t += MIN; });
  assert(createTestCooldown({ dbPath, now }).check(id).skip, 'C3 otra instancia lee el JSON');

  await assertRejects(() => createTestCooldown({ dbPath, now: () => t + 61 * MIN }).run(id, () => { throw new Error('rojo'); }));
  assert(!createTestCooldown({ dbPath, now }).check(id).skip, 'C2 tras un rojo no hay cooldown');
  const rojo = createTestCooldown({ dbPath, now }).entries()[id];
  assertEquals(rojo.until, -1, 'C2 el rojo queda registrado con until -1');
  assertEquals(rojo.okAt, null, 'C2 el rojo no tiene okAt');
  assert(typeof rojo.failAt === 'number', 'C2 el rojo registra failAt');

  const offPath = join(dir, 'off.json');
  const off = createTestCooldown({ dbPath: offPath, now, disabled: true });
  await off.run(id, () => { t += MIN; });
  assert(!off.check(id).skip && !existsSync(offPath), 'C4 disabled no se salta ni escribe');

  assertEquals(COOLDOWN_FACTOR, 60, 'C5 factor estándar x60');
  assertEquals(cooldownMs(MIN), HORA, 'C5 1 min -> 60 min');
  assertEquals(cooldownMs(1_000), MIN, 'C5 1 s -> 1 min');
  assertEquals(cooldownMs(13), 780, 'C5 13 ms -> 780 ms');
  assertEquals(cooldownMs(HORA, 0.5), 30 * MIN, 'C5 factor inyectable (x0,5 = regla vieja)');
});
