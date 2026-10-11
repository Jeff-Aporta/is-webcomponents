/**
 * Guardián WHAT del controlador compartido de Stagehand (`vendor-distributions/testing/stagehand.ts`),
 * con `fetch` simulado (nunca red):
 *   S1 la lista de proveedores se lee en orden; sin apiKey/model se descarta; baseUrl sin barra final.
 *   S2 la sonda interpreta 401/402/429, «insufficient balance» y respuesta vacía como SALTAR (con causa).
 *   S3 el barrido devuelve el primer OK y conserva las causas de los saltados; sin ninguno lanza con todas.
 *   S4 `E2E_LLM_PROVEEDOR` fuerza uno (sin sondar); uno que no está en la lista es error.
 *   S5 el elegido se cachea y se reutiliza sin sondar dentro del TTL; vencido o `E2E_LLM_BARRIDO=1`, se barre.
 *   S6 el generador pide el esquema en el prompt y normaliza el JSON (cercos, prosa alrededor).
 *   S7 fallback durante la corrida: saldo/key → siguiente proveedor sin tumbar la llamada; 5xx repetido →
 *      reintenta y luego pasa; el siguiente queda como actual (round-robin); sin ninguno, error con causas.
 *   S8 destino por protocolo: preferido si su sonda pasa; si no, el siguiente con motivo; sin ninguno, error;
 *      `unaVezPorProceso` decide una sola vez.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  barrerProveedores,
  crearGenerador,
  destinoPreferido,
  elegirProveedor,
  evaluarSondaLlm,
  leerProveedoresDeArchivo,
  normalizarJson,
  resolverDestino,
  sondearProveedor,
  unaVezPorProceso,
  validarProveedores,
} from '../../../vendor-distributions/testing/stagehand.ts';
import type { ProveedorLlm, SondaLlm } from '../../../vendor-distributions/testing/stagehand.ts';

const P = (nombre: string): ProveedorLlm => ({ nombre, apiKey: `k-${nombre}`, model: `m-${nombre}`, baseUrl: `https://${nombre}.test/v1` });
const sondaFija = (okPara: string[]) => (p: ProveedorLlm): Promise<SondaLlm> =>
  Promise.resolve({ nombre: p.nombre, ok: okPara.includes(p.nombre), causa: okPara.includes(p.nombre) ? 'ok' : 'sin saldo (HTTP 402)', ms: 1 });
const silencio = (): void => {};
const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** `fetch` simulado por host: cada proveedor responde con la secuencia dada (la última se repite). */
function fetchSimulado(porHost: Record<string, { status: number; cuerpo: unknown }[]>) {
  const llamadas: { host: string; body: Record<string, unknown> }[] = [];
  const f = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const host = url.hostname.split('.')[0]!;
    const cola = porHost[host] ?? [{ status: 500, cuerpo: {} }];
    const r = cola.length > 1 ? cola.shift()! : cola[0]!;
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    llamadas.push({ host, body: esObjeto(body) ? body : {} });
    return Promise.resolve(new Response(JSON.stringify(r.cuerpo), { status: r.status, headers: { 'content-type': 'application/json' } }));
  };
  return { fetchFn: f, llamadas };
}
const okCon = (texto: string): { status: number; cuerpo: unknown } => ({ status: 200, cuerpo: { choices: [{ message: { content: texto } }], usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 } } });

