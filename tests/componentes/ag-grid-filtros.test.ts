// @contexto INDICE.md · tests/componentes/README.md
/**
 * ag-grid-filtros.test.ts — Logica pura de la parcela de filtros de <iswc-ag-grid>: condiciones,
 * set, multi, quick, avanzado, orden, paginacion, agregados, side bar y menus. El motor corre sobre
 * el grid-model real con un host minimo: asi se comprueba que core deja pasar los modelos de AG Grid.
 */
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { aFecha, aModeloAg, coincideModelo, combinarCondiciones, condicionActiva, esLegado, opcionInicial, opcionesDe, rangoRelativo } from '../../src/components/data/utils/ag-grid/filtros-condiciones.ts';
import { arbolSet, coincideSet, filtrarMini, hojasDe, itemsSet, marcaDeTodo, modeloSet, seleccionDe } from '../../src/components/data/utils/ag-grid/filtros-set.ts';
import { coincideQuick, partesQuick, MotorFiltros } from '../../src/components/data/utils/ag-grid/filtros-motor.ts';
import { avanzadoATexto, coincideAvanzado, parsearAvanzado } from '../../src/components/data/utils/ag-grid/filtros-avanzado.ts';
import { compararValores, esClicMulti, modeloTrasClic, ordenarFilas, ordenInicial, siguienteDir } from '../../src/components/data/utils/ag-grid/filtros-orden.ts';
import { agregados, arbolColumnas, filtrarArbolColumnas, funcionesAgregado, hojasColumna, normalizarSideBar, opcionesTam, resolverMenu, resumenPagina, tamAutomatico } from '../../src/components/data/utils/ag-grid/filtros-resumen.ts';
import { createGridModel } from '../../src/components/data/utils/datagrid-core/grid-model.ts';
import type { ContextoValor } from '../../src/components/data/utils/ag-grid/filtros.schemas.ts';
import type { GridHost } from '../../src/components/data/utils/ag-grid/contrato.schemas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const HOY = new Date(2026, 9, 31);
const ctx = (valor: unknown, texto = String(valor ?? '')): ContextoValor => ({ valor, texto, data: {}, node: {}, col: {}, def: {}, ahora: () => HOY });

test('condiciones: catalogo por tipo, inicial y opciones propias', () => {
  assert.deepEqual(opcionesDe('date').map((o) => o.clave), ['equals', 'notEqual', 'lessThan', 'greaterThan', 'inRange', 'blank', 'notBlank']);
  assert.equal(opcionesDe('number').find((o) => o.clave === 'inRange')?.entradas, 2);
  assert.equal(opcionesDe('text').find((o) => o.clave === 'blank')?.entradas, 0);
  assert.equal(opcionInicial('text', opcionesDe('text')), 'contains');
  const propia = { displayKey: 'par', displayName: 'Par', numberOfInputs: 0, predicate: (_v: unknown[], c: unknown) => Number(c) % 2 === 0 };
  const params = { filterOptions: ['equals', propia] };
  assert.equal(opcionesDe('number', params)[1]?.etiqueta, 'Par');
  assert.equal(coincideModelo('number', { type: 'par' }, ctx(4), params), true);
  assert.equal(coincideModelo('number', { type: 'par' }, ctx(3), params), false);
});

test('condiciones: texto con mayusculas, vacios, negativos, textFormatter y textMatcher', () => {
  const t = (type: string, filter: string, v: unknown, p = {}): boolean => coincideModelo('text', { type, filter }, ctx(v), p);
  assert.equal(t('contains', 'OL', 'colombia'), true);
  assert.equal(t('contains', 'OL', 'colombia', { caseSensitive: true }), false);
  assert.equal(t('startsWith', 'co', 'Colombia'), true);
  assert.equal(t('endsWith', 'ia', 'Colombia'), true);
  assert.equal(t('equals', 'x', null), false);
  assert.equal(t('notContains', 'x', null), true);
  assert.equal(t('notEqual', 'x', null), true);
  assert.equal(coincideModelo('text', { type: 'blank' }, ctx('  ')), true);
  assert.equal(coincideModelo('text', { type: 'notBlank' }, ctx('a')), true);
  assert.equal(t('contains', 'e', 'é', { textFormatter: (v: string) => v.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() }), true);
  assert.equal(t('contains', 'zzz', 'abc', { textMatcher: () => true }), true);
});

