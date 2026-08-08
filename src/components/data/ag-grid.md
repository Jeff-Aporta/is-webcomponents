---
tag: is-ag-grid
tags:
  - is-ag-grid
category: data
status: public
source: ./ag-grid.js
style: ./ag-grid.css
preview: ../../previews/data/is-ag-grid.json
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

## API

### Atributos y propiedades

#### Atributos clave

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

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `rows` | lectura/escritura | Filas del grid. |
| `columns` | lectura/escritura | Definiciones de columna. |
| `api` | lectura | Fachada del motor (`datagrid-core`); ver tabla siguiente. |

### Slots

| Slot | Uso |
| --- | --- |
| (default) | Hasta dos `<script type="application/json">`: primero columnas, luego filas. |

### Métodos y propiedades públicas — `grid.api` (persistencia / columnas)

| Método | Notas |
| --- | --- |
| `serializeState()` / `loadState(json\|object)` | snapshot del core |
| `resetPersistedState()` | borra keyid + restaura defaults |
| `openColumnsPanel()` / `closeSidePanel()` | sidebar |
| `hideColumn(colId, hide?)` | visibilidad |
| `setSortModel` / `setFilter` / `reorderColumn` / … | mutaciones del modelo |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-sort-change` | modelo de orden | sí | sí | no |
| `is-filter-change` | modelo de filtros | sí | sí | no |
| `is-column-hide` | `{ colId, hidden }` | sí | sí | no |
| `is-column-reorder` | `{ colId, from, to }` | sí | sí | no |
| `is-column-resize` | `{ colId, width }` | sí | sí | no |
| `is-column-pin` | `{ colId, pinned }` | sí | sí | no |
| `is-state-saved` | snapshot guardado | sí | sí | no |
| `is-state-loaded` | snapshot aplicado | sí | sí | no |
| `is-state-reset` | sin detail | sí | sí | no |

Nombres completos emitidos por el módulo:

`is-sort-change`, `is-filter-change`, `is-column-hide`, `is-column-reorder`, `is-column-resize`,
`is-column-pin`, `is-state-saved`, `is-state-loaded`, `is-state-reset`, …

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor; lleva `data-density`. |
| `toolbar` | Barra superior (`role="toolbar"`). |
| `group-panel` | Zona de agrupación por columnas. |
| `viewport` | Área desplazable (`role="grid"`). |
| `group-header` | Cabecera de grupos. |
| `header` | Fila de encabezados. |
| `body` | Cuerpo de filas. |
| `sidebar` | Panel lateral. |
| `tool-panel` | Contenido del panel lateral. |
| `footer` | Pie del grid. |
| `count` | Contador de filas del pie. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-grid-row-h` | Alto de fila. |
| `--is-grid-header-h` | Alto del encabezado. |
| `--is-grid-header-bg` | Fondo del encabezado. |
| `--is-grid-stripe` | Fondo alterno de filas. |
| `--is-grid-row-hover` | Fondo de fila en hover. |
| `--is-grid-selected` | Fondo de fila seleccionada. |
| `--is-grid-selected-bar` | Barra indicadora de selección. |

### Integración con formularios

No es form-associated: es una vista de datos. Los editores de celda gestionan
su propio valor y lo devuelven al modelo del core.

## Comportamiento

- El modelo lo aporta `createGridModel` de `./datagrid-core/`: orden, filtros,
  agrupación, agregación, paginación y visibilidad de columnas.
- Las columnas y filas se leen de los `<script type="application/json">` hijos
  o de los atributos correspondientes.
- Con `remember-state` y `storage-key`, el snapshot se guarda mediante
  `_shared/prefs.js` bajo `localStorage['is-webcomponents']['is-ag-grid'][keyid]`.
- El panel lateral de columnas se abre con `api.openColumnsPanel()` y refleja
  la visibilidad del modelo.

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

## Dependencias y componentes relacionados

- `../_shared/prefs.js`
- `../_shared/element-base.js`, `adopt-css.js`, `dom-utils.js`
- `./datagrid-core/*`
- `../media/icon.js`

## Accesibilidad

El viewport declara `role="grid"` y es enfocable (`tabindex="0"`); la toolbar
usa `role="toolbar"`. Al ocultar columnas, mantener disponible el panel lateral
para poder restaurarlas por teclado.

## Ejemplo avanzado

```html
<is-ag-grid id="grid" selectable row-selection="multiple"
            remember-state storage-key="inventario"
            density="compact" page-size="50" style="height: 30rem">
</is-ag-grid>

<script type="module">
  const grid = document.getElementById('grid');
  grid.columns = [
    { field: 'name', header: 'Producto', filter: true, sortable: true },
    { field: 'stock', header: 'Stock', type: 'number', align: 'right' },
  ];
  grid.rows = await (await fetch('/api/inventario')).json();

  grid.addEventListener('is-sort-change', (e) => console.log(e.detail));
  grid.api.openColumnsPanel();
  const snapshot = grid.api.serializeState();
  grid.api.resetPersistedState();      // borra keyid y vuelve a defaults
</script>
```

## Errores comunes

- Persistir con `remember-state` pero sin `storage-key`: la persistencia es
  opt-in estricto y necesita ambos.
- Escuchar `is-sort` / `is-filter`: el vocabulario es `-change`.
- Escribir el estado a mano en `localStorage` en vez de usar `prefs.js`.
- Confundirlo con `<is-data-grid>`: otro contrato y otro archivo.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar `datagrid-core` antes de reimplementar orden, filtro o agrupación.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Persistir solo por `_shared/prefs.js` con la raíz `is-webcomponents`.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./ag-grid.js)
- [CSS](./ag-grid.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/data/is-ag-grid.json)

## Checker

```bash
node tests/prefs-contract.test.mjs
node scripts/docs-consistency.selfcheck.mjs
```

## Navegación

- [Índice data](./LLM.md)
- [Índice global](../LLM.md)
- Preview: `previews/data/is-ag-grid.json`
