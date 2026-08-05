---
tag: is-ag-grid
tags:
  - is-ag-grid
category: data
status: public
source: ./ag-grid.js
style: ./ag-grid.css
preview: ../../previews/data/is-ag-grid.html
---
# `<is-ag-grid>`

## Propósito

Data grid estilo ag-grid.com (vanilla WC): columnas tipadas, multi-sort, filtros por columna,
quick filter, selección, paginación, virtual scroll, grouping/agregación, density, export CSV,
panel lateral de columnas (show/hide) y persistencia opt-in de personalización.

Este módulo registra `<is-ag-grid>`. El motor vive en `./datagrid-core/` (`createGridModel`).

## Cuándo usarlo

Grillas densas con reorder/resize/pin/hide, filtros por columna, sidebar de columnas y estado
persistible por `storage-key`. Preferir este tag cuando el consumidor pide UX tipo ag-Grid.

## Cuándo no usarlo

- No sustituye a `<is-data-grid>` (superficie MUI X: pivot, tree, cell selection, edit modes).
- No usar para tablas estáticas simples: HTML semántico basta.

## Importación

```js
import './ag-grid.js';
// o CDN: dist/cdn/data/ag-grid.min.js  /  dist/cdn/all.min.js
```

## Ejemplo mínimo

```html
<is-ag-grid selectable remember-state storage-key="mi-tabla" style="height: 26rem">
  <script type="application/json">
    [
      { "field": "name", "header": "Producto", "filter": true, "sortable": true },
      { "field": "stock", "header": "Stock", "type": "number", "align": "right" }
    ]
  </script>
  <script type="application/json">
    [
      { "id": 1, "name": "Escritorio", "stock": 24 },
      { "id": 2, "name": "Silla", "stock": 6 }
    ]
  </script>
</is-ag-grid>
```

## Persistencia (OBLIGATORIO respetar)

Opt-in estricto: `remember-state` + `storage-key` (keyid).

Todo va a **un solo JSON** en localStorage:

```text
localStorage['is-webcomponents'] = {
  "is-ag-grid": {
    "<storage-key>": { columns, sortModel, filterModel, quickFilter, page, pageSize, rowGroupCols, … }
  },
  "is-split-panel": { … },
  "is-main": { … }
}
```

API compartida: [`_shared/prefs.js`](../_shared/prefs.js)

| Función | Uso |
| --- | --- |
| `getComponentPrefs(tag, key)` | Leer entrada |
| `replaceComponentPrefs(tag, key, value)` | Reemplazar estado completo (grid) |
| `setComponentPrefs(tag, key, patch)` | Merge shallow (layout/main) |
| `removeComponentPrefs(tag, key)` | Borrar keyid (botón Reiniciar) |
| `getPrefsRootKey()` | Siempre `'is-webcomponents'` |

Tag del bucket = nombre del custom element (`is-ag-grid`). Keyid = valor de `storage-key`.

### Qué se persiste

Orden, visibilidad (`hide`), anchos, pin, `sortModel`, `filterModel`, quick filter, page/pageSize, row groups.

### Reiniciar

- Toolbar: botón **Reiniciar** (visible solo con `remember-state`).
- API: `grid.api.resetPersistedState()` → `removeComponentPrefs` + restaura defs/sort/filtros.

## Panel de columnas

- Sidebar derecha (pestañas Columnas / Filtros) + botón toolbar **Columnas**.
- Lista de checks para show/hide, búsqueda, Mostrar todo / Ocultar todo.
- Markup: `.mim-dg__sidebar`, `.mim-dg__panel`, `.mim-dg__col-check`.
- No reinventar un popover aparte: el sidebar ya es el contrato UI.

## API resumida

### Atributos clave

