// @contexto INDICE.md · tests/componentes/README.md
/**
 * ag-grid-filas.test.ts — Modelos de filas y datos de <iswc-ag-grid>.
 *
 * Caja negra sobre la logica pura de `utils/ag-grid/filas` y sobre el controlador
 * montado en un host minimo con el `createGridModel` real. Sin DOM.
 */
import assert from 'node:assert/strict';
import process from 'node:process';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { createGridModel } from '../../src/components/data/utils/datagrid-core/grid-model.ts';
import { getCellValue, cellText } from '../../src/components/data/utils/datagrid-core/value-formatter.ts';
import { agregarArbol, aplanarArbol, construirArbol, ordenarArbol, podarArbol } from '../../src/components/data/utils/ag-grid/filas-grupos.ts';
import { pivotar, resolverIdPivote } from '../../src/components/data/utils/ag-grid/filas-pivote.ts';
import { construirTree, filtrarTree } from '../../src/components/data/utils/ag-grid/filas-ag-tree-data.ts';
import { aplicarLote, aplicarTransaccion } from '../../src/components/data/utils/ag-grid/filas-transacciones.ts';
import { CacheBloques } from '../../src/components/data/utils/ag-grid/filas-cache-bloques.ts';
import { crc32, zipComprimido, zipGuardado } from '../../src/components/data/utils/ag-grid/filas-ag-zip.ts';
import { tablaACsv } from '../../src/components/data/utils/ag-grid/filas-exportar.ts';
import { crearEstilos, entradasLibro, hojaAXml, letraColumna, nombreHoja } from '../../src/components/data/utils/ag-grid/filas-exportar-excel.ts';
import { fusionarEstado, leerEstado, omitirPropiedades, validarEstado } from '../../src/components/data/utils/ag-grid/filas-estado-grilla.ts';
import { ExpansionGrupos } from '../../src/components/data/utils/ag-grid/filas-expansion.ts';
import { moverEn } from '../../src/components/data/utils/ag-grid/filas-panel-agrupacion.ts';
import { ModeloServidor, ModeloViewport, crearModeloInfinito } from '../../src/components/data/utils/ag-grid/filas-modelos-externos.ts';
import { instalar } from '../../src/components/data/utils/ag-grid/filas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

type Nodo = { id: string; index: number; data: Record<string, unknown> };

const VENTAS = [
  { id: 1, pais: 'CO', anio: 2020, valor: 10, ok: true },
  { id: 2, pais: 'CO', anio: 2021, valor: 20, ok: false },
  { id: 3, pais: 'MX', anio: 2020, valor: 30, ok: true },
  { id: 4, pais: 'CO', anio: 2020, valor: 40, ok: true },
  { id: 5, pais: 'MX', anio: 2021, valor: null, ok: false },
];

function nodos(filas: Record<string, unknown>[]): Nodo[] {
  return filas.map((data, index) => ({ id: String(data['id'] ?? index), index, data }));
}

function nivel(campo: string) {
  return { colId: campo, field: campo, valor: (n: Nodo) => n.data[campo], etiqueta: (v: unknown) => String(v ?? '(vacío)') };
}

function valor(campo: string, func: unknown, colId = campo) {
  return { colId, func, valor: (n: Nodo) => n.data[campo] };
}

const ABIERTO = { abierto: () => true };

/* ── Grupos y agregacion ──────────────────────────────────────────────── */

test('grupos: multinivel conserva orden de aparicion e ids del motor', () => {
  const raiz = construirArbol(nodos(VENTAS), [nivel('pais'), nivel('anio')]);
  assert.deepEqual(raiz.hijos.map((g: { id: string }) => g.id), ['pais=CO', 'pais=MX']);
  assert.deepEqual(raiz.hijos[0].hijos.map((g: { id: string }) => g.id), ['pais=CO|anio=2020', 'pais=CO|anio=2021']);
  assert.equal(raiz.hijos[0].hojas.length, 3);
});

test('agregacion: las siete funciones nativas e ignorar no numericos', () => {
  const raiz = construirArbol(nodos(VENTAS), [nivel('pais')]);
  agregarArbol(raiz, ['sum', 'min', 'max', 'count', 'avg', 'first', 'last'].map((f) => valor('valor', f, f)));
  const mx = raiz.hijos[1];
  assert.deepEqual(mx.agg, { sum: 30, min: 30, max: 30, count: 2, avg: 30, first: 30, last: null });
  assert.equal(raiz.agg['sum'], 100);
});

test('agregacion: avg es ponderado por hojas, no promedio de promedios', () => {
  const raiz = construirArbol(nodos(VENTAS), [nivel('pais'), nivel('anio')]);
  agregarArbol(raiz, [valor('valor', 'avg')]);
  assert.equal(raiz.hijos[0].agg['valor'], (10 + 20 + 40) / 3);
  assert.equal(raiz.agg['valor'], 100 / 4);
});

test('agregacion: funcion propia recibe valores de hijos; por nombre o directa', () => {
  const raiz = construirArbol(nodos(VENTAS), [nivel('pais'), nivel('anio')]);
  let visto: unknown = null;
  const doble = (p: { values: number[] }) => {
    visto = p.values;
    return p.values.reduce((a, b) => a + (b ?? 0), 0) * 2;
  };
  agregarArbol(raiz, [valor('valor', 'doble')], { funciones: { doble } });
  assert.equal(raiz.hijos[1].hijos[0].agg['valor'], 60);
  assert.ok(Array.isArray(visto));
  agregarArbol(raiz, [valor('valor', doble)]);
  assert.equal(raiz.hijos[1].hijos[0].agg['valor'], 60);
});

test('agregacion: suma bigint sin perder precision', () => {
  const raiz = construirArbol(nodos([{ id: 1, g: 'a', v: 9007199254740993n }, { id: 2, g: 'a', v: 2n }]), [nivel('g')]);
  agregarArbol(raiz, [valor('v', 'sum')]);
  assert.equal(raiz.hijos[0].agg['v'], 9007199254740995n);
});

test('agregacion: getGroupRowAgg reemplaza por grupo', () => {
  const raiz = construirArbol(nodos(VENTAS), [nivel('pais')]);
  agregarArbol(raiz, [valor('valor', 'sum')], { porGrupo: (g: { hojas: unknown[] }) => ({ n: g.hojas.length }) });
  assert.deepEqual(raiz.hijos[0].agg, { n: 3 });
});

test('grupos: groupAllowUnbalanced deja la hoja sin clave en su nivel', () => {
  const raiz = construirArbol(nodos([{ id: 1, a: 'x' }, { id: 2, a: null }]), [nivel('a')], true);
  assert.equal(raiz.hijos.length, 1);
  assert.equal(raiz.directas.length, 1);
  const filas = aplanarArbol(raiz, ABIERTO);
  assert.deepEqual(filas.map((f: { kind: string }) => f.kind), ['group', 'leaf', 'leaf']);
});

