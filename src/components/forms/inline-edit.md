---
tag: iswc-inline-edit
tags:
  - iswc-inline-edit
category: forms
status: public
source: ./inline-edit.ts
style: ./inline-edit.scss
preview: ./inline-edit.json
---
# `<iswc-inline-edit>`

## Propósito

Edición "in place": muestra `value` como texto; al hacer clic se convierte en
un `input` o `textarea`; Enter guarda, Esc cancela y revierte, y `blur`
guarda salvo que se pida lo contrario.

Este módulo registra `<iswc-inline-edit>`.

## Cuándo usarlo

Editar un campo suelto dentro de una vista de lectura (título de documento,
nota, nombre de fila) sin abrir un formulario ni un modal.

## Cuándo no usarlo

Para varios campos a la vez usar `<iswc-form>` con `<iswc-input>` / `<iswc-textarea>`.
Para edición de celdas tabulares usar `<iswc-data-grid>` o `<iswc-spreadsheet>`.

## Importación

```js
import './inline-edit.js';
```

## Ejemplo mínimo

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
| `placeholder` | string | Visible cuando `value` está vacío. |
| `name` | string | Nombre del campo. Hoy **no** es form-associated: el valor no entra en el `<form>` (ver «Integración con formularios»). |
| `disabled` | boolean | Impide entrar en edición. |
| `readonly` | boolean | Impide entrar en edición. |
| `required` | boolean | Marca el campo como requerido. Hoy sin efecto (no es form-associated). |
| `cancel-on-blur` | boolean | `blur` cancela en vez de guardar. |
| `maxlength` | number | Solo `mode="text"`. |
| `rows` | number | Solo `mode="textarea"`. |
| `max-rows` | number | Solo `mode="textarea"`. |
| `variant` | string | Variante visual; ver CSS. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Refleja el atributo `value`. |
| `editing` | lectura | `true` mientras el editor está activo. |

### Slots

| Slot | Uso |
| --- | --- |
| `display` | Markup propio para el modo lectura (avatar, badge, etc.). Se reemplaza por el editor al editar. |

### Eventos

<!-- eventos: generado por scripts/sondas/eventos.ts desde declare static events -->

| Evento | detail | cancelable |
| --- | --- | --- |
| `iswc-edit` | `Record<string, never>` | no |
| `iswc-save` | `{ value: string; previous: string \| null }` | no |
| `iswc-cancel` | `{ value: string; previous: string \| null }` | no |

<!-- /eventos -->


| Evento | Descripción |
| --- | --- |
| `iswc-edit` | Evento personalizado del componente (edit). |
| `iswc-save` | Evento personalizado del componente (save). |
| `iswc-cancel` | Emitido al cancelar la operación. |

`iswc-save` se emite antes de escribir `value`: `detail.value` es el valor
nuevo y `detail.previous` el vigente al entrar en edición.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-inline-edit');
el.addEventListener('iswc-edit', (e) => {
  console.log('iswc-edit', e.detail);
});
```

</details>

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `edit()` | Entra en edición (no hace nada si `disabled` o `readonly`). |
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

| Estado | Cuándo |
| --- | --- |
| `:state(idle)` | Modo lectura. |
| `:state(editing)` | Editor activo. |
| `:state(saved)` | 280 ms tras guardar; luego vuelve a `idle`. |
| `:state(cancelled)` | 280 ms tras cancelar; luego vuelve a `idle`. |
| `:state(blank)` | El valor actual está vacío. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-inline-edit-min-h` | Altura mínima del editor en `mode="textarea"`. |
| `--iswc-inline-edit-radius` | Radio de bordes. |
| `--iswc-accent` | Realce en edición. |
| `--iswc-border` | Borde del editor. |
| `--iswc-text` | Color del texto. |
| `--iswc-text-soft` | Color del placeholder. |
| `--iswc-success` | Realce del estado `saved`. |
| `--iswc-danger` | Realce de validación. |
| `--iswc-focus` | Anillo de foco. |

### Integración con formularios

**Decisión: `<iswc-inline-edit>` NO es form-associated** (Fase E2, ítem 1 del handoff).
El atributo `name` se acepta y se documenta, pero el valor **no** entra en el
`FormData` del `<form>` contenedor: el componente no llama a `attachInternals()`
ni declara `static formAssociated`, así que el navegador ni siquiera lo registra
como control del formulario.

**Por qué no:**

- *No es un control de formulario.* Es un afordance de edición «in place» sobre
  un valor suelto (un título, una nota, el nombre de una fila). Su valor es un
  texto que solo existe mientras se edita; fuera de la edición lo que hay es
  una presentación, no un dato de formulario.
- *Ser form-associated sería comportamiento nuevo.* El `<form>` empezaría a
  enviar un campo que hoy no envía, y el componente ganaría estados de
  validez (`:state(user-invalid)`), `checkValidity()` y un `formResetCallback`
  que repondría un valor que el navegador no puede reponer. El handoff de esta
  fase es explícito: **nada de behaviour nuevo**, solo reubicar código.
- *El modelo de valor no está decidido.* Un `inline-edit` sin tocar puede
  tener un valor vacío o no tener ninguno; qué significa «required» en ese
  caso (¿un texto no vacío? ¿un modo de edición abierto?) no está definido, y
  decidirlo aquí abriría un contrato que no pide este ítem.

**Qué haría falta para cambiarlo:** heredar de `IswcFormControl`
(`core/iswc-form-control.ts`) o de `IswcFormChrome`, declarar
`valorFormulario()` y `controlNativo` (el `input`/`textarea` interno) y fijar
el contrato de «required» y de `formResetCallback`. Es un ítem aparte, con su
spec y su guardian.

**Mientras tanto:** para un campo que deba ir al `<form>`, usar
`<iswc-input>` / `<iswc-textarea>` (o `<iswc-masked-input>`), que sí son
form-associated, y leer `iswc-save` de `<iswc-inline-edit>` para volcar el
valor a mano.

## Comportamiento

- Clic en cualquier punto del componente en modo lectura llama a `edit()`.
- Al entrar en edición se guarda un snapshot del valor y el cursor va al final.
- `Enter` guarda solo en `mode="text"`; en `textarea` inserta salto de línea.
- `Escape` siempre cancela.
- `blur` guarda; con `cancel-on-blur` cancela.
- Los estados son excluyentes; `saved` y `cancelled` revierten a `idle` a los
  280 ms.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/dom-utils.js`](../../core/dom.js)
- [`../_shared/form-associated.js`](../../core/form-associated.js)
- [`../_shared/reflect.js`](../../core/attrs.js)

Tags del módulo: `<iswc-inline-edit>`.

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

- Esperar que `Enter` guarde en `mode="textarea"`: allí inserta salto de línea.
- Leer `detail.value` de `iswc-save` esperando el valor viejo: ese es `previous`.
- Poner contenido en el slot `display` y esperar que el texto plano desaparezca:
  conviven; el texto plano se oculta desde CSS si el slot está lleno.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./inline-edit.ts)
- [CSS](./inline-edit.scss)
- [Índice de categoría](../../../specs/componentes.md)
- [Preview](./inline-edit.json)