test('condiciones: numero con rango exclusivo o inclusivo y celdas vacias', () => {
  const n = (type: string, filter: number, filterTo: number | undefined, v: unknown, p = {}): boolean => coincideModelo('number', { type, filter, filterTo }, ctx(v), p);
  assert.equal(n('greaterThan', 5, undefined, 6), true);
  assert.equal(n('lessThanOrEqual', 5, undefined, 5), true);
  assert.equal(n('inRange', 1, 3, 3), false);
  assert.equal(n('inRange', 1, 3, 3, { inRangeInclusive: true }), true);
  assert.equal(n('equals', 1, undefined, null), false);
  assert.equal(n('equals', 1, undefined, null, { includeBlanksInEquals: true }), true);
  assert.equal(n('notEqual', 1, undefined, '2'), true);
  assert.equal(coincideModelo('number', { type: 'blank' }, ctx('')), true);
});

test('condiciones: fecha en hora local, comparator, rangos relativos', () => {
  const d = (type: string, dateFrom: string, v: unknown, dateTo?: string, p = {}): boolean => coincideModelo('date', { type, dateFrom, dateTo }, ctx(v), p);
  assert.equal(aFecha('2026-10-31')?.getDate(), 31);
  assert.equal(aFecha('nada'), null);
  assert.equal(d('equals', '2026-10-31', new Date(2026, 9, 31, 23, 50)), true);
  assert.equal(d('lessThan', '2026-10-31', '2026-10-30'), true);
  assert.equal(d('inRange', '2026-01-01', '2026-06-01', '2026-12-31'), true);
  assert.equal(d('greaterThan', '2026-01-01', null), false);
  const comparator = (f: Date, c: unknown): number => new Date(String(c).split('/').reverse().join('-') + 'T00:00:00').getTime() - f.getTime();
  assert.equal(d('equals', '2026-10-31', '31/10/2026', undefined, { comparator }), true);
  assert.deepEqual(rangoRelativo('lastMonth', HOY)?.map((x) => x.getDate()), [1, 30]);
  assert.equal(rangoRelativo('thisWeek', HOY)?.[0].getDay(), 1);
  assert.equal(coincideModelo('date', { type: 'today' }, ctx(new Date(2026, 9, 31, 8))), true);
  assert.equal(coincideModelo('date', { type: 'yesterday' }, ctx(new Date(2026, 9, 31, 8))), false);
});

test('condiciones: modelos combinados y activos', () => {
  const m = { filterType: 'number', operator: 'OR' as const, conditions: [{ type: 'equals', filter: 1 }, { type: 'equals', filter: 2 }] };
  assert.equal(coincideModelo('number', m, ctx(2)), true);
  assert.equal(coincideModelo('number', { ...m, operator: 'AND' }, ctx(2)), false);
  assert.equal(condicionActiva('text', { type: 'contains', filter: '' }), false);
  assert.equal(condicionActiva('text', { type: 'blank' }), true);
  assert.equal(condicionActiva('number', { type: 'inRange', filter: 1 }), false);
  assert.equal(condicionActiva('date', { type: 'empty' }), false);
  assert.equal(combinarCondiciones('text', [{ type: 'contains', filter: '' }], 'AND'), null);
  assert.deepEqual(combinarCondiciones('text', [{ type: 'contains', filter: 'a' }, { type: 'contains', filter: '' }], 'OR'), { type: 'contains', filter: 'a', filterType: 'text' });
  const dos = combinarCondiciones('text', [{ type: 'contains', filter: 'a' }, { type: 'blank' }], 'OR') as { operator: string; conditions: unknown[] };
  assert.equal(dos.operator, 'OR');
  assert.equal(dos.conditions.length, 2);
});

