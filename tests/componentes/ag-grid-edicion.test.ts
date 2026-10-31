/**
 * ag-grid-edicion.test.ts — Logica pura de la parcela de edicion de <iswc-ag-grid>:
 * rangos, relleno, historial, portapapeles, lote, validacion, navegacion,
 * seleccion de filas, filas fijadas, arrastre y valores de editores.
 */
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import * as rangos from '../../src/components/data/utils/ag-grid/edicion/rangos.ts';
import * as relleno from '../../src/components/data/utils/ag-grid/edicion/relleno.ts';
import { Historial } from '../../src/components/data/utils/ag-grid/edicion/historial.ts';
import * as portapapeles from '../../src/components/data/utils/ag-grid/edicion/portapapeles.ts';
import { Lote } from '../../src/components/data/utils/ag-grid/edicion/lote.ts';
import * as validacion from '../../src/components/data/utils/ag-grid/edicion/validacion.ts';
import * as nav from '../../src/components/data/utils/ag-grid/edicion/navegacion.ts';
import * as sel from '../../src/components/data/utils/ag-grid/edicion/seleccion-filas.ts';
import * as movidas from '../../src/components/data/utils/ag-grid/edicion/filas-movidas.ts';
import * as valores from '../../src/components/data/utils/ag-grid/edicion/valores.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const R = (filaDesde: number, filaHasta: number, colDesde: number, colHasta: number) => ({ filaDesde, filaHasta, colDesde, colHasta });

test('ag-grid edicion: normalizar ordena las esquinas', () => {
  assert.deepEqual(rangos.normalizar({ fila: 5, col: 1 }, { fila: 2, col: 3 }), R(2, 5, 1, 3));
});

test('ag-grid edicion: restar parte el rango sin perder celdas', () => {
  const partes = rangos.restar(R(0, 2, 0, 2), R(1, 1, 1, 1));
  assert.equal(partes.length, 4);
  assert.equal(partes.reduce((s, r) => s + rangos.cuantasCeldas(r), 0), 8);
  assert.equal(rangos.enAlguno(partes, { fila: 1, col: 1 }), false);
  assert.deepEqual(rangos.restar(R(0, 0, 0, 0), R(5, 5, 5, 5)), [R(0, 0, 0, 0)]);
});

test('ag-grid edicion: celdasDeLista no repite lo solapado', () => {
  assert.equal(rangos.celdasDeLista([R(0, 1, 0, 1), R(1, 2, 1, 2)]).length, 7);
});

test('ag-grid edicion: recortar descarta lo que quedo fuera', () => {
  assert.deepEqual(rangos.recortar(R(2, 9, 0, 9), 5, 3), R(2, 4, 0, 2));
  assert.equal(rangos.recortar(R(7, 9, 0, 1), 5, 3), null);
});

test('ag-grid edicion: relleno copia una celda y con Alt incrementa', () => {
  assert.deepEqual(relleno.valoresRelleno([5], 3, false, false), [5, 5, 5]);
  assert.deepEqual(relleno.valoresRelleno([5], 3, false, true), [6, 7, 8]);
  assert.deepEqual(relleno.valoresRelleno([5], 2, true, true), [4, 3]);
});

test('ag-grid edicion: relleno sigue la progresion lineal', () => {
  assert.deepEqual(relleno.valoresRelleno([1, 3, 5], 3, false, false), [7, 9, 11]);
  assert.deepEqual(relleno.valoresRelleno([1, 3, 5], 2, true, false), [-1, -3]);
  assert.deepEqual(relleno.valoresRelleno([0.1, 0.2], 1, false, false), [0.3]);
});

test('ag-grid edicion: relleno repite texto, mixto y numeros con Alt', () => {
  assert.deepEqual(relleno.valoresRelleno(['a', 'b'], 3, false, false), ['a', 'b', 'a']);
  assert.deepEqual(relleno.valoresRelleno(['a', 'b'], 3, true, false), ['b', 'a', 'b']);
  assert.deepEqual(relleno.valoresRelleno([1, 'x'], 2, false, false), [1, 'x']);
  assert.deepEqual(relleno.valoresRelleno([1, 2], 2, false, true), [1, 2]);
});

