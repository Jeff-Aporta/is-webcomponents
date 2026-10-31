/**
 * ag-grid-celdas.test.ts — Lo puro de la parcela de celdas de <iswc-ag-grid>:
 * expresiones, valores, formatos, sparkline, renderers, reglas, flash, tooltips
 * y temas. Sin DOM: el grid es un doble minimo del contrato.
 */
import assert from 'node:assert/strict';

import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import type { ContextoCelda, GridHost } from '../../src/components/data/utils/ag-grid/contrato.ts';
import { compilarExpresion, evaluarExpresion } from '../../src/components/data/utils/ag-grid/celdas/expresion.ts';
import { escribirValor, formatearValor, inferirTipo, lectores, leerRuta, leerValor, parsearValor, textoExportacion, tipoDe } from '../../src/components/data/utils/ag-grid/celdas/valores.ts';
import { aFecha, fmtFecha, fmtMoneda, fmtNumero, fmtPorcentaje } from '../../src/components/data/utils/ag-grid/celdas/formatos.ts';
import { htmlSparkline, normalizarSerie } from '../../src/components/data/utils/ag-grid/celdas/spark.ts';
import { RENDERERS } from '../../src/components/data/utils/ag-grid/celdas/renderers.ts';
import { clasesCelda, clasesColumna, clasesPosicionFila, estiloATexto, estiloCelda, opcionesAClasesFila, opcionesAEstiloFila } from '../../src/components/data/utils/ag-grid/celdas/reglas.ts';
import { Destello } from '../../src/components/data/utils/ag-grid/celdas/flash.ts';
import { AgendaTooltip, contenidoCabecera, contenidoTooltip } from '../../src/components/data/utils/ag-grid/celdas/tooltips.ts';
import { crearTema, medidasDe, paramsEfectivos, PRESETS, resolverTema, tokensDe } from '../../src/components/data/utils/ag-grid/celdas/temas/index.ts';
import { resolverRenderer } from '../../src/components/data/utils/ag-grid/celdas/contexto.ts';
import { instalar } from '../../src/components/data/utils/ag-grid/celdas/index.ts';
import { escaparHtml, limpiarCss, urlSegura } from '../../src/components/data/utils/ag-grid/celdas/html.ts';
import type { ParamsCelda } from '../../src/components/data/utils/ag-grid/celdas/schemas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const gridDoble = { texto: (_c: string, d: string) => d, modelo: () => null, opcion: () => undefined, textoCelda: () => '' } as unknown as GridHost;

function ctx(value: unknown, params: Record<string, unknown> = {}, texto = String(value ?? ''), def: Record<string, unknown> = {}): ContextoCelda {
  return { grid: gridDoble, col: { colId: 'c' } as ContextoCelda['col'], def, node: { id: '1', index: 0, data: {} }, data: { nombre: 'Apple', logo: 'https://x.test/a.png' }, value, texto, rowIndex: 0, params };
}

function p(value: unknown, data: unknown = {}, extra: Record<string, unknown> = {}): ParamsCelda {
  return { value, data, node: null, colDef: {}, column: null, api: null, context: { k: 2 }, ...extra };
}

const render = (nombre: string, c: ContextoCelda): string => (RENDERERS[nombre] as (x: ContextoCelda) => string)(c);

test('expresion: aritmetica, precedencia, ternario y miembros', () => {
  assert.equal(evaluarExpresion('1 + 2 * 3', {}), 7);
  assert.equal(evaluarExpresion('(1 + 2) * 3', {}), 9);
  assert.equal(evaluarExpresion('x > 10 && x < 20', { x: 15 }), true);
  assert.equal(evaluarExpresion("x > 0 ? 'si' : 'no'", { x: -1 }), 'no');
  assert.equal(evaluarExpresion('data.a.b + ctx.k', { data: { a: { b: 1 } }, ctx: { k: 2 } }), 3);
  assert.equal(evaluarExpresion('x.toFixed(2)', { x: 1.5 }), '1.50');
  assert.equal(evaluarExpresion('Math.max(1, x)', { x: 4, Math }), 4);
  assert.equal(evaluarExpresion('data?.a ?? 9', { data: null }), 9);
  assert.equal(evaluarExpresion('!x', { x: 0 }), true);
});

test('expresion: no alcanza constructor ni prototipo, ni con corchetes', () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(evaluarExpresion('x.constructor', { x: 1 }), undefined);
    assert.equal(evaluarExpresion("x['constructor']['constructor']('return 1')()", { x: 1 }), undefined);
    assert.equal(evaluarExpresion('x.__proto__', { x: {} }), undefined);
    assert.equal(evaluarExpresion('1 +', {}), undefined);
  } finally {
    console.warn = warn;
  }
  assert.throws(() => compilarExpresion('a = 1'));
});

