# Paridad de `<iswc-ag-grid>` con AG Grid

Spec de paridad, escrita con palabras propias a partir del comportamiento
documentado de AG Grid (referencia React, leida el 2026-10-31). Implementacion
propia: no usa codigo ni paquetes de AG Grid; varias de estas capacidades son
Enterprise alla, con licencia comercial.

## Como leer los estados

- **hecho**: el nombre existe en el codigo de `utils/ag-grid/`, `ag-grid.ts` o
  `datagrid-core`. Se calcula por identificador con `gen_paridad`: indica que la
  opcion esta cableada, **no** que cada variante este probada una a una.
- **parcial**: existe con limites, indicados en la columna iswc.
- **falta**: no aparece en el codigo.

Lo probado de verdad en navegador esta en la seccion "Verificado".

## Resumen

| Superficie | Hecho | Parcial | Falta |
| --- | --- | --- | --- |
| Grid Options | 162 | 9 | 165 |
| Grid API | 214 | 0 | 43 |
| Eventos | 78 | 0 | 22 |
| Opciones de columna | 87 | 0 | 28 |
| IRowNode | 25 | 1 | 12 |

## Verificado

Comprobado en Edge headless con la grilla real y los cuatro plugins instalados:
renderers financieros en oscuro y claro, cabeceras agrupadas, columnas fijadas,
agregados de grupo alineados bajo su columna, scroll de 100.000 filas y escalado
por `font-size` (16→24 px: fila 40→60, posicion de scroll 1500→2250). Lo demas se
probo solo en las pruebas de cada parcela o no se probo en este pase.

## Guias de comportamiento

| Guia de AG Grid | Equivalente iswc | Estado |
| --- | --- | --- |
| Tamaño y layout de la grilla | `domLayout`, alto por CSS en em | parcial |
| Temas y parametros | `celdas/temas`: presets quartz, balham, alpine, material, financiero; tokens `--iswc-grid-*` | hecho |
| Theme Builder, distribucion de temas | no aplica: sin constructor visual | falta |
| Definicion y actualizacion de columnas | `aplanarDefs`, `defaultColDef`, `columnTypes`, autogeneradas | hecho |
| Estado de columnas | `getColumnState`, `applyColumnState` | hecho |
| Grupos de cabecera | `children` en defs, `nucleo/cabecera` | parcial: sin abrir/cerrar grupos |
| Tamaño, mover, fijar columnas | medicion real con canvas, arrastre, sticky con sombra | hecho |
| Column spanning | `colSpan` en el motor | hecho |
| Row spanning | `spanRows` | falta |
| Columnas calculadas | `calculatedColumns` | falta |
| Orden de filas | core + `filtros/orden` | hecho |
| Numeros de fila | `rowNumbers` | falta |
| Fijar filas | `edicion/filas-fijadas`, `pegar` en el motor | hecho |
| Altura de fila | `alturas`, `getRowHeight`, `autoHeight` | hecho |
| Estilos de fila y celda | `celdas/reglas` | hecho |
| Paginacion | core + `filtros` | hecho |
| Arrastre de filas | gestionado en `edicion/filas-movidas` | parcial: sin zonas externas ni grilla a grilla |
| Filas de ancho completo | `FilaExtra` del contrato | parcial |
| Celdas: valores, formatos, tipos | `celdas/celdas-valores`, `celdas/formatos` | hecho |
| Buscar en la grilla (Find) | `find*` | falta |
| Notas | `notes*` | falta |
| Resaltar cambios | `celdas/flash` | hecho |
| Tooltips | `celdas/tooltips` | hecho |
| Expresiones de celda | `celdas/expresion` | hecho |
| Datos de referencia | `refData` | hecho |
| Filtros texto, numero, fecha, set, multi | `filtros/condiciones`, `filtros/set` | hecho |
| Filtros flotantes | `filtros/ui/flotantes` | hecho |
| Filtro avanzado | `filtros/avanzado` | hecho |
| Quick y externo | `filtros/quick`, `isExternalFilterPresent` | hecho |
| Seleccion de filas y celdas | `edicion/seleccion-filas`, `edicion/rangos`, `edicion/relleno` | hecho |
| Edicion, editores, validacion, lote, deshacer | `edicion/*` | hecho |
| Datos: transacciones y alta frecuencia | core + `filas/transacciones` | hecho |
| Overlays | `filtros/ui/pie-y-capas` | hecho |
| Teclado | `nucleo/interaccion` + `edicion/navegacion` | hecho |
| Touch | sin gestos propios | parcial |
| Accesibilidad | roles grid, aria-*, activedescendant | hecho |
| RTL | propiedades logicas en CSS | parcial: sin verificar |
| Grillas alineadas | `alignedGrids` | falta |
| Localizacion | `localeText`, `getLocaleText` | hecho |
| Agrupacion y agregacion | `filas/grupos` + pintado por columna | hecho |
| Formulas | `formula*` | falta: `iswc-spreadsheet` cubre ese caso |
| Pivote | `filas/pivote` | hecho |
| Tree data | `filas/ag-tree-data` | hecho |
| Master/detail | `filas` | hecho |
| Side bar, menus, status bar | `filtros/ui`, `nucleo/menus` | hecho |
| Toolbar de acceso rapido | toolbar propia | parcial |
| Modelos server-side, infinito, viewport | `filas/modelos-externos` | hecho |
| Exportar CSV y Excel | `filas/exportar-csv`, `filas/exportar-excel` | hecho |
| Importar Excel | `excel-import` | falta |
| Exportar PDF | `exportDataAsPdf` | falta |
| Imprimir | sin vista de impresion dedicada | falta |
| Estado de la grilla | `getState`, `setState`, persistencia en prefs | hecho |
| Sparklines | `celdas/spark`: SVG en linea con el motor de `iswc-sparkline` | hecho |
| Graficos integrados | `createRangeChart` y afines | falta |
| Cell text selection, clipboard | `edicion/portapapeles` | hecho |
| Herramientas de IA (toolkit, MCP) | fuera de alcance | falta |

## Grid Options

### Accesorios

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `toolbar` | mismo nombre | hecho |
| `statusBar` | mismo nombre | hecho |
| `sideBar` | mismo nombre | hecho |
| `getContextMenuItems` | mismo nombre | hecho |
| `suppressContextMenu` | mismo nombre | hecho |
| `preventDefaultOnContextMenu` | — | falta |
| `allowContextMenuWithControlKey` | mismo nombre | hecho |
| `getMainMenuItems` | mismo nombre | hecho |
| `getColumnMenuItems` | mismo nombre | hecho |
| `columnMenu` | mismo nombre | hecho |
| `suppressMenuHide` | — | falta |
| `popupParent` | — | falta |
| `postProcessPopup` | — | falta |