test('aplanado: respeta expansion y niveles', () => {
  const raiz = construirArbol(nodos(VENTAS), [nivel('pais'), nivel('anio')]);
  const cerrado = aplanarArbol(raiz, { abierto: () => false });
  assert.equal(cerrado.length, 2);
  const uno = aplanarArbol(raiz, { abierto: (g: { id: string }) => g.id === 'pais=CO' });
  assert.deepEqual(uno.map((f: { level: number }) => f.level), [0, 1, 1, 0]);
  assert.equal(aplanarArbol(raiz, ABIERTO).length, 2 + 4 + 5);
});

test('aplanado: groupTotalRow bottom pone total y vacia el agregado del grupo abierto', () => {
  const raiz = construirArbol(nodos(VENTAS), [nivel('pais')]);
  agregarArbol(raiz, [valor('valor', 'sum')]);
  const filas = aplanarArbol(raiz, { ...ABIERTO, totalGrupo: 'bottom', totalGeneral: 'bottom' });
  assert.equal(filas[0].kind, 'group');
  assert.deepEqual(filas[0].agg, {});
  assert.equal(filas[4].kind, 'total');
  assert.equal(filas[4].id, 'rowGroupFooter_pais=CO');
  assert.equal(filas[4].agg['valor'], 70);
  assert.equal(filas[filas.length - 1].id, 'rowGroupFooter_ROOT_NODE_ID');
  assert.equal(filas[filas.length - 1].agg['valor'], 100);
});

test('aplanado: agregados por columna con su formato (aggTextos), nunca una linea resumen', () => {
  const raiz = construirArbol(nodos(VENTAS), [nivel('pais')]);
  agregarArbol(raiz, [valor('valor', 'sum'), valor('anio', 'max')]);
  const filas = aplanarArbol(raiz, { abierto: () => false, formatear: (colId: string, v: unknown) => `${colId}:${v}` });
  assert.deepEqual(filas[0].agg, { valor: 70, anio: 2021 });
  assert.deepEqual(filas[0].aggTextos, { valor: 'valor:70', anio: 'anio:2021' });
});

test('aplanado: groupHideOpenParents y groupHideParentOfSingleChild', () => {
  const raiz = construirArbol(nodos(VENTAS), [nivel('pais'), nivel('anio')]);
  const sin = aplanarArbol(raiz, { ...ABIERTO, ocultarPadresAbiertos: true });
  assert.ok(sin.every((f: { kind: string }) => f.kind === 'leaf'));
  const unico = construirArbol(nodos([{ id: 1, a: 'x', b: 'y' }, { id: 2, a: 'x', b: 'z' }]), [nivel('a'), nivel('b')]);
  const f = aplanarArbol(unico, { ...ABIERTO, ocultarHijoUnico: true });
  assert.equal(f.filter((x: { kind: string }) => x.kind === 'group').length, 1, 'a con un hijo y b=y, b=z con hoja unica se ocultan');
});

test('orden: por agregado y por comparador inicial', () => {
  const raiz = construirArbol(nodos(VENTAS), [nivel('pais')]);
  agregarArbol(raiz, [valor('valor', 'sum')]);
  ordenarArbol(raiz, [{ colId: 'valor', dir: 'asc' }]);
  assert.equal(raiz.hijos[0].clave, 'MX');
  ordenarArbol(raiz, [{ colId: 'valor', dir: 'desc' }]);
  assert.equal(raiz.hijos[0].clave, 'CO');
  ordenarArbol(raiz, [], (a: { clave: string }, b: { clave: string }) => b.clave.localeCompare(a.clave));
  assert.equal(raiz.hijos[0].clave, 'MX');
});

test('groupAggFiltering: el grupo que pasa conserva todo; el resto solo lo suyo', () => {
  const todos = nodos(VENTAS);
  const raiz = construirArbol(todos, [nivel('pais')]);
  agregarArbol(raiz, [valor('valor', 'sum')]);
  const pasan = new Set(todos.filter((n) => n.id === '1'));
  podarArbol(raiz, (n: Nodo) => pasan.has(n), (g: { clave: string }) => g.clave === 'MX');
  assert.deepEqual(raiz.hijos.map((g: { clave: string; directas: unknown[] }) => [g.clave, g.directas.length]), [['CO', 1], ['MX', 2]]);
});

/* ── Pivote ───────────────────────────────────────────────────────────── */

test('pivote: columnas por clave ordenadas, valor y agregados por columna generada', () => {
  const hs = nodos(VENTAS);
  const pv = [{ colId: 'anio', valor: (n: Nodo) => n.data['anio'] }];
  const vals = [valor('valor', 'sum')];
  const r = pivotar(hs, pv, vals, (c: string) => c);
  assert.deepEqual(r.planas.map((d: { colId: string }) => d.colId), ['pivot_anio_2020_valor', 'pivot_anio_2021_valor']);
  const raiz = construirArbol(hs, [nivel('pais')]);
  agregarArbol(raiz, vals, { clavesPivote: r.clavesDe, soloPivote: true, idPivote: resolverIdPivote(['anio']) });
  assert.deepEqual(raiz.hijos[0].agg, { pivot_anio_2020_valor: 50, pivot_anio_2021_valor: 20 });
  assert.equal(raiz.agg['pivot_anio_2020_valor'], 80);
});

test('pivote: totales de fila y de grupo, antes y despues', () => {
  const hs = nodos(VENTAS);
  const pv = [{ colId: 'pais', valor: (n: Nodo) => n.data['pais'] }, { colId: 'anio', valor: (n: Nodo) => n.data['anio'] }];
  const vals = [valor('valor', 'sum')];
  const r = pivotar(hs, pv, vals, (c: string) => c, { totalesFila: 'top', totalesGrupo: 'bottom' });
  assert.equal(r.planas[0].colId, 'PivotRowTotal_valor');
  assert.ok(r.planas.some((d: { colId: string }) => d.colId.includes('PivotGroupTotal')));
  const raiz = construirArbol(hs, []);
  agregarArbol(raiz, vals, { clavesPivote: r.clavesDe, soloPivote: true, idPivote: resolverIdPivote(['pais', 'anio']) });
  assert.equal(raiz.agg['PivotRowTotal_valor'], 100);
  const co = r.planas.find((d: { colId: string; pivotKeys: string[] }) => d.pivotKeys.includes('CO') && d.colId.includes('PivotGroupTotal'));
  assert.equal(raiz.agg[co.colId], 70);
});

test('pivote: pivotMaxGeneratedColumns aborta, comparador y procesar def', () => {
  const pv = [{ colId: 'anio', valor: (n: Nodo) => n.data['anio'], comparador: (a: string, b: string) => b.localeCompare(a) }];
  const vals = [valor('valor', 'sum')];
  assert.equal(pivotar(nodos(VENTAS), pv, vals, (c: string) => c, { maximo: 1 }).excedido, true);
  const r = pivotar(nodos(VENTAS), pv, vals, (c: string) => c, { procesarCol: (d: { marcada?: boolean }) => { d.marcada = true; } });
  assert.equal(r.planas[0].pivotKeys[0], '2021');
  assert.equal(r.planas[0]['marcada'], true);
});

