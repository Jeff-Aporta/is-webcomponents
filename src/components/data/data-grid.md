---
tag: iswc-data-grid
tags:
  - iswc-data-grid
category: data
status: public
source: ./data-grid.ts
style: ./data-grid.css
preview: ./data-grid.json
---
# `<iswc-data-grid>`

## PropÃ³sito

Tabla de datos con la superficie de MUI X Data Grid: columnas tipadas, multi-orden, filtros con Y/O,
quick filter, paginaciÃ³n, selecciÃ³n de filas y de rangos de celdas, ediciÃ³n por celda o por fila,
agrupaciÃ³n con agregaciÃ³n, tree data, pivot, virtualizaciÃ³n y exportaciÃ³n.

Este mÃ³dulo registra `<iswc-data-grid>`.

## CuÃ¡ndo usarlo

PresentaciÃ³n, comparaciÃ³n, movimiento u organizaciÃ³n de datos estructurados.

## CuÃ¡ndo no usarlo

No reemplazar HTML semÃ¡ntico cuando contenido es estÃ¡tico y simple.

## ImportaciÃ³n

```js
import './data-grid.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-data-grid></iswc-data-grid>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `density` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `row-height` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `header-height` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `auto-height` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `page-size` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `page-size-options` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `pagination` | boolean | Fuente define default/restricciÃ³n. |
| `pagination-mode` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `row-count` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `sorting-mode` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `sorting-order` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `filter-mode` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `selection-mode` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `checkbox-selection` | boolean | Fuente define default/restricciÃ³n. |
| `cell-selection` | boolean | Fuente define default/restricciÃ³n. |
| `disable-row-selection-on-click` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disable-column-menu` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disable-column-filter` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disable-column-sort` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disable-column-resize` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disable-column-reorder` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disable-multiple-sorting` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `edit-mode` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `editable` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `show-toolbar` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `toolbar-tools` | boolean (`false` oculta Columnas/Filtros/Densidad/Exportar) | Default visible cuando hay toolbar. |
| `quick-filter` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `header-filters` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hide-footer` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hide-footer-selected-count` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `virtualize` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `overscan` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `loading` | boolean | Fuente define default/restricciÃ³n. |
| `loading-color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `list-view` | boolean | Fuente define default/restricciÃ³n. |
| `tree-data` | boolean | Fuente define default/restricciÃ³n. |
| `row-reorder` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `detail-height` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `tab-navigation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `clipboard` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `undo-redo` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `aggregation-position` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `selectable` | boolean | Fuente define default/restricciÃ³n. |
| `filterable` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `columns` | lectura/escritura | Declarada por clase. |
| `rows` | lectura/escritura | Declarada por clase. |
| `pinnedRows` | lectura/escritura | Declarada por clase. |
| `sortModel` | lectura/escritura | Declarada por clase. |
| `filterModel` | lectura/escritura | Declarada por clase. |
| `quickFilterValue` | lectura/escritura | Declarada por clase. |
| `columnVisibilityModel` | lectura/escritura | Declarada por clase. |
| `pinnedColumns` | lectura/escritura | Declarada por clase. |
| `columnOrder` | lectura/escritura | Declarada por clase. |
| `columnGroupingModel` | lectura/escritura | Declarada por clase. |
| `rowGroupingModel` | lectura/escritura | Declarada por clase. |
| `aggregationModel` | lectura/escritura | Declarada por clase. |
| `pivotModel` | lectura/escritura | Declarada por clase. |
| `listViewColumn` | lectura/escritura | Declarada por clase. |
| `paginationModel` | lectura/escritura | Declarada por clase. |
| `rowSelectionModel` | lectura/escritura | Declarada por clase. |
| `selectedRows` | lectura/escritura | Declarada por clase. |
| `selectedIndices` | lectura/escritura | Declarada por clase. |
| `cellSelectionModel` | lectura/escritura | Declarada por clase. |
| `hooks` | lectura/escritura | Declarada por clase. |
| `localeText` | lectura/escritura | Declarada por clase. |
| `density` | lectura/escritura | Declarada por clase. |
| `rowHeight` | lectura/escritura | Declarada por clase. |
| `headerHeight` | solo lectura | Declarada por clase. |
| `pageSize` | lectura/escritura | Declarada por clase. |
| `pageSizeOptions` | solo lectura | Declarada por clase. |
| `pagination` | lectura/escritura | Declarada por clase. |
| `paginationMode` | solo lectura | Declarada por clase. |
| `sortingMode` | solo lectura | Declarada por clase. |
| `filterMode` | solo lectura | Declarada por clase. |
| `sortingOrder` | solo lectura | Declarada por clase. |
| `rowCount` | lectura/escritura | Declarada por clase. |
| `selectionMode` | lectura/escritura | Declarada por clase. |
| `checkboxSelection` | lectura/escritura | Declarada por clase. |
| `cellSelection` | lectura/escritura | Declarada por clase. |
| `editMode` | lectura/escritura | Declarada por clase. |
| `loading` | lectura/escritura | Declarada por clase. |
| `treeData` | lectura/escritura | Declarada por clase. |
| `listView` | lectura/escritura | Declarada por clase. |
| `filterable` | lectura/escritura | Declarada por clase. |
| `selectable` | lectura/escritura | Declarada por clase. |
| `virtualize` | solo lectura | Declarada por clase. |
| `overscan` | solo lectura | Declarada por clase. |
| `tabNavigation` | solo lectura | Declarada por clase. |
| `aggregationPosition` | solo lectura | Declarada por clase. |
| `detailHeight` | solo lectura | Declarada por clase. |
| `api` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `toolbar-start` | Contenido proyectado. |
| `toolbar-end` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-sort-change` | Evento personalizado del componente (sort change). |
| `iswc-filter-change` | Evento personalizado del componente (filter change). |
| `iswc-quick-filter` | Evento personalizado del componente (quick filter). |
| `iswc-column-hide` | Evento personalizado del componente (column hide). |
| `iswc-column-resize` | Evento personalizado del componente (column resize). |
| `iswc-column-pin` | Evento personalizado del componente (column pin). |
| `iswc-density` | Evento personalizado del componente (density). |
| `iswc-group-model` | Evento personalizado del componente (group model). |
| `iswc-aggregation` | Evento personalizado del componente (aggregation). |
| `iswc-export` | Emitido al exportar datos. |
| `iswc-select` | Emitido al seleccionar un elemento. |
| `iswc-cell-select` | Evento personalizado del componente (cell select). |
| `iswc-edit-start` | Evento personalizado del componente (edit start). |
| `iswc-edit-stop` | Evento personalizado del componente (edit stop). |
| `iswc-row-update` | Evento personalizado del componente (row update). |
| `iswc-copy` | Evento personalizado del componente (copy). |
| `iswc-paste` | Evento personalizado del componente (paste). |
| `iswc-column-reorder` | Evento personalizado del componente (column reorder). |
| `iswc-cell-click` | Evento personalizado del componente (cell click). |
| `iswc-row-click` | Evento personalizado del componente (row click). |
| `iswc-row-double-click` | Evento personalizado del componente (row double click). |
| `iswc-cell-double-click` | Evento personalizado del componente (cell double click). |
| `iswc-row-reorder` | Evento personalizado del componente (row reorder). |
| `iswc-group-toggle` | Evento personalizado del componente (group toggle). |
| `iswc-detail-toggle` | Evento personalizado del componente (detail toggle). |
| `iswc-rows-scroll-end` | Evento personalizado del componente (rows scroll end). |
| `iswc-page-change` | Emitido al cambiar de pÃ¡gina. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-sort-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-filter-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-quick-filter` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-column-hide` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-column-resize` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-column-pin` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-density` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-group-model` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-aggregation` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-export` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-select` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-cell-select` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-edit-start` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-edit-stop` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-row-update` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-copy` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-paste` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-column-reorder` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-cell-click` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-row-click` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-row-double-click` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-cell-double-click` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-row-reorder` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-group-toggle` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-detail-toggle` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-rows-scroll-end` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-page-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-data-grid');
el.addEventListener('iswc-sort-change', (e) => {
  console.log('iswc-sort-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `refresh()` | MÃ©todo pÃºblico declarado. |
| `setPage()` | MÃ©todo pÃºblico declarado. |
| `setPageSize()` | MÃ©todo pÃºblico declarado. |
| `setSortModel()` | MÃ©todo pÃºblico declarado. |
| `sortColumn()` | MÃ©todo pÃºblico declarado. |
| `setFilterModel()` | MÃ©todo pÃºblico declarado. |
| `setQuickFilter()` | MÃ©todo pÃºblico declarado. |
| `setColumnVisibility()` | MÃ©todo pÃºblico declarado. |
| `setColumnWidth()` | MÃ©todo pÃºblico declarado. |
| `pinColumn()` | MÃ©todo pÃºblico declarado. |
| `autosizeColumns()` | MÃ©todo pÃºblico declarado. |
| `setDensity()` | MÃ©todo pÃºblico declarado. |
| `selectRow()` | MÃ©todo pÃºblico declarado. |
| `selectAll()` | MÃ©todo pÃºblico declarado. |
| `getRow()` | MÃ©todo pÃºblico declarado. |
| `updateRows()` | MÃ©todo pÃºblico declarado. |
| `scrollToIndex()` | MÃ©todo pÃºblico declarado. |
| `startEdit()` | MÃ©todo pÃºblico declarado. |
| `stopEdit()` | MÃ©todo pÃºblico declarado. |
| `toggleDetailPanel()` | MÃ©todo pÃºblico declarado. |
| `toggleGroup()` | MÃ©todo pÃºblico declarado. |
| `expandAll()` | MÃ©todo pÃºblico declarado. |
| `collapseAll()` | MÃ©todo pÃºblico declarado. |
| `setRowGroupingModel()` | MÃ©todo pÃºblico declarado. |
| `setAggregationModel()` | MÃ©todo pÃºblico declarado. |
| `copySelectionToClipboard()` | MÃ©todo pÃºblico declarado. |
| `undo()` | MÃ©todo pÃºblico declarado. |
| `redo()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `toolbar` | Personalizable con `::part(toolbar)`. |
| `quick-filter` | Personalizable con `::part(quick-filter)`. |
| `toolbar-button` | Personalizable con `::part(toolbar-button)`. |
| `viewport` | Personalizable con `::part(viewport)`. |
| `header` | Personalizable con `::part(header)`. |
| `column-groups` | Personalizable con `::part(column-groups)`. |
| `header-row` | Personalizable con `::part(header-row)`. |
| `header-filters` | Personalizable con `::part(header-filters)`. |
| `pinned-top` | Personalizable con `::part(pinned-top)`. |
| `body` | Personalizable con `::part(body)`. |
| `pinned-bottom` | Personalizable con `::part(pinned-bottom)`. |
| `aggregation-row` | Personalizable con `::part(aggregation-row)`. |
| `overlay` | Personalizable con `::part(overlay)`. |
| `footer` | Personalizable con `::part(footer)`. |
| `pagination` | Personalizable con `::part(pagination)`. |
| `cell` | Personalizable con `::part(cell)`. |
| `detail-panel` | Panel desplegable de detalle por fila. |
| `header-cell` | Cada celda de la fila de encabezados. |
| `row` | Personalizable con `::part(row)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-grid-row-h` | Token leÃ­do o definido por componente. |
| `--iswc-grid-head-h` | Token leÃ­do o definido por componente. |
| `--iswc-grid-head-total` | Token leÃ­do o definido por componente. |
| `--iswc-grid-border` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-grid-border-soft` | Token leÃ­do o definido por componente. |
| `--iswc-border-soft` | Token leÃ­do o definido por componente. |
| `--iswc-grid-bg` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-grid-header-bg` | Token leÃ­do o definido por componente. |
| `--iswc-bg-soft` | Token leÃ­do o definido por componente. |
| `--iswc-grid-row-hover` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-grid-selected` | Token leÃ­do o definido por componente. |
| `--iswc-accent-bg` | Token leÃ­do o definido por componente. |
| `--iswc-grid-radius` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-grid-accent` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-600` | Token leÃ­do o definido por componente. |
| `--iswc-grid-height` | Token leÃ­do o definido por componente. |
| `--iswc-grid-pad` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-danger` | Token leÃ­do o definido por componente. |
| `--iswc-bg` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-shadow-md` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-data-grid> â€” Tabla de datos con la superficie de MUI X Data Grid.
> Columnas: tipos string/number/date/dateTime/boolean/singleSelect/actions,
> valueGetter, valueFormatter, renderCell, renderHeader, ancho fijo o flex,
> resize, autosize, reorden por arrastre, visibilidad, anclaje izquierda y
> derecha, grupos de cabecera anidados, colSpan y menÃº por columna.
> Filas: id propio, alto fijo o por fila, densidad, anclaje arriba y abajo,
> reorden, detail panel, tree data, agrupaciÃ³n con agregaciÃ³n y pivot.
> Datos: multi-orden, filtros con Y/O, filtros de cabecera, quick filter,
> paginaciÃ³n cliente o servidor, virtualizaciÃ³n, carga incremental.
> EdiciÃ³n: por celda o por fila, validaciÃ³n, portapapeles y undo/redo.
> Salida: CSV, Excel (SpreadsheetML) e impresiÃ³n.
> Props JS: columns, rows, pinnedRows, sortModel, filterModel, paginationModel,
> rowSelectionModel, cellSelectionModel, columnVisibilityModel, pinnedColumns,
> columnOrder, columnGroupingModel, rowGroupingModel, aggregationModel,
> pivotModel, listViewColumn, hooks, localeText
> Hooks: getRowId, getRowHeight, getRowClassName, getCellClassName,
> getTreeDataPath, getDetailPanelContent, isRowSelectable, isCellEditable,
> processRowUpdate, rowsLoader
> Attrs: density, row-height, header-height, auto-height, pagination, page-size,
> page-size-options, pagination-mode, row-count, sorting-mode, sorting-order,
> filter-mode, selection-mode, checkbox-selection, cell-selection, editable,
> edit-mode, show-toolbar, toolbar-tools, quick-filter, header-filters, hide-footer,
> hide-footer-selected-count, virtualize, overscan, loading, loading-color,
> list-view, tree-data, row-reorder, detail-height, tab-navigation, clipboard,
> undo-redo, aggregation-position, disable-column-menu, disable-column-filter,
> disable-column-sort, disable-column-resize, disable-column-reorder,
> disable-multiple-sorting, disable-row-selection-on-click
> Events: iswc-sort-change, iswc-filter-change, iswc-quick-filter, iswc-page-change,
> iswc-select, iswc-cell-select, iswc-cell-click, iswc-cell-double-click, iswc-row-click,
> iswc-row-double-click, iswc-edit-start, iswc-edit-stop, iswc-row-update,
> iswc-column-resize, iswc-column-reorder, iswc-column-hide, iswc-column-pin,
> iswc-density, iswc-detail-toggle, iswc-group-toggle, iswc-row-reorder, iswc-copy,
> iswc-paste, iswc-undo, iswc-redo, iswc-rows-scroll-end, iswc-export
> CSS parts: base, toolbar, toolbar-button, quick-filter, viewport, header,
> header-row, header-cell, column-groups, header-filters, body, row, cell,
> pinned-top, pinned-bottom, aggregation-row, detail-panel, overlay, footer,
> pagination

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/grid-types.js`](../_shared/grid-types.js)
- [`../_shared/grid-data.js`](../_shared/grid-data.js)
- [`../_shared/grid-ui.js`](../_shared/grid-ui.js)

Tags del mÃ³dulo: `<iswc-data-grid>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-label`, `aria-haspopup`, `aria-colcount`, `aria-rowcount`, `aria-colspan`, `aria-colindex`, `aria-sort`, `aria-rowindex`, `aria-expanded`, `aria-level`, `aria-selected`.

## Ejemplo avanzado

```html
<iswc-data-grid></iswc-data-grid>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./data-grid.ts)
- [CSS](./data-grid.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./data-grid.json)