test('condiciones: el modelo legado del core se traduce a AG Grid', () => {
  assert.equal(esLegado({ type: 'text', op: 'contains', value: 'a' }), true);
  assert.equal(esLegado({ filterType: 'text', type: 'contains', filter: 'a' }), false);
  assert.deepEqual(aModeloAg({ type: 'number', op: 'gte', value: 3 }), { filterType: 'number', type: 'greaterThanOrEqual', filter: 3, filterTo: null });
  assert.deepEqual(aModeloAg({ type: 'set', values: ['a'] }), { filterType: 'set', values: ['a'] });
  assert.equal((aModeloAg({ type: 'combined', op: 'OR', conditions: [{ type: 'text', op: 'contains', value: 'a' }] }) as { operator: string }).operator, 'OR');
});

test('set: valores unicos, vacios primero, plegado de mayusculas y keyCreator', () => {
  const items = itemsSet(['b', 'A', 'a', null, ''], {}, '(V)');
  assert.deepEqual(items.map((i) => i.clave), [null, 'A', 'b']);
  assert.equal(items[0]?.etiqueta, '(V)');
  assert.equal(itemsSet(['a', 'A'], { caseSensitive: true }).length, 2);
  assert.deepEqual(itemsSet([10, 9]).map((i) => i.valor), [9, 10]);
  assert.deepEqual(itemsSet([['x', 'y'], ['y']]).map((i) => i.clave), ['x', 'y']);
  assert.deepEqual(itemsSet(['b', 'a'], { suppressSorting: true }).map((i) => i.clave), ['b', 'a']);
  const conLlave = itemsSet([{ id: 1, n: 'Uno' }], { keyCreator: (p: { value: { id: number } }) => p.value.id, valueFormatter: (p: { value: { n: string } }) => p.value.n });
  assert.equal(conLlave[0]?.clave, '1');
  assert.equal(conLlave[0]?.etiqueta, 'Uno');
});

test('set: mini filtro, select all, modelo y evaluacion', () => {
  const u = itemsSet(['ana', 'beto', null]);
  assert.equal(filtrarMini(u, 'AN').length, 1);
  const sel = seleccionDe(null, u);
  assert.equal(sel.size, 3);
  assert.equal(modeloSet(sel, u), null);
  sel.delete('ana');
  assert.equal(marcaDeTodo(u, sel), 'some');
  assert.deepEqual(modeloSet(sel, u)?.values, [null, 'beto']);
  assert.equal(seleccionDe(null, u, { defaultToNothingSelected: true }).size, 0);
  const m = { filterType: 'set' as const, values: ['ANA', null] };
  assert.equal(coincideSet(m, 'ana'), true);
  assert.equal(coincideSet(m, null), true);
  assert.equal(coincideSet(m, 'ana', { caseSensitive: true }), false);
  assert.equal(coincideSet(m, ['x', 'ana']), true);
  assert.equal(coincideSet({ filterType: 'set', values: [] }, 'ana'), false);
});

test('set: arbol por fecha y por ruta propia', () => {
  const fechas = itemsSet([new Date(2026, 0, 5), new Date(2026, 1, 6)]);
  const arbol = arbolSet(fechas);
  assert.equal(arbol.length, 1);
  assert.equal(arbol[0]?.hijos.length, 2);
  assert.equal(hojasDe(arbol[0] as (typeof arbol)[number]).length, 2);
  const propia = arbolSet(itemsSet(['a/b', 'a/c']), { treeListPathGetter: (v: string) => v.split('/') });
  assert.equal(propia[0]?.hijos.length, 2);
});