/* ── Tree data ────────────────────────────────────────────────────────── */

const RUTAS = [{ id: 'a', ruta: ['docs'], t: 0 }, { id: 'b', ruta: ['docs', 'x.txt'], t: 5 }, { id: 'c', ruta: ['img', 'y', 'z.png'], t: 7 }];

test('tree: getDataPath crea relleno e ids estables aunque el padre llegue despues', () => {
  const r = construirTree(nodos(RUTAS), { rutaDe: (d: { ruta: string[] }) => d.ruta });
  assert.deepEqual(r.raiz.hijos.map((g: { clave: string }) => g.clave), ['docs', 'img']);
  assert.equal(r.raiz.hijos[1].nodo, null, 'img es relleno');
  const invertido = construirTree(nodos(RUTAS.slice().reverse()), { rutaDe: (d: { ruta: string[] }) => d.ruta });
  const img = invertido.raiz.hijos.find((g: { clave: string }) => g.clave === 'img');
  assert.equal(img.id, r.raiz.hijos[1].id);
});

test('tree: una fila sin ruta no tumba el arbol', () => {
  const r = construirTree(nodos([...RUTAS, { id: 'sin' }]), { rutaDe: (d: { ruta: string[] }) => d.ruta });
  assert.equal(r.raiz.hijos.length, 2);
});

test('tree: agrega desde hojas reales sin contarse a si mismo', () => {
  const r = construirTree(nodos(RUTAS), { rutaDe: (d: { ruta: string[] }) => d.ruta });
  agregarArbol(r.raiz, [valor('t', 'sum')]);
  assert.equal(r.raiz.hijos[0].agg['t'], 5);
  assert.equal(r.raiz.agg['t'], 12);
});

test('tree: treeDataParentIdField, huerfanos a la raiz y ciclo sin colgarse', () => {
  const filas = [{ id: 'r', padre: null }, { id: 'h', padre: 'r' }, { id: 'n', padre: 'r' }, { id: 'o', padre: 'no-existe' }, { id: 'c1', padre: 'c2' }, { id: 'c2', padre: 'c1' }];
  const r = construirTree(nodos(filas), { campoPadre: 'padre', idDe: (d: { id: string }) => d.id });
  const raiz = r.raiz.hijos.find((g: { clave: string }) => g.clave === 'r');
  assert.equal(raiz.hijos.length, 2);
  assert.equal(raiz.hijos[0].nivel, 1);
  assert.ok(r.raiz.hijos.some((g: { clave: string }) => g.clave === 'o'));
  assert.ok(r.raiz.hijos.some((g: { clave: string }) => g.clave === 'c1' || g.clave === 'c2'));
});

test('tree: treeDataChildrenField aplana nodos anidados', () => {
  const r = construirTree(nodos([{ id: 'p', hijos: [{ id: 'q', hijos: [{ id: 's' }] }] }]), { campoHijos: 'hijos' });
  assert.deepEqual(r.nodos.map((n: Nodo) => n.id), ['p', 'q', 's']);
  assert.equal(r.raiz.hijos[0].hijos[0].hijos[0].nivel, 2);
});

test('tree: filtro conserva ancestros y descendientes; exclude quita descendientes', () => {
  const armar = () => construirTree(nodos(RUTAS), { rutaDe: (d: { ruta: string[] }) => d.ruta }).raiz;
  const r1 = armar();
  filtrarTree(r1, (n: Nodo) => n.id === 'c');
  assert.deepEqual(r1.hijos.map((g: { clave: string }) => g.clave), ['img'], 'el ancestro de relleno queda');
  const r2 = armar();
  filtrarTree(r2, (n: Nodo) => n.id === 'a');
  assert.equal(r2.hijos[0].hijos.length, 1, 'hijos del que coincide se conservan');
  const r3 = armar();
  filtrarTree(r3, (n: Nodo) => n.id === 'a', true);
  assert.equal(r3.hijos[0].hijos.length, 0);
});

/* ── Transacciones ────────────────────────────────────────────────────── */

test('transacciones: add, update, remove y addIndex por id', () => {
  const idDe = (d: { id: number }) => String(d.id);
  const filas = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const r = aplicarTransaccion(filas, { add: [{ id: 9 }], addIndex: 1, update: [{ id: 3, v: 1 }], remove: [{ id: 2 }] }, idDe);
  assert.deepEqual(r.filas, [{ id: 1 }, { id: 9 }, { id: 3, v: 1 }]);
  assert.equal(r.remove.length, 1);
  assert.equal(r.update.length, 1);
  assert.equal(r.add.length, 1);
});

test('transacciones: sin getRowId la identidad es la referencia; id repetido no se agrega', () => {
  const a = { n: 1 };
  const b = { n: 1 };
  const r = aplicarTransaccion([a, b], { remove: [b], update: [{ n: 1 }] }, null);
  assert.deepEqual(r.filas, [a]);
  assert.equal(r.update.length, 0, 'objeto desconocido no actualiza');
  const dup = aplicarTransaccion([{ id: 1 }], { add: [{ id: 1 }] }, (d: { id: number }) => String(d.id));
  assert.equal(dup.filas.length, 1);
});

test('transacciones: lote con cambios encadenados', () => {
  const idDe = (d: { id: number }) => String(d.id);
  const { filas, resultados } = aplicarLote([{ id: 1 }], [{ add: [{ id: 2 }] }, { remove: [{ id: 1 }] }, { update: [{ id: 2, v: 1 }] }, { add: [{ id: 1 }], addIndex: 0 }], idDe);
  assert.deepEqual(filas, [{ id: 1 }, { id: 2, v: 1 }]);
  assert.equal(resultados.length, 4);
});

/* ── Cache por bloques ────────────────────────────────────────────────── */

function cacheDePrueba(extra: Record<string, unknown> = {}) {
  const pedidos: Array<{ startRow: number; endRow: number; exito: (f: unknown[], u?: number | null) => void; fallo: () => void }> = [];
  const cache = new CacheBloques({ tamBloque: 10, desborde: 10, inicial: 1, pedir: (p: never) => pedidos.push(p), alCambiar: () => {}, ...extra });
  return { cache, pedidos };
}

const bloque = (desde: number, n = 10) => Array.from({ length: n }, (_, i) => ({ id: desde + i }));

test('cache: crece con desborde hasta conocer la ultima fila', () => {
  const { cache, pedidos } = cacheDePrueba();
  cache.asegurar(0, 5);
  assert.equal(pedidos.length, 1);
  pedidos[0].exito(bloque(0));
  assert.equal(cache.total(), 20);
  assert.equal(cache.ultimaConocida(), false);
  cache.asegurar(10, 15);
  pedidos[1].exito(bloque(10, 3));
  assert.equal(cache.total(), 13);
  assert.equal(cache.ultimaConocida(), true);
  assert.deepEqual(cache.fila(11), { id: 11 });
});

