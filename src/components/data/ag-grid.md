---
tag: iswc-ag-grid
tags:
  - iswc-ag-grid
category: data
status: public
source: ./ag-grid.ts
style: ./ag-grid.css
preview: ./ag-grid.json
---
# `<iswc-ag-grid>`

## PropÃ³sito

Data grid estilo ag-grid.com (vanilla WC): columnas tipadas, multi-sort, filtros por columna,
quick filter, selecciÃ³n, paginaciÃ³n, virtual scroll, grouping/agregaciÃ³n, density, export CSV,
panel lateral de columnas (show/hide) y persistencia opt-in de personalizaciÃ³n.

Este mÃ³dulo registra `<iswc-ag-grid>`. El motor vive en `./datagrid-core/` (`createGridModel`).

## CuÃ¡ndo usarlo

Grillas densas con reorder/resize/pin/hide, filtros por columna, sidebar de columnas y estado
persistible por `storage-key`. Preferir este tag cuando el consumidor pide UX tipo ag-Grid.

## CuÃ¡ndo no usarlo

- No sustituye a `<iswc-data-grid>` (superficie MUI X: pivot, tree, cell selection, edit modes).
- No usar para tablas estÃ¡ticas simples: HTML semÃ¡ntico basta.

## ImportaciÃ³n

```js
import './ag-grid.js';
// o CDN: dist/cdn/data/ag-grid.min.js  /  dist/cdn/all.min.js
```

## Ejemplo mÃ­nimo

```html
<iswc-ag-grid selectable remember-state storage-key="mi-tabla" style="height: 26rem">
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
</iswc-ag-grid>
```

## Persistencia (OBLIGATORIO respetar)

Opt-in estricto: `remember-state` + `storage-key` (keyid).

Todo va a **un solo JSON** en localStorage:

```text
localStorage['iswc-root'] = {
  "iswc-ag-grid": {
    "<storage-key>": { columns, sortModel, filterModel, quickFilter, page, pageSize, rowGroupCols, â€¦ }
  },
  "iswc-split-panel": { â€¦ },
  "iswc-main": { â€¦ }
}
```

API compartida: [`_shared/prefs.js`](../_shared/prefs.js)

| FunciÃ³n | Uso |
| --- | --- |
| `getComponentPrefs(tag, key)` | Leer entrada |
| `replaceComponentPrefs(tag, key, value)` | Reemplazar estado completo (grid) |
| `setComponentPrefs(tag, key, patch)` | Merge shallow (layout/main) |
| `removeComponentPrefs(tag, key)` | Borrar keyid (botÃ³n Reiniciar) |
| `getPrefsRootKey()` | Siempre `'iswc-root'` |

Tag del bucket = nombre del custom element (`iswc-ag-grid`). Keyid = valor de `storage-key`.

### QuÃ© se persiste

Orden, visibilidad (`hide`), anchos, pin, `sortModel`, `filterModel`, quick filter, page/pageSize, row groups.

### Reiniciar

- Toolbar: botÃ³n **Reiniciar** (visible solo con `remember-state`).
- API: `grid.api.resetPersistedState()` â†’ `removeComponentPrefs` + restaura defs/sort/filtros.

## Panel de columnas

- Sidebar derecha (pestaÃ±as Columnas / Filtros) + botÃ³n toolbar **Columnas**.
- Lista de checks para show/hide, bÃºsqueda, Mostrar todo / Ocultar todo.
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
| `storage-key` | keyid bajo `iswc-root.iswc-ag-grid` |
| `toolbar` | `false` oculta toolbar |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `rows` | lectura/escritura | Filas del grid. |
| `columns` | lectura/escritura | Definiciones de columna. |
| `api` | lectura | Fachada del motor (`datagrid-core`); ver tabla siguiente. |

### Slots

| Slot | Uso |
| --- | --- |
| (default) | Hasta dos `<script type="application/json">`: primero columnas, luego filas. |

### MÃ©todos y propiedades pÃºblicas â€” `grid.api` (persistencia / columnas)