test('ag-grid edicion: planRelleno elige eje y separa celdas nuevas', () => {
  const abajo = relleno.planRelleno(R(1, 2, 1, 1), { fila: 5, col: 2 }, 'xy');
  assert.equal(abajo.eje, 'y');
  assert.deepEqual(abajo.nuevas, R(3, 5, 1, 1));
  assert.deepEqual(abajo.final, R(1, 5, 1, 1));
  const izquierda = relleno.planRelleno(R(1, 2, 3, 3), { fila: 2, col: 0 }, 'xy');
  assert.equal(izquierda.eje, 'x');
  assert.equal(izquierda.inverso, true);
  assert.deepEqual(izquierda.nuevas, R(1, 2, 0, 2));
});

test('ag-grid edicion: planRelleno respeta la direccion fijada', () => {
  assert.equal(relleno.planRelleno(R(0, 0, 0, 0), { fila: 9, col: 0 }, 'x').eje, null);
  assert.equal(relleno.planRelleno(R(0, 0, 0, 0), { fila: 0, col: 9 }, 'y').eje, null);
});

test('ag-grid edicion: planRelleno reduce y marca lo que sale', () => {
  const plan = relleno.planRelleno(R(0, 4, 0, 0), { fila: 2, col: 0 }, 'xy');
  assert.deepEqual(plan.reducidas, R(3, 4, 0, 0));
  assert.deepEqual(plan.final, R(0, 2, 0, 0));
  assert.equal(relleno.planRelleno(R(0, 4, 0, 0), { fila: 4, col: 0 }, 'xy').eje, null);
});

test('ag-grid edicion: historial respeta limite y corta el rehacer', () => {
  const h = new Historial(2);
  const accion = (n: number) => ({ cambios: [{ nodoId: String(n), colId: 'a', antes: 0, despues: n }] });
  h.registrar(accion(1));
  h.registrar(accion(2));
  h.registrar(accion(3));
  assert.equal(h.tamanoDeshacer, 2);
  assert.equal(h.tomarDeshacer()?.cambios[0]?.despues, 3);
  assert.equal(h.tamanoRehacer, 1);
  h.registrar(accion(4));
  assert.equal(h.tamanoRehacer, 0);
  assert.equal(h.tomarRehacer(), null);
});

test('ag-grid edicion: historial ignora acciones vacias y limite cero', () => {
  const h = new Historial(0);
  h.registrar({ cambios: [{ nodoId: '1', colId: 'a', antes: 0, despues: 1 }] });
  assert.equal(h.tamanoDeshacer, 0);
});

test('ag-grid edicion: portapapeles ida y vuelta con comillas y saltos', () => {
  const matriz = [['a', 'b\tc'], ['d"e', 'f\ng']];
  assert.deepEqual(portapapeles.desdeTexto(portapapeles.aTexto(matriz, '\t'), '\t'), matriz);
});

test('ag-grid edicion: portapapeles lee CRLF y la linea final de Excel', () => {
  assert.deepEqual(portapapeles.desdeTexto('1\t2\r\n3\t4\r\n', '\t'), [['1', '2'], ['3', '4']]);
  assert.equal(portapapeles.desdeTexto('1\n', '\t', true).length, 2);
  assert.deepEqual(portapapeles.desdeTexto('', '\t'), [['']]);
});

test('ag-grid edicion: pegar repite solo si encaja exacto', () => {
  assert.deepEqual(portapapeles.ajustarAlRango([['x']], R(0, 1, 0, 1)), [['x', 'x'], ['x', 'x']]);
  assert.deepEqual(portapapeles.ajustarAlRango([['a', 'b']], R(0, 1, 0, 2)), [['a', 'b']]);
  assert.deepEqual(portapapeles.ajustarAlRango([['a'], ['b']], R(0, 0, 0, 0)), [['a'], ['b']]);
});

test('ag-grid edicion: lote guarda una entrada por celda y distingue null', () => {
  const lote = new Lote();
  lote.poner('1', 'a', 1);
  lote.poner('1', 'a', 2);
  lote.poner('2', 'a', null);
  assert.equal(lote.lista().length, 2);
  assert.equal(lote.leer('1', 'a')?.valor, 2);
  assert.notEqual(lote.leer('2', 'a'), undefined);
  assert.equal(lote.leer('3', 'a'), undefined);
  assert.deepEqual(lote.filas(), ['1', '2']);
  lote.vaciar();
  assert.equal(lote.vacio, true);
});

