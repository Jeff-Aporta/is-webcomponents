/**
 * Guardián WHAT de los jueces opcionales (`vendor-distributions/testing/jueces.ts` y
 * `test-cooldown.ts`), con `fetch` simulado y un archivo de llaves temporal (nunca red):
 *   J1 sin llave JEV → no evalúa y dice por qué (nunca lanza).
 *   J2 JEV responde → evalúa con sus respuestas.
 *   J3 JEV sin saldo (402) → no evalúa y su entrada queda con cooldownHasta = ahora + 24 h.
 *   J4 en cooldown → ni siquiera llama a la red; con cooldownHasta: -1 vuelve a intentar.
 *   J5 juez LLM: salta el proveedor en cooldown, pone en cooldown al que falla por key y usa el siguiente.
 *   J6 capaOpcional: sin veredicto avisa con el motivo y no corre la aserción; exigirJuez salta.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { capaOpcional, exigirJuez, juzgarConLlm, preguntarJev } from '../../../vendor-distributions/testing/jueces.ts';
import { COOLDOWN_LLAVE_MS, olvidarCooldownsEnMemoria } from '../../../vendor-distributions/testing/test-cooldown.ts';

const AHORA = Date.parse('2026-10-12T12:00:00Z');
const respuesta = (status: number, cuerpo: unknown) => Promise.resolve(new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } }));
function archivo(doc: unknown): { ruta: string; leer: () => Record<string, unknown>; borrar: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'jueces-'));
  const ruta = join(dir, 'llaves.json');
  writeFileSync(ruta, JSON.stringify(doc));
  return { ruta, leer: () => JSON.parse(readFileSync(ruta, 'utf8')), borrar: () => rmSync(dir, { recursive: true, force: true }) };
}
const P = { util: { type: 'noul' as const, instructions: 'La respuesta es útil' } };

test('jueces: J1 sin llave JEV no evalúa y explica', async () => {
  const a = archivo({ proveedores: [] });
  try {
    const v = await preguntarJev({ rutaLlaves: a.ruta, fetchFn: () => { throw new Error('no debe llamar'); } }, 'x', P);
    assert.equal(v.evaluado, false);
    assert.match(v.evaluado ? '' : v.motivo, /sin llave/);
  } finally { a.borrar(); }
});

test('jueces: J2 JEV responde y J3 sin saldo pone cooldown de 24 h', async () => {
  olvidarCooldownsEnMemoria();
  const a = archivo({ jev: { apiKey: 'k', model: 'jev-latest' } });
  try {
    const ok = await preguntarJev({ rutaLlaves: a.ruta, fetchFn: () => respuesta(200, { model: 'jev-1.13.0', answers: { util: { type: 'noul', noul: 0.9 } } }) }, 'x', P);
    assert.ok(ok.evaluado && ok.respuestas.util?.noul === 0.9, 'J2');
    const sin = await preguntarJev({ rutaLlaves: a.ruta, now: () => AHORA, fetchFn: () => respuesta(402, { error: { message: 'insufficient balance' } }) }, 'x', P);
    assert.equal(sin.evaluado, false, 'J3 no evalúa');
    const jev = a.leer().jev as { cooldownHasta?: string };
    assert.equal(Date.parse(jev.cooldownHasta ?? ''), AHORA + COOLDOWN_LLAVE_MS, 'J3 cooldown escrito en el archivo');
  } finally { a.borrar(); }
});

test('jueces: J4 en cooldown no llama a la red; con -1 reintenta', async () => {
  olvidarCooldownsEnMemoria();
  const a = archivo({ jev: { apiKey: 'k', cooldownHasta: new Date(AHORA + 3600_000).toISOString() } });
  try {
    let llamadas = 0;
    const f = () => { llamadas++; return respuesta(200, { answers: { util: { type: 'noul', noul: 1 } } }); };
    const v = await preguntarJev({ rutaLlaves: a.ruta, now: () => AHORA, fetchFn: f }, 'x', P);
    assert.ok(!v.evaluado && /cooldown/.test(v.motivo) && llamadas === 0, 'J4 en cooldown');
    const doc = a.leer();
    (doc.jev as Record<string, unknown>).cooldownHasta = -1;
    writeFileSync(a.ruta, JSON.stringify(doc));
    const otra = await preguntarJev({ rutaLlaves: a.ruta, now: () => AHORA, fetchFn: f }, 'x', P);
    assert.ok(otra.evaluado && llamadas === 1, 'J4 con -1 reintenta');
  } finally { a.borrar(); }
});

test('jueces: J5 juez LLM salta cooldown, enfría el que falla por key y usa el siguiente', async () => {
  olvidarCooldownsEnMemoria();
  const a = archivo({ proveedores: [
    { nombre: 'frio', apiKey: 'k1', model: 'm', baseUrl: 'https://frio.test/v1', cooldownHasta: new Date(AHORA + 1000).toISOString() },
    { nombre: 'malo', apiKey: 'k2', model: 'm', baseUrl: 'https://malo.test/v1' },
    { nombre: 'bueno', apiKey: 'k3', model: 'm', baseUrl: 'https://bueno.test/v1' },
  ] });
  try {
    const hosts: string[] = [];
    const f = (u: string | URL | Request) => {
      const host = new URL(String(u)).hostname.split('.')[0]!;
      hosts.push(host);
      return host === 'malo' ? respuesta(401, { error: { message: 'invalid key' } }) : respuesta(200, { choices: [{ message: { content: '<think>…</think>```json\n{"pertinente": true}\n```' } }] });
    };
    const v = await juzgarConLlm({ rutaLlaves: a.ruta, now: () => AHORA, fetchFn: f }, 'Devuelve {pertinente}.', 'texto');
    assert.ok(v.evaluado && v.juez === 'bueno', 'J5 usa el siguiente');
    assert.deepEqual(v.evaluado ? v.respuestas : null, { pertinente: true });
    assert.deepEqual(hosts, ['malo', 'bueno'], 'J5 el que está en cooldown no se llama');
    const malo = (a.leer().proveedores as Array<{ nombre: string; cooldownHasta?: string }>).find((p) => p.nombre === 'malo');
    assert.ok(malo?.cooldownHasta, 'J5 el que falló por key queda en cooldown');
  } finally { a.borrar(); }
});

test('jueces: J6 capaOpcional avisa y no aplica; exigirJuez salta', () => {
  const avisos: string[] = [];
  let aplicada = false;
  const corrio = capaOpcional({ aviso: (m) => avisos.push(m) }, 'jev', { evaluado: false, motivo: 'sin saldo' }, () => { aplicada = true; });
  assert.ok(!corrio && !aplicada && /sin saldo/.test(avisos[0] ?? ''), 'J6 capa');
  assert.throws(() => exigirJuez({ saltar: (m: string): never => { throw new Error(`SALTO ${m}`); } }, 'jev', { evaluado: false, motivo: 'caído' }), /SALTO .*caído/);
});

test('jueces: J7 Stagehand respeta el cooldown: leer lo salta, el barrido enfría al que falla, la elección opcional no lanza', async () => {
  olvidarCooldownsEnMemoria();
  const { leerProveedoresDeArchivo, elegirProveedorOpcional } = await import('../../../vendor-distributions/testing/stagehand.ts');
  const a = archivo({ proveedores: [
    { nombre: 'frio', apiKey: 'k1', model: 'm', cooldownHasta: new Date(Date.now() + 3600_000).toISOString() },
    { nombre: 'pobre', apiKey: 'k2', model: 'm' },
    { nombre: 'listo', apiKey: 'k3', model: 'm', cooldownHasta: -1 },
  ] });
  try {
    const pila = leerProveedoresDeArchivo(a.ruta, { log: () => {} });
    assert.deepEqual(pila.map((p) => p.nombre), ['pobre', 'listo'], 'J7 el que está en cooldown no entra; -1 sí');
    const r = await elegirProveedorOpcional({
      proveedores: pila, rutaLlaves: a.ruta, log: () => {}, env: {},
      sondear: (p) => Promise.resolve(p.nombre === 'pobre' ? { nombre: p.nombre, ok: false, causa: 'sin saldo (HTTP 402)', ms: 1, definitivo: true } : { nombre: p.nombre, ok: true, causa: 'ok', ms: 1 }),
    });
    assert.equal(r.proveedor?.nombre, 'listo');
    const pobre = (a.leer().proveedores as Array<{ nombre: string; cooldownHasta?: unknown }>).find((p) => p.nombre === 'pobre');
    assert.equal(typeof pobre?.cooldownHasta, 'string', 'J7 el que falló por saldo queda en cooldown');
    const nada = await elegirProveedorOpcional({ proveedores: [], log: () => {}, env: {} });
    assert.ok(nada.proveedor === null && 'motivo' in nada && /ningún proveedor/.test(nada.motivo), 'J7 sin proveedores: motivo, sin lanzar');
  } finally { a.borrar(); }
});

test('jueces: J8 umbrales estándar: < 0.3 rechazo, 0.3-0.5 dudoso (solo aviso), >= 0.5 cumple', async () => {
  const { veredictoProbabilidad, UMBRAL_RECHAZO, UMBRAL_DUDA } = await import('../../../vendor-distributions/testing/jueces.ts');
  assert.equal(UMBRAL_RECHAZO, 0.3);
  assert.equal(UMBRAL_DUDA, 0.5);
  assert.deepEqual([0.1, 0.29, 0.3, 0.42, 0.5, 0.97].map(veredictoProbabilidad), ['rechazo', 'rechazo', 'dudoso', 'dudoso', 'cumple', 'cumple']);
});
