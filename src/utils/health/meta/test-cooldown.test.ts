// test-cooldown.test.ts — garantías del cooldown de tests (src/cdn/tools/test-cooldown.ts).
//   C1 verde de 1 min -> 30 min de skip; a los 31 min vuelve a correr.
//   C2 un rojo borra la entrada y se relanza.
//   C3 la memoria persiste en el JSON.
//   C4 `disabled` corre todo y no escribe.
import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createTestCooldown, testId } from '../../../cdn/tools/test-cooldown.ts';

const MIN = 60_000;

Deno.test('test-cooldown: verde de 1 min -> 30 min de skip; rojo corre siempre; memoria en JSON', async () => {
  const dir = await Deno.makeTempDir({ prefix: 'cooldown-' });
  const dbPath = join(dir, 'db.json');
  let t = 1_000_000;
  const now = () => t;
  const id = testId('tests\\x.test.ts', 'mi test');
  assertEquals(id, 'tests/x.test.ts::mi test');

  const cd = createTestCooldown({ dbPath, now });
  const r1 = await cd.run(id, () => { t += MIN; });
  assert(!r1.skipped && r1.durationMs === MIN, 'C1 primera corrida ejecuta y mide 1 min');
  t += 29 * MIN;
  assert(cd.check(id).skip, 'C1 a los 29 min se salta');
  t += 2 * MIN;
  assert(!cd.check(id).skip, 'C1 a los 31 min vuelve a correr');

  await cd.run(id, () => { t += MIN; });
  assert(createTestCooldown({ dbPath, now }).check(id).skip, 'C3 otra instancia lee el JSON');

  await assertRejects(() => createTestCooldown({ dbPath, now: () => t + 31 * MIN }).run(id, () => { throw new Error('rojo'); }));
  assert(!createTestCooldown({ dbPath, now }).check(id).skip, 'C2 tras un rojo no hay cooldown');

  const offPath = join(dir, 'off.json');
  const off = createTestCooldown({ dbPath: offPath, now, disabled: true });
  await off.run(id, () => { t += MIN; });
  assert(!off.check(id).skip && !existsSync(offPath), 'C4 disabled no se salta ni escribe');
});