test('quick: todas las palabras, parser y matcher propios', () => {
  assert.deepEqual(partesQuick('  tony  ireland '), ['TONY', 'IRELAND']);
  assert.deepEqual(partesQuick('   '), []);
  assert.deepEqual(partesQuick('a,b', (t) => t.split(',')), ['A', 'B']);
  assert.equal(coincideQuick(['TONY', 'IRELAND'], 'TONY\nIRELAND'), true);
  assert.equal(coincideQuick(['TONY', 'CHILE'], 'TONY\nIRELAND'), false);
  assert.equal(coincideQuick([], 'x'), true);
  assert.equal(coincideQuick(['^T'], 'TONY', (p, t) => new RegExp(p[0] as string).test(t)), true);
});

const COLS = [{ colId: 'edad', nombre: 'Edad', tipo: 'number' }, { colId: 'pais', nombre: 'Pais', tipo: 'text' }, { colId: 'activo', nombre: 'Activo', tipo: 'boolean' }, { colId: 'alta', nombre: 'Alta', tipo: 'date' }];

test('avanzado: parser, precedencia y errores con posicion', () => {
  assert.deepEqual(parsearAvanzado('', COLS), { modelo: null, error: null });
  assert.deepEqual(parsearAvanzado('[Edad] > 23', COLS).modelo, { filterType: 'number', colId: 'edad', type: 'greaterThan', filter: 23 });
  const r = parsearAvanzado('[Edad] > 23 and ([Pais] contains "co" or [Activo] is true)', COLS);
  assert.equal(r.error, null);
  assert.equal((r.modelo as { type: string }).type, 'AND');
  assert.equal((parsearAvanzado('[Edad] = 1 OR [Edad] = 2 AND [Edad] = 3', COLS).modelo as { type: string }).type, 'OR');
  const e = (t: string): string | undefined => parsearAvanzado(t, COLS).error?.mensaje;
  assert.equal(e('[Nada] = 1'), 'advancedFilterValidationInvalidColumn');
  assert.equal(e('[Edad] = uno'), 'advancedFilterValidationNotANumber');
  assert.equal(e('[Pais] contains "co'), 'advancedFilterValidationMissingQuote');
  assert.equal(e('([Edad] = 1'), 'advancedFilterValidationMissingEndBracket');
  assert.equal(e('[Edad] = 1)'), 'advancedFilterValidationExtraEndBracket');
  assert.equal(e('[Edad]'), 'advancedFilterValidationMissingOption');
  assert.equal(e('[Edad] contains "x"'), 'advancedFilterValidationInvalidOption');
  assert.equal(e('[Edad] ='), 'advancedFilterValidationMissingValue');
  assert.equal(e('[Alta] = "x"'), 'advancedFilterValidationInvalidDate');
  assert.equal(e('[Edad] = 1 [Edad] = 2'), 'advancedFilterValidationInvalidJoinOperator');
  assert.equal(parsearAvanzado('[Edad] = 1 OR', COLS).error?.posicion, 13);
});

test('avanzado: ida y vuelta por texto y evaluacion', () => {
  const texto = '[Edad] > 23 AND ([Pais] contains "c\\"o" OR [Activo] is true)';
  const m = parsearAvanzado(texto, COLS).modelo;
  assert.equal(avanzadoATexto(m, COLS), texto);
  assert.deepEqual(parsearAvanzado(avanzadoATexto(m, COLS), COLS).modelo, m);
  const fila: Record<string, unknown> = { edad: 30, pais: 'x', activo: true };
  const contexto = (id: string): ContextoValor => ctx(fila[id]);
  assert.equal(coincideAvanzado(m as NonNullable<typeof m>, contexto), true);
  fila['activo'] = false;
  assert.equal(coincideAvanzado(m as NonNullable<typeof m>, contexto), false);
});

