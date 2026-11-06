/**
 * spreadsheet-engine.test.ts — motor de <iswc-spreadsheet>: fórmulas, grafo, errores, referencias,
 * funciones y alias, formatos, relleno, documento con deshacer, macros y archivos. Sin navegador.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRange, colName, colIndex, rangeName } from '../../src/components/data/utils/spreadsheet/address.ts';
import { Axis } from '../../src/components/data/utils/spreadsheet/ui-render.ts';
import { CfEvaluator } from '../../src/components/data/utils/spreadsheet/conditional.ts';
import { detectDelimiter, parseDelimited, toDelimited } from '../../src/components/data/utils/spreadsheet/csv.ts';
import { SpreadsheetDoc } from '../../src/components/data/utils/spreadsheet/document.ts';
import { planFill } from '../../src/components/data/utils/spreadsheet/fill.ts';
import { findAll, replaceAll } from '../../src/components/data/utils/spreadsheet/ui-dialogs.ts';
import { allFunctions, lookupFn, suggest } from '../../src/components/data/utils/spreadsheet/fn-registry.ts';
import { parseInput } from '../../src/components/data/utils/spreadsheet/input-parse.ts';
import { runMacro } from '../../src/components/data/utils/spreadsheet/macro-host.ts';
import { MacroRecorder } from '../../src/components/data/utils/spreadsheet/macro-recorder.ts';
import { adjustDecimals, formatValue } from '../../src/components/data/utils/spreadsheet/numfmt.ts';
import { adjustFormula, shiftFormula } from '../../src/components/data/utils/spreadsheet/rewrite.ts';
import { isValid } from '../../src/components/data/utils/spreadsheet/validation.ts';
import { canonicalFormula, writeXlsx } from '../../src/components/data/utils/spreadsheet/xlsx-write.ts';
import { readXlsx } from '../../src/components/data/utils/spreadsheet/xlsx-read.ts';
import { readZip, writeZip } from '../../src/components/data/utils/spreadsheet/zip.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

/** Libro de prueba con una hoja y celdas A1 → texto. */
function book(cells: Record<string, string> = {}, rows = 60, cols = 12): SpreadsheetDoc {
  const doc = new SpreadsheetDoc('en');
  doc.bootstrap('H1', rows, cols);
  put(doc, cells);
  return doc;
}

function put(doc: SpreadsheetDoc, cells: Record<string, string>, sheet = doc.sheet): void {
  doc.transact('t', () => {
    for (const [a, t] of Object.entries(cells)) {
      const x = parseRange(a)!;
      doc.setInput(sheet, x.r1, x.c1, t);
    }
  });
}

function val(doc: SpreadsheetDoc, a: string, sheet = doc.sheet): unknown {
  const x = parseRange(a)!;
  const v = doc.engine.getValue(sheet, x.r1, x.c1);
  return v !== null && typeof v === 'object' ? String(v) : v;
}

/** Evalúa una fórmula suelta sobre datos de ejemplo. */
function calc(f: string, cells: Record<string, string> = {}): unknown {
  const doc = book({ ...cells, L60: f });
  return val(doc, 'L60');
}

const near = (a: unknown, b: number, eps = 1e-6): void => { assert.ok(Math.abs(Number(a) - b) < eps, `${a} ≈ ${b}`); };

test('direcciones A1 más allá de Z y rangos', () => {
  assert.equal(colName(26), 'AA');
  assert.equal(colName(701), 'ZZ');
  assert.equal(colIndex('AB'), 27);
  assert.deepEqual(parseRange('$B$2:A1'), { r1: 0, c1: 0, r2: 1, c2: 1 });
  assert.equal(rangeName(parseRange('A:B', 10, 5)!), 'A1:B10');
});

test('precedencia, unarios, porcentaje y concatenación', () => {
  assert.equal(calc('=2+3*4'), 14);
  assert.equal(calc('=-2^2'), 4);
  assert.equal(calc('=2^3^2'), 64);
  assert.equal(calc('=50%*2'), 1);
  assert.equal(calc('="a"&1&TRUE'), 'a1TRUE');
  assert.equal(calc('=1=1.0'), true);
  assert.equal(calc('=0.1+0.2=0.3'), true);
  assert.equal(calc('="A"="a"'), true);
  assert.equal(calc('=1<"a"'), true);
});

test('errores: #DIV/0!, #NAME?, #VALUE!, #N/A, #REF!, propagación', () => {
  assert.equal(calc('=1/0'), '#DIV/0!');
  assert.equal(calc('=NOEXISTE(1)'), '#NAME?');
  assert.equal(calc('=nombre_suelto'), '#NAME?');
  assert.equal(calc('=1+"x"'), '#VALUE!');
  assert.equal(calc('=NA()'), '#N/A');
  assert.equal(calc('=SUM(1,#REF!)'), '#REF!');
  assert.equal(calc("=NoHay!A1"), '#REF!');
  assert.equal(calc('=VLOOKUP(9,A1:B1,1,FALSE)', { A1: '1', B1: '2' }), '#N/A');
  assert.equal(calc('=IFERROR(1/0,"ok")'), 'ok');
  assert.equal(calc('=IFNA(NA(),5)'), 5);
  assert.equal(calc('=A1+1', { A1: '=1/0' }), '#DIV/0!');
});

