/**
 * Sistema comun de pruebas (`cdn/tools/pruebas.ts`): contrato que comparten ISS e ISW.
 *
 *   P1 definirPruebas rechaza ids vacios o repetidos, sin correr(), y categoria/nivel invalidos
 *   P2 correrPruebas: verde, rojo por expect, por excepcion y por timeout; nivel `aviso` no pone rojo
 *   P3 cooldown SIEMPRE, con el id de la prueba como llave; sinCooldown corre todo
 *   P4 ids repetidos entre archivos: la corrida aborta con error antes de correr nada
 *   P5 orden secuencial, filtros `solo`/`categoria`, `saltar` (opcion y ctx.saltar), archivo que no carga = rojo
 *   P6 hooks: `antes` solo si algo corre (no si todo esta en cooldown) y `despues` siempre que `antes` corrio
 *   P7 correrCarpeta toma solo los *.test.ts y respeta las subcarpetas excluidas
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { archivosDePrueba, codigoSalida, coleccionPruebas, correrPruebas, definirPruebas, esSaltada } from '../../../cdn/tools/pruebas.ts';
import type { ListaPruebas, Prueba } from '../../../cdn/tools/pruebas.ts';

const raiz = mkdtempSync(join(tmpdir(), 'pruebas-'));
const db = join(raiz, 'cooldown.json');
const correr = (modulos: Record<string, ListaPruebas | Error>, extra: Partial<Parameters<typeof correrPruebas>[0]> = {}) =>
  correrPruebas({
    raiz,
    archivos: Object.keys(modulos).map((n) => join(raiz, n)),
    cooldownDb: db,
    log: () => undefined,
    importar: async (url) => {
      const nombre = Object.keys(modulos).find((n) => url.endsWith(n))!;
      const m = modulos[nombre];
      if (m instanceof Error) throw m;
      return { default: m };
    },
    ...extra,
  });
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('P1 definirPruebas valida la lista', () => {
  const ok = { nombre: 'a', correr() {} };
  assert.equal(definirPruebas([ok]).length, 1);
  assert.throws(() => definirPruebas([{ nombre: ' ', correr() {} }]), /nombre/);
  assert.throws(() => definirPruebas([ok, { ...ok }]), /repetido/);
  assert.throws(() => definirPruebas([{ nombre: 'x' } as unknown as Prueba]), /correr/);
  assert.throws(() => definirPruebas([{ nombre: 'x', categoria: 'otra', correr() {} } as unknown as Prueba]), /categoria/);
  assert.throws(() => definirPruebas([{ nombre: 'x', nivel: 'grave', correr() {} } as unknown as Prueba]), /nivel/);
});

test('P2 verde, rojos y aviso', async () => {
  const r = await correr({
    'a.test.ts': definirPruebas([
      { nombre: 'P2 verde', correr({ expect, eq }) { expect('si', true); eq('igual', [1], [1]); } },
      { nombre: 'P2 rojo expect', correr({ expect }) { expect('no', false, 'detalle'); } },
      { nombre: 'P2 rojo throw', correr() { throw new Error('explota'); } },
      { nombre: 'P2 rojo timeout', timeoutMs: 50, correr: () => dormir(500) },
      { nombre: 'P2 aviso', nivel: 'aviso', correr({ expect }) { expect('prod', false); } },
    ]),
  }, { sinCooldown: true });
  const por = Object.fromEntries(r.resultados.map((x) => [x.nombre, x]));
  assert.equal(por['P2 verde'].ok, true);
  assert.match(String(por['P2 rojo expect'].error), /no \(detalle\)/);
  assert.match(String(por['P2 rojo throw'].error), /explota/);
  assert.match(String(por['P2 rojo timeout'].error), /timeout 50ms/);
  assert.equal(por['P2 aviso'].ok, true);
  assert.match(por['P2 aviso'].avisos.join(' '), /prod/);
  assert.equal(r.resumen.rojos, 3);
  assert.equal(codigoSalida(r), 1);
});

test('P3 cooldown siempre, por id', async () => {
  rmSync(db, { force: true });
  let n = 0;
  const mod = { 'c.test.ts': definirPruebas([{ nombre: 'P3 cuenta', async correr() { n++; await dormir(20); } }]) };
  await correr(mod);
  const r2 = await correr(mod);
  assert.equal(n, 1, 'la verde se salta en la segunda corrida');
  assert.ok(r2.resultados[0].cooldown);
  await correr(mod, { sinCooldown: true });
  assert.equal(n, 2, 'sinCooldown corre todo');
});

test('P4 ids repetidos entre archivos abortan la corrida', async () => {
  let corrio = false;
  await assert.rejects(() => correr({
    'x.test.ts': definirPruebas([{ nombre: 'P4 mismo id', correr() { corrio = true; } }]),
    'y.test.ts': definirPruebas([{ nombre: 'P4 mismo id', correr() { corrio = true; } }]),
  }, { sinCooldown: true }), /ids de prueba repetidos[\s\S]*P4 mismo id[\s\S]*x\.test\.ts, y\.test\.ts/);
  assert.equal(corrio, false, 'no corre nada');
});

test('P5 secuencial, filtros, saltar y carga fallida', async () => {
  const orden: string[] = [];
  const r = await correr({
    'f.test.ts': definirPruebas([
      { nombre: 'P5 alfa', categoria: 'what', async correr() { await dormir(30); orden.push('alfa'); } },
      { nombre: 'P5 beta', categoria: 'how', correr() { orden.push('beta'); } },
      { nombre: 'P5 gamma', categoria: 'what', correr() { orden.push('gamma'); } },
      { nombre: 'P5 saltada', categoria: 'what', saltar: 'motivo', correr() { orden.push('nunca'); } },
      { nombre: 'P5 se salta sola', categoria: 'what', correr({ saltar }) { saltar('sin entorno'); } },
    ]),
    'roto.test.ts': new Error('sintaxis'),
  }, { sinCooldown: true, categoria: 'what' });
  assert.deepEqual(orden, ['alfa', 'gamma'], 'una por una, en orden, solo what');
  assert.equal(r.resultados.find((x) => x.nombre === 'P5 saltada')?.saltada, 'motivo');
  assert.equal(r.resultados.find((x) => x.nombre === 'P5 se salta sola')?.saltada, 'sin entorno');
  assert.match(String(r.resultados.find((x) => x.nombre.startsWith('(carga)'))?.error), /sintaxis/);
  const solo = await correr({ 'g.test.ts': definirPruebas([{ nombre: 'P5 uno-dos', correr() {} }, { nombre: 'P5 tres', correr() {} }]) }, { sinCooldown: true, solo: ['uno dos'] });
  assert.deepEqual(solo.resultados.map((x) => x.nombre), ['P5 uno-dos'], 'solo normaliza guiones');
});

test('P6 hooks por archivo', async () => {
  rmSync(db, { force: true });
  const eventos: string[] = [];
  const hacer = () => definirPruebas([{ nombre: 'P6 una', async correr() { eventos.push('prueba'); await dormir(20); } }], { antes: () => { eventos.push('antes'); }, despues: () => { eventos.push('despues'); } });
  await correr({ 'h.test.ts': hacer() });
  assert.deepEqual(eventos, ['antes', 'prueba', 'despues']);
  eventos.length = 0;
  await correr({ 'h.test.ts': hacer() });
  assert.deepEqual(eventos, [], 'todo en cooldown: ni antes ni despues');
});

test('P7 correrCarpeta toma solo *.test.ts y respeta excluidas', () => {
  const dir = join(raiz, 'tests');
  mkdirSync(join(dir, 'chat'), { recursive: true });
  mkdirSync(join(dir, 'e2e'), { recursive: true });
  writeFileSync(join(dir, 'a.test.ts'), '');
  writeFileSync(join(dir, 'ayuda.ts'), '');
  writeFileSync(join(dir, 'chat', 'b.test.ts'), '');
  writeFileSync(join(dir, 'e2e', 'c.test.ts'), '');
  const rel = (l: string[]) => l.map((p) => p.slice(dir.length + 1).replace(/\\/g, '/'));
  assert.deepEqual(rel(archivosDePrueba(dir)), ['a.test.ts', 'chat/b.test.ts', 'e2e/c.test.ts']);
  assert.deepEqual(rel(archivosDePrueba(dir, ['e2e'])), ['a.test.ts', 'chat/b.test.ts']);
});

test('P8 coleccionPruebas: forma node:test sobre el formato comun', async () => {
  const eventos: string[] = [];
  const c = coleccionPruebas({ timeoutMs: 40 });
  c.before(() => { eventos.push('before'); });
  c.after(() => { eventos.push('after'); });
  c.test('P8 ok', async (t) => { t.after(() => { eventos.push('t.after'); }); t.diagnostic('linea'); eventos.push('ok'); });
  c.test('P8 skip', (t) => { t.skip('no aplica'); eventos.push('nunca'); });
  c.test('P8 opciones', { skip: 'por opcion' }, () => { eventos.push('nunca'); });
  c.test('P8 timeout', () => dormir(500));
  c.test('P8 assert', () => { assert.equal(1, 2); });
  c.prueba({ nombre: 'P8 prueba cruda', correr({ expect }) { expect('cruda', false); } });
  const r = await correr({ 'k.test.ts': c.lista() }, { sinCooldown: true });
  const por = Object.fromEntries(r.resultados.map((x) => [x.nombre, x]));
  assert.deepEqual(eventos, ['before', 'ok', 't.after', 'after']);
  assert.deepEqual(por['P8 ok'].diag, ['linea']);
  assert.equal(por['P8 skip'].saltada, 'no aplica');
  assert.equal(por['P8 opciones'].saltada, 'por opcion');
  assert.match(String(por['P8 timeout'].error), /timeout 40ms/);
  assert.match(String(por['P8 assert'].error), /Expected values to be strictly equal/);
  assert.match(String(por['P8 prueba cruda'].error), /cruda/);
  let capturada: unknown;
  await correr({ 's.test.ts': definirPruebas([{ nombre: 'P8 esSaltada', correr({ saltar }) { try { saltar('x'); } catch (e) { capturada = e; throw e; } } }]) }, { sinCooldown: true });
  assert.equal(esSaltada(capturada), true);
});

test('P9 aislar: cada archivo en su proceso, globales no se pisan, cooldown en el padre', async () => {
  rmSync(db, { force: true });
  const dir = join(raiz, 'aislar');
  mkdirSync(dir, { recursive: true });
  const kit = pathToFileURL(join(Deno.cwd(), 'src', 'cdn', 'tools', 'pruebas.ts')).href;
  writeFileSync(join(dir, 'a.test.ts'), `import { definirPruebas } from '${kit}';\nexport default definirPruebas([{ nombre: 'P9 pone global', async correr({ expect }) { (globalThis as Record<string, unknown>).marca = 'a'; expect('pone', true); await new Promise((r) => setTimeout(r, 20)); } }]);\n`);
  writeFileSync(join(dir, 'b.test.ts'), `import { definirPruebas } from '${kit}';\nexport default definirPruebas([{ nombre: 'P9 no ve global', correr({ eq }) { eq('limpio', (globalThis as Record<string, unknown>).marca, undefined); } }, { nombre: 'P9 rojo hijo', correr({ expect }) { expect('cae', false); } }]);\n`);
  writeFileSync(join(dir, 'c.test.ts'), `throw new Error('rompe al cargar');\n`);
  const lineas: string[] = [];
  const opts = { raiz: dir, archivos: ['a.test.ts', 'b.test.ts'].map((f) => join(dir, f)), cooldownDb: db, log: (l: string) => { lineas.push(l); }, aislar: { comando: [Deno.execPath(), 'run', '-A', '--no-check'] } };
  const r = await correrPruebas(opts);
  const por = Object.fromEntries(r.resultados.map((x) => [x.nombre, x]));
  assert.equal(por['P9 pone global'].ok, true);
  assert.equal(por['P9 no ve global'].ok, true, 'el global de a no llega a b');
  assert.match(String(por['P9 rojo hijo'].error), /cae/);
  assert.ok(lineas.some((l) => l.includes('P9 pone global')), 'el log del hijo llega al padre');
  const r2 = await correrPruebas(opts);
  assert.ok(r2.resultados.find((x) => x.nombre === 'P9 pone global')?.cooldown, 'archivo todo en cooldown: no se lanza el hijo');
  const r3 = await correrPruebas({ ...opts, archivos: [join(dir, 'c.test.ts')] });
  assert.match(String(r3.resultados[0].error), /rompe al cargar/);
});

test('limpieza', () => { rmSync(raiz, { recursive: true, force: true }); });