test('valores: getter por campo con puntos, funcion y expresion', () => {
  const data = { a: { b: 5 }, 'c.d': 1, n: 2 };
  assert.equal(leerRuta(data, 'a.b'), 5);
  assert.equal(leerRuta(data, 'c.d', true), 1);
  assert.equal(leerValor({ field: 'a.b' }, p(0, data)), 5);
  assert.equal(leerValor({ field: 'c.d', suppressFieldDotNotation: true }, p(0, data)), 1);
  assert.equal(leerValor({ valueGetter: (q: ParamsCelda) => (q.data as { n: number }).n * 2, field: 'n' }, p(0, data)), 4);
  assert.equal(leerValor({ valueGetter: 'data.n + 1' }, p(0, data)), 3);
  assert.equal(leerValor({}, p(0, data)), undefined);
});

test('valores: formatter, refData y tipos por defecto', () => {
  assert.equal(formatearValor({ valueFormatter: (q: ParamsCelda) => `$${q.value}` }, 3, p(3)), '$3');
  assert.equal(formatearValor({ valueFormatter: "'#' + value" }, 3, p(3)), '#3');
  assert.equal(formatearValor({ refData: { a: 'Alfa' } }, 'a', p('a')), 'Alfa');
  assert.equal(formatearValor({}, null, p(null)), '');
  assert.equal(formatearValor({}, 1.5, p(1.5)), '1.5');
  assert.equal(formatearValor({}, new Date(2026, 9, 31), p(null)), '2026-10-31');
  assert.equal(formatearValor({ cellDataType: 'eur' }, 2, p(2), { eur: { baseDataType: 'number', valueFormatter: (q: ParamsCelda) => `${q.value} EUR` } }), '2 EUR');
});

test('valores: inferencia y dataTypeDefinitions heredadas', () => {
  assert.equal(inferirTipo(1), 'number');
  assert.equal(inferirTipo(true), 'boolean');
  assert.equal(inferirTipo('2026-10-31'), 'dateString');
  assert.equal(inferirTipo('hola'), 'text');
  assert.equal(inferirTipo({}), 'object');
  assert.equal(tipoDe({ cellDataType: false }, 1), null);
  assert.equal(tipoDe({ cellDataType: 'b' }, 'x', { a: { baseDataType: 'number' }, b: { extendsDataType: 'a' } }), 'number');
});

test('valores: parser y setter', () => {
  assert.equal(parsearValor({ cellDataType: 'number' }, '12.5', p(1)), 12.5);
  assert.equal(parsearValor({ cellDataType: 'number' }, 'abc', p(1)), null);
  assert.equal(parsearValor({ cellDataType: 'boolean' }, 'true', p(false)), true);
  assert.equal(parsearValor({}, '', p('x')), null);
  assert.equal(parsearValor({ valueParser: 'Number(newValue) * 2' }, '4', p(1, {}, { Number })), 8);
  const data: Record<string, unknown> = {};
  assert.equal(escribirValor({ field: 'a.b' }, 1, p(undefined, data)), true);
  assert.deepEqual(data, { a: { b: 1 } });
  assert.equal(escribirValor({ field: 'a.b' }, 1, p(1, data)), false);
  assert.equal(escribirValor({ valueSetter: () => false }, 2, p(1, data)), false);
  escribirValor({ field: '__proto__.x' }, 1, p(undefined, data));
  assert.equal(({} as Record<string, unknown>)['x'], undefined);
  assert.equal(textoExportacion({ useValueFormatterForExport: false, valueFormatter: () => 'f' }, 1, p(1)), 1);
});

test('formatos: numero, moneda, porcentaje', () => {
  assert.equal(fmtNumero(1234.5, { locale: 'en-US', decimales: 2 }), '1,234.50');
  assert.equal(fmtNumero('x'), '');
  assert.equal(fmtNumero(1500000, { locale: 'en-US', compacto: true }), '1.5M');
  assert.equal(fmtMoneda(12.5, { locale: 'en-US', moneda: 'USD' }), '$12.50');
  assert.equal(fmtPorcentaje(0.125, { locale: 'en-US', decimales: 1 }), '12.5%');
  assert.equal(fmtPorcentaje(12.5, { locale: 'en-US', escala: 'ciento', decimales: 1 }), '12.5%');
  assert.equal(fmtNumero(2, { locale: 'en-US', signo: true }), '+2');
});

test('formatos: fecha sin corrimiento de zona', () => {
  assert.equal(aFecha('2026-10-31')?.getDate(), 31);
  assert.equal(fmtFecha('2026-10-31', { formato: 'iso' }), '2026-10-31');
  assert.equal(fmtFecha('no-fecha', {}), 'no-fecha');
  assert.equal(aFecha({}), null);
  const ahora = new Date(2026, 9, 31, 12).getTime();
  assert.equal(fmtFecha(new Date(ahora - 7200000), { locale: 'en-US', formato: 'relativa', ahora }), '2 hours ago');
});