test('grafo: recálculo incremental evalúa solo lo afectado', () => {
  const doc = book({ A1: '1', B1: '=A1+1', C1: '=B1+1', D5: '=7', E5: '=D5*2' });
  const engine = doc.engine;
  engine.setCell(doc.sheet, 0, 0, { v: 10 });
  assert.equal(engine.recalc(), 2);
  assert.equal(val(doc, 'C1'), 12);
  assert.equal(val(doc, 'E5'), 14);
});

test('grafo: rangos y orden sin importar el sentido de la cadena', () => {
  const doc = book({ C1: '=SUM(A1:A3)', D1: '=C1*2', A1: '1', A2: '2', A3: '3' });
  assert.equal(val(doc, 'D1'), 12);
  put(doc, { A2: '20' });
  assert.equal(val(doc, 'D1'), 48);
  const chain = book({}, 3000, 2);
  chain.transact('t', () => {
    for (let r = 2998; r >= 1; r--) chain.setInput(chain.sheet, r, 0, `=A${r}+1`);
    chain.setInput(chain.sheet, 0, 0, '1');
  });
  assert.equal(chain.engine.getValue(chain.sheet, 2998, 0), 2999);
});

test('ciclos: directos, indirectos y por rango; se resuelven al romperlos', () => {
  const doc = book({ A1: '=B1', B1: '=A1+1', C1: '=C1', D1: '=SUM(D1:D2)', E1: '=A1+1' });
  assert.equal(val(doc, 'A1'), '#CYCLE!');
  assert.equal(val(doc, 'B1'), '#CYCLE!');
  assert.equal(val(doc, 'C1'), '#CYCLE!');
  assert.equal(val(doc, 'D1'), '#CYCLE!');
  assert.equal(val(doc, 'E1'), '#CYCLE!');
  put(doc, { B1: '5' });
  assert.equal(val(doc, 'A1'), 5);
  assert.equal(val(doc, 'E1'), 6);
});

test('hojas, nombres definidos y renombrado', () => {
  const doc = book({ A1: '5' });
  const s2 = doc.addSheet('Otra Hoja');
  put(doc, { A1: "=H1!A1*2" }, s2);
  put(doc, { B1: "='Otra Hoja'!A1+1" });
  assert.equal(val(doc, 'B1'), 11);
  doc.renameSheet(s2, 'Datos');
  assert.equal(doc.rawText(doc.sheet, 0, 1), '=Datos!A1+1');
  doc.defineName('Tasa', '=H1!$A$1/100');
  put(doc, { C1: '=Tasa*200', D1: '=SUM(Rango)' });
  assert.equal(val(doc, 'C1'), 10);
  assert.equal(val(doc, 'D1'), '#NAME?');
  doc.defineName('Rango', 'H1!A1:A3');
  assert.equal(val(doc, 'D1'), 5);
  put(doc, { A2: '7' });
  assert.equal(val(doc, 'D1'), 12);
  doc.deleteSheet(s2);
  assert.equal(val(doc, 'B1'), '#REF!');
});

test('referencias relativas y absolutas al copiar', () => {
  assert.equal(shiftFormula('=A1+$B1+C$1+$D$1', 2, 1), '=B3+$B3+D$1+$D$1');
  assert.equal(shiftFormula('=SUM(a1:a3)&"A1"', 1, 0), '=SUM(A2:A4)&"A1"');
  assert.equal(shiftFormula("='Mi Hoja'!A1", 1, 1), "='Mi Hoja'!B2");
  assert.equal(shiftFormula('=A1', -1, 0), '=#REF!');
});

test('insertar y borrar filas/columnas ajusta fórmulas y rangos', () => {
  const op = { sheet: 'H1', axis: 'row' as const, at: 1, count: 1, insert: true };
  assert.equal(adjustFormula('=SUM(A1:A3)+A5', 'H1', op), '=SUM(A1:A4)+A6');
  assert.equal(adjustFormula('=SUM(A1:A3)', 'H1', { ...op, insert: false, at: 2 }), '=SUM(A1:A2)');
  assert.equal(adjustFormula('=A3', 'H1', { ...op, insert: false, at: 2 }), '=#REF!');
  const doc = book({ A1: '1', A2: '2', A3: '3', B1: '=SUM(A1:A3)' });
  doc.structural(doc.sheet, 'row', 1, 2, true);
  assert.equal(doc.rawText(doc.sheet, 0, 1), '=SUM(A1:A5)');
  assert.equal(val(doc, 'B1'), 6);
  assert.equal(val(doc, 'A5'), 3);
  doc.undo();
  assert.equal(doc.rawText(doc.sheet, 0, 1), '=SUM(A1:A3)');
  assert.equal(val(doc, 'A3'), 3);
  doc.structural(doc.sheet, 'col', 0, 1, true);
  assert.equal(doc.rawText(doc.sheet, 0, 2), '=SUM(B1:B3)');
});

