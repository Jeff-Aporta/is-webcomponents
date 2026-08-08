---
tag: is-btn-ref
tags:
  - is-btn-ref
category: isp
status: public
source: ./btn-ref.js
style: ./btn-ref.css
preview: ../../previews/isp/is-btn-ref.json
---
# `<is-btn-ref>`

## Propósito

Campo de referencia portado de `BtnRef.svelte` (ISP): input + botón filtro que
abre un modal con `<is-catalogo-gen select-mode>` para elegir un registro y
mostrar la descripción (`ColumnsBtnRef`) bajo el valor.

Este módulo registra `<is-btn-ref>`.

## Cuándo usarlo

FKs de catálogo (cliente, aplicación, tercero…) donde el usuario escribe la
clave o la busca en modal.

## Cuándo no usarlo

Listado CRUD completo → `<is-catalogo-gen>`. Combobox de opciones estáticas →
`<is-combobox>` / `<is-select>`.

## Importación

```js
import './btn-ref.js';
```

## Ejemplo mínimo

```html
<is-btn-ref id="ref" label="Aplicación" style="width: 20rem;"></is-btn-ref>
<script type="module">
  const el = document.getElementById('ref');
  el.controller = {
    entrie: 'Aplicación',
    primaryKeys: ['app'],
    ColumnsBtnRef: ['app'],
    columns: [{ field: 'app', header: 'Aplicación' }],
    async Lista() {
      return { datos: [{ app: 'ContaPyme' }, { app: 'AgroWin' }] };
    },
  };
  el.addEventListener('is-selected-record', (e) => console.log(e.detail));
</script>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string | Etiqueta flotante. Default `""`. |
| `value` | string | Clave seleccionada. Default `""`. |
| `name` | string | Nombre form-associated. |
| `required` | boolean | Campo obligatorio. |
| `optional` | boolean | Relaja `required`. |
| `readonly` | boolean | Solo lectura. |
| `maxlength` | number | Tope de caracteres, default `20`. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `controller` | lectura/escritura | `ICtxBtnRef`: `Lista`, `primaryKeys`, `ColumnsBtnRef`, `columns`/`Columns`. |
| `onSelectedRecord` | lectura/escritura | Callback `(record) => void`. |
| `onChange` | lectura/escritura | Callback opcional. |
| `onTypingEnd` | lectura/escritura | Callback opcional. |
| `handleInput` | lectura/escritura | Callback opcional. |

### Slots

No expone: el campo, el botón filtro y el modal se construyen internamente.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-input` | `{ value }` | sí | sí | no |
| `is-change` | `{ value }` | sí | sí | no |
| `is-typing-end` | `{ value }` | sí | sí | no |
| `is-selected-record` | `{ record, value, label }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `focus()` | Enfoca el campo. |
| `open()` | Abre el modal de selección. |
| `close()` | Cierra el modal. |

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Contenedor del campo. |
| `label-text` | Etiqueta resuelta bajo el valor. |
| `open` | Botón filtro que abre el modal. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-b-required` | Marca visual de campo obligatorio. |
| `--is-b-optional` | Marca visual de campo opcional. |
| `--is-b-readonly` | Marca visual de solo lectura. |
| `--is-color` | Color base del texto. |
| `--is-color-danger` | Color de error de validación. |
| `--is-primary` | Color del botón filtro. |
| `--is-accent` | Realce del campo enfocado. |
| `--is-text` | Color del valor. |
| `--is-sans` | Familia tipográfica. |

### Integración con formularios

Form-associated vía `ElementInternals`: con `name` presente aporta `value` a
`FormData`. `required` (salvo `optional`) fija validez y mensaje mediante
`setValidity()` / `clearValidity()` de `_shared/form-associated.js`.

## Comportamiento

- El campo es un `<is-input label-placement="float">`; el botón filtro abre un
  `<is-dialog>` con `<is-catalogo-gen select-mode>`.
- Al elegir un registro se toma la clave de `primaryKeys` y la descripción de
  `ColumnsBtnRef`, se emite `is-selected-record` y se llama a
  `onSelectedRecord` si existe.
- Escribir a mano emite `is-input` y, al detenerse la escritura,
  `is-typing-end`.
- La resolución de campos del registro usa `_shared/isp-record-utils.js`
  (`asStr`, `getProp`, `isPresent`), igual que el catálogo.

## Dependencias y componentes relacionados

- [`./catalogo-gen.js`](./catalogo-gen.js) — listado en modo selección.
- [`../forms/input.js`](../forms/input.js)
- [`../actions/button.js`](../actions/button.js)
- [`../layout/dialog.js`](../layout/dialog.js)
- [`../media/icon.js`](../media/icon.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)
- [`../_shared/isp-record-utils.js`](../_shared/isp-record-utils.js)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)

Tags del módulo: `<is-btn-ref>`.

## Accesibilidad

La etiqueta flotante la aporta `<is-input>`; el botón filtro lleva su propio
texto accesible y el modal es un `<is-dialog>`, con foco atrapado y cierre por
`Escape`. El icono del filtro es `aria-hidden`.

## Ejemplo avanzado

```html
<is-btn-ref id="tercero" label="Tercero" name="tercero" required maxlength="15">
</is-btn-ref>

<script type="module">
  const campo = document.getElementById('tercero');
  campo.controller = {
    entrie: 'Tercero',
    primaryKeys: ['nit'],
    ColumnsBtnRef: ['razon'],
    columns: [
      { field: 'nit', header: 'NIT' },
      { field: 'razon', header: 'Razón social' },
    ],
    async Lista() {
      const r = await fetch('/api/terceros');
      return { datos: await r.json() };
    },
  };
  campo.addEventListener('is-selected-record', (e) => {
    console.log(e.detail.value, e.detail.label);
  });
  campo.open();
</script>
```

## Errores comunes

- No asignar `controller`: sin `Lista` el modal no tiene datos.
- Declarar `primaryKeys` con un campo que la fuente no devuelve: `value` queda vacío.
- Usarlo para catálogos completos con alta/baja: eso es `<is-catalogo-gen>`.
- Combinar `required` y `optional` esperando que gane `required`: `optional` lo relaja.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./btn-ref.js)
- [CSS](./btn-ref.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/isp/is-btn-ref.json)

## Relación con ISP

Fuente: `ISP-SvelteComponents/src/lib/form/BtnRef.svelte` + stories
`SvelteComponents/Form/BtnRef`. El modal interno equivale a `ModalSelect.svelte`.