test('cache: lastRow explicito, concurrencia limitada y fallo reintentable', () => {
  const { cache, pedidos } = cacheDePrueba({ maxConcurrentes: 1 });
  cache.asegurar(0, 25);
  assert.equal(pedidos.length, 1, 'solo una en vuelo');
  pedidos[0].exito(bloque(0), 25);
  assert.equal(cache.total(), 25);
  assert.equal(pedidos.length, 2);
  pedidos[1].fallo();
  assert.equal(cache.estadoFila(10), 'failed');
  assert.equal(pedidos.length, 3, 'la cola avanza tras el fallo');
  cache.reintentar();
  assert.equal(pedidos.length, 3, 'la plaza sigue ocupada por el tercer bloque');
  pedidos[2].exito(bloque(20, 5));
  assert.equal(pedidos.length, 4);
});

test('cache: respuesta tardia tras purge se descarta; LRU protege lo visible', () => {
  const { cache, pedidos } = cacheDePrueba();
  cache.asegurar(0, 5);
  cache.refrescar(true);
  pedidos[0].exito(bloque(0), 10);
  assert.equal(cache.fila(0), null);
  assert.equal(cache.ultimaConocida(), false);
  const lru = cacheDePrueba({ maxBloques: 2 });
  lru.cache.fijarTotal(100);
  for (const [i, d] of [[0, 0], [1, 10], [2, 20]]) {
    lru.cache.asegurar(d, d);
    lru.pedidos[i].exito(bloque(d));
  }
  lru.cache.asegurar(20, 20);
  assert.ok(Object.keys(lru.cache.estados()).length <= 3);
  assert.deepEqual(lru.cache.fila(20), { id: 20 });
});

/* ── ZIP, CSV y XLSX ──────────────────────────────────────────────────── */

test('zip: crc32 conocido y lectura del directorio central', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const zip = zipGuardado([{ nombre: 'a.txt', datos: new TextEncoder().encode('hola') }]);
  const v = new DataView(zip.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint32(zip.length - 22, true), 0x06054b50);
  assert.equal(v.getUint16(zip.length - 22 + 8, true), 1);
});

