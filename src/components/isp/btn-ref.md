---
tag: is-btn-ref
tags:
  - is-btn-ref
category: isp
status: public
source: ./btn-ref.js
style: ./btn-ref.css
preview: ../../previews/isp/is-btn-ref.html
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

### Propiedades JS

| Propiedad | Notas |
| --- | --- |
| `controller` | `ICtxBtnRef`: `Lista`, `primaryKeys`, `ColumnsBtnRef`, `columns`/`Columns` |
| `onSelectedRecord` | `(record) => void` |
| `onChange` / `onTypingEnd` / `handleInput` | callbacks opcionales |

### Atributos

| Atributo | Default | Notas |
| --- | --- | --- |
| `label` | `""` | Etiqueta flotante |
| `value` | `""` | Clave seleccionada |
| `required` | false | Obligatorio |
| `optional` | false | Relaja required |
| `readonly` | false | Solo lectura |
| `maxlength` | 20 | Tope de caracteres |
| `name` / `id` | — | Formulario / DOM |

### Eventos

| Evento | detail |
| --- | --- |
| `is-change` | `{ value }` |
| `is-input` | `{ value }` |
| `is-typing-end` | `{ value }` |
| `is-selected-record` | `{ record, value, label }` |

### Métodos

`focus()`, `open()`, `close()`.

## Relación con ISP

Fuente: `ISP-SvelteComponents/src/lib/form/BtnRef.svelte` + stories
`SvelteComponents/Form/BtnRef`. El modal interno equivale a `ModalSelect.svelte`.
