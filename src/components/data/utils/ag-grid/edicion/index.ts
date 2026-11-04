/**
 * ag-grid/edicion — Plugin de edicion e interaccion de <iswc-ag-grid>:
 * cell editing, batch, validacion, undo/redo, seleccion de filas y celdas,
 * fill handle, portapapeles, teclado, accesibilidad, row dragging y row pinning.
 */
import type { InicioEdicion, LecturaValor } from './index.schemas.js';
import { Accesibilidad } from './accesibilidad.js';
import { posDeRef } from './apoyo.js';
import { refDePos } from './apoyo.js';
import { ArrastreFilas } from './arrastre-filas.js';
import { EDITORES } from './editores.js';
import { Escritor } from './escritor.js';
import { FilasFijadas } from './filas-fijadas.js';
import { PortapapelesCtl } from './portapapeles-ctl.js';
import { SeleccionFilas } from './seleccion-filas-ctl.js';
import { SeleccionRangos } from './seleccion-rangos.js';
import { SesionEdicion } from './sesion.js';
import { Teclado } from './teclado.js';
import type { ColumnState } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { Desinstalar } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { GridHost } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { RefCelda } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { LadoFijado } from './schemas/edicion.schemas.js';


function idDeColumna(clave: string | ColumnState): string {
  return typeof clave === 'string' ? clave : clave.colId;
}