const textos = { muyLargo: 'max {n}', menorQue: 'hasta {n}', mayorQue: 'desde {n}', noNumero: 'nan', noFecha: 'nofecha' };

test('ag-grid edicion: validacion de texto, numero y fecha', () => {
  assert.deepEqual(validacion.erroresInternos('texto', 'abcd', { maxLength: 3 }, textos), ['max 3']);
  assert.deepEqual(validacion.erroresInternos('numero', 5, { min: 10 }, textos), ['desde 10']);
  assert.deepEqual(validacion.erroresInternos('numero', 50, { max: 10 }, textos), ['hasta 10']);
  assert.deepEqual(validacion.erroresInternos('numero', null, { min: 10 }, textos), []);
  assert.deepEqual(validacion.erroresInternos('fecha', 'xx', {}, textos), ['nofecha']);
  assert.deepEqual(validacion.erroresInternos('fecha', '2020-01-01', { min: '2021-01-01' }, textos), ['desde 2021-01-01']);
});

test('ag-grid edicion: getValidationErrors reemplaza lo interno', () => {
  assert.deepEqual(validacion.resolverErrores(['x'], () => null, {}), []);
  assert.deepEqual(validacion.resolverErrores(['x'], ({ internalErrors }: { internalErrors: string[] }) => [...internalErrors, 'y'], {}), ['x', 'y']);
  assert.deepEqual(validacion.resolverErrores(['x'], undefined, {}), ['x']);
});

const mapa = (totalFilas: number, totalCols: number, bloqueadas: number[] = []) => ({ totalFilas, totalCols, navegable: (_f: number, c: number) => !bloqueadas.includes(c) });

test('ag-grid edicion: flechas se detienen en el borde y saltan lo no navegable', () => {
  assert.equal(nav.moverFlecha({ fila: 0, col: 0 }, 'arriba', mapa(3, 3)), null);
  assert.deepEqual(nav.moverFlecha({ fila: 0, col: 0 }, 'derecha', mapa(3, 3, [1])), { fila: 0, col: 2 });
  assert.deepEqual(nav.extremo({ fila: 0, col: 1 }, 'abajo', mapa(4, 3)), { fila: 3, col: 1 });
  assert.equal(nav.extremo({ fila: 3, col: 1 }, 'abajo', mapa(4, 3)), null);
});

test('ag-grid edicion: Tab pasa de fila y sale al final', () => {
  assert.deepEqual(nav.tabular({ fila: 0, col: 2 }, false, mapa(2, 3)), { fila: 1, col: 0 });
  assert.deepEqual(nav.tabular({ fila: 1, col: 0 }, true, mapa(2, 3)), { fila: 0, col: 2 });
  assert.equal(nav.tabular({ fila: 1, col: 2 }, false, mapa(2, 3)), null);
  assert.equal(nav.tabular({ fila: 0, col: 2 }, false, mapa(2, 3), true), null);
});

test('ag-grid edicion: pagina y Home/End', () => {
  assert.deepEqual(nav.porPagina({ fila: 1, col: 0 }, 1, 5, mapa(4, 1)), { fila: 3, col: 0 });
  assert.equal(nav.porPagina({ fila: 0, col: 0 }, -1, 5, mapa(4, 1)), null);
  assert.deepEqual(nav.filaExtrema({ fila: 1, col: 2 }, true, mapa(4, 3)), { fila: 3, col: 2 });
});

const multi = sel.leerOpciones({ mode: 'multiRow', enableClickSelection: true })!;
const ordenados = ['a', 'b', 'c', 'd'];
const gesto = (id: string, extra: Record<string, unknown> = {}) => ({ id, ctrl: false, shift: false, ancla: null as string | null, ordenados, ...extra });
const todas = () => true;