test('matemáticas y estadística', () => {
  assert.equal(calc('=ROUND(2.675,2)'), 2.68);
  assert.equal(calc('=ROUNDUP(1.01,1)'), 1.1);
  assert.equal(calc('=MOD(-3,2)'), 1);
  assert.equal(calc('=FACT(5)'), 120);
  assert.equal(calc('=GCD(12,18)'), 6);
  assert.equal(calc('=ROMAN(1994)'), 'MCMXCIV');
  assert.equal(calc('=SUMPRODUCT(A1:A2,B1:B2)', { A1: '2', A2: '3', B1: '4', B2: '5' }), 23);
  assert.equal(calc('=MEDIAN(1,2,3,4)'), 2.5);
  assert.equal(calc('=MODE(1,2,2,3)'), 2);
  near(calc('=STDEV.S(2,4,4,4,5,5,7,9)'), 2.13808994);
  near(calc('=STDEV.P(2,4,4,4,5,5,7,9)'), 2);
  assert.equal(calc('=PERCENTILE.INC(A1:A4,0.5)', { A1: '1', A2: '2', A3: '3', A4: '4' }), 2.5);
  assert.equal(calc('=RANK(3,A1:A3)', { A1: '1', A2: '2', A3: '3' }), 1);
  near(calc('=NORM.S.DIST(1.96,TRUE)'), 0.9750021, 1e-5);
  near(calc('=NORM.S.INV(0.975)'), 1.959964, 1e-5);
  near(calc('=T.DIST.2T(2,10)'), 0.0733880, 1e-5);
  near(calc('=CHISQ.DIST.RT(3.84,1)'), 0.0500435, 1e-4);
  assert.equal(calc('=SUBTOTAL(9,A1:A2)', { A1: '4', A2: '=SUBTOTAL(9,A3:A4)', A3: '9' }), 4);
  assert.equal(calc('=COUNT(A1:A3)', { A1: '1', A2: 'x', A3: '' }), 1);
  assert.equal(calc('=COUNTA(A1:A3)', { A1: '1', A2: 'x' }), 2);
});

test('condicionales: SUMIFS, COUNTIFS y comodines', () => {
  const data = { A1: 'Ana', A2: 'Beto', A3: 'Ana', B1: '10', B2: '20', B3: '30' };
  assert.equal(calc('=SUMIF(A1:A3,"Ana",B1:B3)', data), 40);
  assert.equal(calc('=SUMIFS(B1:B3,A1:A3,"Ana",B1:B3,">10")', data), 30);
  assert.equal(calc('=COUNTIF(B1:B3,">=20")', data), 2);
  assert.equal(calc('=COUNTIFS(A1:A3,"A*",B1:B3,"<>10")', data), 1);
  assert.equal(calc('=AVERAGEIF(A1:A3,"Ana",B1:B3)', data), 20);
  assert.equal(calc('=MAXIFS(B1:B3,A1:A3,"Ana")', data), 30);
  assert.equal(calc('=COUNTIF(A1:A3,"?eto")', data), 1);
});

test('búsqueda: VLOOKUP, XLOOKUP, INDEX, MATCH, OFFSET, INDIRECT', () => {
  const data = { A1: 'a', A2: 'b', A3: 'c', B1: '1', B2: '2', B3: '3' };
  assert.equal(calc('=VLOOKUP("b",A1:B3,2,FALSE)', data), 2);
  assert.equal(calc('=HLOOKUP(1,B1:B3,2,FALSE)', data), 2);
  assert.equal(calc('=VLOOKUP(2.5,B1:C3,1)', data), 2);
  assert.equal(calc('=XLOOKUP("c",A1:A3,B1:B3)', data), 3);
  assert.equal(calc('=XLOOKUP("z",A1:A3,B1:B3,"nada")', data), 'nada');
  assert.equal(calc('=XLOOKUP(2.5,B1:B3,A1:A3,,-1)', data), 'b');
  assert.equal(calc('=INDEX(B1:B3,MATCH("c",A1:A3,0))', data), 3);
  assert.equal(calc('=INDEX(A1:B3,2,2)', data), 2);
  assert.equal(calc('=SUM(INDEX(A1:B3,0,2))', data), 6);
  assert.equal(calc('=SUM(OFFSET(B1,1,0,2,1))', data), 5);
  assert.equal(calc('=INDIRECT("B"&2)', data), 2);
  assert.equal(calc('=ROWS(A1:B3)*COLUMNS(A1:B3)', data), 6);
  assert.equal(calc('=ADDRESS(2,3)'), '$C$2');
});

test('texto y fecha', () => {
  assert.equal(calc('=LEFT("hola",2)&RIGHT("hola")&MID("hola",2,2)'), 'hoaol');
  assert.equal(calc('=PROPER("hola mundo")'), 'Hola Mundo');
  assert.equal(calc('=TRIM("  a   b ")'), 'a b');
  assert.equal(calc('=SUBSTITUTE("aXbX","X","-",2)'), 'aXb-');
  assert.equal(calc('=SEARCH("m*o","hola mundo")'), 6);
  assert.equal(calc('=TEXTJOIN(",",TRUE,"a","","b")'), 'a,b');
  assert.equal(calc('=TEXT(1234.5,"$#,##0.00")'), '$1,234.50');
  assert.equal(calc('=TEXTAFTER("a-b-c","-",2)'), 'c');
  assert.equal(calc('=REGEXTEST("ab12","\\d+")'), true);
  assert.equal(calc('=DATE(2024,3,15)'), 45366);
  assert.equal(calc('=YEAR(45366)&"-"&MONTH(45366)&"-"&DAY(45366)'), '2024-3-15');
  assert.equal(calc('=DATE(1900,3,1)'), 61);
  assert.equal(calc('=WEEKDAY(DATE(2024,3,15))'), 6);
  assert.equal(calc('=EOMONTH(DATE(2024,1,31),1)'), 45351);
  assert.equal(calc('=EDATE(DATE(2024,1,31),1)'), 45351);
  assert.equal(calc('=DATEDIF(DATE(2020,1,15),DATE(2024,3,10),"Y")'), 4);
  assert.equal(calc('=NETWORKDAYS(DATE(2024,3,11),DATE(2024,3,15))'), 5);
  assert.equal(calc('=WORKDAY(DATE(2024,3,15),1)'), 45369);
});

