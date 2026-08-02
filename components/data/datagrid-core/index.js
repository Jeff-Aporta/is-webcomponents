/**
 * datagrid-core/index — API pública del motor agnóstico del <is-ag-grid>.
 *
 * Punto único de entrada para la capa de render (<is-ag-grid>). Reexporta:
 *   - tipos y constantes
 *   - column-state (resolveColumns, setColumnWidth, …)
 *   - viewport (rowWindow, columnLayout, colWindow, applyFlex)
 *   - selection (toggleRowSelection, selectAll, headerCheckboxState)
 *   - value-formatter (getCellValue, formatCellValue, cellText, formatValue)
 *   - pipeline-filtering / pipeline-sorting / pipeline-grouping
 *   - csv-export (rowsToCsv)
 *   - grid-model (createGridModel)
 *
 * Equivalente en: Jeff-Aporta/mimicus-react · src/datagrid/core/index.ts
 */

// Types & constants
export * from './types.js';

// Column state
export {
  resolveColumns,
  setColumnWidth,
  setColumnPinned,
  setColumnHidden,
  moveColumn,
  autosizeColumn,
  orderedForLayout,
} from './column-state.js';

// Viewport math
export {
  rowWindow,
  columnLayout,
  colWindow,
  applyFlex,
} from './viewport.js';

// Selection
export {
  toggleRowSelection,
  selectAll,
  clearSelection,
  headerCheckboxState,
} from './selection.js';

// Value formatter
export {
  getCellValue,
  formatCellValue,
  cellText,
  formatValue,
} from './value-formatter.js';

// Pipeline: filter / sort / group
export {
  filterRows,
  uniqueValues,
} from './pipeline-filtering.js';
export {
  sortRows,
  cycleSort,
} from './pipeline-sorting.js';
export {
  buildDisplayRows,
  collectGroupIds,
} from './pipeline-grouping.js';

// CSV export
export { rowsToCsv } from './csv-export.js';

// Store observable
export { createGridModel } from './grid-model.js';