### Portapapeles

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `copyHeadersToClipboard` | mismo nombre | hecho |
| `copyGroupHeadersToClipboard` | — | falta |
| `clipboardDelimiter` | mismo nombre | hecho |
| `suppressCutToClipboard` | mismo nombre | hecho |
| `suppressLastEmptyLineOnPaste` | mismo nombre | hecho |
| `suppressClipboardPaste` | mismo nombre | hecho |
| `suppressClipboardApi` | — | falta |
| `processCellForClipboard` | mismo nombre | hecho |
| `processHeaderForClipboard` | mismo nombre | hecho |
| `processGroupHeaderForClipboard` | — | falta |
| `processCellFromClipboard` | mismo nombre | hecho |
| `sendToClipboard` | mismo nombre | hecho |
| `processDataFromClipboard` | mismo nombre | hecho |

### Definicion de columnas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `columnDefs` | mismo nombre | hecho |
| `autoGenerateColumnDefs` | — | falta |
| `processAutoGeneratedColumnDefs` | — | falta |
| `defaultColDef` | mismo nombre | hecho |
| `defaultColGroupDef` | — | falta |
| `columnTypes` | mismo nombre | hecho |
| `dataTypeDefinitions` | mismo nombre | hecho |
| `calculatedColumns` | — | falta |
| `columnHeaderEdit` | — | falta |
| `maintainColumnOrder` | — | falta |
| `enableStrictPivotColumnOrder` | — | falta |
| `suppressFieldDotNotation` | mismo nombre | hecho |

### Encabezados

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `headerHeight` | por token | parcial |
| `groupHeaderHeight` | mismo nombre | hecho |
| `floatingFiltersHeight` | mismo nombre | hecho |
| `pivotHeaderHeight` | — | falta |
| `pivotGroupHeaderHeight` | — | falta |
| `hidePaddedHeaderRows` | — | falta |

### Mover columnas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `suppressMovableColumns` | mismo nombre | hecho |
| `suppressMoveWhenColumnDragging` | — | falta |
| `suppressColumnMoveAnimation` | — | falta |
| `suppressDragLeaveHidesColumns` | — | falta |
| `allowDragFromColumnsToolPanel` | — | falta |

### Fijar y dimensionar columnas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `processUnpinnedColumns` | — | falta |
| `colResizeDefault` | — | falta |
| `autoSizeStrategy` | mismo nombre | hecho |
| `suppressAutoSize` | mismo nombre | hecho |
| `autoSizePadding` | — | falta |
| `skipHeaderOnAutoSize` | — | falta |
| `animateColumnResizing` | — | falta |

### Componentes

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `components` | registro por nombre; sin los 19 tipos | parcial |

### Edicion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `editType` | mismo nombre | hecho |
| `getFullRowEditValidationErrors` | mismo nombre | hecho |
| `invalidEditValueMode` | mismo nombre | hecho |
| `singleClickEdit` | mismo nombre | hecho |
| `suppressClickEdit` | mismo nombre | hecho |
| `stopEditingWhenCellsLoseFocus` | mismo nombre | hecho |
| `suppressStartEditOnTab` | — | falta |
| `enterNavigatesVertically` | mismo nombre | hecho |
| `enterNavigatesVerticallyAfterEdit` | mismo nombre | hecho |
| `enableCellEditingOnBackspace` | — | falta |
| `undoRedoCellEditing` | mismo nombre | hecho |
| `undoRedoCellEditingLimit` | mismo nombre | hecho |
| `readOnlyEdit` | mismo nombre | hecho |

### Exportacion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `defaultCsvExportParams` | mismo nombre | hecho |
| `suppressCsvExport` | mismo nombre | hecho |
| `defaultExcelExportParams` | mismo nombre | hecho |
| `suppressExcelExport` | mismo nombre | hecho |
| `defaultPdfExportParams` | — | falta |
| `suppressPdfExport` | — | falta |
| `excelStyles` | mismo nombre | hecho |

### Filtrado

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `quickFilterText` | mismo nombre | hecho |
| `cacheQuickFilter` | mismo nombre | hecho |
| `includeHiddenColumnsInQuickFilter` | mismo nombre | hecho |
| `quickFilterParser` | mismo nombre | hecho |
| `quickFilterMatcher` | mismo nombre | hecho |
| `applyQuickFilterBeforePivotOrAgg` | — | falta |
| `isExternalFilterPresent` | mismo nombre | hecho |
| `doesExternalFilterPass` | mismo nombre | hecho |
| `excludeChildrenWhenTreeDataFiltering` | mismo nombre | hecho |
| `suppressSetFilterByDefault` | — | falta |
| `enableAdvancedFilter` | mismo nombre | hecho |
| `includeHiddenColumnsInAdvancedFilter` | — | falta |
| `advancedFilterParent` | — | falta |
| `advancedFilterBuilderParams` | — | falta |
| `advancedFilterParams` | — | falta |
| `alwaysPassFilter` | — | falta |
| `enableFilterHandlers` | — | falta |
| `filterHandlers` | — | falta |

### Buscar

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `findSearchValue` | — | falta |
| `findOptions` | — | falta |

### Formulas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `formulaDataSource` | — | falta |
| `formulaFuncs` | — | falta |

### Graficos integrados

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `enableCharts` | — | falta |
| `includeHiddenColumnsInCharts` | — | falta |
| `getChartToolbarItems` | — | falta |
| `createChartContainer` | — | falta |
| `chartThemes` | — | falta |
| `customChartThemes` | — | falta |
| `chartThemeOverrides` | — | falta |
| `chartToolPanelsDef` | — | falta |
| `chartMenuItems` | — | falta |

### Teclado

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `focusGridInnerElement` | — | falta |
| `navigateToNextHeader` | — | falta |
| `tabToNextHeader` | — | falta |
| `navigateToNextCell` | mismo nombre | hecho |
| `tabToNextCell` | mismo nombre | hecho |
| `tabToNextGridContainer` | — | falta |

### Celdas de carga

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `loadingCellRenderer` | — | falta |
| `loadingCellRendererParams` | — | falta |
| `loadingCellRendererSelector` | — | falta |

### Localizacion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `localeText` | mismo nombre | hecho |
| `getLocaleText` | mismo nombre | hecho |

### Master/detail

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `masterDetail` | mismo nombre | hecho |
| `isRowMaster` | mismo nombre | hecho |
| `masterDefaultExpanded` | mismo nombre | hecho |
| `isMasterOpenByDefault` | mismo nombre | hecho |
| `detailCellRenderer` | mismo nombre | hecho |
| `detailCellRendererParams` | mismo nombre | hecho |
| `detailRowHeight` | mismo nombre | hecho |
| `detailRowAutoHeight` | mismo nombre | hecho |
| `keepDetailRows` | mismo nombre | hecho |
| `keepDetailRowsCount` | mismo nombre | hecho |