| MÃ©todo | Notas |
| --- | --- |
| `serializeState()` / `loadState(json\|object)` | snapshot del core |
| `resetPersistedState()` | borra keyid + restaura defaults |
| `openColumnsPanel()` / `closeSidePanel()` | sidebar |
| `hideColumn(colId, hide?)` | visibilidad |
| `setSortModel` / `setFilter` / `reorderColumn` / â€¦ | mutaciones del modelo |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-sort-change` | Evento personalizado del componente (sort change). |
| `iswc-filter-change` | Evento personalizado del componente (filter change). |
| `iswc-column-hide` | Evento personalizado del componente (column hide). |
| `iswc-column-reorder` | Evento personalizado del componente (column reorder). |
| `iswc-column-resize` | Evento personalizado del componente (column resize). |
| `iswc-column-pin` | Evento personalizado del componente (column pin). |
| `iswc-state-saved` | Evento personalizado del componente (state saved). |
| `iswc-state-loaded` | Evento personalizado del componente (state loaded). |
| `iswc-state-reset` | Evento personalizado del componente (state reset). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-sort-change` | modelo de orden | sÃ­ | sÃ­ | no |
| `iswc-filter-change` | modelo de filtros | sÃ­ | sÃ­ | no |
| `iswc-column-hide` | `{ colId, hidden }` | sÃ­ | sÃ­ | no |
| `iswc-column-reorder` | `{ colId, from, to }` | sÃ­ | sÃ­ | no |
| `iswc-column-resize` | `{ colId, width }` | sÃ­ | sÃ­ | no |
| `iswc-column-pin` | `{ colId, pinned }` | sÃ­ | sÃ­ | no |
| `iswc-state-saved` | snapshot guardado | sÃ­ | sÃ­ | no |
| `iswc-state-loaded` | snapshot aplicado | sÃ­ | sÃ­ | no |
| `iswc-state-reset` | sin detail | sÃ­ | sÃ­ | no |

Nombres completos emitidos por el mÃ³dulo:

`iswc-sort-change`, `iswc-filter-change`, `iswc-column-hide`, `iswc-column-reorder`, `iswc-column-resize`,
`iswc-column-pin`, `iswc-state-saved`, `iswc-state-loaded`, `iswc-state-reset`, â€¦


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-ag-grid');
el.addEventListener('iswc-sort-change', (e) => {
  console.log('iswc-sort-change', e.detail);
});
```

</details>

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor; lleva `data-density`. |
| `toolbar` | Barra superior (`role="toolbar"`). |
| `group-panel` | Zona de agrupaciÃ³n por columnas. |
| `viewport` | Ãrea desplazable (`role="grid"`). |
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
| `--iswc-grid-row-h` | Alto de fila. |
| `--iswc-grid-header-h` | Alto del encabezado. |
| `--iswc-grid-header-bg` | Fondo del encabezado. |
| `--iswc-grid-stripe` | Fondo alterno de filas. |
| `--iswc-grid-row-hover` | Fondo de fila en hover. |
| `--iswc-grid-selected` | Fondo de fila seleccionada. |
| `--iswc-grid-selected-bar` | Barra indicadora de selecciÃ³n. |

### IntegraciÃ³n con formularios

No es form-associated: es una vista de datos. Los editores de celda gestionan
su propio valor y lo devuelven al modelo del core.

## Comportamiento

- El modelo lo aporta `createGridModel` de `./datagrid-core/`: orden, filtros,
  agrupaciÃ³n, agregaciÃ³n, paginaciÃ³n y visibilidad de columnas.
- Las columnas y filas se leen de los `<script type="application/json">` hijos
  o de los atributos correspondientes.
- Con `remember-state` y `storage-key`, el snapshot se guarda mediante
  `_shared/prefs.js` bajo `localStorage['iswc-root']['iswc-ag-grid'][keyid]`.
- El panel lateral de columnas se abre con `api.openColumnsPanel()` y refleja
  la visibilidad del modelo.

## QuÃ© hacer

- Persistencia â†’ **solo** `_shared/prefs.js` con raÃ­z `iswc-root`.
- Estado completo del grid â†’ `replaceComponentPrefs` (no merge parcial que deje campos viejos).
- Reset â†’ `removeComponentPrefs` + reaplicar defs originales (`#rawColumns`).
- Columnas show/hide â†’ sidebar/checks existentes; cablear, no rehacer UI.
- Motor â†’ `datagrid-core` (`hideColumn`, `serializeState`, `loadState`).
- Tras cambiar JS/CSS â†’ `deno task build` (previews cargan `dist/cdn/all.min.js`).
- Migrar legacy flat keys / `is-components` / `sessionStorage` al root nuevo (ya hay helpers).