test('orden: ciclo, multi, tecla y orden inicial', () => {
  assert.equal(siguienteDir(null), 'asc');
  assert.equal(siguienteDir('desc'), null);
  assert.equal(siguienteDir('asc', ['desc', 'asc', null]), null);
  assert.deepEqual(modeloTrasClic([{ colId: 'a', dir: 'asc' }], 'b', { multi: false }), [{ colId: 'b', dir: 'asc' }]);
  assert.deepEqual(modeloTrasClic([{ colId: 'a', dir: 'asc' }], 'b', { multi: true }), [{ colId: 'a', dir: 'asc' }, { colId: 'b', dir: 'asc' }]);
  assert.deepEqual(modeloTrasClic([{ colId: 'a', dir: 'desc' }, { colId: 'b', dir: 'asc' }], 'a', { multi: true }), [{ colId: 'b', dir: 'asc' }]);
  assert.equal(esClicMulti({ shiftKey: true }, {}), true);
  assert.equal(esClicMulti({ shiftKey: true }, { multiSortKey: 'ctrl' }), false);
  assert.equal(esClicMulti({ ctrlKey: true }, { multiSortKey: 'ctrl' }), true);
  assert.equal(esClicMulti({ shiftKey: true }, { suppressMultiSort: true }), false);
  assert.equal(esClicMulti({}, { alwaysMultiSort: true }), true);
  assert.deepEqual(ordenInicial([{ colId: 'a', sort: 'asc', sortIndex: 1 }, { field: 'b', initialSort: 'desc', initialSortIndex: 0 }, { colId: 'c' }]), [{ colId: 'b', dir: 'desc' }, { colId: 'a', dir: 'asc' }]);
});

test('orden: comparacion por tipo, comparador propio, absoluto y acentos', () => {
  assert.ok(compararValores(null, 1, 'number') < 0);
  assert.ok(compararValores(9, 10, 'number') < 0);
  assert.ok(compararValores('é', 'f', 'text', true) < 0);
  assert.ok(compararValores('é', 'f', 'text', false) > 0);
  const valor = (n: unknown): unknown => n;
  const cols = new Map([['x', { colId: 'x', tipo: 'number', valor }]]);
  assert.deepEqual(ordenarFilas([3, -5, 1], [{ colId: 'x', dir: 'asc', type: 'absolute' }], cols), [1, 3, -5]);
  assert.deepEqual(ordenarFilas([3, 1, 2], [{ colId: 'x', dir: 'desc' }], cols), [3, 2, 1]);
  const vistos: boolean[] = [];
  const propio = new Map([['x', { colId: 'x', tipo: 'text', valor, comparador: (a: unknown, b: unknown, _n: unknown, _m: unknown, desc: boolean): number => {
    vistos.push(desc);
    return Number(a) - Number(b);
  } }]]);
  assert.deepEqual(ordenarFilas([1, 2], [{ colId: 'x', dir: 'desc' }], propio), [2, 1]);
  assert.equal(vistos[0], true);
  assert.deepEqual(ordenarFilas([{ a: 1, k: 'p' }, { a: 1, k: 'q' }], [{ colId: 'x', dir: 'desc' }], new Map([['x', { colId: 'x', tipo: 'number', valor: (n: unknown) => (n as { a: number }).a }]])).map((f) => f.k), ['p', 'q']);
});

test('resumen: paginacion, tamano automatico y selector', () => {
  assert.deepEqual(resumenPagina(1, 10, 25), { pagina: 1, paginas: 3, desde: 11, hasta: 20, total: 25, tam: 10 });
  assert.equal(resumenPagina(99, 10, 25).pagina, 2);
  assert.equal(resumenPagina(0, 10, 25).hasta, 10);
  assert.deepEqual(resumenPagina(3, 10, 0), { pagina: 0, paginas: 0, desde: 0, hasta: 0, total: 0, tam: 10 });
  assert.equal(tamAutomatico(95, 10), 9);
  assert.equal(tamAutomatico(5, 10), 1);
  assert.deepEqual(opcionesTam(true, 20), [20, 50, 100]);
  assert.deepEqual(opcionesTam(undefined, 25), [20, 25, 50, 100]);
  assert.deepEqual(opcionesTam(false, 20), []);
  assert.deepEqual(opcionesTam([5, 10], 5), [5, 10]);
});