### Miscelanea

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `initialState` | mismo nombre | hecho |
| `alignedGrids` | — | falta |
| `context` | mismo nombre | hecho |
| `tabIndex` | mismo nombre | hecho |
| `suppressInputClearButton` | — | falta |
| `enableInputAutoComplete` | — | falta |
| `rowBuffer` | mismo nombre | hecho |
| `rowNumbers` | mismo nombre | hecho |
| `valueCache` | — | falta |
| `valueCacheNeverExpires` | — | falta |
| `enableCellExpressions` | — | falta |
| `getDocument` | — | falta |
| `suppressTouch` | — | falta |
| `suppressFocusAfterRefresh` | — | falta |
| `suppressChangeDetection` | — | falta |
| `debug` | — | falta |

### Notas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `notesDataSource` | — | falta |
| `noteTrigger` | — | falta |
| `noteShowDelay` | — | falta |
| `noteHideDelay` | — | falta |

### Overlays

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `loading` | mismo nombre | hecho |
| `loadingRows` | — | falta |
| `overlayComponent` | — | falta |
| `overlayComponentParams` | — | falta |
| `overlayComponentSelector` | — | falta |
| `suppressOverlays` | — | falta |
| `activeOverlay` | — | falta |
| `activeOverlayParams` | — | falta |
| `overlayLoadingTemplate` | mismo nombre | hecho |
| `loadingOverlayComponent` | — | falta |
| `loadingOverlayComponentParams` | — | falta |
| `suppressNoRowsOverlay` | mismo nombre | hecho |
| `overlayNoRowsTemplate` | mismo nombre | hecho |
| `noRowsOverlayComponent` | — | falta |
| `noRowsOverlayComponentParams` | — | falta |
| `processFileInput` | — | falta |

### Paginacion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `pagination` | mismo nombre | hecho |
| `paginationPageSize` | mismo nombre | hecho |
| `paginationPageSizeSelector` | — | falta |
| `paginationPanels` | — | falta |
| `paginationNumberFormatter` | — | falta |
| `paginationAutoPageSize` | — | falta |
| `paginateChildRows` | — | falta |
| `suppressPaginationPanel` | — | falta |

### Render

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `animateRows` | mismo nombre | hecho |
| `cellFlashDuration` | mismo nombre | hecho |
| `cellFadeDuration` | mismo nombre | hecho |
| `allowShowChangeAfterFilter` | — | falta |
| `domLayout` | autoHeight sin imprimir | parcial |
| `ensureDomOrder` | — | falta |
| `getBusinessKeyForNode` | — | falta |
| `gridId` | — | falta |
| `processRowPostCreate` | — | falta |
| `enableRtl` | el CSS usa propiedades logicas; sin verificacion completa | parcial |
| `suppressColumnVirtualisation` | sin efecto si la opcion no se lee | parcial |
| `suppressRowVirtualisation` | — | falta |
| `suppressMaxRenderedRowRestriction` | — | falta |
| `enableCellSpan` | — | falta |
| `suppressRowTransform` | — | falta |
| `enableContentVisibilityAuto` | — | falta |
| `contentVisibilityAutoDelay` | — | falta |

### Agregacion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `aggFuncs` | mismo nombre | hecho |
| `groupTotalRow` | mismo nombre | hecho |
| `grandTotalRow` | mismo nombre | hecho |
| `suppressAggFuncInHeader` | — | falta |
| `aggregateOnlyChangedColumns` | — | falta |
| `suppressAggFilteredOnly` | mismo nombre | hecho |
| `groupAggFiltering` | mismo nombre | hecho |
| `groupSuppressBlankHeader` | — | falta |
| `suppressStickyTotalRow` | — | falta |
| `alwaysAggregateAtRootLevel` | — | falta |
| `getGroupRowAgg` | mismo nombre | hecho |

### Arrastre de filas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `rowDragManaged` | mismo nombre | hecho |
| `rowDragEntireRow` | mismo nombre | hecho |
| `rowDragMultiRow` | mismo nombre | hecho |
| `suppressRowDrag` | mismo nombre | hecho |
| `suppressMoveWhenRowDragging` | mismo nombre | hecho |
| `rowDragText` | mismo nombre | hecho |
| `dragAndDropImageComponent` | — | falta |
| `dragAndDropImageComponentParams` | — | falta |
| `rowDragInsertDelay` | — | falta |
| `isRowValidDropPosition` | — | falta |

### Filas de ancho completo

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `fullWidthCellRenderer` | — | falta |
| `fullWidthCellRendererParams` | — | falta |
| `embedFullWidthRows` | — | falta |
| `isFullWidthRow` | — | falta |

### Agrupacion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `groupDisplayType` | — | falta |
| `autoGroupColumnDef` | — | falta |
| `groupRowRenderer` | — | falta |
| `groupRowRendererParams` | — | falta |
| `showOpenedGroup` | — | falta |
| `groupHideOpenParents` | mismo nombre | hecho |
| `groupHideColumnsUntilExpanded` | — | falta |
| `groupHideParentOfSingleChild` | mismo nombre | hecho |
| `initialGroupOrderComparator` | mismo nombre | hecho |
| `groupAllowUnbalanced` | mismo nombre | hecho |
| `groupMaintainOrder` | — | falta |
| `groupDefaultExpanded` | mismo nombre | hecho |
| `isGroupOpenByDefault` | mismo nombre | hecho |
| `suppressGroupRowsSticky` | — | falta |
| `stickyRowsMaxViewportRatio` | — | falta |
| `rowGroupPanelShow` | mismo nombre | hecho |
| `rowGroupPanelSuppressSort` | — | falta |
| `pivotPanelSuppressSort` | — | falta |
| `groupLockGroupColumns` | — | falta |
| `groupHierarchyConfig` | — | falta |
| `suppressGroupChangesColumnVisibility` | — | falta |
| `ssrmExpandAllAffectsAllRows` | — | falta |
| `refreshAfterGroupEdit` | — | falta |

### Fijar filas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `enableRowPinning` | mismo nombre | hecho |
| `isRowPinnable` | mismo nombre | hecho |
| `isRowPinned` | mismo nombre | hecho |
| `pinnedTopRowData` | mismo nombre | hecho |
| `pinnedBottomRowData` | mismo nombre | hecho |

### Pivote

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `pivotMode` | mismo nombre | hecho |
| `pivotPanelShow` | mismo nombre | hecho |
| `pivotDefaultExpanded` | — | falta |
| `pivotRowTotals` | mismo nombre | hecho |
| `pivotColumnGroupTotals` | mismo nombre | hecho |
| `pivotSuppressAutoColumn` | — | falta |
| `pivotMaxGeneratedColumns` | mismo nombre | hecho |
| `processPivotResultColDef` | mismo nombre | hecho |
| `processPivotResultColGroupDef` | mismo nombre | hecho |
| `suppressExpandablePivotGroups` | — | falta |
| `functionsReadOnly` | — | falta |
| `removePivotHeaderRowWhenSingleValueColumn` | mismo nombre | hecho |