test('zip: comprimido es menor y descomprime igual', async () => {
  const datos = new TextEncoder().encode('abc'.repeat(5000));
  const zip = await zipComprimido([{ nombre: 'a.txt', datos }]);
  assert.ok(zip.length < 1000);
  const v = new DataView(zip.buffer);
  const n = v.getUint32(18, true);
  const inicio = 30 + v.getUint16(26, true);
  const flujo = new Blob([zip.slice(inicio, inicio + n)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  assert.equal(new TextDecoder().decode(await new Response(flujo).arrayBuffer()), 'abc'.repeat(5000));
});

const TABLA = {
  columnas: [{ colId: 'a', encabezado: 'A"1', ancho: 100, tipo: 'text', fijada: true }, { colId: 'b', encabezado: 'B', ancho: 140, tipo: 'number', fijada: false }],
  filas: [
    { tipo: 'grupo', nivel: 0, valores: ['-> x', 3], textos: ['-> x', '3'], contraida: false },
    { tipo: 'hoja', nivel: 1, valores: ['l<1>&', 1.5], textos: ['l<1>&', '1,5'], contraida: true },
    { tipo: 'hoja', nivel: 1, valores: [new Date(Date.UTC(2020, 0, 1)), true], textos: ['2020', 'si'], contraida: false },
  ],
};

test('csv: comillas por defecto, separador, suppressQuotes y contenido libre', () => {
  const csv = tablaACsv({ ...TABLA, antes: 'titulo', despues: [{ cells: [{ data: { value: 'pie' }, mergeAcross: 1 }] }] }, {});
  const lineas = csv.split('\r\n');
  assert.equal(lineas[0], 'titulo');
  assert.equal(lineas[1], '"A""1","B"');
  assert.equal(lineas[3], '"l<1>&","1,5"');
  assert.equal(lineas[lineas.length - 1], '"pie",""');
  assert.equal(tablaACsv(TABLA, { suppressQuotes: true, columnSeparator: ';', skipColumnHeaders: true }).split('\r\n')[0], '-> x;3');
});

test('xlsx: tipos nativos, escape, contorno y fecha serial', () => {
  const { xml: _x, indice } = crearEstilos();
  const xml = hojaAXml({ nombre: 'H', columnas: TABLA.columnas, filas: TABLA.filas, antes: [], despues: [], opciones: { freezeRows: 'headers' } }, indice);
  assert.match(xml, /<c r="B2" s="3"><v>3<\/v><\/c>/);
  assert.match(xml, /<t>l&lt;1&gt;&amp;<\/t>/);
  assert.match(xml, /<row r="3" outlineLevel="1" hidden="1">/);
  assert.match(xml, /<c r="A4" s="2"><v>43831<\/v><\/c>/);
  assert.match(xml, /<c r="B4" t="b"><v>1<\/v><\/c>/);
  assert.match(xml, /<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/);
});

test('xlsx: estilos de excelStyles por cellClass, fusiones y caracteres ilegales', () => {
  const { xml: estilos, indice } = crearEstilos([{ id: 'plata', interior: { color: '#C0C0C0' }, numberFormat: { format: '#,##0' }, font: { bold: true } }]);
  assert.match(estilos, /rgb="FFC0C0C0"/);
  assert.match(estilos, /formatCode="#,##0"/);
  const cols = [{ colId: 'a', encabezado: 'A\u0001', ancho: 70, tipo: 'number', fijada: false, clase: 'plata' }];
  const xml = hojaAXml({ nombre: 'H', columnas: cols, filas: [{ tipo: 'hoja', nivel: 0, valores: [5], textos: ['5'], contraida: false }], antes: [{ cells: [{ data: { value: 'T', type: 'String' }, mergeAcross: 2 }] }], despues: [], opciones: {} }, indice);
  assert.ok(!xml.includes('\u0001'));
  assert.match(xml, /<c r="A3" s="4"><v>5<\/v>/);
  assert.match(xml, /<mergeCell ref="A1:C1"\/>/);
});

test('xlsx: letras de columna, nombre de hoja y libro con hojas repetidas', () => {
  assert.deepEqual([0, 25, 26, 701, 702].map(letraColumna), ['A', 'Z', 'AA', 'ZZ', 'AAA']);
  assert.equal(nombreHoja('a/b:c*d'.repeat(10), 0).length, 31);
  assert.equal(nombreHoja('', 2), 'Hoja3');
  const e = entradasLibro(['Hoja', 'hoja'], ['<x/>', '<y/>'], crearEstilos().xml);
  assert.ok(e.some((x: { nombre: string }) => x.nombre === 'xl/worksheets/sheet2.xml'));
  const libro = new TextDecoder().decode(e.find((x: { nombre: string }) => x.nombre === 'xl/workbook.xml').datos);
  assert.match(libro, /name="hoja \(2\)"/);
});

/* ── Estado ───────────────────────────────────────────────────────────── */

const COLS = [{ colId: 'a', width: 100, pinned: null, hide: false }, { colId: 'b', width: 80, pinned: 'left', hide: true, flex: 2 }];
const FOTO = { columns: COLS, sortModel: [{ colId: 'a', dir: 'desc' }], filterModel: {}, quickFilter: 'q', selection: new Set(['1']), page: 2, pageSize: 50, rowGroupCols: ['a'], expandedGroups: new Set() };

test('estado: forma de AG Grid, ida y vuelta', () => {
  const e = leerEstado(FOTO, { pivot: { pivotMode: true, pivotColIds: ['b'] } });
  assert.deepEqual(e.columnPinning, { leftColIds: ['b'], rightColIds: [] });
  assert.deepEqual(e.columnVisibility, { hiddenColIds: ['b'] });
  assert.deepEqual(e.sort, { sortModel: [{ colId: 'a', sort: 'desc' }] });
  assert.deepEqual(e.rowGroup, { groupColIds: ['a'] });
  assert.equal(e.filter.quickFilter, 'q');
  const parche = fusionarEstado(COLS, { columnOrder: { orderedColIds: ['b', 'a'] }, columnVisibility: { hiddenColIds: [] }, sort: e.sort });
  assert.deepEqual(parche.columns.map((c: { colId: string }) => c.colId), ['b', 'a']);
  assert.equal(parche.columns[0].hide, false);
  assert.deepEqual(parche.sortModel, [{ colId: 'a', dir: 'desc' }]);
  assert.ok(!('rowGroupCols' in parche));
});

test('estado: rechaza invalido y omite propiedades ignoradas', () => {
  assert.equal(validarEstado({ sort: { sortModel: 'x' } }), null);
  assert.ok(validarEstado({ sort: { sortModel: [] }, desconocido: 1 }));
  assert.deepEqual(omitirPropiedades({ sort: { sortModel: [] }, version: '1' }, ['sort']), { version: '1' });
});

/* ── Expansion ────────────────────────────────────────────────────────── */

test('expansion: default perezoso; toggles del motor invierten lo efectivo', () => {
  const ex = new ExpansionGrupos(() => true);
  const g = { id: 'x' };
  ex.sincronizar(new Set());
  assert.equal(ex.abierto(g), true);
  assert.deepEqual(ex.sincronizar(new Set(['x'])), ['x']);
  assert.equal(ex.abierto(g), false, 'abierto por defecto + toggle = cerrado');
  assert.deepEqual(ex.sincronizar(new Set()), ['x']);
  assert.equal(ex.abierto(g), true);
  assert.equal(ex.sincronizar(new Set()), null, 'mismo contenido no es un cambio');
});

test('expansion: expandAll y collapseAll del motor se reconocen como masivos', () => {
  const ex = new ExpansionGrupos(() => false);
  ex.sincronizar(new Set());
  assert.equal(ex.sincronizar(new Set(['a', 'b'])), null);
  assert.equal(ex.abierto({ id: 'nuevo' }), true);
  assert.equal(ex.sincronizar(new Set()), null);
  assert.equal(ex.abierto({ id: 'a' }), false);
});

test('controlador: collapseAllGroups del motor cierra aunque el default los abra', async () => {
  const g = hostFalso({ groupDefaultExpanded: -1 }, VENTAS);
  g.model.setRowGroupCols(['pais']);
  assert.equal(g.filas().length, 7);
  g.model.collapseAllGroups();
  await espera();
  assert.equal(g.filas().length, 2);
  g.fin();
});

test('panel: moverEn reordena e inserta', () => {
  assert.deepEqual(moverEn(['a', 'b', 'c'], 'a', 3), ['b', 'c', 'a']);
  assert.deepEqual(moverEn(['a', 'b'], 'x', 1), ['a', 'x', 'b']);
  assert.deepEqual(moverEn(['a', 'b', 'c'], 'c', 0), ['c', 'a', 'b']);
});

/* ── Controlador sobre el modelo real ─────────────────────────────────── */

function hostFalso(opciones: Record<string, unknown> = {}, filas: Record<string, unknown>[] = VENTAS, columnas?: unknown[]) {
  const o = new Map(Object.entries(opciones));
  const oyentesOp = new Map<string, Set<(v: unknown) => void>>();
  const oyentes = new Map<string, Set<(d: Record<string, unknown>) => void>>();
  const transformadores: Array<{ etapa: string; aplicar: (f: unknown[], g: unknown) => unknown[] }> = [];
  const fuentes: Array<(c: unknown, n: unknown) => { valor: unknown } | undefined> = [];
  const decoradores: Array<(c: unknown) => unknown> = [];
  const clics: Array<(e: unknown) => unknown> = [];
  const expuestos: Record<string, (...a: unknown[]) => any> = {};
  const emitidos: Array<[string, Record<string, unknown>]> = [];
  const modelos = new Map<string, (g: unknown) => unknown>();
  const exportadores = new Map<string, { generar: (p: unknown) => unknown }>();
  const rowId = o.get('getRowId') as ((p: { data: unknown }) => string) | undefined;
  const model = createGridModel({
    rows: filas,
    columns: columnas ?? [{ field: 'pais', enableRowGroup: true }, { field: 'anio', type: 'number' }, { field: 'valor', type: 'number', aggFunc: 'sum' }],
    getRowId: rowId ? (data: unknown) => rowId({ data }) : (row: { id?: unknown }, i: number) => String(row.id ?? `row-${i}`),
  });
  const h: Record<string, any> = {
    el: { getAttribute: () => null, api: expuestos, ownerDocument: {} },
    shadow: { querySelector: () => null },
    opcion: (n: string, d: unknown) => (o.has(n) && o.get(n) !== undefined ? o.get(n) : d),
    fijarOpcion: (n: string, v: unknown) => {
      o.set(n, v);
      for (const fn of oyentesOp.get(n) ?? []) fn(v);
    },
    alCambiarOpcion: (n: string, fn: (v: unknown) => void) => {
      const s = oyentesOp.get(n) ?? new Set();
      oyentesOp.set(n, s);
      s.add(fn);
      return () => s.delete(fn);
    },
    modelo: () => model,
    estado: () => model.getState(),
    columnas: () => model.getColumns(),
    columna: (id: string) => model.getColumns().find((c: { colId: string }) => c.colId === id) ?? null,
    defDe: (c: { def: unknown }) => c.def,
    valor: (c: unknown, n: unknown) => {
      for (const f of fuentes) {
        const r = f(c, n);
        if (r) return r.valor;
      }
      return getCellValue(c as never, n as never);
    },
    textoCelda: (c: unknown, n: unknown) => cellText(c as never, n as never),
    texto: (_k: string, d: string) => d,
    filaEn: (i: number) => model.getState().displayRows[i] ?? null,
    totalFilas: () => model.getState().displayRows.length,
    nodo: (id: string) => model.getRowNode(id),
    fijarValor: () => true,
    emitir: (ev: string, d: Record<string, unknown> = {}) => {
      emitidos.push([ev, d]);
      for (const fn of oyentes.get(ev) ?? []) fn(d);
    },
    on: (ev: string, fn: (d: Record<string, unknown>) => void) => {
      const s = oyentes.get(ev) ?? new Set();
      oyentes.set(ev, s);
      s.add(fn);
      return () => s.delete(fn);
    },
    exponer: (m: Record<string, (...a: unknown[]) => unknown>) => Object.assign(expuestos, m),
    transformador: (t: { etapa: string; aplicar: (f: unknown[], g: unknown) => unknown[] }) => {
      transformadores.push(t);
      model.setTransforms(transformadores.map((x) => ({ etapa: x.etapa, aplicar: (f: unknown[]) => x.aplicar(f, h) })));
      return () => {};
    },
    fuenteValor: (fn: (c: unknown, n: unknown) => { valor: unknown } | undefined) => {
      fuentes.push(fn);
      return () => {};
    },
    decorarCelda: (fn: (c: unknown) => unknown) => {
      decoradores.push(fn);
      return () => {};
    },
    celdaClic: (fn: (e: unknown) => unknown) => {
      clics.push(fn);
      return () => {};
    },
    modeloFilas: (t: string, c: (g: unknown) => unknown) => modelos.set(t, c),
    exportador: (e: { formato: string; generar: (p: unknown) => unknown }) => exportadores.set(e.formato, e),
    renderer: () => {},
    menu: () => () => {},
    panel: () => {},
    foco: () => null,
    enfocar: () => {},
    em: (u: number) => `${u / 16}em`,
    escapar: (s: unknown) => String(s),
    pedirRender: () => {},
    recomputar: () => model.invalidate('agrupar'),
    alturaFila: () => {},
  };
  const fin = instalar(h as never);
  h['emitir']('gridReady');
  return { h, model, api: expuestos, emitidos, fuentes, decoradores, modelos, exportadores, fin, filas: () => model.getState().displayRows as any[] };
}

const espera = (ms = 0) => new Promise((r) => setTimeout(r, ms));

test('controlador: rowGroup en ColDef siembra el agrupado y agrega por columna', () => {
  const g = hostFalso({}, VENTAS, [{ field: 'pais', rowGroup: true }, { field: 'valor', type: 'number', aggFunc: 'sum' }]);
  const f = g.filas();
  assert.deepEqual(f.map((x) => x.id), ['pais=CO', 'pais=MX']);
  assert.equal(f[0].agg['valor'], 70);
  assert.equal(f[0].aggTextos['valor'], '70');
  g.fin();
});

test('controlador: groupDefaultExpanded abre por nivel y toggleGroup del motor cierra', () => {
  const g = hostFalso({ groupDefaultExpanded: 1 }, VENTAS);
  g.model.setRowGroupCols(['pais', 'anio']);
  assert.equal(g.filas().filter((x) => x.level === 1).length, 4);
  assert.equal(g.filas().filter((x) => x.level === 2).length, 0);
  g.model.toggleGroup('pais=CO');
  assert.equal(g.filas()[0].expanded, false);
  assert.equal(g.filas().length, 2 + 2);
  g.fin();
});

test('controlador: expandAll, collapseAll y resetRowGroupExpansion', () => {
  const g = hostFalso({}, VENTAS);
  g.model.setRowGroupCols(['pais']);
  g.api.expandAll();
  assert.equal(g.filas().length, 7);
  g.api.collapseAll();
  assert.equal(g.filas().length, 2);
  g.api.setRowNodeExpanded({ id: 'pais=MX' }, true);
  assert.equal(g.filas().length, 4);
  g.api.resetRowGroupExpansion();
  assert.equal(g.filas().length, 2);
  g.fin();
});

test('controlador: total general es hoja sintetica con valor por columna', () => {
  const g = hostFalso({ grandTotalRow: 'bottom' }, VENTAS);
  const f = g.filas();
  const ultimo = f[f.length - 1];
  assert.equal(ultimo.kind, 'leaf');
  assert.equal(ultimo.node.id, 'rowGroupFooter_ROOT_NODE_ID');
  const col = g.h['columna']('valor');
  assert.equal(g.h['valor'](col, ultimo.node), 100);
  assert.equal(g.h['valor'](g.h['columna']('pais'), ultimo.node), null);
  const pegado = hostFalso({ grandTotalRow: 'pinnedTop' }, VENTAS).filas()[0];
  assert.equal(pegado.pegar, 'arriba');
  g.fin();
});

test('controlador: addValueColumns, setColumnAggFunc y addAggFuncs', () => {
  const g = hostFalso({}, VENTAS);
  g.model.setRowGroupCols(['pais']);
  g.api.addValueColumns(['anio']);
  assert.equal(g.filas()[0].agg['anio'], 6061);
  g.api.setColumnAggFunc('anio', 'max');
  assert.equal(g.filas()[0].agg['anio'], 2021);
  assert.equal(g.h['columna']('anio').aggFunc, 'max');
  g.api.addAggFuncs({ dos: () => 2 });
  g.api.setColumnAggFunc('anio', 'dos');
  assert.equal(g.filas()[0].agg['anio'], 2);
  g.api.removeValueColumns(['anio']);
  assert.equal(g.filas()[0].agg['anio'], undefined);
  assert.equal(g.api.getValueColumns().length, 1);
  assert.ok(g.emitidos.some(([e]) => e === 'columnValueChanged'));
  g.fin();
});

test('controlador: pivote genera columnas, oculta origen y restaura al salir', async () => {
  const g = hostFalso({}, VENTAS);
  g.model.setRowGroupCols(['pais']);
  g.api.setPivotColumns(['anio']);
  g.h['fijarOpcion']('pivotMode', true);
  await espera();
  const f = g.filas();
  assert.equal(f.length, 2, 'sin hojas en modo pivote');
  assert.equal(g.h['valor'](g.h['columna']('pivot_anio_2020_valor'), f[0].node), 50);
  assert.equal(g.h['columna']('valor').hide, true);
  assert.ok(g.h['columna']('ag-Grid-AutoColumn'));
  assert.equal(g.api.getPivotResultColumn(['2021'], 'valor').colId, 'pivot_anio_2021_valor');
  assert.equal(g.api.isPivotMode(), true);
  g.h['fijarOpcion']('pivotMode', false);
  assert.equal(g.h['columna']('pivot_anio_2020_valor'), null);
  assert.equal(g.h['columna']('valor').hide, false);
  g.fin();
});

test('controlador: tree data pinta hojas alineadas con decoracion y expande', () => {
  const g = hostFalso({ treeData: true, getDataPath: (d: { ruta: string[] }) => d.ruta, groupDefaultExpanded: -1 }, RUTAS, [{ field: 't', type: 'number', aggFunc: 'sum' }]);
  g.model.invalidate('agrupar');
  const f = g.filas();
  assert.ok(f.every((x) => x.kind === 'leaf'));
  assert.equal(f.length, 5);
  const padre = f.find((x) => x.node.id === 'a');
  const col = g.h['columna']('t');
  assert.equal(g.h['valor'](col, padre.node), 5);
  const d = g.decoradores[0]({ node: padre.node, col, texto: '5' }) as { prefijo: string };
  assert.match(d.prefijo, /iswc-ag-arbol-toggle/);
  assert.match(d.prefijo, /docs/);
  g.api.setRowNodeExpanded({ id: 'a' }, false);
  assert.equal(g.filas().length, 4);
  g.fin();
});

test('controlador: master-detail inserta fila extra solo en maestros abiertos', () => {
  const g = hostFalso({ masterDetail: true, isRowMaster: (d: { pais: string }) => d.pais === 'CO', detailRowHeight: 120 }, VENTAS);
  g.api.setRowNodeExpanded({ id: '1' }, true);
  const f = g.filas();
  assert.equal(f.length, 6);
  assert.equal(f[1].kind, 'detalle');
  assert.equal(f[1].id, 'detail_1');
  assert.equal(f[1].alto, 120);
  g.api.setRowNodeExpanded({ id: '3' }, true);
  assert.equal(g.filas().length, 6, 'no maestro se trata como grupo y no agrega detalle');
  g.fin();
});

test('controlador: applyTransaction por referencia y por id; async agrupa en un lote', async () => {
  const propias = VENTAS.map((v) => ({ ...v }));
  const g = hostFalso({ asyncTransactionWaitMillis: 1 }, propias);
  const r = g.api.applyTransaction({ remove: [propias[0]] });
  assert.equal(r.remove.length, 1);
  assert.equal(g.model.getAllRows().length, 4);
  const conId = hostFalso({ getRowId: (p: { data: { id: number } }) => String(p.data.id) }, propias);
  assert.equal(conId.api.applyTransaction({ update: [{ id: 2, pais: 'AR', valor: 1 }] }).update.length, 1);
  let llamadas = 0;
  const resultados: unknown[] = [];
  g.api.applyTransactionAsync({ add: [{ id: 8 }] }, (x: unknown) => resultados.push(x));
  g.api.applyTransactionAsync({ add: [{ id: 9 }] }, (x: unknown) => resultados.push(x));
  const original = g.model.setRows;
  g.model.setRows = (f: unknown) => {
    llamadas++;
    original(f);
  };
  await espera(10);
  assert.equal(g.model.getAllRows().length, 6);
  assert.equal(llamadas, 1, 'una reconstruccion por lote');
  assert.equal(resultados.length, 2);
  assert.ok(g.emitidos.some(([e]) => e === 'asyncTransactionsFlushed'));
  g.fin();
});

test('controlador: exportacion CSV con grupos, totales y callbacks', () => {
  const g = hostFalso({}, VENTAS);
  g.model.setRowGroupCols(['pais']);
  const csv: string = g.api.getDataAsCsv({ columnKeys: ['anio', 'valor'] });
  const l = csv.split('\r\n');
  assert.equal(l[0], '"Grupo","anio","valor"');
  assert.equal(l[1], '"-> CO","","70"');
  assert.equal(l[2], '"","2020","10"');
  const solo = g.api.getDataAsCsv({ skipRowGroups: true, columnKeys: ['valor'], processCellCallback: (p: { value: unknown }) => `v${p.value}` });
  assert.equal(solo.split('\r\n')[1], '"","v10"');
  assert.equal(g.api.getDataAsCsv({ shouldRowBeSkipped: () => true, skipColumnHeaders: true, skipRowGroups: true }), '');
  g.fin();
});

test('controlador: Excel de varias hojas devuelve XLSX valido', async () => {
  const g = hostFalso({}, VENTAS);
  const a = g.api.getSheetDataForExcel({ sheetName: 'Uno' });
  const b = g.api.getSheetDataForExcel({ sheetName: 'Dos', onlySelected: true });
  const blob: Blob = g.api.getMultipleSheetsAsExcel({ data: [a, b] });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x04034b50);
  assert.match(blob.type, /spreadsheetml/);
  assert.ok(new TextDecoder().decode(bytes).includes('name="Dos"'));
  assert.ok(g.api.getDataAsExcel() instanceof Blob);
  g.fin();
});

test('controlador: getState/setState en un solo notify; initialState al arrancar', () => {
  const g = hostFalso({}, VENTAS);
  g.model.setRowGroupCols(['pais']);
  g.model.setSortModel([{ colId: 'valor', dir: 'desc' }]);
  g.api.setRowNodeExpanded({ id: 'pais=CO' }, true);
  const foto = JSON.parse(JSON.stringify(g.api.getState()));
  assert.deepEqual(foto.rowGroup, { groupColIds: ['pais'] });
  assert.ok(foto.rowGroupExpansion.expandedRowGroupIds.includes('pais=CO'));
  const otro = hostFalso({ initialState: foto }, VENTAS);
  assert.deepEqual(otro.model.getState().rowGroupCols, ['pais']);
  assert.equal(otro.filas().length, 5);
  let avisos = 0;
  otro.model.subscribe(() => avisos++);
  otro.api.setState({ sort: { sortModel: [] }, pagination: { page: 0, pageSize: 10 } });
  assert.equal(avisos, 1);
  assert.equal(otro.api.setState({ sort: 'mal' }), false);
  g.fin();
});

test('controlador: accesores incluyen grupos', () => {
  const g = hostFalso({}, VENTAS);
  g.model.setRowGroupCols(['pais']);
  g.filas();
  const vistos: Array<{ group: boolean; id: string }> = [];
  g.api.forEachNode((n: { group: boolean; id: string }) => vistos.push(n));
  assert.equal(vistos.length, 7);
  assert.equal(vistos[0].group, true);
  assert.equal(g.api.getRowNode('pais=CO').allChildrenCount, 3);
  assert.equal(g.api.getRowNode('1').group, false);
  g.fin();
});

/* ── Modelos externos ─────────────────────────────────────────────────── */

test('infinite: pide bloques, entrega filas, purge y reconoce la ultima', () => {
  const pedidos: any[] = [];
  const g = hostFalso({ datasource: { getRows: (p: unknown) => pedidos.push(p) }, cacheBlockSize: 2, rowModelType: 'infinite', context: { c: 1 } });
  const m = crearModeloInfinito(g.h as never);
  assert.equal(m.filaEn(0), null);
  m.asegurar(0, 1);
  pedidos[0].successCallback([{ id: 1 }, { id: 2 }], null);
  assert.equal(m.filaEn(1).node.data['id'], 2);
  assert.equal(pedidos[0].context.c, 1);
  assert.equal(m.total(), 4);
  m.refrescar('x');
  assert.equal(m.filaEn(0), null);
  g.fin();
});

test('serverSide: grupos por ruta, subtienda al abrir y transaccion', () => {
  const pedidos: any[] = [];
  const g = hostFalso({ serverSideDatasource: { getRows: (p: unknown) => pedidos.push(p) }, cacheBlockSize: 10, getRowId: (p: { data: { id: unknown } }) => String(p.data.id) });
  g.model.setRowGroupCols(['pais']);
  const s = new ModeloServidor(g.h as never);
  s.asegurar(0, 0);
  assert.deepEqual(pedidos[0].request.groupKeys, []);
  assert.deepEqual(pedidos[0].request.rowGroupCols.map((c: { id: string }) => c.id), ['pais']);
  pedidos[0].success({ rowData: [{ id: 'co', pais: 'CO', valor: 7 }, { id: 'mx', pais: 'MX', valor: 3 }], rowCount: 2 });
  const f = s.filaEn(0) as any;
  assert.equal(f.kind, 'group');
  assert.equal(f.id, 'pais=CO');
  assert.equal(f.agg['valor'], 7);
  s.alternarPorId(f.id);
  s.filaEn(0);
  s.asegurar(0, 2);
  assert.deepEqual(pedidos[1].request.groupKeys, ['CO']);
  pedidos[1].success({ rowData: [{ id: 1, pais: 'CO' }], rowCount: 1 });
  assert.equal(s.total(), 3);
  assert.equal((s.filaEn(1) as any).kind, 'leaf');
  assert.equal((s.filaEn(2) as any).id, 'pais=MX');
  const r = s.transaccion({ route: ['CO'], add: [{ id: 2, pais: 'CO' }] });
  assert.equal(r.status, 'Applied');
  assert.equal(s.total(), 4);
  assert.equal(s.transaccion({ route: ['NO'] }).status, 'StoreNotFound');
  assert.equal(s.niveles().length, 2);
  s.destruir();
  g.fin();
});

test('viewport: rango con pagina y buffer; solo guarda la ventana', () => {
  const rangos: number[][] = [];
  let params: any = null;
  const g = hostFalso({ viewportDatasource: { init: (p: unknown) => { params = p; }, setViewportRange: (a: number, b: number) => rangos.push([a, b]) }, viewportRowModelPageSize: 10, viewportRowModelBufferSize: 5 });
  const m = new ModeloViewport(g.h as never);
  params.setRowCount(1000);
  m.asegurar(20, 29);
  assert.deepEqual(rangos[0], [10, 39]);
  m.asegurar(20, 29);
  assert.equal(rangos.length, 1);
  params.setRowData({ 12: { id: 12 }, 500: { id: 500 } });
  assert.equal((m.filaEn(12) as any).node.data['id'], 12);
  m.asegurar(100, 109);
  assert.equal(m.filaEn(12), null);
  g.fin();
});

/* ── Rendimiento ──────────────────────────────────────────────────────── */

/**
 * ms de CPU del proceso desde `c0` (user + system). Los presupuestos de rendimiento son de CPU, no de reloj: el
 * cálculo es síncrono y con el equipo cargado el reloj midió 1,6-6,1 s (6-nov-2026) para lo que cabe holgado en
 * el presupuesto; la carga ajena no es una regresión del código.
 */
function cpuDesde(c0: { user: number; system: number }): number {
  const { user, system } = process.cpuUsage(c0);
  return (user + system) / 1000;
}

function masivo(n: number) {
  const out: Nodo[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = { id: String(i), index: i, data: { a: i % 10, b: i % 100, c: i % 7, v: i } };
  return out;
}

test('rendimiento: 100.000 filas agrupadas, agregadas y aplanadas', () => {
  const hs = masivo(100000);
  const c0 = process.cpuUsage();
  const raiz = construirArbol(hs, [nivel('a'), nivel('b'), nivel('c')]);
  agregarArbol(raiz, [valor('v', 'sum'), valor('v', 'avg', 'p'), valor('v', 'max', 'x')]);
  const f = aplanarArbol(raiz, ABIERTO);
  const ms = cpuDesde(c0);
  assert.ok(f.length > 100000);
  assert.equal(raiz.agg['v'], (99999 * 100000) / 2);
  assert.ok(ms < 1500, `tardo ${ms} ms`);
});

test('rendimiento: 100.000 filas en pivote, tree, transaccion y CSV', () => {
  const hs = masivo(100000);
  const c0 = process.cpuUsage();
  const r = pivotar(hs, [{ colId: 'c', valor: (n: Nodo) => n.data['c'] }], [valor('v', 'sum')], (c: string) => c);
  const raiz = construirArbol(hs, [nivel('a')]);
  agregarArbol(raiz, [valor('v', 'sum')], { clavesPivote: r.clavesDe, soloPivote: true, idPivote: resolverIdPivote(['c']) });
  const tree = construirTree(hs, { rutaDe: (d: { a: number; b: number }) => [String(d.a), String(d.b), 'x' + d.a] });
  const filas = hs.map((n) => n.data);
  aplicarTransaccion(filas, { update: filas.slice(0, 1000), remove: filas.slice(1000, 2000) }, null);
  const tabla = { columnas: [{ colId: 'v', encabezado: 'V', ancho: 10, tipo: 'number', fijada: false }], filas: hs.map((n) => ({ tipo: 'hoja', nivel: 0, valores: [n.data['v']], textos: [String(n.data['v'])], contraida: false })) };
  const csv = tablaACsv(tabla);
  const ms = cpuDesde(c0);
  assert.ok(tree.raiz.hijos.length === 10 && csv.length > 100000);
  assert.ok(ms < 3000, `tardo ${ms} ms`);
});

test('rendimiento: 100.000 filas a XLSX', () => {
  const hs = masivo(100000);
  const cols = [{ colId: 'v', encabezado: 'V', ancho: 10, tipo: 'number', fijada: false }, { colId: 't', encabezado: 'T', ancho: 10, tipo: 'text', fijada: false }];
  const filas = hs.map((n) => ({ tipo: 'hoja', nivel: 0, valores: [n.data['v'], `t${n.data['v']}`], textos: ['', `t${n.data['v']}`], contraida: false }));
  const e = crearEstilos();
  const c0 = process.cpuUsage();
  const xml = hojaAXml({ nombre: 'H', columnas: cols, filas, antes: [], despues: [], opciones: {} }, e.indice);
  const zip = zipGuardado(entradasLibro(['H'], [xml], e.xml));
  const ms = cpuDesde(c0);
  assert.ok(zip.length > 1000000);
  assert.ok(ms < 3000, `tardo ${ms} ms`);
});

export default lista();