test('financieras', () => {
  near(calc('=PMT(0.1/12,12,1000)'), -87.9158872);
  near(calc('=FV(0.05,10,-100)'), 1257.78925, 1e-4);
  near(calc('=PV(0.05,10,-100)'), 772.173493, 1e-4);
  near(calc('=NPER(0.01,-100,1000)'), 10.5886444, 1e-5);
  near(calc('=RATE(12,-100,1000)'), 0.0292285, 1e-5);
  near(calc('=NPV(0.1,100,200)'), 256.198347);
  near(calc('=IRR({-100,60,60})'), 0.1306624, 1e-5);
  near(calc('=XIRR({-100,110},{45000,45365})'), 0.1, 1e-4);
  near(calc('=IPMT(0.1/12,1,12,1000)'), -8.3333333);
  near(calc('=PPMT(0.1/12,1,12,1000)'), -79.5825539);
  assert.equal(calc('=SLN(1000,100,9)'), 100);
  near(calc('=EFFECT(0.12,12)'), 0.1268250, 1e-6);
});

test('matrices dinámicas: desborde, #SPILL!, operador # y LAMBDA', () => {
  const doc = book({ A1: '3', A2: '1', A3: '2', C1: '=SORT(A1:A3)', D1: '=C1#*2', E1: '=SUM(C1#)' });
  assert.equal(val(doc, 'C3'), 3);
  assert.equal(val(doc, 'D3'), 6);
  assert.equal(val(doc, 'E1'), 6);
  put(doc, { A3: '9' });
  assert.equal(val(doc, 'C3'), 9);
  assert.equal(val(doc, 'E1'), 13);
  put(doc, { C2: 'bloqueo' });
  assert.equal(val(doc, 'C1'), '#SPILL!');
  put(doc, { C2: '' });
  assert.equal(val(doc, 'C1'), 1);
  assert.equal(val(doc, 'C2'), 3);
  assert.equal(calc('=SUM(FILTER(A1:A3,A1:A3>1))', { A1: '1', A2: '2', A3: '3' }), 5);
  assert.equal(calc('=COUNTA(UNIQUE(A1:A3))', { A1: 'a', A2: 'A', A3: 'b' }), 2);
  assert.equal(calc('=SUM(SEQUENCE(3,2))'), 21);
  assert.equal(calc('=SUM(VSTACK({1,2},{3,4}))'), 10);
  assert.equal(calc('=LET(x,2,y,x*3,x+y)'), 8);
  assert.equal(calc('=SUM(MAP({1,2},LAMBDA(v,v*2)))'), 6);
  assert.equal(calc('=REDUCE(0,{1,2,3},LAMBDA(a,b,a+b))'), 6);
  assert.equal(calc('=SUM(A1:A2*2)', { A1: '1', A2: '2' }), 6);
  const named = book();
  named.defineName('Doble', '=LAMBDA(x,x*2)');
  put(named, { A1: '=Doble(4)' });
  assert.equal(val(named, 'A1'), 8);
});

test('alias en español, separador ; y coerción', () => {
  assert.equal(calc('=SUMA(1;2;3)'), 6);
  assert.equal(calc('=SI(1>0;"sí";"no")'), 'sí');
  assert.equal(calc('=BUSCARV(2;A1:B2;2;FALSO)', { A1: '1', A2: '2', B1: 'x', B2: 'y' }), 'y');
  assert.equal(calc('=CONTAR.SI(A1:A2;">1")', { A1: '1', A2: '2' }), 1);
  assert.equal(calc('=SUMAR.SI.CONJUNTO(A1:A2;A1:A2;">1")', { A1: '1', A2: '2' }), 2);
  assert.equal(calc('=REDONDEAR(1.26;1)'), 1.3);
  assert.equal(lookupFn('promedio')?.name, 'AVERAGE');
  assert.equal(canonicalFormula('=SUMA(A1;SI(B1;1;2))'), 'SUM(A1,IF(B1,1,2))');
  assert.equal(canonicalFormula('=BUSCARX(A1;B1:B2;C1:C2)'), '_xlfn.XLOOKUP(A1,B1:B2,C1:C2)');
});

test('biblioteca: amplitud, firmas y autocompletado', () => {
  const all = allFunctions();
  assert.ok(all.length >= 380, `hay ${all.length}`);
  assert.ok(all.every((f) => f.desc.length > 2));
  const cats = new Set(all.map((f) => f.cat));
  for (const c of ['Matemáticas', 'Estadística', 'Lógica', 'Texto', 'Fecha y hora', 'Búsqueda', 'Financieras', 'Matrices dinámicas']) assert.ok(cats.has(c), c);
  assert.deepEqual(suggest('busc', 'es', 3).map((s) => s.label), ['BUSCAR', 'BUSCARH', 'BUSCARV']);
  assert.ok(suggest('VLOO', 'en').some((s) => s.label === 'VLOOKUP'));
  assert.equal(lookupFn('VLOOKUP')?.min, 3);
  assert.equal(lookupFn('VLOOKUP')?.max, 4);
  assert.equal(lookupFn('SUM')?.max, Infinity);
  assert.equal(calc('=ROUND(1)'), '#VALUE!');
});