### Modelos de filas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `rowModelType` | viewport basico | parcial |
| `getRowId` | mismo nombre | hecho |
| `rowData` | mismo nombre | hecho |
| `resetRowDataOnUpdate` | — | falta |
| `asyncTransactionWaitMillis` | mismo nombre | hecho |
| `suppressModelUpdateAfterUpdateTransaction` | — | falta |
| `datasource` | mismo nombre | hecho |
| `cacheOverflowSize` | mismo nombre | hecho |
| `maxConcurrentDatasourceRequests` | mismo nombre | hecho |
| `cacheBlockSize` | mismo nombre | hecho |
| `maxBlocksInCache` | mismo nombre | hecho |
| `infiniteInitialRowCount` | mismo nombre | hecho |
| `serverSideDatasource` | mismo nombre | hecho |
| `blockLoadDebounceMillis` | mismo nombre | hecho |
| `suppressServerSideFullWidthLoadingRow` | — | falta |
| `purgeClosedRowNodes` | mismo nombre | hecho |
| `serverSidePivotResultFieldSeparator` | — | falta |
| `serverSideSortAllLevels` | — | falta |
| `serverSideEnableClientSideSort` | — | falta |
| `serverSideOnlyRefreshFilteredGroups` | — | falta |
| `serverSideInitialRowCount` | mismo nombre | hecho |
| `getChildCount` | mismo nombre | hecho |
| `getServerSideGroupLevelParams` | — | falta |
| `isServerSideGroupOpenByDefault` | mismo nombre | hecho |
| `isApplyServerSideTransaction` | — | falta |
| `isServerSideGroup` | mismo nombre | hecho |
| `getServerSideGroupKey` | mismo nombre | hecho |
| `viewportDatasource` | mismo nombre | hecho |
| `viewportRowModelPageSize` | mismo nombre | hecho |
| `viewportRowModelBufferSize` | mismo nombre | hecho |

### Scroll

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `alwaysShowHorizontalScroll` | — | falta |
| `alwaysShowVerticalScroll` | — | falta |
| `debounceVerticalScrollbar` | — | falta |
| `suppressHorizontalScroll` | — | falta |
| `suppressScrollOnNewData` | — | falta |
| `suppressScrollWhenPopupsAreOpen` | — | falta |
| `suppressAnimationFrame` | — | falta |
| `suppressMiddleClickScrolls` | — | falta |
| `suppressPreventDefaultOnMouseWheel` | — | falta |
| `scrollbarWidth` | — | falta |

### Seleccion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `cellSelection` | mismo nombre | hecho |
| `rowSelection` | modos, `isRowSelectable` y `hideDisabledCheckboxes` | hecho |
| `selectionColumnDef` | — | falta |
| `suppressCellFocus` | — | falta |
| `suppressHeaderFocus` | — | falta |
| `enableCellTextSelection` | mismo nombre | hecho |

### Orden

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `accentedSort` | mismo nombre | hecho |
| `suppressMultiSort` | mismo nombre | hecho |
| `alwaysMultiSort` | mismo nombre | hecho |
| `multiSortKey` | mismo nombre | hecho |
| `suppressMaintainUnsortedOrder` | — | falta |
| `postSortRows` | mismo nombre | hecho |
| `deltaSort` | — | falta |

### Estilo

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `icons` | iswc-icon por nombre | parcial |
| `rowHeight` | unidades u (1/16em) | parcial |
| `getRowHeight` | mismo nombre | hecho |
| `rowStyle` | mismo nombre | hecho |
| `getRowStyle` | mismo nombre | hecho |
| `rowClass` | mismo nombre | hecho |
| `getRowClass` | mismo nombre | hecho |
| `rowClassRules` | mismo nombre | hecho |
| `suppressRowHoverHighlight` | mismo nombre | hecho |
| `columnHoverHighlight` | mismo nombre | hecho |

### Tema

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `theme` | tokens y presets propios; el objeto de tema de AG se acepta solo con parametros mapeados | parcial |
| `loadThemeGoogleFonts` | — | falta |
| `themeStyleContainer` | — | falta |
| `themeCssLayer` | — | falta |
| `styleNonce` | — | falta |

### Tooltips

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `enableBrowserTooltips` | mismo nombre | hecho |
| `tooltipShowDelay` | mismo nombre | hecho |
| `tooltipSwitchShowDelay` | mismo nombre | hecho |
| `tooltipHideDelay` | mismo nombre | hecho |
| `tooltipMouseTrack` | mismo nombre | hecho |
| `tooltipShowMode` | mismo nombre | hecho |
| `tooltipTrigger` | mismo nombre | hecho |
| `tooltipInteraction` | mismo nombre | hecho |

### Tree data

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `treeData` | mismo nombre | hecho |
| `getDataPath` | mismo nombre | hecho |
| `treeDataChildrenField` | mismo nombre | hecho |
| `treeDataParentIdField` | mismo nombre | hecho |
| `treeDataDisplayType` | — | falta |

## Grid API

### Accesorios

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `showColumnChooser` | mismo nombre | hecho |
| `showColumnFilter` | mismo nombre | hecho |
| `hideColumnFilter` | mismo nombre | hecho |
| `showColumnMenu` | mismo nombre | hecho |
| `showContextMenu` | mismo nombre | hecho |
| `hidePopupMenu` | mismo nombre | hecho |
| `hideColumnChooser` | mismo nombre | hecho |
| `getSideBar` | mismo nombre | hecho |
| `setSideBarVisible` | mismo nombre | hecho |
| `isSideBarVisible` | mismo nombre | hecho |
| `setSideBarPosition` | mismo nombre | hecho |
| `openToolPanel` | mismo nombre | hecho |
| `closeToolPanel` | mismo nombre | hecho |
| `getOpenedToolPanel` | mismo nombre | hecho |
| `isToolPanelShowing` | mismo nombre | hecho |
| `refreshToolPanel` | mismo nombre | hecho |
| `getToolPanelInstance` | mismo nombre | hecho |
| `getToolbarItemInstance` | — | falta |
| `getStatusPanel` | mismo nombre | hecho |

### Portapapeles

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `cutToClipboard` | mismo nombre | hecho |
| `copyToClipboard` | mismo nombre | hecho |
| `copySelectedRangeToClipboard` | mismo nombre | hecho |
| `copySelectedRangeDown` | — | falta |
| `copySelectedRowsToClipboard` | mismo nombre | hecho |
| `pasteFromClipboard` | mismo nombre | hecho |

