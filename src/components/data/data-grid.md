---
tag: iswc-data-grid
tags:
  - iswc-data-grid
category: data
status: public
source: ./data-grid.js
style: ./data-grid.css
preview: ./data-grid.json
---
# `<iswc-data-grid>`

## Propósito

Tabla de datos con la superficie de MUI X Data Grid: columnas tipadas, multi-orden, filtros con Y/O,
quick filter, paginación, selección de filas y de rangos de celdas, edición por celda o por fila,
agrupación con agregación, tree data, pivot, virtualización y exportación.

Este módulo registra `<iswc-data-grid>`.

## Cuándo usarlo

Presentación, comparación, movimiento u organización de datos estructurados.

## Cuándo no usarlo

No reemplazar HTML semántico cuando contenido es estático y simple.

## Importación

```js
import './data-grid.js';
```

## Ejemplo mínimo

```html
<iswc-data-grid></iswc-data-grid>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `density` | string/según contrato | Fuente define default/restricción. |
| `row-height` | string/según contrato | Fuente define default/restricción. |
| `header-height` | string/según contrato | Fuente define default/restricción. |
| `auto-height` | string/según contrato | Fuente define default/restricción. |
| `page-size` | string/según contrato | Fuente define default/restricción. |
| `page-size-options` | string/según contrato | Fuente define default/restricción. |
| `pagination` | boolean | Fuente define default/restricción. |
| `pagination-mode` | string/según contrato | Fuente define default/restricción. |
| `row-count` | string/según contrato | Fuente define default/restricción. |
| `sorting-mode` | string/según contrato | Fuente define default/restricción. |
| `sorting-order` | string/según contrato | Fuente define default/restricción. |
| `filter-mode` | string/según contrato | Fuente define default/restricción. |
| `selection-mode` | string/según contrato | Fuente define default/restricción. |
| `checkbox-selection` | boolean | Fuente define default/restricción. |
| `cell-selection` | boolean | Fuente define default/restricción. |
| `disable-row-selection-on-click` | string/según contrato | Fuente define default/restricción. |
| `disable-column-menu` | string/según contrato | Fuente define default/restricción. |
| `disable-column-filter` | string/según contrato | Fuente define default/restricción. |
| `disable-column-sort` | string/según contrato | Fuente define default/restricción. |
| `disable-column-resize` | string/según contrato | Fuente define default/restricción. |
| `disable-column-reorder` | string/según contrato | Fuente define default/restricción. |
| `disable-multiple-sorting` | string/según contrato | Fuente define default/restricción. |
| `edit-mode` | string/según contrato | Fuente define default/restricción. |
| `editable` | string/según contrato | Fuente define default/restricción. |
| `show-toolbar` | string/según contrato | Fuente define default/restricción. |
| `toolbar-tools` | boolean (`false` oculta Columnas/Filtros/Densidad/Exportar) | Default visible cuando hay toolbar. |
| `quick-filter` | string/según contrato | Fuente define default/restricción. |
| `header-filters` | string/según contrato | Fuente define default/restricción. |
| `hide-footer` | string/según contrato | Fuente define default/restricción. |
| `hide-footer-selected-count` | string/según contrato | Fuente define default/restricción. |
| `virtualize` | string/según contrato | Fuente define default/restricción. |
| `overscan` | string/según contrato | Fuente define default/restricción. |
| `loading` | boolean | Fuente define default/restricción. |
| `loading-color` | string/según contrato | Fuente define default/restricción. |
| `list-view` | boolean | Fuente define default/restricción. |
| `tree-data` | boolean | Fuente define default/restricción. |
| `row-reorder` | string/según contrato | Fuente define default/restricción. |
| `detail-height` | string/según contrato | Fuente define default/restricción. |
| `tab-navigation` | string/según contrato | Fuente define default/restricción. |
| `clipboard` | string/según contrato | Fuente define default/restricción. |
| `undo-redo` | string/según contrato | Fuente define default/restricción. |
| `aggregation-position` | string/según contrato | Fuente define default/restricción. |
| `selectable` | boolean | Fuente define default/restricción. |
| `filterable` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

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


| Evento | Descripción |
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
| `iswc-page-change` | Emitido al cambiar de página. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-sort-change` | sí | sí | sí | no |
| `iswc-filter-change` | sí | sí | sí | no |
| `iswc-quick-filter` | sí | sí | sí | no |
| `iswc-column-hide` | sí | sí | sí | no |
| `iswc-column-resize` | sí | sí | sí | no |
| `iswc-column-pin` | sí | sí | sí | no |
| `iswc-density` | sí | sí | sí | no |
| `iswc-group-model` | sí | sí | sí | no |
| `iswc-aggregation` | sí | sí | sí | no |
| `iswc-export` | sí | sí | sí | no |
| `iswc-select` | sí | sí | sí | no |
| `iswc-cell-select` | sí | sí | sí | no |
| `iswc-edit-start` | sí | sí | sí | no |
| `iswc-edit-stop` | sí | sí | sí | no |
| `iswc-row-update` | sí | sí | sí | no |
| `iswc-copy` | sí | sí | sí | no |
| `iswc-paste` | sí | sí | sí | no |
| `iswc-column-reorder` | sí | sí | sí | no |
| `iswc-cell-click` | sí | sí | sí | no |
| `iswc-row-click` | sí | sí | sí | no |
| `iswc-row-double-click` | sí | sí | sí | no |
| `iswc-cell-double-click` | sí | sí | sí | no |
| `iswc-row-reorder` | sí | sí | sí | no |
| `iswc-group-toggle` | sí | sí | sí | no |
| `iswc-detail-toggle` | sí | sí | sí | no |
| `iswc-rows-scroll-end` | sí | sí | sí | no |
| `iswc-page-change` | sí | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-data-grid');
el.addEventListener('iswc-sort-change', (e) => {
  console.log('iswc-sort-change', e.detail);
});
```

</details>

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `refresh()` | Método público declarado. |
| `setPage()` | Método público declarado. |
| `setPageSize()` | Método público declarado. |
| `setSortModel()` | Método público declarado. |
| `sortColumn()` | Método público declarado. |
| `setFilterModel()` | Método público declarado. |
| `setQuickFilter()` | Método público declarado. |
| `setColumnVisibility()` | Método público declarado. |
| `setColumnWidth()` | Método público declarado. |
| `pinColumn()` | Método público declarado. |
| `autosizeColumns()` | Método público declarado. |
| `setDensity()` | Método público declarado. |
| `selectRow()` | Método público declarado. |
| `selectAll()` | Método público declarado. |
| `getRow()` | Método público declarado. |
| `updateRows()` | Método público declarado. |
| `scrollToIndex()` | Método público declarado. |
| `startEdit()` | Método público declarado. |
| `stopEdit()` | Método público declarado. |
| `toggleDetailPanel()` | Método público declarado. |
| `toggleGroup()` | Método público declarado. |
| `expandAll()` | Método público declarado. |
| `collapseAll()` | Método público declarado. |
| `setRowGroupingModel()` | Método público declarado. |
| `setAggregationModel()` | Método público declarado. |
| `copySelectionToClipboard()` | Método público declarado. |
| `undo()` | Método público declarado. |
| `redo()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--iswc-grid-row-h` | Token leído o definido por componente. |
| `--iswc-grid-head-h` | Token leído o definido por componente. |
| `--iswc-grid-head-total` | Token leído o definido por componente. |
| `--iswc-grid-border` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-grid-border-soft` | Token leído o definido por componente. |
| `--iswc-border-soft` | Token leído o definido por componente. |
| `--iswc-grid-bg` | Token leído o definido por componente. |
| `--iswc-bg-elev` | Token leído o definido por componente. |
| `--iswc-grid-header-bg` | Token leído o definido por componente. |
| `--iswc-bg-soft` | Token leído o definido por componente. |
| `--iswc-grid-row-hover` | Token leído o definido por componente. |
| `--iswc-control-bg-hover` | Token leído o definido por componente. |
| `--iswc-grid-selected` | Token leído o definido por componente. |
| `--iswc-accent-bg` | Token leído o definido por componente. |
| `--iswc-grid-radius` | Token leído o definido por componente. |
| `--iswc-radius` | Token leído o definido por componente. |
| `--iswc-grid-accent` | Token leído o definido por componente. |
| `--iswc-color-brand-600` | Token leído o definido por componente. |
| `--iswc-grid-height` | Token leído o definido por componente. |
| `--iswc-grid-pad` | Token leído o definido por componente. |
| `--iswc-sans` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-control-border` | Token leído o definido por componente. |
| `--iswc-radius-sm` | Token leído o definido por componente. |
| `--iswc-control-bg` | Token leído o definido por componente. |
| `--iswc-focus` | Token leído o definido por componente. |
| `--iswc-danger` | Token leído o definido por componente. |
| `--iswc-bg` | Token leído o definido por componente. |
| `--iswc-text-dim` | Token leído o definido por componente. |
| `--iswc-text-soft` | Token leído o definido por componente. |
| `--iswc-shadow-md` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-data-grid> — Tabla de datos con la superficie de MUI X Data Grid.
> Columnas: tipos string/number/date/dateTime/boolean/singleSelect/actions,
> valueGetter, valueFormatter, renderCell, renderHeader, ancho fijo o flex,
> resize, autosize, reorden por arrastre, visibilidad, anclaje izquierda y
> derecha, grupos de cabecera anidados, colSpan y menú por columna.
> Filas: id propio, alto fijo o por fila, densidad, anclaje arriba y abajo,
> reorden, detail panel, tree data, agrupación con agregación y pivot.
> Datos: multi-orden, filtros con Y/O, filtros de cabecera, quick filter,
> paginación cliente o servidor, virtualización, carga incremental.
> Edición: por celda o por fila, validación, portapapeles y undo/redo.
> Salida: CSV, Excel (SpreadsheetML) e impresión.
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

Tags del módulo: `<iswc-data-grid>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-label`, `aria-haspopup`, `aria-colcount`, `aria-rowcount`, `aria-colspan`, `aria-colindex`, `aria-sort`, `aria-rowindex`, `aria-expanded`, `aria-level`, `aria-selected`.

## Ejemplo avanzado

```html
<iswc-data-grid></iswc-data-grid>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./data-grid.js)
- [CSS](./data-grid.css)
- [Índice de categoría](./LLM.md)
- [Preview](./data-grid.json)