test('sparkline: formatos de dato y huecos', () => {
  assert.deepEqual(normalizarSerie([1, null, 'x', 3]), [1, null, null, 3]);
  assert.deepEqual(normalizarSerie([[0, 1], [1, 2]]), [1, 2]);
  assert.deepEqual(normalizarSerie([{ t: 1, v: 2 }], { yKey: 'v' }), [2]);
  assert.deepEqual(normalizarSerie('x'), []);
  const conHueco = htmlSparkline([1, 2, null, 3, 4]);
  assert.equal(conHueco.match(/<path/g)?.length, 2);
  assert.equal(htmlSparkline(['a']), '');
});

test('sparkline: tipos, tendencia, marcador y estilo por punto', () => {
  assert.match(htmlSparkline([1, 2], { type: 'area' }), /fill-opacity/);
  assert.equal(htmlSparkline([1, 2, 3], { type: 'bar' }).match(/<rect/g)?.length, 3);
  assert.match(htmlSparkline([1, 2, 3], { type: 'bar', direction: 'horizontal' }), /<rect x="0" y=/);
  assert.match(htmlSparkline([-1, 2], { type: 'column' }), /--iswc-grid-down/);
  assert.match(htmlSparkline([3, 1], { tendencia: true }), /--iswc-grid-down/);
  assert.match(htmlSparkline([1, 3], { tendencia: true }), /--iswc-grid-up/);
  assert.match(htmlSparkline([1, 2], { marcarUltimo: true }), /iswc-ag-spark-punto/);
  const estilada = htmlSparkline([1, 5, 2], { itemStyler: (q) => (q.max ? { fill: 'red', size: 6 } : null) });
  assert.equal(estilada.match(/iswc-ag-spark-punto/g)?.length, 1);
  assert.match(estilada, /background:red/);
});

test('sparkline: serie plana no divide por cero y se memoiza por arreglo', () => {
  const plana = [5, 5, 5];
  const html = htmlSparkline(plana);
  assert.doesNotMatch(html, /NaN|Infinity/);
  assert.equal(htmlSparkline(plana), html);
  assert.doesNotMatch(htmlSparkline([1, 2], { stroke: 'red"><script>' }), /<script>/);
});

test('renderers: nombres propios y alias de AG', () => {
  for (const nombre of ['logoTexto', 'ticker', 'sparkline', 'agSparklineCellRenderer', 'delta', 'pill', 'progreso', 'rating', 'booleano', 'agCheckboxCellRenderer', 'moneda', 'porcentaje', 'fecha', 'link', 'acciones', 'agAnimateShowChangeCellRenderer', 'agAnimateSlideCellRenderer']) {
    assert.equal(typeof RENDERERS[nombre], 'function', nombre);
  }
});