### Columnas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `getColumnDefs` | mismo nombre | hecho |
| `getColumn` | mismo nombre | hecho |
| `getColumns` | mismo nombre | hecho |
| `getAllGridColumns` | mismo nombre | hecho |
| `setColumnsVisible` | mismo nombre | hecho |
| `getDisplayNameForColumn` | mismo nombre | hecho |
| `getDisplayedColAfter` | mismo nombre | hecho |
| `getDisplayedColBefore` | mismo nombre | hecho |
| `getAllDisplayedVirtualColumns` | mismo nombre | hecho |
| `getAllDisplayedColumns` | mismo nombre | hecho |
| `getDisplayedCenterColumns` | mismo nombre | hecho |
| `getDisplayedLeftColumns` | mismo nombre | hecho |
| `getDisplayedRightColumns` | mismo nombre | hecho |
| `isColumnHovered` | — | falta |
| `moveColumns` | mismo nombre | hecho |
| `moveColumnByIndex` | mismo nombre | hecho |
| `isPinning` | mismo nombre | hecho |
| `isPinningLeft` | mismo nombre | hecho |
| `isPinningRight` | mismo nombre | hecho |
| `setColumnsPinned` | mismo nombre | hecho |
| `setColumnWidths` | mismo nombre | hecho |
| `sizeColumnsToFit` | mismo nombre | hecho |
| `autoSizeColumns` | mismo nombre | hecho |
| `autoSizeAllColumns` | mismo nombre | hecho |
| `getColumnState` | mismo nombre | hecho |
| `applyColumnState` | mismo nombre | hecho |
| `resetColumnState` | mismo nombre | hecho |
| `getColumnGroupState` | mismo nombre | hecho |
| `setColumnGroupState` | mismo nombre | hecho |
| `resetColumnGroupState` | mismo nombre | hecho |

### Grupos de columnas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `getColumnGroup` | mismo nombre | hecho |
| `getProvidedColumnGroup` | mismo nombre | hecho |
| `setColumnGroupOpened` | mismo nombre | hecho |
| `getDisplayNameForColumnGroup` | mismo nombre | hecho |
| `getAllDisplayedColumnGroups` | mismo nombre | hecho |
| `getCenterDisplayedColumnGroups` | mismo nombre | hecho |
| `getLeftDisplayedColumnGroups` | mismo nombre | hecho |
| `getRightDisplayedColumnGroups` | mismo nombre | hecho |

### Edicion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `startEditingCell` | mismo nombre | hecho |
| `stopEditing` | mismo nombre | hecho |
| `isEditing` | mismo nombre | hecho |
| `getEditingCells` | mismo nombre | hecho |
| `getEditRowValues` | mismo nombre | hecho |
| `getCellEditorInstances` | mismo nombre | hecho |
| `validateEdit` | — | falta |
| `getEditValidationErrors` | — | falta |
| `startBatchEdit` | mismo nombre | hecho |
| `commitBatchEdit` | mismo nombre | hecho |
| `cancelBatchEdit` | mismo nombre | hecho |
| `isBatchEditing` | mismo nombre | hecho |
| `undoCellEditing` | mismo nombre | hecho |
| `redoCellEditing` | mismo nombre | hecho |
| `getCurrentUndoSize` | mismo nombre | hecho |
| `getCurrentRedoSize` | mismo nombre | hecho |

### Eventos

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `addEventListener` | mismo nombre | hecho |
| `removeEventListener` | mismo nombre | hecho |
| `addGlobalListener` | mismo nombre | hecho |
| `removeGlobalListener` | — | falta |
| `addRenderedRowListener` | — | falta |

### Exportacion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `exportDataAsCsv` | mismo nombre | hecho |
| `getDataAsCsv` | mismo nombre | hecho |
| `exportDataAsExcel` | mismo nombre | hecho |
| `getDataAsExcel` | mismo nombre | hecho |
| `getSheetDataForExcel` | mismo nombre | hecho |
| `exportMultipleSheetsAsExcel` | mismo nombre | hecho |
| `getMultipleSheetsAsExcel` | mismo nombre | hecho |
| `exportDataAsPdf` | mismo nombre | hecho |
| `getDataAsPdf` | — | falta |

### Filtrado

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `getQuickFilter` | mismo nombre | hecho |
| `resetQuickFilter` | mismo nombre | hecho |
| `isQuickFilterPresent` | mismo nombre | hecho |
| `isColumnFilterPresent` | mismo nombre | hecho |
| `isAnyFilterPresent` | mismo nombre | hecho |
| `getColumnFilterInstance` | mismo nombre | hecho |
| `getColumnFilterHandler` | — | falta |
| `getFilterModel` | mismo nombre | hecho |
| `setFilterModel` | mismo nombre | hecho |
| `getColumnFilterModel` | mismo nombre | hecho |
| `setColumnFilterModel` | mismo nombre | hecho |
| `onFilterChanged` | mismo nombre | hecho |
| `destroyFilter` | mismo nombre | hecho |
| `doFilterAction` | — | falta |
| `getAdvancedFilterModel` | mismo nombre | hecho |
| `setAdvancedFilterModel` | mismo nombre | hecho |
| `showAdvancedFilterBuilder` | mismo nombre | hecho |
| `hideAdvancedFilterBuilder` | mismo nombre | hecho |

### Buscar

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `findNext` | — | falta |
| `findPrevious` | — | falta |
| `findGetTotalMatches` | — | falta |
| `findGoTo` | — | falta |
| `findClearActive` | — | falta |
| `findGetActiveMatch` | — | falta |
| `findGetNumMatches` | — | falta |
| `findGetParts` | — | falta |
| `findRefresh` | — | falta |

### Opciones y estado

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `getGridOption` | mismo nombre | hecho |
| `setGridOption` | mismo nombre | hecho |
| `updateGridOptions` | mismo nombre | hecho |
| `getState` | mismo nombre | hecho |
| `setState` | mismo nombre | hecho |

### Graficos integrados

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `createRangeChart` | — | falta |
| `createPivotChart` | — | falta |
| `createCrossFilterChart` | — | falta |
| `updateChart` | — | falta |
| `getChartRef` | — | falta |
| `getChartModels` | — | falta |
| `restoreChart` | — | falta |
| `getChartImageDataURL` | — | falta |
| `downloadChart` | — | falta |
| `openChartToolPanel` | — | falta |
| `closeChartToolPanel` | — | falta |

### Teclado

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `getFocusedCell` | mismo nombre | hecho |
| `setFocusedCell` | mismo nombre | hecho |
| `clearFocusedCell` | mismo nombre | hecho |
| `tabToNextCell` | mismo nombre | hecho |
| `tabToPreviousCell` | mismo nombre | hecho |
| `setFocusedHeader` | mismo nombre | hecho |

### Master/detail

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `getDetailGridInfo` | mismo nombre | hecho |
| `forEachDetailGridInfo` | mismo nombre | hecho |
| `addDetailGridInfo` | mismo nombre | hecho |
| `removeDetailGridInfo` | mismo nombre | hecho |