export function instalar(grid: GridHost): Desinstalar {
  const a11y = new Accesibilidad(grid);
  const escritor = new Escritor(grid);
  const filas = new SeleccionFilas(grid);
  const rangos = new SeleccionRangos(grid, escritor);
  const sesion = new SesionEdicion(grid, escritor, { rango: (valor, node, colId) => rangos.asignar(valor, node, colId), anunciar: (texto) => a11y.anunciar(texto) });
  const portapapeles = new PortapapelesCtl(grid, escritor, rangos, filas, sesion);
  const fijadas = new FilasFijadas(grid);
  const arrastre = new ArrastreFilas(grid, filas);
  const teclado = new Teclado(grid, sesion, rangos, filas, escritor);

  for (const [nombre, crear] of Object.entries(EDITORES)) grid.editor(nombre, crear);

  const puedeClic = (colId: string): boolean => {
    if (grid.opcion('suppressClickEdit', false)) return false;
    const col = grid.columna(colId);
    if (!col) return false;
    return grid.opcion<boolean>('singleClickEdit', false) === true || grid.defDe(col)['singleClickEdit'] === true;
  };

  const salir = [
    a11y.instalar(),
    escritor.instalar(),
    filas.instalar(),
    rangos.instalar(),
    portapapeles.instalar(),
    fijadas.instalar(),
    arrastre.instalar(),
    teclado.instalar(),
    grid.on('pintado', () => sesion.reubicar()),
    grid.celdaAbajo((ev) => {
      if (sesion.activa && !sesion.incluye(ev.evento.target)) sesion.detener(false);
    }),
    grid.celdaClic((ev) => {
      if (puedeClic(ev.colId)) sesion.iniciar(ev, {});
    }),
    grid.celdaDobleClic((ev) => {
      if (!grid.opcion('suppressClickEdit', false)) sesion.iniciar(ev, {});
    }),
  ];

  grid.exponer({
    /* edicion */
    startEditingCell: (p: InicioEdicion) => {
      const ref = { indice: p.rowIndex, colId: idDeColumna(p.colKey) };
      grid.enfocar(ref);
      const caracter = p.key && [...p.key].length === 1 ? p.key : null;
      return sesion.iniciar(ref, { tecla: p.key ?? null, caracter });
    },
    stopEditing: (cancelar?: boolean) => sesion.detener(cancelar === true),
    isEditing: () => sesion.activa,
    getEditingCells: () => sesion.celdas().map((c: RefCelda) => ({ rowIndex: c.indice, column: grid.columna(c.colId), colKey: c.colId })),
    getEditRowValues: (node: RowNode) => sesion.valoresFila(node),
    getCellValue: (p: LecturaValor) => {
      const col = grid.columna(idDeColumna(p.colKey));
      if (!col) return undefined;
      if (p.useFormatter) return grid.textoCelda(col, p.rowNode);
      const desde = p.from ?? 'edit';
      if (desde === 'data') return escritor.valorDatos(col, p.rowNode);
      const abierto = desde === 'edit' ? sesion.valorAbierto(p.rowNode.id, col.colId) : undefined;
      return abierto ? abierto.valor : escritor.valorVisible(col, p.rowNode);
    },
    tabToNextCell: () => {
      const foco = grid.foco();
      const pos = foco ? posDeRef(grid, foco) : null;
      const destino = pos ? teclado.tabular(pos, false) : null;
      const ref = destino ? refDePos(grid, destino) : null;
      if (ref) grid.enfocar(ref);
      return Boolean(ref);
    },
    tabToPreviousCell: () => {
      const foco = grid.foco();
      const pos = foco ? posDeRef(grid, foco) : null;
      const destino = pos ? teclado.tabular(pos, true) : null;
      const ref = destino ? refDePos(grid, destino) : null;
      if (ref) grid.enfocar(ref);
      return Boolean(ref);
    },
    /* lote */
    startBatchEdit: () => escritor.iniciarLote(),
    commitBatchEdit: () => {
      sesion.detener(false);
      escritor.confirmarLote();
    },
    cancelBatchEdit: () => {
      sesion.detener(true);
      escritor.cancelarLote();
    },
    isBatchEditing: () => escritor.enLote,
    /* deshacer */
    undoCellEditing: () => escritor.deshacer(),
    redoCellEditing: () => escritor.rehacer(),
    getCurrentUndoSize: () => escritor.tamanoDeshacer,
    getCurrentRedoSize: () => escritor.tamanoRehacer,
    /* seleccion de filas */
    setNodesSelected: (p: { nodes: RowNode[]; newValue: boolean }) => filas.fijarNodos(p.nodes, p.newValue),
    selectAll: () => filas.seleccionarAlcance('all'),
    deselectAll: () => filas.deseleccionarAlcance('all'),
    selectAllFiltered: () => filas.seleccionarAlcance('filtered'),
    deselectAllFiltered: () => filas.deseleccionarAlcance('filtered'),
    selectAllOnCurrentPage: () => filas.seleccionarAlcance('currentPage'),
    deselectAllOnCurrentPage: () => filas.deseleccionarAlcance('currentPage'),
    getSelectedNodes: () => filas.nodosSeleccionados(),
    getSelectedRows: () => filas.filasSeleccionadas(),
    /* rangos */
    getCellRanges: () => rangos.rangos.map((r) => rangos.aPublico(r)),
    addCellRange: (p: Record<string, unknown>) => {
      const nuevo = rangos.desdePublico(p);
      if (nuevo) rangos.fijar([...rangos.rangos, nuevo]);
    },
    clearCellSelection: () => rangos.limpiar(),
    clearRangeSelection: () => rangos.limpiar(),
    /* portapapeles */
    copyToClipboard: (p?: { includeHeaders?: boolean }) => portapapeles.copiarRango(p),
    copySelectedRangeToClipboard: (p?: { includeHeaders?: boolean }) => portapapeles.copiarRango(p),
    copySelectedRowsToClipboard: (p?: { includeHeaders?: boolean }) => portapapeles.copiarFilas(p),
    cutToClipboard: () => portapapeles.cortarRango(),
    pasteFromClipboard: () => portapapeles.pegarDesdeNavegador(),
    /* filas fijadas */
    getPinnedTopRowCount: () => fijadas.contar('top'),
    getPinnedBottomRowCount: () => fijadas.contar('bottom'),
    getPinnedTopRow: (i: number) => fijadas.en('top', i),
    getPinnedBottomRow: (i: number) => fijadas.en('bottom', i),
    setRowPinned: (node: RowNode, lado: LadoFijado | null) => fijadas.fijar(node, lado),
    getRowPinningState: () => fijadas.estado(),
    /* accesibilidad */
    setGridAriaProperty: (nombre: string, valor: string | null) => a11y.fijarAtributo(nombre, valor),
  });

  return () => {
    sesion.detener(true);
    for (const fn of salir) fn();
  };
}