test('formatos numéricos', () => {
  const f = (v: number | string, s: string): string => formatValue(v, s).text;
  assert.equal(f(1234.5, '#,##0.00'), '1,234.50');
  assert.equal(f(-1234.5, '#,##0;(#,##0)'), '(1,235)');
  assert.equal(f(0.256, '0.0%'), '25.6%');
  assert.equal(f(1234, '$#,##0'), '$1,234');
  assert.equal(f(1234567, '0.00E+00'), '1.23E+06');
  assert.equal(f(0.5, '# ?/?'), '1/2');
  assert.equal(f(45366, 'dd/mm/yyyy'), '15/03/2024');
  assert.equal(f(45366, 'yyyy-mm-dd'), '2024-03-15');
  assert.equal(f(45366.75, 'hh:mm'), '18:00');
  assert.equal(f(45366, 'mmmm'), 'marzo');
  assert.equal(f(1500000, '0.0,,"M"'), '1.5M');
  assert.equal(f('x', '0;0;0;"T:"@'), 'T:x');
  assert.equal(formatValue(-1, '[Red]0;[Blue]-0').color, '#1565c0');
  assert.equal(formatValue(5, '[>3]"alto";"bajo"').text, 'alto');
  assert.equal(adjustDecimals('0.00', 1), '0.000');
  assert.equal(adjustDecimals('#,##0.00', -2), '#,##0');
  assert.equal(adjustDecimals('General', 1), '0.0');
});

test('entrada: número, porcentaje, moneda, fecha, lógico y fórmula', () => {
  assert.deepEqual(parseInput('1,234.5', 'en'), { v: 1234.5 });
  assert.deepEqual(parseInput('1.234,5', 'es'), { v: 1234.5 });
  assert.deepEqual(parseInput('12,5', 'es'), { v: 12.5 });
  assert.deepEqual(parseInput('50%', 'es'), { v: 0.5, numFmt: '0%' });
  assert.equal(parseInput('$1,000.50', 'en').v, 1000.5);
  assert.equal(parseInput('15/03/2024', 'es').v, 45366);
  assert.equal(parseInput('03/15/2024', 'en').v, 45366);
  assert.deepEqual(parseInput('verdadero', 'es'), { v: true });
  assert.deepEqual(parseInput("'123", 'es'), { v: '123' });
  assert.deepEqual(parseInput('=SUM(A1:A2', 'es'), { f: '=SUM(A1:A2)' });
});

test('relleno: números, fechas, listas, texto numerado y fórmulas', () => {
  const vals = (src: Parameters<typeof planFill>[0], n: number, back = false, alt = false): unknown[] => planFill(src, n, back, alt).map((s) => s.v ?? src[s.from].v);
  assert.deepEqual(vals([{ v: 1 }, { v: 3 }], 3), [5, 7, 9]);
  assert.deepEqual(vals([{ v: 5 }], 2), [5, 5]);
  assert.deepEqual(vals([{ v: 5 }], 2, false, true), [6, 7]);
  assert.deepEqual(vals([{ v: 'lunes' }], 2), ['martes', 'miércoles']);
  assert.deepEqual(vals([{ v: 'Ene' }, { v: 'Mar' }], 2), ['May', 'Jul']);
  assert.deepEqual(vals([{ v: 'Item 9' }], 2), ['Item 10', 'Item 11']);
  assert.deepEqual(vals([{ v: 'Q3' }], 3), ['Q4', 'Q1', 'Q2']);
  assert.deepEqual(vals([{ v: 'a' }, { v: 'b' }], 3), ['a', 'b', 'a']);
  assert.deepEqual(vals([{ v: 45366, isDate: true }], 1), [45367]);
  assert.deepEqual(vals([{ v: 45366, isDate: true }, { v: 45397, isDate: true }], 1), [45427]);
  const doc = book({ A1: '1', A2: '2', B1: '=A1*2', B2: '=A2*2' });
  doc.fill(doc.sheet, parseRange('A1:B2')!, parseRange('A1:B5')!);
  assert.equal(val(doc, 'A5'), 5);
  assert.equal(val(doc, 'B5'), 10);
  assert.equal(doc.rawText(doc.sheet, 4, 1), '=A5*2');
});

test('documento: deshacer y rehacer agrupan transacciones', () => {
  const doc = book({ A1: '1' });
  doc.transact('varias', () => {
    doc.setInput(doc.sheet, 0, 0, '2');
    doc.setInput(doc.sheet, 1, 0, '3');
    doc.applyStyle(doc.sheet, [parseRange('A1')!], { bold: true });
  });
  assert.equal(doc.undoLabel, 'varias');
  doc.undo();
  assert.equal(val(doc, 'A1'), 1);
  assert.equal(val(doc, 'A2'), null);
  assert.equal(doc.styleAt(doc.sheet, 0, 0).bold, undefined);
  doc.redo();
  assert.equal(val(doc, 'A1'), 2);
  assert.equal(doc.styleAt(doc.sheet, 0, 0).bold, true);
});

test('documento: combinar, ordenar, filtrar y duplicados', () => {
  const doc = book({ A1: 'n', B1: 'v', A2: 'b', B2: '2', A3: 'a', B3: '3', A4: 'c', B4: '=B2+1', C2: '=B2*10' });
  doc.merge(doc.sheet, parseRange('E1:F2')!);
  assert.deepEqual(doc.mergeAt(doc.sheet, 1, 5), parseRange('E1:F2'));
  doc.undo();
  assert.equal(doc.mergeAt(doc.sheet, 1, 5), null);
  doc.sort(doc.sheet, parseRange('A1:C4')!, [{ col: 0 }], true);
  assert.equal(val(doc, 'A2'), 'a');
  assert.equal(val(doc, 'C3'), 20);
  assert.equal(doc.rawText(doc.sheet, 2, 2), '=B3*10');
  doc.toggleFilter(doc.sheet, parseRange('A1:C4')!);
  doc.setFilterColumn(doc.sheet, 0, { values: ['b'] });
  assert.equal(doc.rowHidden(doc.sheet, 1), true);
  assert.equal(doc.rowHidden(doc.sheet, 2), false);
  doc.setFilterColumn(doc.sheet, 0, null);
  assert.equal(doc.rowHidden(doc.sheet, 1), false);
  const dup = book({ A1: 'x', B1: '1', A2: 'x', B2: '1', A3: 'y', B3: '2' });
  assert.equal(dup.removeDuplicates(dup.sheet, parseRange('A1:B3')!, [0, 1]), 1);
  assert.equal(val(dup, 'A2'), 'y');
  assert.equal(val(dup, 'A3'), null);
});