test('resumen: agregados de la barra de estado', () => {
  assert.deepEqual(agregados([1, '2', 3, null, '']), { count: 3, sum: 6, min: 1, max: 3, avg: 2 });
  assert.deepEqual(agregados(['a', 'b']), { count: 2, sum: null, min: null, max: null, avg: null });
  assert.deepEqual(funcionesAgregado(['sum', 'avg']), ['avg', 'sum']);
  assert.equal(funcionesAgregado(undefined).length, 5);
});

test('resumen: side bar normaliza atajos', () => {
  assert.equal(normalizarSideBar(undefined), null);
  assert.equal(normalizarSideBar(false), null);
  assert.deepEqual(normalizarSideBar(true)?.toolPanels.map((p) => p.id), ['columns', 'filters']);
  assert.equal(normalizarSideBar('filters')?.toolPanels[0]?.toolPanel, 'agFiltersToolPanel');
  assert.deepEqual(normalizarSideBar(['columns'])?.toolPanels.map((p) => p.id), ['columns']);
  const def = normalizarSideBar({ toolPanels: ['columns', { id: 'x', toolPanel: 'agColumnsToolPanel', width: 300 }], defaultToolPanel: 'x', hiddenByDefault: true, position: 'left', hideButtons: true });
  assert.equal(def?.position, 'left');
  assert.equal(def?.defaultToolPanel, 'x');
  assert.equal(def?.hiddenByDefault, true);
  assert.equal(def?.toolPanels[1]?.width, 300);
  assert.equal(def?.toolPanels[1]?.iconKey, 'mdi:view-column-outline');
});

test('resumen: arbol de columnas y menus', () => {
  const arbol = arbolColumnas([{ headerName: 'G', children: [{ field: 'a', headerName: 'Ana' }, { field: 'b' }] }, { colId: 'c' }]);
  assert.deepEqual(hojasColumna(arbol), ['a', 'b', 'c']);
  assert.deepEqual(hojasColumna(filtrarArbolColumnas(arbol, 'an')), ['a']);
  assert.deepEqual(hojasColumna(filtrarArbolColumnas(arbol, 'g')), ['a', 'b']);
  let hecho = 0;
  const menu = resolverMenu(['separator', 'x', 'separator', 'separator', 'nada', { name: 'P', action: () => { hecho += 1; }, subMenu: ['x'], checked: true, disabled: true }, 'separator'], { x: { id: 'x', texto: 'X' }, nada: null });
  assert.deepEqual(menu.map((i) => i.id ?? i.texto ?? 'sep'), ['x', 'sep', 'P']);
  assert.equal(menu[2]?.hijos?.[0]?.id, 'x');
  assert.equal(menu[2]?.marcado, true);
  assert.equal(menu[2]?.deshabilitado, true);
  menu[2]?.accion?.();
  assert.equal(hecho, 1);
});

const FILAS = [
  { id: '1', nombre: 'Ana Perez', pais: 'Colombia', edad: 30 },
  { id: '2', nombre: 'Beto Ruiz', pais: 'Chile', edad: 40 },
  { id: '3', nombre: 'Ana Ruiz', pais: 'Chile', edad: 50 },
];

/** Host minimo sobre el grid-model real. El transformador se conecta como lo hace el host. */
function montar(opciones: Record<string, unknown> = {}): { motor: MotorFiltros; ids: () => string[]; eventos: string[] } {
  const api = createGridModel({ rows: FILAS, columns: [{ field: 'nombre' }, { field: 'pais', filter: 'agSetColumnFilter' }, { field: 'edad', type: 'number', filter: 'agNumberColumnFilter' }, { field: 'oculta', hide: true, filter: false }], getRowId: (r) => String(r['id']) } as never);
  const eventos: string[] = [];
  const grid = {
    el: {}, modelo: () => api, estado: () => api.getState(), columnas: () => api.getColumns(),
    columna: (id: string) => api.getColumns().find((c) => c.colId === id) ?? null,
    defDe: (c: { def: unknown }) => c.def, valor: (c: { field: string }, n: { data: Record<string, unknown> }) => n.data[c.field],
    textoCelda: (c: { field: string }, n: { data: Record<string, unknown> }) => String(n.data[c.field] ?? ''),
    texto: (_c: string, d: string) => d, opcion: (n: string, d: unknown) => opciones[n] ?? d, fijarOpcion: (n: string, v: unknown) => { opciones[n] = v; },
    recomputar: () => api.invalidate('filtrar'), emitir: (e: string) => { eventos.push(e); },
  } as unknown as GridHost;
  const motor = new MotorFiltros(grid);
  api.setTransforms([{ etapa: 'filtrar', aplicar: (f: unknown[]) => motor.aplicar(f as never) }]);
  return { motor, eventos, ids: () => api.getState().displayedRows.map((n) => n.id) };
}

