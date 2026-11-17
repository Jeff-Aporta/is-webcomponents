// @contexto INDICE.md · tests/componentes/README.md
/**
 * ag-grid-exportadores.test.ts — Los exportadores de serie del modal de exportar de <iswc-ag-grid>.
 *
 * CSV y Excel vienen de serie (la app puede registrar más con la opción `exporters`). Caja negra sobre
 * `grid-modales`: se arman los archivos con datos ya preparados y se revisa lo que queda adentro. Sin DOM.
 */
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { EXPORTADOR_CSV, EXPORTADOR_XLSX } from '../../src/components/data/utils/ag-grid/grid-modales.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const DATOS = {
  columnas: [{ colId: 'ref', headerName: 'Referencia', field: 'ref' }, { colId: 'nombre', headerName: 'Nombre; con "comillas"', field: 'nombre' }, { colId: 'valor', headerName: 'Valor', field: 'valor' }],
  filas: [['COCO-001', 'Agua de coco', 4500], ['COCO-002', 'Cocada, blanca', 9800]],
};

test('exportadores: el CSV lleva BOM, encabezados y escapa comas y comillas', async () => {
  assert.equal(EXPORTADOR_CSV.extension, 'csv');
  const blob = EXPORTADOR_CSV.construir(DATOS);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // `Blob.text()` descarta el BOM al decodificar: se mira en los bytes.
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], 'BOM para que Excel lea UTF-8');
  const lineas = (await blob.text()).replace(/^﻿/, '').split('\r\n');
  assert.equal(lineas[0], 'Referencia,"Nombre; con ""comillas""",Valor');
  assert.equal(lineas[2], 'COCO-002,"Cocada, blanca",9800');
});

test('exportadores: el Excel es un .xlsx real (ZIP con la hoja, encabezados y valores)', async () => {
  assert.equal(EXPORTADOR_XLSX.extension, 'xlsx');
  const blob = EXPORTADOR_XLSX.construir(DATOS);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0), 'PK', 'firma ZIP');
  const crudo = new TextDecoder('latin1').decode(bytes);
  for (const parte of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/styles.xml']) assert.ok(crudo.includes(parte), `falta ${parte}`);
  assert.ok(crudo.includes('Referencia') && crudo.includes('Agua de coco') && crudo.includes('9800'), 'encabezados y valores dentro de la hoja');
});

export default lista();