| Atributo | Notas |
| --- | --- |
| `rows` / `columns` | JSON attr o `<script type="application/json">` |
| `selectable` / `row-selection` | checkboxes / single\|multiple |
| `density` | `compact` \| `normal` \| `comfortable` |
| `page-size` / `page-size-options` / `pagination` | pager |
| `quick-filter` / `group-by` | texto / CSV colIds |
| `remember-state` | boolean opt-in persistencia |
| `storage-key` | keyid bajo `is-webcomponents.is-ag-grid` |
| `toolbar` | `false` oculta toolbar |

### API `grid.api` (persistencia / columnas)

| Método | Notas |
| --- | --- |
| `serializeState()` / `loadState(json\|object)` | snapshot del core |
| `resetPersistedState()` | borra keyid + restaura defaults |
| `openColumnsPanel()` / `closeSidePanel()` | sidebar |
| `hideColumn(colId, hide?)` | visibilidad |
| `setSortModel` / `setFilter` / `reorderColumn` / … | mutaciones del modelo |

### Eventos

`is-sort-change`, `is-filter-change`, `is-column-hide`, `is-column-reorder`, `is-column-resize`,
`is-column-pin`, `is-state-saved`, `is-state-loaded`, `is-state-reset`, …

## Qué hacer

- Persistencia → **solo** `_shared/prefs.js` con raíz `is-webcomponents`.
- Estado completo del grid → `replaceComponentPrefs` (no merge parcial que deje campos viejos).
- Reset → `removeComponentPrefs` + reaplicar defs originales (`#rawColumns`).
- Columnas show/hide → sidebar/checks existentes; cablear, no rehacer UI.
- Motor → `datagrid-core` (`hideColumn`, `serializeState`, `loadState`).
- Tras cambiar JS/CSS → `npm run build` (previews cargan `dist/cdn/all.min.js`).
- Migrar legacy flat keys / `is-components` / `sessionStorage` al root nuevo (ya hay helpers).

## Qué no hacer

- **No** `localStorage.setItem('demo-density', …)` ni keys planas por tabla.
- **No** `sessionStorage` como almacén canónico de estado de grid.
- **No** renombrar la raíz a otra cosa (`is-components` es solo legacy de migración).
- **No** inventar un segundo store de prefs por componente.
- **No** dejar el sidebar `hidden` sin cablear: el markup vacío fue el bug original.
- **No** regenerar todos los beats/overlays de otros kits: aquí no aplica; no mezclar con video-editor.
- **No** confundir con `<is-data-grid>` (otro contrato, otro archivo).

## Errores conocidos (no repetir)

| Error | Prevención |
| --- | --- |
| Sidebar en template pero siempre `hidden` y sin handlers | Cablear tabs + `#renderColumnsPanel`; test `prefs-contract` exige clases |
| Persistencia en `sessionStorage` o key plana | Usar `prefs.js`; test falla si `ag-grid.js` hace `setItem` directo de estado |
| Root `is-components` tratado como canónico | Canónico = `is-webcomponents`; legacy solo en migración |
| `setComponentPrefs` merge deja basura en estado de grid | Usar `replaceComponentPrefs` al guardar snapshot |
| Documentar persistencia sin mencionar el root único | MD + preview deben decir `localStorage['is-webcomponents'][tag][key]` |
| Olvidar botón Reiniciar cuando hay `remember-state` | Toolbar `.mim-dg__reset-btn` + `api.resetPersistedState` |

## Dependencias

- `../_shared/prefs.js`
- `../_shared/element-base.js`, `adopt-css.js`, `dom-utils.js`
- `./datagrid-core/*`
- `../media/icon.js`

## Tokens CSS (host)

`--is-grid-row-h`, `--is-grid-header-h`, `--is-grid-header-bg`, `--is-grid-stripe`,
`--is-grid-row-hover`, `--is-grid-selected`, `--is-grid-selected-bar`

## Checker

```bash
node tests/prefs-contract.test.mjs
node scripts/docs-consistency.selfcheck.mjs
```

## Navegación

- [Índice data](./LLM.md)
- [Índice global](../LLM.md)
- Preview: `previews/data/is-ag-grid.html`