## QuÃ© no hacer

- **No** `localStorage.setItem('demo-density', â€¦)` ni keys planas por tabla.
- **No** `sessionStorage` como almacÃ©n canÃ³nico de estado de grid.
- **No** renombrar la raÃ­z a otra cosa (`is-components` es solo legacy de migraciÃ³n).
- **No** inventar un segundo store de prefs por componente.
- **No** dejar el sidebar `hidden` sin cablear: el markup vacÃ­o fue el bug original.
- **No** regenerar todos los beats/overlays de otros kits: aquÃ­ no aplica; no mezclar con video-editor.
- **No** confundir con `<iswc-data-grid>` (otro contrato, otro archivo).

## Errores conocidos (no repetir)

| Error | PrevenciÃ³n |
| --- | --- |
| Sidebar en template pero siempre `hidden` y sin handlers | Cablear tabs + `#renderColumnsPanel`; test `prefs-contract` exige clases |
| Persistencia en `sessionStorage` o key plana | Usar `prefs.js`; test falla si `ag-grid.js` hace `setItem` directo de estado |
| Root `is-components` tratado como canÃ³nico | CanÃ³nico = `iswc-root`; legacy solo en migraciÃ³n |
| `setComponentPrefs` merge deja basura en estado de grid | Usar `replaceComponentPrefs` al guardar snapshot |
| Documentar persistencia sin mencionar el root Ãºnico | MD + preview deben decir `localStorage['iswc-root'][tag][key]` |
| Olvidar botÃ³n Reiniciar cuando hay `remember-state` | Toolbar `.mim-dg__reset-btn` + `api.resetPersistedState` |

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
<iswc-ag-grid id="grid" selectable row-selection="multiple"
            remember-state storage-key="inventario"
            density="compact" page-size="50" style="height: 30rem">
</iswc-ag-grid>

<script type="module">
  const grid = document.getElementById('grid');
  grid.columns = [
    { field: 'name', header: 'Producto', filter: true, sortable: true },
    { field: 'stock', header: 'Stock', type: 'number', align: 'right' },
  ];
  grid.rows = await (await fetch('/api/inventario')).json();

  grid.addEventListener('iswc-sort-change', (e) => console.log(e.detail));
  grid.api.openColumnsPanel();
  const snapshot = grid.api.serializeState();
  grid.api.resetPersistedState();      // borra keyid y vuelve a defaults
</script>
```

## Errores comunes

- Persistir con `remember-state` pero sin `storage-key`: la persistencia es
  opt-in estricto y necesita ambos.
- Escuchar `iswc-sort` / `iswc-filter`: el vocabulario es `-change`.
- Escribir el estado a mano en `localStorage` en vez de usar `prefs.js`.
- Confundirlo con `<iswc-data-grid>`: otro contrato y otro archivo.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar `datagrid-core` antes de reimplementar orden, filtro o agrupaciÃ³n.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Persistir solo por `_shared/prefs.js` con la raÃ­z `iswc-root`.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./ag-grid.ts)
- [CSS](./ag-grid.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./ag-grid.json)

## Checker

```bash
node tests/prefs-contract.test.ts
deno run -A --no-check scripts/docs-consistency.selfcheck.mjs
```

## NavegaciÃ³n

- [Ãndice data](../../specs/componentes.md)
- [Ãndice global](../../specs/componentes.md)
- Preview: `components/data/ag-grid.json`