### Miscelanea

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `getCellValue` | mismo nombre | hecho |
| `expireValueCache` | mismo nombre | hecho |
| `destroy` | mismo nombre | hecho |
| `isDestroyed` | mismo nombre | hecho |
| `setGridAriaProperty` | mismo nombre | hecho |
| `getGridId` | mismo nombre | hecho |
| `getGridElement` | mismo nombre | hecho |
| `isModuleRegistered` | mismo nombre | hecho |
| `isAnimationFrameQueueEmpty` | mismo nombre | hecho |
| `getNote` | — | falta |
| `setNote` | — | falta |
| `refreshNotes` | — | falta |

### Overlays

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `showNoRowsOverlay` | mismo nombre | hecho |
| `hideOverlay` | mismo nombre | hecho |

### Paginacion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `paginationIsLastPageFound` | mismo nombre | hecho |
| `paginationGetPageSize` | mismo nombre | hecho |
| `paginationGetCurrentPage` | mismo nombre | hecho |
| `paginationGetTotalPages` | mismo nombre | hecho |
| `paginationGetRowCount` | mismo nombre | hecho |
| `paginationGoToPage` | mismo nombre | hecho |
| `paginationGoToNextPage` | mismo nombre | hecho |
| `paginationGoToPreviousPage` | mismo nombre | hecho |
| `paginationGoToFirstPage` | mismo nombre | hecho |
| `paginationGoToLastPage` | mismo nombre | hecho |

### Refresco y render

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `refreshCells` | mismo nombre | hecho |
| `redrawRows` | mismo nombre | hecho |
| `refreshHeader` | mismo nombre | hecho |
| `refreshFormulas` | — | falta |
| `flashCells` | mismo nombre | hecho |
| `getRenderedNodes` | mismo nombre | hecho |
| `getCellRendererInstances` | mismo nombre | hecho |
| `getSizesForCurrentTheme` | mismo nombre | hecho |
| `resetRowHeights` | mismo nombre | hecho |
| `onRowHeightChanged` | mismo nombre | hecho |

### Agregacion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `getValueColumns` | mismo nombre | hecho |
| `addValueColumns` | mismo nombre | hecho |
| `removeValueColumns` | mismo nombre | hecho |
| `setValueColumns` | mismo nombre | hecho |
| `setColumnAggFunc` | mismo nombre | hecho |
| `addAggFuncs` | mismo nombre | hecho |
| `clearAggFuncs` | mismo nombre | hecho |

### Filas mostradas y nodos

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `getDisplayedRowAtIndex` | mismo nombre | hecho |
| `getDisplayedRowCount` | mismo nombre | hecho |
| `getFirstDisplayedRowIndex` | mismo nombre | hecho |
| `getLastDisplayedRowIndex` | mismo nombre | hecho |
| `getRowNode` | mismo nombre | hecho |
| `forEachNode` | mismo nombre | hecho |
| `forEachNodeAfterFilter` | mismo nombre | hecho |
| `forEachNodeAfterFilterAndSort` | mismo nombre | hecho |
| `forEachLeafNode` | mismo nombre | hecho |

### Arrastre de filas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `addRowDropZone` | — | falta |
| `removeRowDropZone` | — | falta |
| `getRowDropZoneParams` | — | falta |
| `setRowDropPositionIndicator` | — | falta |
| `getRowDropPositionIndicator` | — | falta |

### Expandir y agrupar

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `expandAll` | mismo nombre | hecho |
| `collapseAll` | mismo nombre | hecho |
| `resetRowGroupExpansion` | mismo nombre | hecho |
| `setRowNodeExpanded` | mismo nombre | hecho |
| `onGroupExpandedOrCollapsed` | mismo nombre | hecho |
| `getRowGroupColumns` | mismo nombre | hecho |
| `setRowGroupColumns` | mismo nombre | hecho |
| `addRowGroupColumns` | mismo nombre | hecho |
| `removeRowGroupColumns` | mismo nombre | hecho |
| `moveRowGroupColumn` | mismo nombre | hecho |

### Fijar filas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `getPinnedTopRowCount` | mismo nombre | hecho |
| `getPinnedBottomRowCount` | mismo nombre | hecho |
| `getPinnedTopRow` | mismo nombre | hecho |
| `getPinnedBottomRow` | mismo nombre | hecho |
| `forEachPinnedRow` | — | falta |

### Pivote

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `isPivotMode` | mismo nombre | hecho |
| `getPivotColumns` | mismo nombre | hecho |
| `setPivotColumns` | mismo nombre | hecho |
| `addPivotColumns` | mismo nombre | hecho |
| `removePivotColumns` | mismo nombre | hecho |
| `getPivotResultColumn` | mismo nombre | hecho |
| `setPivotResultColumns` | mismo nombre | hecho |
| `getPivotResultColumns` | mismo nombre | hecho |

### Modelos de filas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `applyTransaction` | mismo nombre | hecho |
| `applyTransactionAsync` | mismo nombre | hecho |
| `flushAsyncTransactions` | mismo nombre | hecho |
| `refreshClientSideRowModel` | mismo nombre | hecho |
| `isRowDataEmpty` | mismo nombre | hecho |
| `refreshInfiniteCache` | mismo nombre | hecho |
| `purgeInfiniteCache` | mismo nombre | hecho |
| `isLastRowIndexKnown` | mismo nombre | hecho |
| `setRowCount` | mismo nombre | hecho |
| `getCacheBlockState` | mismo nombre | hecho |
| `refreshServerSide` | mismo nombre | hecho |
| `getServerSideGroupLevelState` | mismo nombre | hecho |
| `retryServerSideLoads` | mismo nombre | hecho |
| `applyServerSideTransaction` | mismo nombre | hecho |
| `applyServerSideTransactionAsync` | mismo nombre | hecho |
| `applyServerSideRowData` | mismo nombre | hecho |
| `getServerSideSelectionState` | — | falta |
| `setServerSideSelectionState` | — | falta |

### Scroll

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `ensureIndexVisible` | mismo nombre | hecho |
| `ensureNodeVisible` | mismo nombre | hecho |
| `ensureColumnVisible` | mismo nombre | hecho |
| `getHorizontalPixelRange` | mismo nombre | hecho |
| `getVerticalPixelRange` | mismo nombre | hecho |

### Seleccion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `selectAll` | mismo nombre | hecho |
| `deselectAll` | mismo nombre | hecho |
| `getSelectedNodes` | mismo nombre | hecho |
| `getSelectedRows` | mismo nombre | hecho |
| `setNodesSelected` | mismo nombre | hecho |
| `getBestCostNodeSelection` | — | falta |
| `getCellRanges` | mismo nombre | hecho |
| `addCellRange` | mismo nombre | hecho |
| `clearCellSelection` | mismo nombre | hecho |
| `onSortChanged` | mismo nombre | hecho |

## Eventos

