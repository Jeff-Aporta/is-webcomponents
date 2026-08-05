---
tag: is-catalogo-gen
tags:
  - is-catalogo-gen
category: isp
status: public
source: ./catalogo-gen.js
style: ./catalogo-gen.css
preview: ../../previews/isp/is-catalogo-gen.html
---
# `<is-catalogo-gen>`

## Propósito

Catálogo CRUD genérico portado de `CatalogoGen.svelte` (ISP-SvelteComponents):
toolbar de acciones, grilla (`<is-ag-grid>`), drawer de ficha y modales de
verificar / eliminar / recodificar / duplicar / consolidar.

Este módulo registra `<is-catalogo-gen>`.

## Cuándo usarlo

Listados maestros ContaPyme con controller que implementa `Lista` + acciones
`actCrear` / `actModificar` / …

## Cuándo no usarlo

Tablas de solo lectura sin CRUD → `<is-ag-grid>` o `<is-data-grid>` directo.
Selector de un registro en un formulario → `<is-btn-ref>`.

## Importación

```js
import './catalogo-gen.js';
```

## Ejemplo mínimo

```html
<is-catalogo-gen id="cat" style="height: 28rem;"></is-catalogo-gen>
<script type="module">
  const cat = document.getElementById('cat');
  cat.controller = {
    entrie: 'Aplicación',
    primaryKeys: ['app'],
    columns: [
      { field: 'app', header: 'Aplicación' },
      { field: 'bactiva', header: 'Activa' },
    ],
    async Lista() {
      return { datos: [
        { app: 'ContaPyme', bactiva: true },
        { app: 'AgroWin', bactiva: false },
      ]};
    },
    async actCrear(o) { return o; },
    async actModificar(o) { return o; },
    async actEliminar(o) { return o; },
  };
</script>
```

## API

### Propiedades JS

| Propiedad | Notas |
| --- | --- |
| `controller` | `Lista`, `primaryKeys`, `Columns` o `columns`, `act*` opcionales |
| `bAllowed` | Permisos por acción (default todas `true`) |
| `onError` | `(msg) => void` |
| `onNewObject` | `() => Promise<record>` |
| `selectionData` | Registros seleccionados (vivo) |

### Atributos

| Atributo | Default | Notas |
| --- | --- | --- |
| `show-header` | true | Toolbar de acciones |
| `show-search` | true | Campo buscar |
| `mode-filter` | true | Etiqueta modo filtro/lista |
| `multi-select` | false | Selección múltiple |
| `select-mode` | false | Oculta CRUD (uso en `<is-btn-ref>`) |
| `q-registros` | 10000 | Tope de filas al cargar |
| `q-rows-header` | 2 | Filas del grid de botones |
| `icon-*` | mdi:… | Iconos por acción |

### Slots

| Slot | Uso |
| --- | --- |
| `frm` | Contenido del formulario en el drawer |

### Eventos

| Evento | detail |
| --- | --- |
| `is-selection-change` | `{ records }` |
| `is-double-click` | `{ record }` |
| `is-action` | `{ action, record? }` |
| `is-frm-open` / `is-frm-close` | modo / vacío |
| `is-error` | `{ message }` |

### Métodos

`refreshGrid()`, `showFrmCrear()`, `showFrmModificar(r)`, `showFrmVisualizar(r)`,
`showVerificar(r)`, `showEliminar(r)`, `showRecodificar(r)`, `showDuplicar(r)`,
`showConsolidar(r)`, `closeFrm()`.

## Relación con ISP

Fuente: `ISP-SvelteComponents/src/lib/base/CatalogoGen.svelte` + stories
`SvelteComponents/Base/CatalogoGen`.