test('motor: modelo de AG Grid por columna, sobre el core real', () => {
  const { motor, ids, eventos } = montar();
  motor.setColumna('nombre', { filterType: 'text', type: 'contains', filter: 'ruiz' });
  assert.deepEqual(ids(), ['2', '3']);
  assert.equal(eventos.at(-1), 'filterChanged');
  motor.setColumna('edad', { filterType: 'number', operator: 'OR', conditions: [{ type: 'equals', filter: 40 }, { type: 'equals', filter: 30 }] });
  assert.deepEqual(ids(), ['2']);
  assert.equal(Object.keys(motor.getFilterModel()).length, 2);
  motor.setFilterModel({ pais: { filterType: 'set', values: ['Chile'] } });
  assert.deepEqual(ids(), ['2', '3']);
  assert.deepEqual(Object.keys(motor.getFilterModel()), ['pais']);
  motor.setFilterModel(null);
  assert.deepEqual(ids(), ['1', '2', '3']);
  assert.equal(motor.isAnyFilterPresent(), false);
});

test('motor: tipo de filtro, modelo multi e instancia', () => {
  const { motor, ids } = montar();
  const pais = motor.col('pais');
  assert.equal(motor.tipoDe(motor.col('edad') as NonNullable<typeof pais>), 'number');
  assert.equal(motor.tipoDe(pais as NonNullable<typeof pais>), 'set');
  assert.equal(motor.tipoDe(motor.col('oculta') as NonNullable<typeof pais>), null);
  assert.equal(motor.col({ getColId: () => 'pais' })?.colId, 'pais');
  motor.setColumna('pais', { filterType: 'multi', filterModels: [{ filterType: 'text', type: 'startsWith', filter: 'ch' }, { filterType: 'set', values: ['Chile', 'Colombia'] }] });
  assert.deepEqual(ids(), ['2', '3']);
  const inst = motor.instancia(pais as NonNullable<typeof pais>) as { isFilterActive: () => boolean; getFilterValues: () => unknown[] };
  assert.equal(inst.isFilterActive(), true);
  assert.equal(inst.getFilterValues().length, 3);
});

test('motor: quick, externo y avanzado', () => {
  const { motor, ids } = montar({ isExternalFilterPresent: () => false });
  motor.setQuick('ana ruiz');
  assert.deepEqual(ids(), ['3']);
  assert.equal(motor.isQuickPresent(), true);
  motor.setQuick('');
  assert.deepEqual(ids(), ['1', '2', '3']);
  const conExterno = montar({ isExternalFilterPresent: () => true, doesExternalFilterPass: (n: { data: { edad: number } }) => n.data.edad > 35 });
  conExterno.motor.avisar([], 'api');
  assert.deepEqual(conExterno.ids(), ['2', '3']);
  const avanzado = montar({ enableAdvancedFilter: true });
  avanzado.motor.setColumna('pais', { filterType: 'set', values: ['Colombia'] });
  assert.deepEqual(avanzado.ids(), ['1', '2', '3']);
  avanzado.motor.setAvanzado({ filterType: 'join', type: 'AND', conditions: [{ filterType: 'number', colId: 'edad', type: 'greaterThan', filter: 45 }] });
  assert.deepEqual(avanzado.ids(), ['3']);
});

export default lista();