### Accesorios

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `toolPanelVisibleChanged` | mismo nombre | hecho |
| `toolPanelSizeChanged` | mismo nombre | hecho |
| `columnMenuVisibleChanged` | mismo nombre | hecho |
| `contextMenuVisibleChanged` | — | falta |

### Portapapeles

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `cutStart` | mismo nombre | hecho |
| `cutEnd` | mismo nombre | hecho |
| `pasteStart` | mismo nombre | hecho |
| `pasteEnd` | mismo nombre | hecho |

### Columnas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `columnVisible` | mismo nombre | hecho |
| `columnPinned` | mismo nombre | hecho |
| `columnHeaderNameChanged` | — | falta |
| `columnResized` | mismo nombre | hecho |
| `columnMoved` | mismo nombre | hecho |
| `columnValueChanged` | mismo nombre | hecho |
| `columnPivotModeChanged` | mismo nombre | hecho |
| `columnPivotChanged` | mismo nombre | hecho |
| `columnGroupOpened` | mismo nombre | hecho |
| `newColumnsLoaded` | mismo nombre | hecho |
| `gridColumnsChanged` | — | falta |
| `displayedColumnsChanged` | — | falta |
| `virtualColumnsChanged` | — | falta |
| `columnHeaderMouseOver` | mismo nombre | hecho |
| `columnHeaderMouseLeave` | mismo nombre | hecho |
| `columnHeaderClicked` | mismo nombre | hecho |
| `columnHeaderContextMenu` | mismo nombre | hecho |
| `pivotMaxColumnsExceeded` | mismo nombre | hecho |
| `columnsReset` | — | falta |

### Arrastre

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `dragStarted` | — | falta |
| `dragStopped` | — | falta |
| `dragCancelled` | — | falta |
| `rowDragEnter` | mismo nombre | hecho |
| `rowDragMove` | mismo nombre | hecho |
| `rowDragLeave` | mismo nombre | hecho |
| `rowDragEnd` | mismo nombre | hecho |
| `rowDragCancel` | mismo nombre | hecho |

### Edicion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `cellValueChanged` | mismo nombre | hecho |
| `cellEditRequest` | mismo nombre | hecho |
| `rowValueChanged` | mismo nombre | hecho |
| `cellEditingStarted` | mismo nombre | hecho |
| `cellEditingStopped` | mismo nombre | hecho |
| `rowEditingStarted` | mismo nombre | hecho |
| `rowEditingStopped` | mismo nombre | hecho |
| `batchEditingStarted` | mismo nombre | hecho |
| `batchEditingStopped` | mismo nombre | hecho |
| `undoStarted` | mismo nombre | hecho |
| `undoEnded` | mismo nombre | hecho |
| `redoStarted` | mismo nombre | hecho |
| `redoEnded` | mismo nombre | hecho |
| `cellSelectionDeleteStart` | mismo nombre | hecho |
| `cellSelectionDeleteEnd` | mismo nombre | hecho |

### Filtrado

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `filterOpened` | mismo nombre | hecho |
| `filterChanged` | mismo nombre | hecho |
| `filterModified` | mismo nombre | hecho |
| `filterUiChanged` | — | falta |
| `floatingFilterUiChanged` | — | falta |
| `advancedFilterBuilderVisibleChanged` | — | falta |

### Ciclo de vida

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `gridReady` | mismo nombre | hecho |
| `gridPreDestroyed` | mismo nombre | hecho |
| `firstDataRendered` | mismo nombre | hecho |
| `modelUpdated` | mismo nombre | hecho |
| `stateUpdated` | mismo nombre | hecho |

### Graficos

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `chartCreated` | — | falta |
| `chartRangeSelectionChanged` | — | falta |
| `chartOptionsChanged` | — | falta |
| `chartDestroyed` | — | falta |

### Celdas y seleccion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `cellKeyDown` | mismo nombre | hecho |
| `paginationChanged` | mismo nombre | hecho |
| `headerFocused` | mismo nombre | hecho |
| `cellClicked` | mismo nombre | hecho |
| `cellDoubleClicked` | mismo nombre | hecho |
| `cellFocused` | mismo nombre | hecho |
| `cellMouseOver` | mismo nombre | hecho |
| `cellMouseOut` | mismo nombre | hecho |
| `cellMouseDown` | — | falta |
| `rowClicked` | mismo nombre | hecho |
| `rowDoubleClicked` | mismo nombre | hecho |
| `rowSelected` | mismo nombre | hecho |
| `selectionChanged` | mismo nombre | hecho |
| `cellContextMenu` | mismo nombre | hecho |
| `cellSelectionChanged` | mismo nombre | hecho |
| `fillStart` | mismo nombre | hecho |
| `fillEnd` | mismo nombre | hecho |
| `sortChanged` | mismo nombre | hecho |
| `tooltipShow` | mismo nombre | hecho |
| `tooltipHide` | mismo nombre | hecho |

### Filas

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `columnRowGroupChanged` | mismo nombre | hecho |
| `rowGroupOpened` | mismo nombre | hecho |
| `expandOrCollapseAll` | mismo nombre | hecho |
| `pinnedRowDataChanged` | — | falta |
| `pinnedRowsChanged` | mismo nombre | hecho |
| `rowResizeStarted` | — | falta |
| `rowResizeEnded` | — | falta |
| `rowDataUpdated` | mismo nombre | hecho |
| `asyncTransactionsFlushed` | mismo nombre | hecho |
| `storeRefreshed` | mismo nombre | hecho |

### Vista

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `gridSizeChanged` | mismo nombre | hecho |
| `virtualRowRemoved` | — | falta |
| `viewportChanged` | — | falta |
| `bodyScroll` | mismo nombre | hecho |
| `bodyScrollEnd` | mismo nombre | hecho |

## Opciones de columna

### Base

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `field` | mismo nombre | hecho |
| `colId` | mismo nombre | hecho |
| `type` | mismo nombre | hecho |
| `cellDataType` | mismo nombre | hecho |
| `valueGetter` | mismo nombre | hecho |
| `valueFormatter` | mismo nombre | hecho |
| `refData` | mismo nombre | hecho |
| `keyCreator` | mismo nombre | hecho |
| `equals` | mismo nombre | hecho |
| `toolPanelClass` | — | falta |
| `suppressColumnsToolPanel` | mismo nombre | hecho |
| `columnGroupShow` | mismo nombre | hecho |
| `suppressNavigable` | mismo nombre | hecho |
| `suppressKeyboardEvent` | mismo nombre | hecho |
| `suppressPaste` | mismo nombre | hecho |
| `suppressFillHandle` | mismo nombre | hecho |
| `contextMenuItems` | mismo nombre | hecho |
| `cellAriaRole` | — | falta |

### Agregacion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `aggFunc` | mismo nombre | hecho |
| `initialAggFunc` | mismo nombre | hecho |
| `enableValue` | mismo nombre | hecho |
| `allowedAggFuncs` | mismo nombre | hecho |
| `defaultAggFunc` | mismo nombre | hecho |
| `showValuesAs` | — | falta |