test('documento: pegar valores, formatos, transponer y mover', () => {
  const doc = book({ A1: '1', B1: '=A1+1' });
  doc.applyStyle(doc.sheet, [parseRange('A1')!], { bold: true });
  const block = doc.copy(doc.sheet, parseRange('A1:B1')!);
  doc.paste(doc.sheet, block, parseRange('A3')!);
  assert.equal(doc.rawText(doc.sheet, 2, 1), '=A3+1');
  doc.paste(doc.sheet, block, parseRange('A4')!, { mode: 'values' });
  assert.equal(doc.rawText(doc.sheet, 3, 1), '2');
  doc.paste(doc.sheet, block, parseRange('D1')!, { transpose: true });
  assert.equal(doc.rawText(doc.sheet, 1, 3), '=C2+1');
  doc.paste(doc.sheet, block, parseRange('F1')!, { mode: 'formats' });
  assert.equal(doc.styleAt(doc.sheet, 0, 5).bold, true);
  assert.equal(val(doc, 'F1'), null);
  doc.paste(doc.sheet, doc.copy(doc.sheet, parseRange('A1')!), parseRange('H1:H3')!);
  assert.equal(val(doc, 'H3'), 1);
});

test('formato condicional y validación', () => {
  const doc = book({ A1: '1', A2: '5', A3: '10', B1: 'hola', B2: 'hola' });
  doc.addCf(doc.sheet, { range: 'A1:A3', type: 'cell', op: 'gt', a: '4', style: { bg: '#ff0000' } });
  doc.addCf(doc.sheet, { range: 'A1:A3', type: 'colorScale', colors: ['#000000', '#ffffff'] });
  doc.addCf(doc.sheet, { range: 'B1:B2', type: 'duplicate', style: { bold: true } });
  doc.addCf(doc.sheet, { range: 'A1:A3', type: 'formula', a: '=$A1=10', style: { color: '#00ff00' } });
  const cf = new CfEvaluator(doc);
  assert.equal(cf.effect(doc.sheet, 0, 0)?.bg, '#000000');
  assert.equal(cf.effect(doc.sheet, 1, 0)?.bg, '#ff0000');
  assert.equal(cf.effect(doc.sheet, 0, 1)?.bold, true);
  assert.equal(cf.effect(doc.sheet, 2, 0)?.color, '#00ff00');
  const rule = { id: 'x', range: 'C1:C3', type: 'whole' as const, op: 'between' as const, a: '1', b: '5' };
  assert.equal(isValid(doc, doc.sheet, rule, 0, 2, '3'), true);
  assert.equal(isValid(doc, doc.sheet, rule, 0, 2, '9'), false);
  assert.equal(isValid(doc, doc.sheet, rule, 0, 2, '2.5'), false);
  const list = { id: 'y', range: 'C1', type: 'list' as const, a: 'si, no' };
  assert.equal(isValid(doc, doc.sheet, list, 0, 2, 'SI'), true);
  assert.equal(isValid(doc, doc.sheet, list, 0, 2, 'tal vez'), false);
  const custom = { id: 'z', range: 'C1:C3', type: 'custom' as const, a: '=C1>A1' };
  assert.equal(isValid(doc, doc.sheet, custom, 1, 2, '6'), true);
  assert.equal(isValid(doc, doc.sheet, custom, 1, 2, '4'), false);
});

test('buscar y reemplazar', () => {
  const doc = book({ A1: 'Hola', A2: 'hola mundo', B1: '=SUM(A1:A2)' });
  assert.equal(findAll(doc, 'hola').length, 2);
  assert.equal(findAll(doc, 'hola', { matchCase: true }).length, 1);
  assert.equal(findAll(doc, 'hola', { wholeCell: true }).length, 1);
  assert.equal(findAll(doc, 'SUM', { inFormulas: true }).length, 1);
  assert.equal(replaceAll(doc, 'hola', 'chao'), 2);
  assert.equal(val(doc, 'A2'), 'chao mundo');
});

test('macros: lenguaje, control de flujo y hoja', () => {
  const doc = book({ A1: '1', A2: '2', A3: '3' });
  const logs: string[] = [];
  const res = runMacro(doc, `
    # suma con bucle y función propia
    funcion doble(x) { retorna x * 2 }
    sea total = 0
    para f en 1..ultimaFila("A") {
      si celda(f, 1) == 2 { sigue }
      total += doble(celda(f, 1))
    }
    escribir("B1", total)
    formato("B1", {negrita: verdadero, relleno: "#ffe08a", alineacion: "centro"})
    sea nombres = ["a", "b"]
    para n en nombres { agregar(nombres, mayus(n)) ; corta }
    escribir("C1:C3", nombres[2] & "!")
    escribir("D1", [[1, 2], [3, 4]])
    sea i = 0
    mientras i < 3 { i = i + 1 }
    si i == 3 y no falso { imprimir("listo", i) } sino { imprimir("mal") }
    retorna {total: total}
  `, 'prueba', { log: (t) => logs.push(t) });
  assert.equal(res.ok, true, res.error);
  assert.equal(val(doc, 'B1'), 8);
  assert.equal(doc.styleAt(doc.sheet, 0, 1).bold, true);
  assert.equal(doc.styleAt(doc.sheet, 0, 1).align, 'center');
  assert.equal(val(doc, 'C3'), 'A!');
  assert.equal(val(doc, 'E2'), 4);
  assert.deepEqual(logs, ['listo 3']);
  doc.undo();
  assert.equal(val(doc, 'B1'), null);
  assert.equal(val(doc, 'E2'), null);
});