test('ag-grid edicion: leerOpciones acepta objeto y formas viejas', () => {
  assert.equal(sel.leerOpciones(undefined), null);
  assert.equal(sel.leerOpciones('multiple')?.mode, 'multiRow');
  assert.equal(sel.leerOpciones({ mode: 'singleRow' })?.enableClickSelection, false);
  assert.equal(sel.leerOpciones({ mode: 'multiRow', selectAll: 'filtered' })?.selectAll, 'filtered');
});

test('ag-grid edicion: clic sin enableClickSelection no selecciona', () => {
  const opciones = sel.leerOpciones({ mode: 'multiRow' })!;
  assert.equal(sel.clicFila(new Set(), gesto('a'), opciones, todas).size, 0);
});

test('ag-grid edicion: clic reemplaza, Ctrl acumula, Shift hace tramo', () => {
  assert.deepEqual([...sel.clicFila(new Set(['a']), gesto('b'), multi, todas)], ['b']);
  assert.deepEqual([...sel.clicFila(new Set(['a']), gesto('b', { ctrl: true }), multi, todas)], ['a', 'b']);
  assert.deepEqual([...sel.clicFila(new Set(['a']), gesto('c', { shift: true, ancla: 'a' }), multi, todas)], ['a', 'b', 'c']);
});

test('ag-grid edicion: enableSelection no deselecciona y enableDeselection no selecciona', () => {
  const soloMarca = sel.leerOpciones({ mode: 'multiRow', enableClickSelection: 'enableSelection' })!;
  const soloQuita = sel.leerOpciones({ mode: 'multiRow', enableClickSelection: 'enableDeselection' })!;
  assert.equal(sel.clicFila(new Set(['a']), gesto('a', { ctrl: true }), soloMarca, todas).has('a'), true);
  assert.equal(sel.clicFila(new Set(), gesto('a'), soloQuita, todas).size, 0);
  assert.equal(sel.clicFila(new Set(['a']), gesto('a', { ctrl: true }), soloQuita, todas).size, 0);
});

test('ag-grid edicion: enableSelectionWithoutKeys acumula sin teclas', () => {
  const opciones = sel.leerOpciones({ mode: 'multiRow', enableClickSelection: true, enableSelectionWithoutKeys: true })!;
  assert.equal(sel.clicFila(new Set(['a']), gesto('b'), opciones, todas).size, 2);
});

test('ag-grid edicion: isRowSelectable bloquea clic, check y seleccionar todo', () => {
  const noB = (id: string) => id !== 'b';
  assert.equal(sel.clicFila(new Set(), gesto('b'), multi, noB).size, 0);
  assert.equal(sel.alternarCheck(new Set(), gesto('b'), multi, noB).size, 0);
  assert.equal(sel.agregarTodas(new Set(), ordenados, noB).has('b'), false);
  assert.deepEqual([...sel.clicFila(new Set(), gesto('c', { shift: true, ancla: 'a' }), multi, noB)], ['a', 'c']);
  assert.equal(sel.estadoEncabezado(new Set(['a', 'c', 'd']), ordenados, noB), 'all');
});

test('ag-grid edicion: check no quita otras en multi y singleRow deja una', () => {
  assert.equal(sel.alternarCheck(new Set(['a']), gesto('b'), multi, todas).size, 2);
  const single = sel.leerOpciones({ mode: 'singleRow' })!;
  assert.deepEqual([...sel.alternarCheck(new Set(['a']), gesto('b'), single, todas)], ['b']);
});

test('ag-grid edicion: alcance de seleccionar todo', () => {
  const universo = { todas: ['1', '2', '3'], filtradas: ['1', '2'], pagina: ['1'] };
  assert.equal(sel.idsDeAlcance('filtered', universo).length, 2);
  assert.equal(sel.idsDeAlcance('currentPage', universo).length, 1);
  assert.equal(sel.idsDeAlcance('all', universo).length, 3);
});

test('ag-grid edicion: fijadas conservan el orden y respetan el permiso', () => {
  const partes = movidas.partirFijadas([1, 2, 3, 4], (n) => (n === 2 ? 'top' : n === 3 ? 'bottom' : null));
  assert.deepEqual(partes, { arriba: [2], centro: [1, 4], abajo: [3] });
  assert.equal(movidas.ladoPermitido('top', 'bottom'), false);
  assert.equal(movidas.ladoPermitido(true, 'bottom'), true);
  assert.equal(movidas.ladoPermitido(false, 'top'), false);
});