test('stagehand: S1 lista en orden, sin key se descarta, baseUrl normalizada', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sh-'));
  try {
    const ruta = join(dir, 'keys.json');
    writeFileSync(ruta, JSON.stringify({ proveedores: [
      { nombre: 'deepseek', apiKey: 'sk-1', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1/' },
      { nombre: 'sin-key', model: 'x' },
      { apiKey: 'sk-2', model: 'MiniMax-M3', baseUrl: 'https://api.minimax.io/v1', extra: { thinking: { type: 'disabled' } } },
      { nombre: 'deepseek', apiKey: 'dup', model: 'dup' },
    ] }));
    const lista = leerProveedoresDeArchivo(ruta);
    assert.deepEqual(lista.map((p) => p.nombre), ['deepseek', 'MiniMax-M3'], 'orden del archivo; sin key fuera; nombre repetido fuera; sin nombre → model');
    assert.equal(lista[0]!.baseUrl, 'https://api.deepseek.com/v1');
    assert.deepEqual(lista[1]!.extra, { thinking: { type: 'disabled' } });
    assert.equal(validarProveedores([{ apiKey: 'a', model: 'b' }])[0]!.baseUrl, 'https://api.openai.com/v1', 'default OpenAI');
    assert.deepEqual(leerProveedoresDeArchivo(join(dir, 'no.json')), []);
    writeFileSync(join(dir, 'mal.json'), '{');
    assert.deepEqual(leerProveedoresDeArchivo(join(dir, 'mal.json')), [], 'archivo corrupto no revienta');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('stagehand: S2 la sonda interpreta las causas de saltar', () => {
  assert.match(evaluarSondaLlm(401, {}).causa, /key rechazada/);
  assert.match(evaluarSondaLlm(402, {}).causa, /sin saldo/);
  assert.match(evaluarSondaLlm(429, {}).causa, /cuota/);
  assert.match(evaluarSondaLlm(200, { error: { message: 'insufficient balance' } }).causa, /sin saldo \(insufficient balance\)/);
  assert.match(evaluarSondaLlm(200, { base_resp: { status_code: 1008, status_msg: 'insufficient balance' } }).causa, /sin saldo/);
  assert.equal(evaluarSondaLlm(200, { choices: [{ message: { content: '' } }] }).causa, 'respuesta sin contenido');
  assert.equal(evaluarSondaLlm(200, { choices: [{ message: { content: 'ok' } }] }).ok, true);
  assert.equal(evaluarSondaLlm(503, {}).definitivo, false, '5xx es transitorio');
  assert.equal(evaluarSondaLlm(402, {}).definitivo, true, 'saldo es definitivo');
});

test('stagehand: S3 el barrido devuelve el primer OK con las causas de los saltados; sin ninguno lanza con todas', async () => {
  const lista = [P('a'), P('b'), P('c')];
  const r = await barrerProveedores(lista, sondaFija(['b', 'c']));
  assert.equal(r.elegido?.nombre, 'b');
  assert.deepEqual(r.sondas.map((s) => `${s.nombre}:${s.ok}`), ['a:false', 'b:true'], 'no sonda lo que sigue al elegido');
  const { fetchFn } = fetchSimulado({ a: [{ status: 402, cuerpo: {} }], b: [okCon('ok')] });
  const sa = await sondearProveedor(P('a'), { fetchFn });
  assert.equal(sa.ok, false); assert.match(sa.causa, /402/);
  assert.equal((await sondearProveedor(P('b'), { fetchFn })).ok, true);
  const sinRed = await sondearProveedor(P('z'), { fetchFn: () => Promise.reject(new Error('ECONNREFUSED')) });
  assert.match(sinRed.causa, /sin respuesta \(ECONNREFUSED\)/);
  await assert.rejects(
    elegirProveedor({ proveedores: lista, sondear: sondaFija([]), log: silencio }),
    (e: Error) => /a: sin saldo/.test(e.message) && /b: sin saldo/.test(e.message) && /c: sin saldo/.test(e.message),
  );
  await assert.rejects(elegirProveedor({ proveedores: [], log: silencio }), /ningún proveedor LLM configurado/);
});

test('stagehand: S4 E2E_LLM_PROVEEDOR fuerza uno sin sondar; fuera de la lista es error', async () => {
  const lista = [P('a'), P('b')];
  let sondas = 0;
  const sondear = (p: ProveedorLlm) => { sondas++; return sondaFija(['a', 'b'])(p); };
  const e = await elegirProveedor({ proveedores: lista, env: { E2E_LLM_PROVEEDOR: 'b' }, sondear, log: silencio });
  assert.equal(e.proveedor.nombre, 'b'); assert.equal(e.origen, 'forzado'); assert.equal(sondas, 0);
  assert.deepEqual(e.orden.map((p) => p.nombre), ['b', 'a'], 'el forzado primero y el resto detrás');
  await assert.rejects(elegirProveedor({ proveedores: lista, forzado: 'zzz', env: {}, log: silencio }), /zzz no está en la lista \(a, b\)/);
});

test('stagehand: S5 cache del elegido: reusa dentro del TTL, barre vencida o con E2E_LLM_BARRIDO=1', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sh-'));
  try {
    const rutaCache = join(dir, '.tmp', 'prov.json');
    const lista = [P('a'), P('b')];
    let reloj = 1_000_000;
    let sondas = 0;
    const sondear = (p: ProveedorLlm) => { sondas++; return sondaFija(['b'])(p); };
    const base = { proveedores: lista, rutaCache, env: {}, sondear, now: () => reloj, log: silencio };
    const e1 = await elegirProveedor(base);
    assert.equal(e1.origen, 'barrido'); assert.equal(e1.proveedor.nombre, 'b'); assert.equal(sondas, 2);
    assert.deepEqual(e1.orden.map((p) => p.nombre), ['b'], 'el saltado por saldo no entra en la pila del generador');
    assert.equal(JSON.parse(readFileSync(rutaCache, 'utf8')).nombre, 'b');
    reloj += 10 * 60_000;
    const e2 = await elegirProveedor(base);
    assert.equal(e2.origen, 'cache'); assert.equal(sondas, 2, 'sin sondas nuevas');
    assert.deepEqual(e2.orden.map((p) => p.nombre), ['b', 'a'], 'desde cache nadie está descartado: b primero, a de respaldo');
    reloj += 31 * 60_000;
    assert.equal((await elegirProveedor(base)).origen, 'barrido', 'vencida la cache se barre');
    assert.equal(sondas, 4);
    assert.equal((await elegirProveedor({ ...base, env: { E2E_LLM_BARRIDO: '1' } })).origen, 'barrido');
    assert.equal(sondas, 6);
    writeFileSync(rutaCache, JSON.stringify({ nombre: 'fuera-de-la-lista', ts: reloj }));
    assert.equal((await elegirProveedor(base)).origen, 'barrido', 'cache con un nombre que ya no está → barre');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('stagehand: S6 el generador pide el esquema en el prompt y normaliza el JSON', async () => {
  assert.deepEqual(normalizarJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(normalizarJson('Claro, aquí va: {"a":{"b":[1,2]}} y listo'), { a: { b: [1, 2] } });
  assert.deepEqual(normalizarJson('[1,2]'), [1, 2]);
  assert.throws(() => normalizarJson('sin json'), /no devolvió JSON/);
  assert.throws(() => normalizarJson('{"a":'), /incompleto|inválido/);
  const sim = fetchSimulado({ a: [okCon('```json\n{"ok":true}\n```')] });
  const g = crearGenerador([P('a')], { fetchFn: sim.fetchFn, log: silencio });
  const r = await g.generate({
    systemPrompt: 'Sistema',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hola' }, { type: 'image', mimeType: 'image/png', data: 'AAA' }] }],
    responseFormat: { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } },
  });
  assert.deepEqual(r.structuredContent, { ok: true });
  assert.equal(r.outputFormat, 'json_schema');
  assert.deepEqual(r.usage, { inputTokens: 3, outputTokens: 2, totalTokens: 5 });
  const body = sim.llamadas[0]!.body;
  const mensajes = body.messages;
  assert.ok(Array.isArray(mensajes) && mensajes.length === 2);
  const sistema: unknown = mensajes[0];
  assert.ok(esObjeto(sistema) && sistema.role === 'system' && typeof sistema.content === 'string');
  assert.ok(sistema.content.startsWith('Sistema') && sistema.content.includes('"properties"'), 'esquema dentro del system prompt');
  const usuario: unknown = mensajes[1];
  assert.ok(esObjeto(usuario) && Array.isArray(usuario.content));
  assert.deepEqual(usuario.content.map((p: unknown) => (esObjeto(p) ? p.type : null)), ['text', 'image_url']);
  assert.equal(body.model, 'm-a');
});

test('stagehand: S7 fallback durante la corrida: saldo → siguiente; 5xx repetido → reintenta y pasa; sin ninguno, causas', async () => {
  const sim = fetchSimulado({
    a: [{ status: 402, cuerpo: { error: { message: 'insufficient balance' } } }],
    b: [{ status: 503, cuerpo: {} }, { status: 503, cuerpo: {} }, okCon('{"de":"b"}')],
    c: [okCon('{"de":"c"}')],
  });
  const esperas: number[] = [];
  const g = crearGenerador([P('a'), P('b'), P('c')], { fetchFn: sim.fetchFn, reintentos: 3, esperar: (ms) => { esperas.push(ms); return Promise.resolve(); }, log: silencio });
  const r1 = await g.generate({ messages: [{ role: 'user', content: 'x' }] });
  assert.deepEqual(r1.structuredContent, { de: 'b' }, 'a cae por saldo; b responde al tercer intento');
  assert.deepEqual(sim.llamadas.map((l) => l.host), ['a', 'b', 'b', 'b']);
  assert.equal(esperas.length, 2, 'dos esperas entre los reintentos de b');
  const est = g.estado();
  assert.equal(est.actual?.nombre, 'b', 'b queda como actual (round-robin)');
  assert.deepEqual(est.caidos.map((c) => c.nombre), ['a']);
  const r2 = await g.generate({ messages: [{ role: 'user', content: 'y' }] });
  assert.deepEqual(r2.structuredContent, { de: 'b' }, 'la siguiente llamada va directo a b');
  assert.equal(sim.llamadas.at(-1)!.host, 'b');

  // 5xx persistente en b → cae y pasa a c; luego c sin saldo → sin ninguno funcional, con todas las causas.
  const sim2 = fetchSimulado({ b: [{ status: 500, cuerpo: {} }], c: [okCon('{"de":"c"}'), { status: 429, cuerpo: {} }] });
  const g2 = crearGenerador([P('b'), P('c')], { fetchFn: sim2.fetchFn, reintentos: 2, esperar: () => Promise.resolve(), log: silencio });
  assert.deepEqual((await g2.generate({ messages: [] })).structuredContent, { de: 'c' });
  assert.deepEqual(sim2.llamadas.map((l) => l.host), ['b', 'b', 'c']);
  await assert.rejects(
    g2.generate({ messages: [] }),
    (e: Error) => /ningún proveedor LLM funcional durante la corrida/.test(e.message) && /c: cuota/.test(e.message) && /b: HTTP 500 \(caído antes\)/.test(e.message),
  );
  // Pasado el reposo, los caídos vuelven a entrar.
  let reloj = 0;
  const sim3 = fetchSimulado({ a: [{ status: 503, cuerpo: {} }, okCon('{"de":"a"}')] });
  const g3 = crearGenerador([P('a')], { fetchFn: sim3.fetchFn, reintentos: 1, reposoMs: 1000, now: () => reloj, esperar: () => Promise.resolve(), log: silencio });
  await assert.rejects(g3.generate({ messages: [] }), /a: HTTP 503/);
  reloj = 2000;
  assert.deepEqual((await g3.generate({ messages: [] })).structuredContent, { de: 'a' });
});

test('stagehand: S8 destino por protocolo: preferido si responde, si no el siguiente con motivo; sin ninguno error; una vez por proceso', async () => {
  const sondas: Record<string, { ok: boolean; causa: string }> = { staging: { ok: false, causa: '/api/sistema/cfg HTTP 500' }, local: { ok: true, causa: 'ok' }, production: { ok: true, causa: 'ok' } };
  const destinos = (['staging', 'local', 'production'] as const).map((id) => ({ id, sondear: () => Promise.resolve(sondas[id]!) }));
  const c1 = await resolverDestino({ destinos, log: silencio });
  assert.equal(c1.destino, 'local');
  assert.match(c1.motivo, /staging falla \(\/api\/sistema\/cfg HTTP 500\) → protocolo: probar contra local/);
  assert.deepEqual(c1.sondas.map((s) => s.destino), ['staging', 'local'], 'no sonda production: ya hay destino');
  const c2 = await resolverDestino({ destinos, preferido: 'local', log: silencio });
  assert.equal(c2.destino, 'local'); assert.equal(c2.motivo, 'preferido local responde'); assert.equal(c2.sondas.length, 1);
  const c3 = await resolverDestino({ destinos, preferido: 'production', log: silencio });
  assert.equal(c3.destino, 'production', 'el preferido va primero aunque esté al final de la lista');
  sondas.local = { ok: false, causa: 'no responde' }; sondas.production = { ok: false, causa: '401' };
  await assert.rejects(
    resolverDestino({ destinos, log: silencio }),
    (e: Error) => /staging: \/api\/sistema\/cfg HTTP 500/.test(e.message) && /local: no responde/.test(e.message) && /production: 401/.test(e.message),
  );
  const lanza = [{ id: 'x', sondear: () => Promise.reject(new Error('boom')) }];
  await assert.rejects(resolverDestino({ destinos: lanza, log: silencio }), /x: sonda lanzó: boom/);
  await assert.rejects(resolverDestino({ destinos, preferido: 'otro', log: silencio }), /preferido otro no está en la lista/);
  assert.equal(destinoPreferido('PROD', ['local', 'staging', 'production'], 'staging', { prod: 'production' }), 'production');
  assert.equal(destinoPreferido(undefined, ['local', 'staging'], 'staging'), 'staging');
  assert.equal(destinoPreferido('nada', ['local', 'staging'], 'staging'), 'staging');
  let veces = 0;
  const memo = unaVezPorProceso(() => { veces++; return Promise.resolve(veces); });
  assert.equal(await memo.obtener(), 1); assert.equal(await memo.obtener(), 1); assert.equal(veces, 1);
  memo.olvidar();
  assert.equal(await memo.obtener(), 2);
});
