/**
 * Guardianes WHAT de `Obj` (src/cdn/lib/obj.ts): operaciones parciales sobre objetos JSON y
 * referencias `{ path, query, actions }` a fuentes de verdad.
 *   Q1 get: la estructura con lo marcado (truthy), `*` y `[campo=valor]`.
 *   Q2 getValue: el valor exacto (sin estructura) de la única hoja truthy; `null` si no existe;
 *      una consulta con varias o ninguna hoja lanza.
 *   M1 update cambia solo lo existente; insert agrega solo lo que falta; delete quita lo marcado.
 *   M2 push: upsert profundo; `null` quita según el schema; nada muta.
 *   A1 aplicar: acciones en orden.
 *   R1 resolver: referencias a cualquier profundidad, relativas a su archivo, anidadas y con acciones.
 *   R2 resolver: ciclo, referencia mal formada y valor inexistente (getValue null) lanzan; props extra avisan.
 */
import { assert, assertEquals, assertRejects, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { z } from 'zod';
import { Obj, ObjError, resolverUrl } from '../../../cdn/lib/obj.ts';

const DER = {
  erDiagram: {
    entities: [
      { name: 'patyia_conversaciones', attributes: [{ name: 'iconversacion', type: 'bigint' }, { name: 'titulo', type: 'varchar' }] },
      { name: 'patyia_errores', attributes: [{ name: 'ierror', type: 'bigint' }] },
    ],
  },
};

Deno.test('obj: Q1 get con claves, comodín y selector', () => {
  assertEquals(Obj.get({ a: 1, b: { c: 2, d: 3 } }, { b: { c: true } }), { b: { c: 2 } });
  assertEquals(Obj.get(DER, { erDiagram: { entities: { '*': { name: 1 } } } }), { erDiagram: { entities: [{ name: 'patyia_conversaciones' }, { name: 'patyia_errores' }] } });
  assertEquals(Obj.get(DER, { erDiagram: { entities: { '[name=patyia_errores]': true } } }), { erDiagram: { entities: [DER.erDiagram.entities[1]] } });
  assertEquals(Obj.get({ a: 1, b: 2 }, { a: true, b: false }), { a: 1 }, 'falsy no se pide');
});

Deno.test('obj: Q2 getValue trae el valor exacto; null si no existe; la consulta debe marcar una hoja', () => {
  assertEquals(Obj.getValue(DER, { erDiagram: { entities: { '[name=patyia_conversaciones]': { attributes: { '[name=titulo]': { type: 1 } } } } } }), 'varchar');
  assertEquals(Obj.getValue({ a: { b: { c: [1, 2] } } }, { a: { b: { c: true } } }), [1, 2], 'sin la estructura que lo contiene');
  assertEquals(Obj.getValue({ a: 1 }, { x: true }), null, 'no existe: null');
  assertEquals(Obj.getValue(DER, { erDiagram: { entities: { '[name=nada]': true } } }), null);
  assertThrows(() => Obj.getValue({ a: 1, b: 2 }, { a: true, b: true }), ObjError, 'marca 2 hojas');
  assertThrows(() => Obj.getValue({ a: 1 }, { a: false }), ObjError, 'ninguna');
  assertThrows(() => Obj.getValue({ a: [1] }, { a: { '*': true } }), ObjError, '«*»');
  assertEquals(Obj.get({ a: { b: 1, c: 2 } }, { a: { b: true } }), { a: { b: 1 } }, 'get conserva la estructura desde la raíz');
});

Deno.test('obj: M1 update, insert y delete parciales; nada muta', () => {
  const base = { a: 1, b: { c: 2 }, l: [{ id: 'x', v: 1 }, { id: 'y', v: 2 }] };
  const congelado = JSON.stringify(base);
  assertEquals(Obj.update(base, { a: 9, z: 1, b: { c: 3, q: 1 } }), { a: 9, b: { c: 3 }, l: base.l });
  assertEquals(Obj.update(base, { l: { '[id=y]': { v: 7 } } }).l, [{ id: 'x', v: 1 }, { id: 'y', v: 7 }]);
  assertEquals(Obj.insert(base, { a: 9, z: 1, b: { c: 3, q: 1 } }), { a: 1, b: { c: 2, q: 1 }, l: base.l, z: 1 });
  assertEquals(Obj.delete(base, { b: { c: true }, l: { '[id=x]': true } }), { a: 1, b: {}, l: [{ id: 'y', v: 2 }] });
  assertEquals(JSON.stringify(base), congelado, 'la base no cambió');
});

Deno.test('obj: M2 push profundo; null quita según el schema', () => {
  const S = z.object({ a: z.number().optional(), b: z.number().default(5), c: z.object({ d: z.string() }).optional() });
  assertEquals(Obj.push({ a: 1, b: 2, c: { d: 'x' } }, { a: null, b: null, c: { d: 'y' } }, S), { b: 5, c: { d: 'y' } });
  assertEquals(Obj.pushZod(S, { b: 1 }, { a: 3 }), { a: 3, b: 1 });
  assertEquals(Obj.push({ x: { y: 1, z: 2 } }, { x: { y: 3 } }), { x: { y: 3, z: 2 } }, 'lo no mencionado se conserva');
});

Deno.test('obj: A1 aplicar ejecuta las acciones en orden', () => {
  const r = Obj.aplicar({ x: 1, y: 2, s: { a: 1 } }, [
    { op: 'delete', query: { y: true } },
    { op: 'update', valor: { x: 10 } },
    { op: 'insert', valor: { s: { b: 2 } } },
    { op: 'get', query: { x: 1, s: 1 } },
  ]);
  assertEquals(r, { x: 10, s: { a: 1, b: 2 } });
});

const archivos: Record<string, unknown> = {
  'docs/der.json': DER,
  'docs/nombres.json': { tabla: { path: './der.json', query: { erDiagram: { entities: { '[name=patyia_errores]': { name: true } } } } } },
  'docs/ciclo-a.json': { v: { path: './ciclo-b.json', query: { v: true } } },
  'docs/ciclo-b.json': { v: { path: './ciclo-a.json', query: { v: true } } },
};
const cargar = (url: string) => (url in archivos ? Promise.resolve(structuredClone(archivos[url])) : Promise.reject(new Error('404')));

Deno.test('obj: R1 resolver referencias anidadas, relativas y con acciones', async () => {
  const diagrama = {
    nodos: [
      { id: 't', table: { path: './der.json', query: { erDiagram: { entities: { '[name=patyia_conversaciones]': true } } }, actions: [{ op: 'update', valor: { attributes: { '[name=titulo]': { type: 'text' } } } }] } },
      { id: 'n', label: { path: './nombres.json', query: { tabla: true } } },
    ],
  };
  const r = await Obj.resolver(diagrama, { base: 'docs/diagrama.json', cargar }) as { nodos: Array<Record<string, unknown>> };
  assertEquals((r.nodos[0]!.table as { attributes: unknown[] }).attributes[1], { name: 'titulo', type: 'text' });
  assertEquals(r.nodos[1]!.label, 'patyia_errores', 'la referencia dentro de nombres.json se resuelve contra su archivo');
  assertEquals(resolverUrl('../a.json', 'x/y/b.json'), 'x/a.json');
});

Deno.test('obj: R2 ciclos, refs mal formadas y consultas sin resultado lanzan; props extra avisan', async () => {
  await assertRejects(() => Obj.resolver({ v: { path: './ciclo-a.json', query: { v: true } } }, { base: 'docs/x.json', cargar }), ObjError, 'circular');
  await assertRejects(() => Obj.resolver({ v: { path: './der.json', query: { no: { existe: true } } } }, { base: 'docs/x.json', cargar }), ObjError, 'el valor no existe');
  await assertRejects(() => Obj.resolver({ v: { path: './der.json', query: { x: true }, actions: [{ op: 'nada' }] } }, { base: 'docs/x.json', cargar }), ObjError, 'mal formada');
  await assertRejects(() => Obj.resolver({ v: { path: './falta.json', query: { x: true } } }, { base: 'docs/x.json', cargar }), ObjError, 'no se pudo leer');
  const avisos: string[] = [];
  await Obj.resolver({ v: { path: './der.json', query: { erDiagram: { entities: { '[name=patyia_errores]': { name: 1 } } } }, extra: 1 } }, { base: 'docs/x.json', cargar, avisar: (m) => avisos.push(m) });
  assert(avisos.some((m) => m.includes('extra')), avisos.join(' | '));
});

Deno.test('obj: S1 esquemaPush valida fragmentos y restaurarClaves recupera las mayúsculas del schema', () => {
  const S = z.object({ maxMensajes: z.number(), sub: z.object({ aB: z.string() }) });
  const F = Obj.esquemaPush(S);
  assert(F.safeParse({ maxMensajes: null }).success, 'null = quitar');
  assert(F.safeParse({ sub: { aB: 'x' } }).success, 'fragmento anidado');
  assert(!F.safeParse({ otra: 1 }).success, 'clave desconocida: error');
  assertEquals(Obj.restaurarClaves({ maxmensajes: 3, sub: { ab: 'x' }, libre: 1 }, S), { maxMensajes: 3, sub: { aB: 'x' }, libre: 1 });
});