### Visualizacion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `hide` | mismo nombre | hecho |
| `initialHide` | mismo nombre | hecho |
| `lockVisible` | — | falta |
| `lockPosition` | mismo nombre | hecho |
| `suppressMovable` | mismo nombre | hecho |
| `useValueFormatterForExport` | mismo nombre | hecho |

### Edicion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `editable` | mismo nombre | hecho |
| `valueSetter` | mismo nombre | hecho |
| `valueParser` | mismo nombre | hecho |
| `cellEditor` | mismo nombre | hecho |
| `cellEditorParams` | mismo nombre | hecho |
| `cellEditorSelector` | mismo nombre | hecho |
| `cellEditorPopup` | mismo nombre | hecho |
| `cellEditorPopupPosition` | — | falta |
| `singleClickEdit` | mismo nombre | hecho |
| `useValueParserForImport` | — | falta |
| `onCellValueChanged` | mismo nombre | hecho |
| `onCellClicked` | — | falta |
| `onCellDoubleClicked` | — | falta |
| `onCellContextMenu` | — | falta |

### Filtro

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `filter` | mismo nombre | hecho |
| `filterParams` | mismo nombre | hecho |
| `filterValueGetter` | mismo nombre | hecho |
| `getQuickFilterText` | mismo nombre | hecho |
| `floatingFilter` | mismo nombre | hecho |
| `floatingFilterComponent` | — | falta |
| `floatingFilterComponentParams` | — | falta |
| `suppressFiltersToolPanel` | mismo nombre | hecho |
| `dateComponent` | — | falta |

### Encabezado

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `headerName` | mismo nombre | hecho |
| `headerNameEditable` | — | falta |
| `headerValueGetter` | — | falta |
| `headerTooltip` | mismo nombre | hecho |
| `headerStyle` | — | falta |
| `headerClass` | mismo nombre | hecho |
| `headerComponent` | — | falta |
| `headerComponentParams` | — | falta |
| `wrapHeaderText` | mismo nombre | hecho |
| `autoHeaderHeight` | — | falta |
| `menuTabs` | — | falta |
| `mainMenuItems` | mismo nombre | hecho |
| `columnMenuItems` | mismo nombre | hecho |
| `suppressHeaderMenuButton` | mismo nombre | hecho |
| `suppressHeaderFilterButton` | mismo nombre | hecho |
| `suppressHeaderContextMenu` | — | falta |
| `suppressHeaderKeyboardEvent` | — | falta |
| `suppressFloatingFilterButton` | mismo nombre | hecho |

### Fijar

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `pinned` | mismo nombre | hecho |
| `initialPinned` | mismo nombre | hecho |
| `lockPinned` | — | falta |

### Pivote

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `pivot` | mismo nombre | hecho |
| `pivotIndex` | mismo nombre | hecho |
| `enablePivot` | mismo nombre | hecho |
| `pivotComparator` | mismo nombre | hecho |

### Render

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `cellStyle` | mismo nombre | hecho |
| `cellClass` | mismo nombre | hecho |
| `cellClassRules` | mismo nombre | hecho |
| `cellRenderer` | mismo nombre | hecho |
| `cellRendererParams` | mismo nombre | hecho |
| `cellRendererSelector` | mismo nombre | hecho |
| `autoHeight` | mismo nombre | hecho |
| `wrapText` | mismo nombre | hecho |
| `enableCellChangeFlash` | mismo nombre | hecho |

### Arrastre

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `rowDrag` | mismo nombre | hecho |
| `rowDragText` | mismo nombre | hecho |
| `dndSource` | — | falta |

### Agrupacion

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `rowGroup` | mismo nombre | hecho |
| `rowGroupIndex` | mismo nombre | hecho |
| `enableRowGroup` | mismo nombre | hecho |
| `showRowGroup` | — | falta |

### Orden

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `sortable` | mismo nombre | hecho |
| `sort` | mismo nombre | hecho |
| `initialSort` | mismo nombre | hecho |
| `sortIndex` | mismo nombre | hecho |
| `sortingOrder` | mismo nombre | hecho |
| `comparator` | mismo nombre | hecho |
| `unSortIcon` | — | falta |

### Span

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `colSpan` | mismo nombre | hecho |
| `spanRows` | — | falta |

### Tooltips

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `tooltip` | mismo nombre | hecho |
| `tooltipComponent` | mismo nombre | hecho |
| `tooltipComponentParams` | mismo nombre | hecho |

### Ancho

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `width` | mismo nombre | hecho |
| `initialWidth` | mismo nombre | hecho |
| `minWidth` | mismo nombre | hecho |
| `maxWidth` | mismo nombre | hecho |
| `flex` | mismo nombre | hecho |
| `initialFlex` | — | falta |
| `resizable` | mismo nombre | hecho |
| `suppressSizeToFit` | — | falta |
| `suppressAutoSize` | mismo nombre | hecho |

## IRowNode

### Propiedades y metodos

| AG Grid | iswc | Estado |
| --- | --- | --- |
| `id` | mismo nombre | hecho |
| `sourceRowIndex` | mismo nombre | hecho |
| `data` | mismo nombre | hecho |
| `updateData` | — | falta |
| `setData` | mismo nombre | hecho |
| `setDataValue` | mismo nombre | hecho |
| `getDataValue` | — | falta |
| `rowIndex` | mismo nombre | hecho |
| `rowTop` | — | falta |
| `displayed` | mismo nombre | hecho |
| `isHovered` | — | falta |
| `expanded` | mismo nombre | hecho |
| `isExpandable` | — | falta |
| `setExpanded` | mismo nombre | hecho |
| `group` | mismo nombre | hecho |
| `groupData` | — | falta |
| `aggData` | mismo nombre | hecho |
| `key` | mismo nombre | hecho |
| `field` | mismo nombre | hecho |
| `parent` | mismo nombre | hecho |
| `level` | mismo nombre | hecho |
| `allLeafChildren` | mismo nombre | hecho |
| `childrenAfterFilter` | — | falta |
| `childrenAfterSort` | — | falta |
| `allChildrenCount` | mismo nombre | hecho |
| `leafGroup` | — | falta |
| `rowHeight` | unidades u (1/16em) | parcial |
| `setRowHeight` | mismo nombre | hecho |
| `master` | mismo nombre | hecho |
| `detail` | mismo nombre | hecho |
| `rowPinned` | mismo nombre | hecho |
| `isRowPinned` | mismo nombre | hecho |
| `selectable` | mismo nombre | hecho |
| `setSelected` | mismo nombre | hecho |
| `isSelected` | mismo nombre | hecho |
| `stub` | — | falta |
| `failedLoad` | — | falta |
| `getRoute` | — | falta |
