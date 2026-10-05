---
tag: iswc-btn-ref
tags:
  - iswc-btn-ref
category: isp
status: public
source: ./btn-ref.ts
style: ./btn-ref.css
preview: ./btn-ref.json
---
# `<iswc-btn-ref>`

## PropÃ³sito

Campo de referencia portado de `BtnRef.svelte` (ISP): input + botÃ³n filtro que
abre un modal con `<iswc-catalogo-gen select-mode>` para elegir un registro y
mostrar la descripciÃ³n (`ColumnsBtnRef`) bajo el valor.

Este mÃ³dulo registra `<iswc-btn-ref>`.

## CuÃ¡ndo usarlo

FKs de catÃ¡logo (cliente, aplicaciÃ³n, terceroâ€¦) donde el usuario escribe la
clave o la busca en modal.

## CuÃ¡ndo no usarlo

Listado CRUD completo â†’ `<iswc-catalogo-gen>`. Combobox de opciones estÃ¡ticas â†’
`<iswc-combobox>` / `<iswc-select>`.

## ImportaciÃ³n

```js
import './btn-ref.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-btn-ref id="ref" label="AplicaciÃ³n" style="width: 20rem;"></iswc-btn-ref>
<script type="module">
  const el = document.getElementById('ref');
  el.controller = {
    entrie: 'AplicaciÃ³n',
    primaryKeys: ['app'],
    ColumnsBtnRef: ['app'],
    columns: [{ field: 'app', header: 'AplicaciÃ³n' }],
    async Lista() {
      return { datos: [{ app: 'ContaPyme' }, { app: 'AgroWin' }] };
    },
  };
  el.addEventListener('iswc-selected-record', (e) => console.log(e.detail));
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

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `controller` | lectura/escritura | `ICtxBtnRef`: `Lista`, `primaryKeys`, `ColumnsBtnRef`, `columns`/`Columns`. |
| `onSelectedRecord` | lectura/escritura | Callback `(record) => void`. |
| `onChange` | lectura/escritura | Callback opcional. |
| `onTypingEnd` | lectura/escritura | Callback opcional. |
| `handleInput` | lectura/escritura | Callback opcional. |

### Slots

No expone: el campo, el botÃ³n filtro y el modal se construyen internamente.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-typing-end` | Emitido tras el debounce de escritura (default 600 ms). |
| `iswc-selected-record` | Evento personalizado del componente (selected record). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-input` | `{ value }` | sÃ­ | sÃ­ | no |
| `iswc-change` | `{ value }` | sÃ­ | sÃ­ | no |
| `iswc-typing-end` | `{ value }` | sÃ­ | sÃ­ | no |
| `iswc-selected-record` | `{ record, value, label }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-btn-ref');
el.addEventListener('iswc-input', (e) => {
  console.log('iswc-input', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `focus()` | Enfoca el campo. |
| `open()` | Abre el modal de selecciÃ³n. |
| `close()` | Cierra el modal. |

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Contenedor del campo. |
| `label-text` | Etiqueta resuelta bajo el valor. |
| `open` | BotÃ³n filtro que abre el modal. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-b-required` | Marca visual de campo obligatorio. |
| `--iswc-b-optional` | Marca visual de campo opcional. |
| `--iswc-b-readonly` | Marca visual de solo lectura. |
| `--iswc-color` | Color base del texto. |
| `--iswc-color-danger` | Color de error de validaciÃ³n. |
| `--iswc-primary` | Color del botÃ³n filtro. |
| `--iswc-accent` | Realce del campo enfocado. |
| `--iswc-text` | Color del valor. |
| `--iswc-sans` | Familia tipogrÃ¡fica. |

### IntegraciÃ³n con formularios

Form-associated vÃ­a `ElementInternals`: con `name` presente aporta `value` a
`FormData`. `required` (salvo `optional`) fija validez y mensaje mediante
`setValidity()` / `clearValidity()` de `_shared/form-associated.js`.

## Comportamiento

- El campo es un `<iswc-input label-placement="float">`; el botÃ³n filtro abre un
  `<iswc-dialog>` con `<iswc-catalogo-gen select-mode>`.
- Al elegir un registro se toma la clave de `primaryKeys` y la descripciÃ³n de
  `ColumnsBtnRef`, se emite `iswc-selected-record` y se llama a
  `onSelectedRecord` si existe.
- Escribir a mano emite `iswc-input` y, al detenerse la escritura,
  `iswc-typing-end`.
- La resoluciÃ³n de campos del registro usa `_shared/isp-record-utils.js`
  (`asStr`, `getProp`, `isPresent`), igual que el catÃ¡logo.

## Dependencias y componentes relacionados

- [`./catalogo-gen.js`](./catalogo-gen.js) â€” listado en modo selecciÃ³n.
- [`../forms/input.js`](../forms/input.js)
- [`../actions/button.js`](../actions/button.js)
- [`../layout/dialog.js`](../layout/dialog.js)
- [`../media/icon.js`](../media/icon.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)
- [`../_shared/isp-record-utils.js`](../_shared/isp-record-utils.js)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)

Tags del mÃ³dulo: `<iswc-btn-ref>`.

## Accesibilidad

La etiqueta flotante la aporta `<iswc-input>`; el botÃ³n filtro lleva su propio
texto accesible y el modal es un `<iswc-dialog>`, con foco atrapado y cierre por
`Escape`. El icono del filtro es `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-btn-ref id="tercero" label="Tercero" name="tercero" required maxlength="15">
</iswc-btn-ref>

<script type="module">
  const campo = document.getElementById('tercero');
  campo.controller = {
    entrie: 'Tercero',
    primaryKeys: ['nit'],
    ColumnsBtnRef: ['razon'],
    columns: [
      { field: 'nit', header: 'NIT' },
      { field: 'razon', header: 'RazÃ³n social' },
    ],
    async Lista() {
      const r = await fetch('/api/terceros');
      return { datos: await r.json() };
    },
  };
  campo.addEventListener('iswc-selected-record', (e) => {
    console.log(e.detail.value, e.detail.label);
  });
  campo.open();
</script>
```

## Errores comunes

- No asignar `controller`: sin `Lista` el modal no tiene datos.
- Declarar `primaryKeys` con un campo que la fuente no devuelve: `value` queda vacÃ­o.
- Usarlo para catÃ¡logos completos con alta/baja: eso es `<iswc-catalogo-gen>`.
- Combinar `required` y `optional` esperando que gane `required`: `optional` lo relaja.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./btn-ref.ts)
- [CSS](./btn-ref.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./btn-ref.json)

## RelaciÃ³n con ISP

Fuente: `ISP-SvelteComponents/src/lib/form/BtnRef.svelte` + stories
`SvelteComponents/Form/BtnRef`. El modal interno equivale a `ModalSelect.svelte`.
