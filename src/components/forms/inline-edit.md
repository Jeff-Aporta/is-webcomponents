---
tag: iswc-inline-edit
tags:
  - iswc-inline-edit
category: forms
status: public
source: ./inline-edit.ts
style: ./inline-edit.css
preview: ./inline-edit.json
---
# `<iswc-inline-edit>`

## PropÃ³sito

EdiciÃ³n "in place": muestra `value` como texto; al hacer clic se convierte en
un `input` o `textarea`; Enter guarda, Esc cancela y revierte, y `blur`
guarda salvo que se pida lo contrario.

Este mÃ³dulo registra `<iswc-inline-edit>`.

## CuÃ¡ndo usarlo

Editar un campo suelto dentro de una vista de lectura (tÃ­tulo de documento,
nota, nombre de fila) sin abrir un formulario ni un modal.

## CuÃ¡ndo no usarlo

Para varios campos a la vez usar `<iswc-form>` con `<iswc-input>` / `<iswc-textarea>`.
Para ediciÃ³n de celdas tabulares usar `<iswc-data-grid>` o `<iswc-spreadsheet>`.

## ImportaciÃ³n

```js
import './inline-edit.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-inline-edit value="Factura de venta"></iswc-inline-edit>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | Texto actual; se refleja tras guardar. |
| `mode` | `text` \| `textarea` | Default `text`. |
| `placeholder` | string | Visible cuando `value` estÃ¡ vacÃ­o. |
| `name` | string | Nombre del campo form-associated. |
| `disabled` | boolean | Impide entrar en ediciÃ³n. |
| `readonly` | boolean | Impide entrar en ediciÃ³n. |
| `required` | boolean | Marca el campo como requerido. |
| `cancel-on-blur` | boolean | `blur` cancela en vez de guardar. |
| `maxlength` | number | Solo `mode="text"`. |
| `rows` | number | Solo `mode="textarea"`. |
| `max-rows` | number | Solo `mode="textarea"`. |
| `variant` | string | Variante visual; ver CSS. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Refleja el atributo `value`. |
| `editing` | lectura | `true` mientras el editor estÃ¡ activo. |

### Slots

| Slot | Uso |
| --- | --- |
| `display` | Markup propio para el modo lectura (avatar, badge, etc.). Se reemplaza por el editor al editar. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-edit` | Evento personalizado del componente (edit). |
| `iswc-save` | Evento personalizado del componente (save). |
| `iswc-cancel` | Emitido al cancelar la operaciÃ³n. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-edit` | `{}` | sÃ­ | sÃ­ | no |
| `iswc-save` | `{ value, previous }` | sÃ­ | sÃ­ | no |
| `iswc-cancel` | `{ value, previous }` | sÃ­ | sÃ­ | no |

`iswc-save` se emite antes de escribir `value`: `detail.value` es el valor
nuevo y `detail.previous` el vigente al entrar en ediciÃ³n.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-inline-edit');
el.addEventListener('iswc-edit', (e) => {
  console.log('iswc-edit', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `edit()` | Entra en ediciÃ³n (no hace nada si `disabled` o `readonly`). |
| `save()` | Guarda el contenido del editor y vuelve a lectura. |
| `cancel()` | Revierte al valor previo y vuelve a lectura. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `display` | Bloque de lectura. |
| `editor-wrap` | Contenedor del editor. |
| `editor` | `input` o `textarea` interno. |

### Custom states

| Estado | CuÃ¡ndo |
| --- | --- |
| `:state(idle)` | Modo lectura. |
| `:state(editing)` | Editor activo. |
| `:state(saved)` | 280 ms tras guardar; luego vuelve a `idle`. |
| `:state(cancelled)` | 280 ms tras cancelar; luego vuelve a `idle`. |
| `:state(blank)` | El valor actual estÃ¡ vacÃ­o. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-inline-edit-min-h` | Altura mÃ­nima del editor en `mode="textarea"`. |
| `--iswc-inline-edit-radius` | Radio de bordes. |
| `--iswc-accent` | Realce en ediciÃ³n. |
| `--iswc-border` | Borde del editor. |
| `--iswc-text` | Color del texto. |
| `--iswc-text-soft` | Color del placeholder. |
| `--iswc-success` | Realce del estado `saved`. |
| `--iswc-danger` | Realce de validaciÃ³n. |
| `--iswc-focus` | Anillo de foco. |

### IntegraciÃ³n con formularios

Es form-associated vÃ­a `ElementInternals`: con `name` presente aporta `value`
a `FormData` del `<form>` contenedor. `required` marca el campo como
obligatorio.

## Comportamiento

- Clic en cualquier punto del componente en modo lectura llama a `edit()`.
- Al entrar en ediciÃ³n se guarda un snapshot del valor y el cursor va al final.
- `Enter` guarda solo en `mode="text"`; en `textarea` inserta salto de lÃ­nea.
- `Escape` siempre cancela.
- `blur` guarda; con `cancel-on-blur` cancela.
- Los estados son excluyentes; `saved` y `cancelled` revierten a `idle` a los
  280 ms.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/dom-utils.js`](../_shared/dom-utils.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)
- [`../_shared/reflect.js`](../_shared/reflect.js)

Tags del mÃ³dulo: `<iswc-inline-edit>`.

## Accesibilidad

El editor es un control nativo (`input` / `textarea`), con `disabled` y
`readOnly` sincronizados desde los atributos del host. El teclado cubre el
ciclo completo: entrar por clic, `Enter` para guardar, `Escape` para cancelar.
Al proveer el slot `display` con contenido no textual, aportar un texto
accesible propio.

## Ejemplo avanzado

```html
<iswc-inline-edit id="nota" mode="textarea" rows="3" max-rows="8"
                name="nota" placeholder="Sin observaciones" cancel-on-blur>
</iswc-inline-edit>

<script type="module">
  const nota = document.getElementById('nota');
  nota.addEventListener('iswc-save', async (e) => {
    await fetch('/api/nota', { method: 'PUT', body: e.detail.value });
  });
  nota.addEventListener('iswc-cancel', (e) => console.log('revertido a', e.detail.previous));
</script>
```

## Errores comunes

- Esperar que `Enter` guarde en `mode="textarea"`: allÃ­ inserta salto de lÃ­nea.
- Leer `detail.value` de `iswc-save` esperando el valor viejo: ese es `previous`.
- Poner contenido en el slot `display` y esperar que el texto plano desaparezca:
  conviven; el texto plano se oculta desde CSS si el slot estÃ¡ lleno.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./inline-edit.ts)
- [CSS](./inline-edit.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./inline-edit.json)
