---
tag: iswc-catalogo-gen
tags:
  - iswc-catalogo-gen
category: isp
status: public
source: ./catalogo-gen.ts
style: ./catalogo-gen.css
preview: ./catalogo-gen.json
---
# `<iswc-catalogo-gen>`

## PropÃ³sito

CatÃ¡logo CRUD genÃ©rico portado de `CatalogoGen.svelte` (ISP-SvelteComponents):
toolbar de acciones, grilla (`<iswc-ag-grid>`), drawer de ficha y modales de
verificar / eliminar / recodificar / duplicar / consolidar.

Este mÃ³dulo registra `<iswc-catalogo-gen>`.

## CuÃ¡ndo usarlo

Listados maestros ContaPyme con controller que implementa `Lista` + acciones
`actCrear` / `actModificar` / â€¦

## CuÃ¡ndo no usarlo

Tablas de solo lectura sin CRUD â†’ `<iswc-ag-grid>` o `<iswc-data-grid>` directo.
Selector de un registro en un formulario â†’ `<iswc-btn-ref>`.

## ImportaciÃ³n

```js
import './catalogo-gen.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-catalogo-gen id="cat" style="height: 28rem;"></iswc-catalogo-gen>
<script type="module">
  const cat = document.getElementById('cat');
  cat.controller = {
    entrie: 'AplicaciÃ³n',
    primaryKeys: ['app'],
    columns: [
      { field: 'app', header: 'AplicaciÃ³n' },
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
| `show-search` | boolean | Campo de bÃºsqueda. Activo por defecto. |
| `mode-filter` | boolean | Etiqueta modo filtro / lista. Activo por defecto. |
| `multi-select` | boolean | SelecciÃ³n mÃºltiple. |
| `select-mode` | boolean | Oculta el CRUD; es el modo que usa `<iswc-btn-ref>`. |
| `q-registros` | number | Tope de filas al cargar, default `10000`. |
| `q-rows-header` | number | Filas del grid de botones, default `2`. |
| `icon-*` | string | Icono por acciÃ³n (`mdi:â€¦`). |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `controller` | lectura/escritura | `Lista`, `primaryKeys`, `Columns` o `columns`, y acciones `act*` opcionales. |
| `bAllowed` | lectura/escritura | Permisos por acciÃ³n; todas `true` por defecto. |
| `onError` | lectura/escritura | Callback `(msg) => void`. |
| `onNewObject` | lectura/escritura | Callback `() => Promise<record>`. |
| `selectionData` | lectura | Registros seleccionados; referencia viva. |

### Slots

| Slot | Uso |
| --- | --- |
| `frm` | Contenido del formulario dentro del drawer de ficha. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-selection-change` | Emitido al cambiar la selecciÃ³n. |
| `iswc-double-click` | Evento personalizado del componente (double click). |
| `iswc-action` | Evento personalizado del componente (action). |
| `iswc-frm-open` | Evento personalizado del componente (frm open). |
| `iswc-frm-close` | Evento personalizado del componente (frm close). |
| `iswc-error` | Emitido cuando se produce un error. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-selection-change` | `{ records }` | sÃ­ | sÃ­ | no |
| `iswc-double-click` | `{ record }` | sÃ­ | sÃ­ | no |
| `iswc-action` | `{ action, record? }` | sÃ­ | sÃ­ | no |
| `iswc-frm-open` | modo del formulario | sÃ­ | sÃ­ | no |
| `iswc-frm-close` | sin detail | sÃ­ | sÃ­ | no |
| `iswc-error` | `{ message }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-catalogo-gen');
el.addEventListener('iswc-selection-change', (e) => {
  console.log('iswc-selection-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `refreshGrid()` | Recarga la grilla llamando a `Lista`. |
| `showFrmCrear()` | Abre la ficha en modo creaciÃ³n. |
| `showFrmModificar(record)` | Abre la ficha en modo ediciÃ³n. |
| `showFrmVisualizar(record)` | Abre la ficha en solo lectura. |
| `showVerificar(record)` | Abre el modal de verificaciÃ³n. |
| `showEliminar(record)` | Abre el modal de eliminaciÃ³n. |
| `showRecodificar(record)` | Abre el modal de recodificaciÃ³n. |
| `showDuplicar(record)` | Abre el modal de duplicado. |
| `showConsolidar(record)` | Abre el modal de consolidaciÃ³n. |
| `closeFrm()` | Cierra la ficha. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `toolbar` | Barra de acciones. |
| `grid-wrap` | Contenedor de la grilla. |
| `drawer` | Drawer de ficha. |
| `pk-backdrop` | Backdrop del modal de clave primaria. |
| `pk-modal` | Modal que pide el PK antes de una acciÃ³n. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-cat-rows` | Filas visibles del grid de botones de la toolbar. |
| `--iswc-text` | Color del texto. |
| `--iswc-text-muted` | Texto secundario de la toolbar. |
| `--iswc-sans` | Familia tipogrÃ¡fica. |

### IntegraciÃ³n con formularios

No es form-associated: es una vista CRUD. El formulario de la ficha vive en el
slot `frm` y gestiona su propio envÃ­o.

## Comportamiento

- `refreshGrid()` invoca `controller.Lista()` y vuelca `datos` en la grilla,
  recortando a `q-registros`.
- Las acciones de la toolbar se habilitan segÃºn `bAllowed` y la presencia de
  la acciÃ³n `act*` correspondiente en el controller.
- Doble clic sobre una fila emite `iswc-double-click` y abre la ficha en el modo
  permitido.
- Con `select-mode` se oculta el CRUD y el catÃ¡logo actÃºa como selector: es el
  modo que consume `<iswc-btn-ref>`.
- Los errores de las acciones se anuncian por `iswc-error` y por `onError`.

## Dependencias y componentes relacionados

- [`../data/ag-grid.js`](../data/ag-grid.js) â€” grilla.
- [`../layout/drawer.js`](../layout/drawer.js) â€” ficha.
- [`../layout/dialog.js`](../layout/dialog.js) â€” modales de acciÃ³n.
- [`./confirm-delete.js`](./confirm-delete.js), [`./modal-verificacion.js`](./modal-verificacion.js)
- [`../_shared/isp-record-utils.js`](../_shared/isp-record-utils.js)
- Consumidor: [`btn-ref.md`](btn-ref.md).

Tags del mÃ³dulo: `<iswc-catalogo-gen>`.

## Accesibilidad

La ficha es un `<iswc-drawer>` y los modales son `<iswc-dialog>`: ambos atrapan el
foco y cierran con `Escape`. Los botones de la toolbar llevan texto accesible
aunque muestren solo icono.

## Ejemplo avanzado

```html
<iswc-catalogo-gen id="cat" multi-select style="height: 32rem">
  <form slot="frm">
    <iswc-input name="app" label="AplicaciÃ³n"></iswc-input>
  </form>
</iswc-catalogo-gen>

<script type="module">
  const cat = document.getElementById('cat');
  cat.bAllowed = { crear: true, modificar: true, eliminar: false };
  cat.onError = (mensaje) => console.warn(mensaje);
  cat.controller = {
    entrie: 'AplicaciÃ³n',
    primaryKeys: ['app'],
    columns: [{ field: 'app', header: 'AplicaciÃ³n' }],
    async Lista() { return { datos: await (await fetch('/api/apps')).json() }; },
    async actCrear(o) { return o; },
  };
  cat.addEventListener('iswc-selection-change', (e) => console.log(e.detail.records));
  cat.refreshGrid();
</script>
```

## Errores comunes

- Definir `act*` sin permitirla en `bAllowed`: el botÃ³n queda deshabilitado.
- Esperar CRUD con `select-mode` presente: ese modo lo oculta.
- Superar `q-registros` y asumir que la grilla trae todo.
- Mutar `selectionData`: es la referencia interna.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./catalogo-gen.ts)
- [CSS](./catalogo-gen.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./catalogo-gen.json)

## RelaciÃ³n con ISP

Fuente: `ISP-SvelteComponents/src/lib/base/CatalogoGen.svelte` + stories
`SvelteComponents/Base/CatalogoGen`.
