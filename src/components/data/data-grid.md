---
tag: is-data-grid
tags:
  - is-data-grid
category: data
status: public
source: ./data-grid.js
style: ./data-grid.css
preview: ../../previews/data/is-data-grid.html
---
# `<is-data-grid>`

## Propósito

Tabla de datos con la superficie de MUI X Data Grid: columnas tipadas, multi-orden, filtros con Y/O,
quick filter, paginación, selección de filas y de rangos de celdas, edición por celda o por fila,
agrupación con agregación, tree data, pivot, virtualización y exportación.

Este módulo registra `<is-data-grid>`.

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
<is-data-grid></is-data-grid>
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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-sort` | sí | sí | sí | no |
| `is-filter` | sí | sí | sí | no |
| `is-quick-filter` | sí | sí | sí | no |
| `is-column-visibility` | sí | sí | sí | no |
| `is-column-resize` | sí | sí | sí | no |
| `is-column-pin` | sí | sí | sí | no |
| `is-density` | sí | sí | sí | no |
| `is-group-model` | sí | sí | sí | no |
| `is-aggregation` | sí | sí | sí | no |
| `is-export` | sí | sí | sí | no |
| `is-select` | sí | sí | sí | no |
| `is-cell-select` | sí | sí | sí | no |
| `is-edit-start` | sí | sí | sí | no |
| `is-edit-stop` | sí | sí | sí | no |
| `is-row-update` | sí | sí | sí | no |
| `is-copy` | sí | sí | sí | no |
| `is-paste` | sí | sí | sí | no |
| `is-column-reorder` | sí | sí | sí | no |
| `is-cell-click` | sí | sí | sí | no |
| `is-row-click` | sí | sí | sí | no |
| `is-row-double-click` | sí | sí | sí | no |
| `is-cell-double-click` | sí | sí | sí | no |
| `is-row-reorder` | sí | sí | sí | no |
| `is-group-toggle` | sí | sí | sí | no |
| `is-detail-toggle` | sí | sí | sí | no |
| `is-rows-scroll-end` | sí | sí | sí | no |
| `is-pagination` | sí | sí | sí | no |
| `is-page-change` | sí | sí | sí | no |

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

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-grid-row-h` | Token leído o definido por componente. |
| `--is-grid-head-h` | Token leído o definido por componente. |
| `--is-grid-head-total` | Token leído o definido por componente. |
| `--is-grid-border` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-grid-border-soft` | Token leído o definido por componente. |
| `--is-border-soft` | Token leído o definido por componente. |
| `--is-grid-bg` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-grid-header-bg` | Token leído o definido por componente. |
| `--is-bg-soft` | Token leído o definido por componente. |
| `--is-grid-row-hover` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-grid-selected` | Token leído o definido por componente. |
| `--is-accent-bg` | Token leído o definido por componente. |
| `--is-grid-radius` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-grid-accent` | Token leído o definido por componente. |
| `--is-color-brand-600` | Token leído o definido por componente. |
| `--is-grid-height` | Token leído o definido por componente. |
| `--is-grid-pad` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-danger` | Token leído o definido por componente. |
| `--is-bg` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-shadow-md` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-data-grid> — Tabla de datos con la superficie de MUI X Data Grid.
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
> Events: is-sort, is-filter, is-quick-filter, is-pagination, is-page-change,
> is-select, is-cell-select, is-cell-click, is-cell-double-click, is-row-click,
> is-row-double-click, is-edit-start, is-edit-stop, is-row-update,
> is-column-resize, is-column-reorder, is-column-visibility, is-column-pin,
> is-density, is-detail-toggle, is-group-toggle, is-row-reorder, is-copy,
> is-paste, is-undo, is-redo, is-rows-scroll-end, is-export
> CSS parts: base, toolbar, toolbar-button, quick-filter, viewport, header,
> header-row, header-cell, column-groups, header-filters, body, row, cell,
> pinned-top, pinned-bottom, aggregation-row, detail-panel, overlay, footer,
> pagination

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/grid-types.js`](../_shared/grid-types.js)
- [`../_shared/grid-data.js`](../_shared/grid-data.js)
- [`../_shared/grid-ui.js`](../_shared/grid-ui.js)

Tags del módulo: `<is-data-grid>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-label`, `aria-haspopup`, `aria-colcount`, `aria-rowcount`, `aria-colspan`, `aria-colindex`, `aria-sort`, `aria-rowindex`, `aria-expanded`, `aria-level`, `aria-selected`.

## Ejemplo avanzado

```html
<is-data-grid></is-data-grid>
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
- [Preview](../../previews/data/is-data-grid.html)