test('renderers: logo + texto con iniciales de respaldo y url saneada', () => {
  const html = render('ticker', ctx('AAPL', { logoField: 'logo', subField: 'nombre' }));
  assert.match(html, /<img src="https:\/\/x\.test\/a\.png"/);
  assert.match(html, /iswc-ag-principal">AAPL/);
  assert.match(html, /iswc-ag-sub">Apple/);
  assert.match(html, />AA<img/);
  const malo = render('ticker', ctx('X', { logo: 'javascript:alert(1)' }));
  assert.doesNotMatch(malo, /<img/);
  assert.equal(render('ticker', ctx('')), '');
});

test('renderers: delta con flecha, color e inversion', () => {
  assert.match(render('delta', ctx(1.5, { formato: 'porcentaje', escala: 'ciento', locale: 'en-US', decimales: 2 })), /iswc-ag-up.*1\.50%/);
  assert.match(render('delta', ctx(-2, { locale: 'en-US' })), /iswc-ag-down.*>2</);
  assert.match(render('delta', ctx(-2, { invertir: true })), /iswc-ag-up/);
  assert.match(render('delta', ctx(0.001, { umbral: 0.01 })), /iswc-ag-flat/);
  assert.equal(render('delta', ctx(null, {}, '')), '');
});

test('renderers: pill por tono, color libre y escape', () => {
  assert.match(render('pill', ctx('ok', { colores: { ok: 'success' }, etiquetas: { ok: 'Activo' } })), /iswc-ag-tono-success.*Activo/);
  assert.match(render('pill', ctx('x', { colores: { x: '#123456' } })), /--iswc-ag-tono:#123456/);
  assert.equal(render('pill', ctx(['a', 'b'])).match(/iswc-ag-pill /g)?.length, 2);
  assert.match(render('pill', ctx('<b>')), /&lt;b&gt;/);
});

test('renderers: progreso con limites y umbrales; rating parcial', () => {
  const html = render('progreso', ctx(150, { umbrales: [{ hasta: 50, tono: 'danger' }, { hasta: 100, tono: 'success' }] }));
  assert.match(html, /inline-size:100%/);
  assert.match(html, /iswc-ag-tono-success/);
  assert.match(html, /role="progressbar"/);
  assert.match(render('progreso', ctx(5, { min: 0, max: 10 })), /inline-size:50%/);
  assert.match(render('rating', ctx(2.5)), /inline-size:50%/);
  assert.match(render('rating', ctx(2.5)), /aria-label="2\.5 de 5"/);
});

test('renderers: booleano, numericos, fecha, enlace', () => {
  assert.match(render('booleano', ctx(true)), /aria-checked="true"/);
  assert.match(render('booleano', ctx(false, {}, '', { editable: true })), /iswc-ag-check-editable/);
  assert.equal(render('booleano', ctx(null)), '');
  assert.match(render('moneda', ctx(10, { locale: 'en-US', moneda: 'EUR' })), /€10\.00/);
  assert.match(render('porcentaje', ctx(0.5, { locale: 'en-US' })), /50%/);
  assert.match(render('moneda', ctx(-1, { locale: 'en-US', colorSigno: true })), /iswc-ag-down/);
  assert.match(render('moneda', ctx(1, {}, 'propio', { valueFormatter: () => 'propio' })), /propio/);
  assert.match(render('fecha', ctx('2026-10-31', { formato: 'iso' })), /2026-10-31/);
  assert.match(render('link', ctx('https://a.test', {}, 'Ir')), /href="https:\/\/a\.test".*rel="noopener noreferrer".*Ir/);
  assert.doesNotMatch(render('link', ctx('javascript:alert(1)', {}, 'Ir')), /<a/);
});

test('renderers: acciones con visibilidad, deshabilitado y tono', () => {
  const html = render('acciones', ctx(1, { acciones: [{ id: 'ver', texto: 'Ver', svg: 'M0 0' }, { id: 'no', visible: false }, { id: 'off', deshabilitado: () => true, icono: 'mdi:x', tono: 'danger' }] }));
  assert.match(html, /data-accion="ver"/);
  assert.doesNotMatch(html, /data-accion="no"/);
  assert.match(html, /data-accion="off"[^>]* disabled/);
  assert.match(html, /<iswc-icon icon="mdi:x">/);
});

test('renderers: cambio animado muestra diferencia solo si la hubo', () => {
  assert.doesNotMatch(render('animarCambio', ctx(5)), /iswc-ag-delta/);
  assert.match(render('animarCambio', ctx(5, { cambio: { anterior: 3, nuevo: 5, desde: 0 } })), /iswc-ag-up.*>2<.*>5</);
  assert.match(render('animarCambio', ctx(1, { cambio: { anterior: 3, nuevo: 1, desde: 0 } })), /iswc-ag-down/);
  assert.match(render('animarDeslizar', ctx(5, { cambio: { anterior: 3, nuevo: 5, desde: 0 } })), /iswc-ag-deslizar-viejo[^>]*>3</);
});

test('resolverRenderer: selector gana y funde params', () => {
  const uno = () => 'uno';
  const dos = () => 'dos';
  const registro = (n: string) => ({ uno, dos } as Record<string, () => string>)[n];
  const base = ctx(1);
  assert.equal(resolverRenderer({}, base, registro), null);
  assert.equal(resolverRenderer({ cellRenderer: 'nadie' }, base, registro), null);
  const directo = resolverRenderer({ cellRenderer: 'uno', cellRendererParams: { a: 1 } }, base, registro);
  assert.equal(directo?.renderer, uno);
  assert.equal(directo?.ctx.params['a'], 1);
  const porFuncion = resolverRenderer({ cellRenderer: 'uno', cellRendererParams: () => ({ a: 2 }) }, base, registro);
  assert.equal(porFuncion?.ctx.params['a'], 2);
  const elegido = resolverRenderer({ cellRenderer: 'uno', cellRendererParams: { a: 1 }, cellRendererSelector: () => ({ component: 'dos', params: { a: 3 } }) }, base, registro);
  assert.equal(elegido?.renderer, dos);
  assert.equal(elegido?.ctx.params['a'], 3);
});

test('reglas: cellClass, cellClassRules y cellStyle', () => {
  assert.equal(clasesCelda({ cellClass: 'a b' }, p(1)), 'a b');
  assert.equal(clasesCelda({ cellClass: ['a', 'b'] }, p(1)), 'a b');
  assert.equal(clasesCelda({ cellClass: (q: ParamsCelda) => (q.value ? 'si' : null) }, p(1)), 'si');
  assert.equal(clasesCelda({ cellClassRules: { alto: 'x > 5', bajo: (q: ParamsCelda) => (q.value as number) < 5 } }, p(9)), 'alto');
  assert.equal(clasesCelda({ cellClass: 'a', cellClassRules: { b: 'data.v == 1' } }, p(0, { v: 1 })), 'a b');
  assert.equal(estiloCelda({ cellStyle: { backgroundColor: 'red', '--x': '1' } }, p(1)), 'background-color:red;--x:1;');
  assert.equal(estiloCelda({ cellStyle: () => null }, p(1)), '');
  assert.equal(estiloATexto({ color: 'red;background:url(x)' }), '');
});

test('reglas: fila y clases estructurales', () => {
  assert.equal(opcionesAClasesFila('a', () => ['b'], { c: 'data.v > 1', d: () => false }, p(0, { v: 2 })), 'a b c');
  assert.equal(opcionesAEstiloFila({ color: 'red' }, () => ({ fontWeight: 700 }), p(0)), 'color:red;font-weight:700;');
  assert.equal(clasesPosicionFila(0, 3), 'iswc-ag-row-even iswc-ag-row-first');
  assert.equal(clasesPosicionFila(2, 3), 'iswc-ag-row-even iswc-ag-row-last');
  assert.equal(clasesPosicionFila(1, 3), 'iswc-ag-row-odd');
  assert.match(clasesColumna({ type: ['numericColumn'], wrapText: true }), /iswc-ag-right iswc-ag-wrap/);
});

function relojFalso() {
  let t = 1000;
  const tareas: Array<{ fn: () => void; en: number; id: number }> = [];
  let sig = 0;
  return {
    ahora: () => t,
    programar: (fn: () => void, ms: number) => {
      tareas.push({ fn, en: t + ms, id: ++sig });
      return sig;
    },
    cancelar: (id: unknown) => {
      const i = tareas.findIndex((x) => x.id === id);
      if (i >= 0) tareas.splice(i, 1);
    },
    avanzar(ms: number) {
      const fin = t + ms;
      for (;;) {
        tareas.sort((a, b) => a.en - b.en);
        const proxima = tareas[0];
        if (!proxima || proxima.en > fin) break;
        tareas.shift();
        t = proxima.en;
        proxima.fn();
      }
      t = fin;
    },
  };
}

test('flash: fases, retardo negativo y vencimiento', () => {
  const r = relojFalso();
  const vencidos: unknown[] = [];
  const d = new Destello({ reloj: r.ahora, programar: r.programar, cancelar: r.cancelar, alVencer: (a) => vencidos.push(a) });
  assert.equal(d.clases('f', 'c'), '');
  d.destellar(['f'], ['c'], 500, 1000);
  assert.equal(d.clases('f', 'c'), 'iswc-ag-flash');
  assert.equal(d.clases('f', 'otra'), '');
  r.avanzar(200);
  assert.match(d.estilo('f', 'c'), /--iswc-ag-flash-ms:500ms;--iswc-ag-fade-ms:1000ms;--iswc-ag-flash-t:200ms/);
  r.avanzar(1300);
  assert.equal(d.clases('f', 'c'), '');
  assert.deepEqual(vencidos, [{ filas: ['f'], columnas: ['c'] }]);
});

test('flash: filas o columnas omitidas abarcan todas; direccion y reinicio', () => {
  const r = relojFalso();
  const d = new Destello({ reloj: r.ahora, programar: r.programar, cancelar: r.cancelar });
  d.destellar(null, ['c'], 100, 100, 'up');
  assert.equal(d.clases('cualquiera', 'c'), 'iswc-ag-flash iswc-ag-flash-up');
  assert.equal(d.clases('x', 'b'), '');
  d.destellar(['f'], null, 100, 100);
  assert.notEqual(d.clases('f', 'zzz'), '');
  r.avanzar(150);
  d.destellar(['g'], ['c'], 100, 100);
  r.avanzar(100);
  d.destellar(['g'], ['c'], 100, 100);
  r.avanzar(150);
  assert.notEqual(d.clases('g', 'c'), '');
  d.destruir();
  assert.equal(d.clases('g', 'c'), '');
});

test('flash: cambio reciente caduca', () => {
  const r = relojFalso();
  const d = new Destello({ reloj: r.ahora, programar: r.programar, cancelar: r.cancelar });
  d.registrarCambio('f', 'c', 1, 2);
  assert.equal(d.cambioDe('f', 'c')?.nuevo, 2);
  assert.equal(d.cambioDe('f', 'x'), undefined);
  r.avanzar(3000);
  assert.equal(d.cambioDe('f', 'c'), undefined);
  d.destruir();
});

test('tooltip: precedencia y cabecera', () => {
  assert.equal(contenidoTooltip({ tooltip: 'fijo', tooltipField: 'a' }, p(1)), 'fijo');
  assert.equal(contenidoTooltip({ tooltip: true }, p(1, {}, { valueFormatted: 'uno' })), 'uno');
  assert.equal(contenidoTooltip({ tooltip: false, tooltipField: 'a' }, p(1, { a: 'x' })), undefined);
  assert.equal(contenidoTooltip({ tooltipValueGetter: (q: ParamsCelda) => `v${q.value}`, tooltipField: 'a' }, p(1)), 'v1');
  assert.equal(contenidoTooltip({ tooltipField: 'a.b' }, p(1, { a: { b: 'x' } })), 'x');
  assert.equal(contenidoTooltip({}, p(1)), undefined);
  assert.equal(contenidoCabecera({ headerTooltip: true, headerName: 'H' }, p(1)), 'H');
  assert.equal(contenidoCabecera({ headerTooltip: 'T' }, p(1)), 'T');
  assert.equal(contenidoCabecera({}, p(1)), undefined);
});

test('tooltip: esperas de mostrar, cambio y cierre', () => {
  const r = relojFalso();
  const log: string[] = [];
  const a = new AgendaTooltip({ programar: r.programar, cancelar: r.cancelar }, () => log.push('abre'), () => log.push('cierra'));
  a.entrar(2000, 200, 10000);
  r.avanzar(1999);
  assert.deepEqual(log, []);
  a.salir();
  r.avanzar(5000);
  assert.deepEqual(log, []);
  a.entrar(2000, 200, 10000);
  r.avanzar(2000);
  assert.deepEqual(log, ['abre']);
  a.entrar(2000, 200, 10000);
  r.avanzar(200);
  assert.deepEqual(log, ['abre', 'abre']);
  r.avanzar(10000);
  assert.deepEqual(log, ['abre', 'abre', 'cierra']);
  assert.equal(a.fase, 'oculto');
});

test('tooltip: interactivo se sostiene mientras el puntero sigue adentro', () => {
  const r = relojFalso();
  const log: string[] = [];
  const a = new AgendaTooltip({ programar: r.programar, cancelar: r.cancelar }, () => log.push('abre'), () => log.push('cierra'));
  a.entrar(0, 0, 0);
  r.avanzar(0);
  a.salir(300);
  a.sostener();
  r.avanzar(1000);
  assert.equal(a.fase, 'visible');
  a.salir(300);
  r.avanzar(300);
  assert.deepEqual(log, ['abre', 'cierra']);
});

test('temas: parametros a tokens en em', () => {
  const t = tokensDe({ accentColor: 'red', rowHeight: 40, fontSize: '14px', headerFontWeight: 600, rowBorder: 'none', spacing: 8 });
  assert.equal(t['--iswc-grid-accent'], 'red');
  assert.equal(t['--iswc-grid-row-h'], '2.8571em', 'relativa a la fuente del tema: 40/14');
  assert.equal(t['--iswc-grid-font-size'], '0.875em');
  assert.equal(tokensDe({ rowHeight: 42, fontSize: 14 })['--iswc-grid-row-h'], '3em');
  assert.equal(tokensDe({ rowHeight: 28, fontSize: 12 })['--iswc-grid-row-h'], '2.3333em');
  assert.equal(tokensDe({ rowHeight: 40 })['--iswc-grid-row-h'], '2.8571em', 'sin fontSize vale la del host');
  assert.equal(t['--iswc-grid-header-weight'], '600');
  assert.equal(t['--iswc-grid-spacing'], '0.5714em');
  assert.equal(tokensDe({ miPropio: '1' })['--iswc-grid-mi-propio'], '1');
  for (const valor of Object.values(tokensDe(PRESETS['quartz'] ?? {}))) assert.doesNotMatch(valor, /\dpx/);
});

test('temas: presets, withParams, modo y resolucion de la opcion', () => {
  for (const nombre of ['quartz', 'balham', 'material', 'alpine', 'financiero']) assert.ok(resolverTema(nombre), nombre);
  assert.ok((PRESETS['balham']?.['rowHeight'] as number) < (PRESETS['material']?.['rowHeight'] as number));
  const tema = crearTema('quartz').withParams({ accentColor: 'red' }).withParams({ accentColor: 'pink' }, 'dark');
  assert.equal(paramsEfectivos(tema, 'light')['accentColor'], 'red');
  assert.equal(paramsEfectivos(tema, 'dark')['accentColor'], 'pink');
  assert.equal(crearTema('quartz').params['accentColor'], undefined);
  assert.equal(resolverTema('auto'), null);
  assert.equal(resolverTema('dark'), null);
  assert.equal(resolverTema(tema), tema);
  assert.deepEqual(medidasDe({ rowHeight: 30, headerHeight: '40px' }), { rowHeight: 30, headerHeight: 40 });
});

test('html: escape, css y url', () => {
  assert.equal(escaparHtml('<a b="c">'), '&lt;a b=&quot;c&quot;&gt;');
  assert.equal(limpiarCss('red;x:y'), 'redx:y');
  assert.equal(limpiarCss('url(http://x)'), '');
  assert.equal(urlSegura(' JavaScript:alert(1)'), '');
  assert.equal(urlSegura('data:text/html,x'), '');
  assert.equal(urlSegura('/ruta/a?b=1'), '/ruta/a?b=1');
  assert.equal(urlSegura('mailto:a@b.c'), 'mailto:a@b.c');
});

function hostDoble(opciones: Record<string, unknown> = {}) {
  const def: Record<string, unknown> = { field: 'v', enableCellChangeFlash: true };
  const col = { colId: 'v' };
  const filas = [{ kind: 'leaf', level: 0, node: { id: 'f1', index: 0, data: { v: 1 as unknown } } }];
  const oyentes = new Map<string, (d: Record<string, unknown>) => void>();
  const refrescos: unknown[] = [];
  const renderers = new Map<string, (c: ContextoCelda) => string>();
  const emitidos: string[] = [];
  let api: Record<string, (...a: never[]) => unknown> = {};
  let clic: ((ev: unknown) => unknown) | null = null;
  const grid = {
    el: Object.assign(new EventTarget(), { style: { setProperty() {}, removeProperty() {} }, closest: () => null }),
    shadow: new EventTarget(),
    opcion: (n: string, d?: unknown) => opciones[n] ?? d,
    alCambiarOpcion: () => () => {},
    modelo: () => null,
    columnas: () => [{ ...col }],
    columna: () => ({ ...col }),
    defDe: () => def,
    valor: (_c: unknown, n: { data: { v: unknown } }) => n.data.v,
    textoCelda: (_c: unknown, n: { data: { v: unknown } }) => String(n.data.v),
    texto: (_c: string, d: string) => d,
    filaEn: (i: number) => filas[i] ?? null,
    totalFilas: () => filas.length,
    nodo: () => filas[0]?.node,
    fijarValor: (n: { data: { v: unknown } }, _c: string, v: unknown) => {
      n.data.v = v;
      return true;
    },
    emitir: (e: string) => emitidos.push(e),
    on: (e: string, fn: (d: Record<string, unknown>) => void) => {
      oyentes.set(e, fn);
      return () => oyentes.delete(e);
    },
    exponer: (m: typeof api) => {
      api = m;
    },
    renderer: (n: string, r: (c: ContextoCelda) => string) => renderers.set(n, r),
    celdaClic: (fn: (ev: unknown) => unknown) => {
      clic = fn;
      return () => {
        clic = null;
      };
    },
    refrescarCeldas: (...a: unknown[]) => refrescos.push(a),
    alturaFila: (id: string, u: number) => refrescos.push(['alto', id, u]),
    recomputar: () => {},
    capa: () => ({ getBoundingClientRect: () => ({ top: 0, left: 0 }) }),
  } as unknown as GridHost;
  return { grid, filas, def, oyentes, refrescos, renderers, emitidos, api: () => api, clic: () => clic };
}

test('instalar: registra renderers, expone api y limpia', () => {
  const h = hostDoble();
  const quitar = instalar(h.grid);
  for (const n of ['presentarCelda', 'presentarFila', 'flashCells', 'resetRowHeights', 'setRowHeight', 'getThemeMetrics']) assert.equal(typeof h.api()[n], 'function', n);
  assert.ok(h.renderers.has('sparkline'));
  assert.ok(h.oyentes.has('pintado'));
  quitar();
  assert.equal(h.oyentes.size, 0);
  assert.equal(h.clic(), null);
});

test('instalar: el renderer registrado funde cellRendererParams', () => {
  const h = hostDoble();
  const quitar = instalar(h.grid);
  const c = { ...ctx(-1.5), def: { cellRenderer: 'delta', cellRendererParams: { invertir: true } } };
  assert.match((h.renderers.get('delta') as (x: ContextoCelda) => string)(c), /iswc-ag-up/);
  quitar();
});

test('instalar: un cambio por transaccion destella y refresca una sola vez', () => {
  const h = hostDoble();
  const quitar = instalar(h.grid);
  const dispara = (e: string) => h.oyentes.get(e)?.({});
  const presentar = h.api()['presentarCelda'] as unknown as (c: unknown) => { clases: string; estilo: string };
  const node = h.filas[0]?.node as { data: { v: unknown } };
  const celda = { ...ctx(1), def: h.def, node, col: { colId: 'v' } };
  dispara('rowDataUpdated');
  assert.equal(h.refrescos.length, 0, 'la primera carga no destella');
  node.data.v = 2;
  dispara('rowDataUpdated');
  dispara('modelUpdated');
  assert.equal(h.refrescos.length, 1);
  assert.match(presentar(celda).clases, /iswc-ag-flash/);
  assert.match(presentar(celda).estilo, /--iswc-ag-flash-t/);
  quitar();
});

test('instalar: el renderer calcula el texto que el motor deja vacio', () => {
  const h = hostDoble();
  const quitar = instalar(h.grid);
  const c = { ...ctx('AAPL', {}, ''), node: h.filas[0]?.node, grid: h.grid } as ContextoCelda;
  assert.match((h.renderers.get('ticker') as (x: ContextoCelda) => string)(c), /iswc-ag-principal">1</);
  quitar();
});

test('lectores: valor y texto con getter y formatter de AG', () => {
  const def = { valueGetter: 'data.a * 2', valueFormatter: "'#' + value" };
  const grid = { defDe: () => def, modelo: () => null, opcion: () => undefined } as unknown as GridHost;
  const l = lectores(grid);
  const node = { id: '1', index: 0, data: { a: 4 } };
  const col = { colId: 'c' } as ContextoCelda['col'];
  assert.equal(l.valor(col, node), 8);
  assert.equal(l.texto(col, node), '#8');
});

test('instalar: cellValueChanged destella una vez y sin cambio real no hace nada', () => {
  const h = hostDoble({ cellFlashDirectional: true });
  const quitar = instalar(h.grid);
  const dispara = (d: Record<string, unknown>) => h.oyentes.get('cellValueChanged')?.(d);
  const presentar = h.api()['presentarCelda'] as unknown as (c: unknown) => { clases: string };
  const node = h.filas[0]?.node;
  dispara({ node, colId: 'v', oldValue: 1, newValue: 1 });
  assert.equal(h.refrescos.length, 0);
  dispara({ node, colId: 'v', oldValue: 2, newValue: 1 });
  assert.match(presentar({ ...ctx(1), def: h.def, node, col: { colId: 'v' } }).clases, /iswc-ag-flash-down/);
  assert.equal(h.refrescos.length, 1);
  quitar();
});

test('instalar: presentarFila reune posicion, reglas y estilo', () => {
  const h = hostDoble({ rowClass: 'a', rowClassRules: { b: 'data.v == 1' }, getRowStyle: () => ({ color: 'red' }), suppressRowHoverHighlight: true });
  const quitar = instalar(h.grid);
  const presentar = h.api()['presentarFila'] as unknown as (n: unknown, i: number) => { clases: string; estilo: string };
  const r = presentar(h.filas[0]?.node, 0);
  assert.match(r.clases, /iswc-ag-row-even iswc-ag-row-first iswc-ag-row-last a b iswc-ag-row-sin-hover/);
  assert.equal(r.estilo, 'color:red;');
  quitar();
});

test('instalar: getRowHeight se llama una vez por fila hasta resetRowHeights', () => {
  let llamadas = 0;
  const getRowHeight = () => {
    llamadas++;
    return 60;
  };
  const h = hostDoble({ getRowHeight });
  const quitar = instalar(h.grid);
  h.oyentes.get('rowDataUpdated')?.({});
  h.oyentes.get('modelUpdated')?.({});
  assert.equal(llamadas, 1);
  assert.deepEqual(h.refrescos.at(-1), ['alto', 'f1', 60]);
  (h.api()['resetRowHeights'] as unknown as () => void)();
  assert.equal(llamadas, 2);
  quitar();
});

test('instalar: casilla editable alterna y acciones emiten cellAction', () => {
  if (typeof globalThis.Element === 'undefined') Object.assign(globalThis, { Element: class {} });
  const h = hostDoble();
  const quitar = instalar(h.grid);
  const objetivo = (selector: string) => {
    const el = Object.create(Element.prototype) as Element;
    Object.defineProperty(el, 'closest', { value: (s: string) => (s === selector ? { disabled: false, dataset: { accion: 'ver' } } : null) });
    return el;
  };
  const node = h.filas[0]?.node as { data: { v: unknown } };
  const col = { colId: 'v' };
  node.data.v = true;
  assert.equal(h.clic()?.({ evento: { target: objetivo('.iswc-ag-check-editable') }, node, col, colId: 'v', indice: 0 }), true);
  assert.equal(node.data.v, false);
  let visto = 0;
  h.def['cellRenderer'] = 'acciones';
  h.def['cellRendererParams'] = { acciones: [{ id: 'ver', onClick: () => visto++ }] };
  assert.equal(h.clic()?.({ evento: { target: objetivo('.iswc-ag-accion') }, node, col, colId: 'v', indice: 0 }), true);
  assert.equal(visto, 1);
  assert.ok(h.emitidos.includes('cellAction'));
  quitar();
});

export default lista();
