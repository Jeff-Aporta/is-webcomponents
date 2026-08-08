---
tag: is-catalogo-gen
tags:
  - is-catalogo-gen
category: isp
status: public
source: ./catalogo-gen.js
style: ./catalogo-gen.css
preview: ../../previews/isp/is-catalogo-gen.json
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

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `show-header` | boolean | Toolbar de acciones. Activa por defecto. |
| `show-search` | boolean | Campo de búsqueda. Activo por defecto. |
| `mode-filter` | boolean | Etiqueta modo filtro / lista. Activo por defecto. |
| `multi-select` | boolean | Selección múltiple. |
| `select-mode` | boolean | Oculta el CRUD; es el modo que usa `<is-btn-ref>`. |
| `q-registros` | number | Tope de filas al cargar, default `10000`. |
| `q-rows-header` | number | Filas del grid de botones, default `2`. |
| `icon-*` | string | Icono por acción (`mdi:…`). |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `controller` | lectura/escritura | `Lista`, `primaryKeys`, `Columns` o `columns`, y acciones `act*` opcionales. |
| `bAllowed` | lectura/escritura | Permisos por acción; todas `true` por defecto. |
| `onError` | lectura/escritura | Callback `(msg) => void`. |
| `onNewObject` | lectura/escritura | Callback `() => Promise<record>`. |
| `selectionData` | lectura | Registros seleccionados; referencia viva. |

### Slots

| Slot | Uso |
| --- | --- |
| `frm` | Contenido del formulario dentro del drawer de ficha. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-selection-change` | `{ records }` | sí | sí | no |
| `is-double-click` | `{ record }` | sí | sí | no |
| `is-action` | `{ action, record? }` | sí | sí | no |
| `is-frm-open` | modo del formulario | sí | sí | no |
| `is-frm-close` | sin detail | sí | sí | no |
| `is-error` | `{ message }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `refreshGrid()` | Recarga la grilla llamando a `Lista`. |
| `showFrmCrear()` | Abre la ficha en modo creación. |
| `showFrmModificar(record)` | Abre la ficha en modo edición. |
| `showFrmVisualizar(record)` | Abre la ficha en solo lectura. |
| `showVerificar(record)` | Abre el modal de verificación. |
| `showEliminar(record)` | Abre el modal de eliminación. |
| `showRecodificar(record)` | Abre el modal de recodificación. |
| `showDuplicar(record)` | Abre el modal de duplicado. |
| `showConsolidar(record)` | Abre el modal de consolidación. |
| `closeFrm()` | Cierra la ficha. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `toolbar` | Barra de acciones. |
| `grid-wrap` | Contenedor de la grilla. |
| `drawer` | Drawer de ficha. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-cat-rows` | Filas visibles del grid de botones de la toolbar. |
| `--is-text` | Color del texto. |
| `--is-text-muted` | Texto secundario de la toolbar. |
| `--is-sans` | Familia tipográfica. |

### Integración con formularios

No es form-associated: es una vista CRUD. El formulario de la ficha vive en el
slot `frm` y gestiona su propio envío.

## Comportamiento

- `refreshGrid()` invoca `controller.Lista()` y vuelca `datos` en la grilla,
  recortando a `q-registros`.
- Las acciones de la toolbar se habilitan según `bAllowed` y la presencia de
  la acción `act*` correspondiente en el controller.
- Doble clic sobre una fila emite `is-double-click` y abre la ficha en el modo
  permitido.
- Con `select-mode` se oculta el CRUD y el catálogo actúa como selector: es el
  modo que consume `<is-btn-ref>`.
- Los errores de las acciones se anuncian por `is-error` y por `onError`.

## Dependencias y componentes relacionados

- [`../data/ag-grid.js`](../data/ag-grid.js) — grilla.
- [`../layout/drawer.js`](../layout/drawer.js) — ficha.
- [`../layout/dialog.js`](../layout/dialog.js) — modales de acción.
- [`./confirm-delete.js`](./confirm-delete.js), [`./modal-verificacion.js`](./modal-verificacion.js)
- [`../_shared/isp-record-utils.js`](../_shared/isp-record-utils.js)
- Consumidor: [`btn-ref.md`](btn-ref.md).

Tags del módulo: `<is-catalogo-gen>`.

## Accesibilidad

La ficha es un `<is-drawer>` y los modales son `<is-dialog>`: ambos atrapan el
foco y cierran con `Escape`. Los botones de la toolbar llevan texto accesible
aunque muestren solo icono.

## Ejemplo avanzado

```html
<is-catalogo-gen id="cat" multi-select style="height: 32rem">
  <form slot="frm">
    <is-input name="app" label="Aplicación"></is-input>
  </form>
</is-catalogo-gen>

<script type="module">
  const cat = document.getElementById('cat');
  cat.bAllowed = { crear: true, modificar: true, eliminar: false };
  cat.onError = (mensaje) => console.warn(mensaje);
  cat.controller = {
    entrie: 'Aplicación',
    primaryKeys: ['app'],
    columns: [{ field: 'app', header: 'Aplicación' }],
    async Lista() { return { datos: await (await fetch('/api/apps')).json() }; },
    async actCrear(o) { return o; },
  };
  cat.addEventListener('is-selection-change', (e) => console.log(e.detail.records));
  cat.refreshGrid();
</script>
```

## Errores comunes

- Definir `act*` sin permitirla en `bAllowed`: el botón queda deshabilitado.
- Esperar CRUD con `select-mode` presente: ese modo lo oculta.
- Superar `q-registros` y asumir que la grilla trae todo.
- Mutar `selectionData`: es la referencia interna.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./catalogo-gen.js)
- [CSS](./catalogo-gen.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/isp/is-catalogo-gen.json)

## Relación con ISP

Fuente: `ISP-SvelteComponents/src/lib/base/CatalogoGen.svelte` + stories
`SvelteComponents/Base/CatalogoGen`.