test('ag-grid edicion: arrastre gestionado se apaga con orden, filtro o pagina', () => {
  const base = { ordenado: false, filtrado: false, paginado: false, modelo: 'clientSide' };
  assert.equal(movidas.gestionadoDisponible(base), true);
  assert.equal(movidas.gestionadoDisponible({ ...base, ordenado: true }), false);
  assert.equal(movidas.gestionadoDisponible({ ...base, filtrado: true }), false);
  assert.equal(movidas.gestionadoDisponible({ ...base, paginado: true }), false);
  assert.equal(movidas.gestionadoDisponible({ ...base, modelo: 'serverSide' }), false);
});

test('ag-grid edicion: multi fila mueve seleccionadas solo si tomo una de ellas', () => {
  assert.deepEqual(movidas.filasAMover('b', ['c', 'b'], true, ordenados), ['b', 'c']);
  assert.deepEqual(movidas.filasAMover('a', ['c', 'b'], true, ordenados), ['a']);
  assert.deepEqual(movidas.filasAMover('b', ['c', 'b'], false, ordenados), ['b']);
});

test('ag-grid edicion: reordenar antes o despues del destino', () => {
  assert.deepEqual(movidas.reordenar(ordenados, ['a'], 'c', true), ['b', 'c', 'a', 'd']);
  assert.deepEqual(movidas.reordenar(ordenados, ['d', 'c'], 'a', false), ['d', 'c', 'a', 'b']);
  assert.deepEqual(movidas.reordenar(ordenados, ['a'], 'a', false), ordenados);
});

test('ag-grid edicion: editor por defecto segun tipo', () => {
  assert.equal(valores.editorPorTipo('number'), 'agNumberCellEditor');
  assert.equal(valores.editorPorTipo('boolean'), 'agCheckboxCellEditor');
  assert.equal(valores.editorPorTipo('otro'), 'agTextCellEditor');
});

test('ag-grid edicion: numero, paso y fechas locales', () => {
  assert.equal(valores.textoANumero(' 2.5 '), 2.5);
  assert.equal(valores.textoANumero('x'), null);
  assert.equal(valores.pasoNumero(1, 1, 0.25, 2, undefined, 1.1), 1.1);
  assert.equal(valores.pasoNumero(null, -1, 1, undefined, 0, undefined), 0);
  assert.equal(valores.fechaAIso(new Date(2024, 0, 31)), '2024-01-31');
  assert.equal(valores.fechaAIso('2024-05-06T10:00:00'), '2024-05-06');
  assert.equal(valores.isoAFecha('2024-01-31')?.getDate(), 31);
  assert.equal(valores.isoAFecha('nada'), null);
});

test('ag-grid edicion: texto pegado segun el tipo', () => {
  assert.equal(valores.textoAValor('', 'text'), null);
  assert.equal(valores.textoAValor('7', 'number'), 7);
  assert.equal(valores.textoAValor('TRUE', 'boolean'), true);
  assert.equal(valores.textoAValor('hola', 'text'), 'hola');
});

test('ag-grid edicion: filtrar opciones por tipo de busqueda', () => {
  const opciones = [{ valor: 1, texto: 'Colombia' }, { valor: 2, texto: 'Bolivia' }];
  assert.equal(valores.filtrarOpciones(opciones, 'co', 'match').length, 1);
  assert.equal(valores.filtrarOpciones(opciones, 'liv', 'matchAny').length, 1);
  assert.equal(valores.filtrarOpciones(opciones, 'clm', 'fuzzyMatch').length, 1);
  assert.equal(valores.filtrarOpciones(opciones, '', 'match').length, 2);
});

test('ag-grid edicion: esImprimible ignora atajos y teclas con nombre', () => {
  const base = { ctrlKey: false, metaKey: false, altKey: false };
  assert.equal(valores.esImprimible({ ...base, key: 'a' }), true);
  assert.equal(valores.esImprimible({ ...base, key: 'Enter' }), false);
  assert.equal(valores.esImprimible({ ...base, key: 'a', ctrlKey: true }), false);
});

export default lista();