test('macros: alias en inglés y operaciones de hoja', () => {
  const doc = book({ A1: 'b', A2: 'a' });
  const res = runMacro(doc, `
    let s = newSheet("Resumen")
    sheet("H1")
    sort("A1:A2")
    insertRows(1, 1)
    write("B1", "=COUNTA(A:A)")
    for x in 1..3 step 2 { put(x, 3, x) }
  `, 'en');
  assert.equal(res.ok, true, res.error);
  assert.equal(doc.engine.sheets.length, 2);
  assert.equal(val(doc, 'A2'), 'a');
  assert.equal(val(doc, 'B1'), 2);
  assert.equal(val(doc, 'C3'), 3);
});

test('macros: seguridad y límites', () => {
  const doc = book();
  const bad = (code: string, needle: RegExp, limits = {}): void => {
    const r = runMacro(doc, code, 'mala', {}, limits);
    assert.equal(r.ok, false, code);
    assert.match(r.error!, needle);
  };
  bad('mientras verdadero { }', /límite de pasos/, { steps: 2000 });
  bad('funcion f() { retorna f() }\nf()', /anidadas/);
  bad('sea x = constructor', /no está definido/);
  bad('sea x = {}\nx.constructor.constructor("return 1")()', /función|leer/);
  bad('eval("1")', /no existe/);
  bad('Function("return 1")', /nombre|no existe/);
  bad('globalThis', /no está definido/);
  bad('sea a = []\na.__proto__', /No se puede leer/);
  bad('escribir("no es celda", 1)', /no válida/);
  bad('sea = 3', /nombre/);
  bad('si verdadero {', /Falta/);
  const src = ['interp.ts', 'macro-parser.ts', 'lexer.ts', 'host.ts', 'recorder.ts'].map((f) => readFileSync(join(raiz, 'src/components/data/utils/spreadsheet/macro', f), 'utf8')).join('\n');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(code, /\beval\s*\(/);
  assert.doesNotMatch(code, /new\s+Function/);
});

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('sin eval ni new Function en todo el motor', () => {
  const dir = join(raiz, 'src/components/data/utils/spreadsheet');
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  for (const f of walk(dir).filter((x) => x.endsWith('.ts'))) {
    const code = readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.doesNotMatch(code, /new\s+Function\s*\(/, f);
    assert.doesNotMatch(code, /(^|[^\w.])eval\s*\(/, f);
  }
  assert.doesNotMatch(readFileSync(join(raiz, 'src/components/data/spreadsheet.ts'), 'utf8'), /new\s+Function\s*\(/);
});

test('grabadora: selección fundida y literales ejecutables', () => {
  const rec = new MacroRecorder();
  rec.record('seleccionar', 'A1');
  rec.start();
  rec.record('seleccionar', 'A1');
  rec.record('seleccionar', 'B2');
  rec.record('escribir', 'B2', 'di "hola"');
  rec.record('formato', 'B2', { negrita: true, tamano: 14 });
  const code = rec.stop();
  assert.equal(code.split('\n').length, 3);
  const doc = book();
  assert.equal(runMacro(doc, code, 'grabada').ok, true);
  assert.equal(val(doc, 'B2'), 'di "hola"');
  assert.equal(doc.styleAt(doc.sheet, 1, 1).size, 14);
  rec.record('escribir', 'A1', 1);
  assert.equal(rec.recording, false);
});

test('CSV: comillas, separador y BOM', () => {
  assert.deepEqual(parseDelimited('a,"b,c"\r\n"d""e",f\n', ','), [['a', 'b,c'], ['d"e', 'f']]);
  assert.equal(detectDelimiter('a;b;c\n1;2;3\n'), ';');
  assert.equal(detectDelimiter('a\tb\n1\t2\n'), '\t');
  assert.equal(toDelimited([['a,b', 'c"d'], ['1', '']]), '"a,b","c""d"\r\n1,');
  assert.deepEqual(parseDelimited('﻿a,b', ','), [['a', 'b']]);
});

test('ZIP: ida y vuelta con deflate', async () => {
  const body = new TextEncoder().encode('hola '.repeat(500));
  const zip = await writeZip(new Map([['a/b.txt', body], ['vacío.txt', new Uint8Array()]]));
  assert.ok(zip.length < body.length);
  const out = await readZip(zip);
  assert.deepEqual(out.get('a/b.txt'), body);
  assert.equal(out.get('vacío.txt')?.length, 0);
});

test('XLSX: ida y vuelta conserva contenido, estilo y estructura', async () => {
  const doc = book({ A1: 'Nombre', B1: '=SUMA(1;2)', C1: '1,234.5', A2: 'Con <xml> & "comillas"', B2: '=BUSCARX(1;C1:C2;C1:C2;"x")' });
  const s = doc.sheet;
  doc.applyStyle(s, [parseRange('A1')!], { bold: true, color: '#ff0000', bg: '#00ff00', align: 'center', numFmt: '0.00', wrap: true });
  doc.setBorders(s, parseRange('A1')!, 'all', { style: 'medium', color: '#0000ff' });
  doc.merge(s, parseRange('E1:F2')!);
  doc.setColWidth(s, [0], 12);
  doc.setRowHeight(s, [0], 3);
  doc.setFreeze(s, 1, 1);
  doc.setHidden(s, 'col', [8], true);
  doc.setComment(s, 0, 0, 'nota');
  doc.toggleFilter(s, parseRange('A1:C3')!);
  doc.addCf(s, { range: 'C1:C5', type: 'cell', op: 'gt', a: '1', style: { bg: '#ffff00', bold: true } });
  doc.addCf(s, { range: 'C1:C5', type: 'colorScale', colors: ['#ff0000', '#00ff00'] });
  doc.addValidation(s, { range: 'D1:D3', type: 'list', a: 'x,y' });
  doc.defineName('Tasa', 'H1!$C$1');
  const s2 = doc.addSheet('Dos');
  doc.setInput(s2, 0, 0, '=H1!C1*2');
  const out = new SpreadsheetDoc('en');
  out.load(await readXlsx(await writeXlsx(doc)));
  const h = out.sheetByName('H1')!;
  assert.equal(out.engine.sheets.length, 2);
  assert.equal(out.engine.getValue(h, 0, 0), 'Nombre');
  assert.equal(out.rawText(h, 0, 1), '=SUM(1,2)');
  assert.equal(out.engine.getValue(h, 0, 1), 3);
  assert.equal(out.rawText(h, 1, 1), '=XLOOKUP(1,C1:C2,C1:C2,"x")');
  assert.equal(out.engine.getValue(h, 1, 0), 'Con <xml> & "comillas"');
  const st = out.styleAt(h, 0, 0);
  assert.equal(st.bold, true);
  assert.equal(st.color, '#ff0000');
  assert.equal(st.bg, '#00ff00');
  assert.equal(st.align, 'center');
  assert.equal(st.numFmt, '0.00');
  assert.equal(st.wrap, true);
  assert.equal(st.borderTop?.style, 'medium');
  assert.deepEqual(out.mergeAt(h, 1, 5), parseRange('E1:F2'));
  assert.equal(out.colWidth(h, 0), 12);
  assert.ok(Math.abs(out.rowHeight(h, 0) - 3) < 0.01);
  assert.deepEqual(out.extras(h).freeze, { rows: 1, cols: 1 });
  assert.equal(out.colHidden(h, 8), true);
  assert.equal(out.engine.getCell(h, 0, 0)?.c, 'nota');
  assert.equal(out.extras(h).filter?.range, 'A1:C3');
  assert.equal(out.extras(h).cf.length, 2);
  assert.equal(out.extras(h).cf[0].style?.bg, '#ffff00');
  assert.equal(out.extras(h).validations[0].a, 'x,y');
  assert.equal(out.engine.names.get('TASA')?.ref, '=H1!$C$1');
  assert.equal(out.engine.getValue(out.sheetByName('Dos')!, 0, 0), 2469);
});

test('documento JSON: ida y vuelta', () => {
  const doc = book({ A1: '2', B1: '=A1*2' });
  doc.applyStyle(doc.sheet, [parseRange('A1')!], { italic: true });
  doc.saveMacro({ name: 'M', code: 'escribir("C1", 1)' });
  doc.addChart(doc.sheet, { type: 'bar', range: 'A1:B1', x: 1, y: 1, w: 20, h: 10 });
  const copy = new SpreadsheetDoc('en');
  copy.load(JSON.parse(JSON.stringify(doc.save())));
  assert.equal(val(copy, 'B1'), 4);
  assert.equal(copy.styleAt(copy.sheet, 0, 0).italic, true);
  assert.equal(copy.macros[0].name, 'M');
  assert.equal(copy.extras(copy.sheet).charts.length, 1);
});

test('eje virtual: desplazamientos con tamaños propios y ocultos', () => {
  const ax = new Axis(1000000, 2, new Map([[10, 5], [20, 0]]));
  assert.equal(ax.offset(10), 20);
  assert.equal(ax.offset(11), 25);
  assert.equal(ax.offset(21), 25 + 2 * 9);
  assert.equal(ax.indexAt(24), 10);
  assert.equal(ax.indexAt(0), 0);
  assert.equal(ax.total, 2000000 + 3 - 2);
  assert.equal(ax.size(20), 0);
});

test('rendimiento: 100 000 fórmulas se cargan y recalculan por lote', () => {
  const doc = new SpreadsheetDoc('en');
  const sheet = doc.bootstrap('G', 100001, 3);
  const engine = doc.engine;
  engine.batch(() => {
    for (let r = 0; r < 100000; r++) {
      engine.setCell(sheet, r, 0, { v: r });
      engine.setCell(sheet, r, 1, { f: `=A${r + 1}*2` });
    }
    engine.setCell(sheet, 100000, 1, { f: '=SUM(B1:B100000)' });
  });
  assert.equal(engine.getValue(sheet, 100000, 1), 99999 * 100000);
  engine.setCell(sheet, 5, 0, { v: 6 });
  assert.equal(engine.recalc(), 2);
  assert.equal(engine.getValue(sheet, 100000, 1), 99999 * 100000 + 2);
});

export default lista();
